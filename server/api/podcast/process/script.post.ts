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
import type { PodcastCreateRequest, PodcastCreateResponse, ScriptSegment } from '~/types/api/podcast';

interface Persona { 
  id: number; 
  name: string;
  voice_model_identifier: string;
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

export default defineEventHandler(async (event): Promise<PodcastCreateResponse> => {
  try {
    const body = await readBody<PodcastCreateRequest>(event);

    // 1. Basic Validation - Ensure essential fields are present
    const { podcastTitle, script, hostPersonaId, language, ttsProvider } = body;

    if (!podcastTitle || !script || !Array.isArray(script) || !language || !ttsProvider || hostPersonaId === undefined) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. Required fields: podcastTitle, script, hostPersonaId, language, ttsProvider.',
      });
    }

    if (script.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. Script cannot be empty.',
      });
    }

    // 2. Validate each script segment
    for (const segment of script as ScriptSegment[]) { // Type assertion for iteration
      if (segment.speaker === undefined || segment.text === undefined || segment.speakerPersonaId === undefined) {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid script segment. Missing required fields (speaker, text, speakerPersonaId) in segment: ${JSON.stringify(segment)}`,
        });
      }
      if (typeof segment.speakerPersonaId !== 'number') {
        throw createError({
            statusCode: 400,
            statusMessage: `Invalid speakerPersonaId in segment. Expected number, got ${typeof segment.speakerPersonaId}: ${JSON.stringify(segment)}`,
        });
      }
    }
    
    // 3. Generate a podcastId (simple version for now)
    // In a real app, this would be a unique ID, possibly from a database or a UUID generator.
    const generatedPodcastId = `${podcastTitle.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/gi, '')}_${Date.now()}`;

    // 4. Simulate saving data to a database (actual DB logic to be added later)
    // const podcastRecord = await createPodcastServer(event, body); // Example call
    // For now, we assume the body is what would be saved.
    console.log('Simulating podcast creation with data:', JSON.stringify(body, null, 2));

    // 5. Prepare and return the response
    // The backend directly returns the segments as prepared, using personaId from the request.
    const response: PodcastCreateResponse = {
      success: true,
      // podcastId: podcastRecord?.podcast_id || generatedPodcastId, // If using DB service
      podcastId: generatedPodcastId, // Use generated ID for now
      preparedSegments: script.map((segment, index) => ({
        segmentIndex: index,
        text: segment.text,
        speakerPersonaId: segment.speakerPersonaId,
        speakerName: segment.speaker, // Pass speaker name back for UI consistency/confirmation
      })),
      message: `Script processed successfully for podcast "${podcastTitle}".`,
    };

    return response;

  } catch (error: any) {
    console.error('Error processing script:', error.message);
    // H3 will automatically handle createError() thrown errors
    // For other errors, ensure a proper error response is sent
    if (error.statusCode) {
        throw error; // Re-throw H3 errors
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to process script: ${error.message || 'Unknown server error'}`,
    });
  }
});
