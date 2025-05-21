import { createError, defineEventHandler, readBody } from "h3";
import {
  processPodcastScript,
  type PreparedSegmentForSynthesis,
} from "../../../utils/podcastScriptProcessor";
import { serverSupabaseClient } from '#supabase/server'; // For database interaction
import type { Database } from '~/types/supabase'; // For database types
import { createPodcastServer, addPodcastSegmentsServer } from '~/server/utils/podcastDatabaseServerUtils'; // Import server-side database utils
import { getPersonasByLanguage, type AutoSelectedPersona } from "../../../utils/personaFetcher";
import { consola } from 'consola';

interface Persona { 
  id: number; 
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface RequestBody {
  podcastTitle: string;
  script: ScriptSegment[];
  personas: { 
    hostPersona?: Partial<Persona>; 
    guestPersonas?: Partial<Persona>[];
  };
  voiceMap?: Record<string, { personaId: number; voice_model_identifier: string }>; // Added voiceMap, made optional
  language: string;
  topic?: string;
  host_persona_id?: number; 
  guest_persona_id?: number; 
  creator_persona_id?: number; 
  total_duration_ms?: number; 
  total_word_count?: number; 
  museumId?: number;
  galleryId?: number;
  objectId?: number;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RequestBody;
    const {
      podcastTitle,
      script,
      personas: clientPersonas, 
      voiceMap, // Destructure voiceMap
      language,
      topic, 
      host_persona_id, 
      guest_persona_id, 
      creator_persona_id, 
      total_duration_ms, 
      total_word_count, 
      museumId,
      galleryId,
      objectId,
    } = body;

    consola.info('[script.post.ts] Initial client personas received in body:', JSON.stringify(clientPersonas, null, 2)); 
    consola.info('[script.post.ts] Received voiceMap:', JSON.stringify(voiceMap, null, 2)); // Log voiceMap

    if (
      !podcastTitle ||
      !script ||
      !Array.isArray(script) ||
      !language
      // Removed voiceMap from required validation
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid request body. "podcastTitle", "script" array, and "language" are required.',
      });
    }

    let resolvedHostPersona: AutoSelectedPersona | undefined = undefined;
    let resolvedGuestPersonas: Persona[] = [];

    const availablePersonas = await getPersonasByLanguage(event, language, 20); 

    if (availablePersonas.length === 0) {
      consola.warn(`[script.post.ts] No personas available for language ${language}. processPodcastScript might not find speakers.`);
    } else {
      if (clientPersonas?.hostPersona?.id) {
        resolvedHostPersona = availablePersonas.find(p => p.persona_id === clientPersonas.hostPersona!.id);
        if(resolvedHostPersona) consola.info(`[script.post.ts] Host persona identified by client ID: ${resolvedHostPersona.name}`);
      } else if (clientPersonas?.hostPersona?.name) {
        resolvedHostPersona = availablePersonas.find(p => p.name === clientPersonas.hostPersona!.name);
        if(resolvedHostPersona) consola.info(`[script.post.ts] Host persona identified by client name: ${resolvedHostPersona.name}`);
      }

      if (!resolvedHostPersona) {
        resolvedHostPersona = availablePersonas[0]; 
        consola.info(`[script.post.ts] Auto-selected host persona: ${resolvedHostPersona.name}`);
      }

      resolvedGuestPersonas = availablePersonas
        .filter(p => p.persona_id !== resolvedHostPersona!.persona_id)
        .map(p => ({
          id: p.persona_id,
          name: p.name,
          voice_model_identifier: p.voice_model_identifier || "", 
        }));
      consola.info(`[script.post.ts] Resolved guest personas count: ${resolvedGuestPersonas.length}`);
    }

    const finalPersonasForProcessing = {
      hostPersona: resolvedHostPersona ? {
        id: resolvedHostPersona.persona_id,
        name: resolvedHostPersona.name,
        voice_model_identifier: resolvedHostPersona.voice_model_identifier || "",
      } : undefined,
      guestPersonas: resolvedGuestPersonas,
    };

    consola.info('[script.post.ts] Final personas constructed for processPodcastScript:', JSON.stringify(finalPersonasForProcessing, null, 2));

    console.log(`API: Processing script for podcast: "${podcastTitle}"`);

    let podcastRecord = null;

    if (script.length > 0) {
      try {
        podcastRecord = await createPodcastServer(event, {
          title: podcastTitle,
          topic: topic,
          host_persona_id: host_persona_id, 
          guest_persona_id: guest_persona_id, 
          creator_persona_id: creator_persona_id, 
          total_duration_ms: total_duration_ms, 
          total_word_count: total_word_count, 
        });
        consola.info(`DB: Podcast record CREATED successfully. ID: ${podcastRecord.podcast_id}, Title: "${podcastTitle}", Topic: "${topic || 'N/A'}"`);

        const segmentsToInsert = script.map((segment, index) => ({
          idx: index, 
          speaker: segment.speaker,
          text: segment.text,
        }));

        const insertedSegments = await addPodcastSegmentsServer(event, podcastRecord.podcast_id, segmentsToInsert);
        consola.info(`DB: ${insertedSegments.length} Segments ADDED successfully to podcast ID: ${podcastRecord.podcast_id}.`);
        if (segmentsToInsert.length > 0 && insertedSegments.length > 0) {
          consola.info(`DB: First segment info - ID: ${insertedSegments[0].segment_text_id}, IDX: ${segmentsToInsert[0].idx}, Speaker: "${segmentsToInsert[0].speaker}", Text snippet: "${segmentsToInsert[0].text.substring(0, 70)}..."`);
        }

      } catch (dbError: any) {
        consola.error(
          `Database operation error for podcast "${podcastTitle}": ${dbError.message}`,
          dbError
        );
      }
    } else {
      consola.log(`Input script for podcast "${podcastTitle}" was empty. Not creating database records.`);
    }

    const stringPodcastId = podcastTitle 
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "");

    const preparedSegments: PreparedSegmentForSynthesis[] =
      await processPodcastScript(stringPodcastId, script, finalPersonasForProcessing, language); 

    const isScriptProcessingSuccessful = preparedSegments.every(
      (segment) => !segment.error
    );

    if (!isScriptProcessingSuccessful) {
       consola.warn( 
        `Script processing for podcast "${podcastTitle}" had errors in one or more segments.`
      );
    }


    return {
      success: true,
      podcastId: podcastRecord?.podcast_id || null,
      preparedSegments: preparedSegments,
      message: `Script processed and segments prepared for podcast "${podcastTitle}". Database records created: ${!!podcastRecord}. Next step: synthesize segments.`,
    };
  } catch (error: any) {
    consola.error(
      `Error in /api/podcast/process/script.post.ts:`, error.stack || error.message || error
    );
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to process script: ${ 
        error.statusMessage || error.message
      }`,
      data: error.data || error,
    });
  }
});
