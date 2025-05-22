import { createError, defineEventHandler, readBody } from "h3";
import { serverSupabaseClient } from '#supabase/server'; // For database interaction
import type { Database } from '~/types/supabase'; // For database types
import { createPodcastServer, addPodcastSegmentsServer } from '~/server/utils/podcastDatabaseServerUtils'; // Import server-side database utils
import { getPersonasByLanguage, type AutoSelectedPersona } from "../../../utils/personaFetcher";
import { consola } from 'consola';
import type { PodcastCreateRequest, PodcastCreateResponse, ScriptSegment } from '~/types/api/podcast';
import { randomUUID } from 'crypto';

// Removed unused internal Persona interface
// Removed unused internal RequestBody interface

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
    
    // 3. Generate a proper UUID for podcastId
    const generatedPodcastId = randomUUID();

    // 4. Create podcast record in database
    consola.info(`[script.post.ts] Creating podcast record in database for: ${podcastTitle}`);
    let podcastRecord;
    try {
      // Create podcast record
      const podcastData = {
        podcast_id: generatedPodcastId,
        title: podcastTitle,
        topic: body.topic || null,
        host_persona_id: hostPersonaId,
        guest_persona_id: body.guestPersonaIds && body.guestPersonaIds.length > 0 ? body.guestPersonaIds[0] : null,
        total_word_count: script.reduce((sum, segment) => sum + (segment.text?.split(' ').length || 0), 0),
        // Add other fields as needed
      };
      
      podcastRecord = await createPodcastServer(event, podcastData);
      consola.info(`[script.post.ts] Podcast created with ID: ${podcastRecord.podcast_id}`);
      
      // Create podcast segments in database
      const segmentsData = script.map((segment, index) => ({
        idx: index,
        speaker: segment.speaker,
        text: segment.text,
      }));
      
      const createdSegments = await addPodcastSegmentsServer(event, podcastRecord.podcast_id, segmentsData);
      consola.info(`[script.post.ts] Created ${createdSegments.length} segments for podcast ${podcastRecord.podcast_id}`);
      
    } catch (dbError: any) {
      consola.error(`[script.post.ts] Database error: ${dbError.message}`, dbError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save podcast to database: ${dbError.message}`,
      });
    }

    // 5. Prepare and return the response
    // The backend directly returns the segments as prepared, using personaId from the request.
    const response: PodcastCreateResponse = {
      success: true,
      podcastId: podcastRecord?.podcast_id || generatedPodcastId,
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
