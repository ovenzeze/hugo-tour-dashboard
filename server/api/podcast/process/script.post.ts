import { createError, defineEventHandler, readBody } from "h3";
import {
  processPodcastScript,
  type PreparedSegmentForSynthesis,
} from "../../../utils/podcastScriptProcessor";
import { serverSupabaseClient } from '#supabase/server'; // For database interaction
import type { Database } from '~/types/supabase'; // For database types
import { createPodcastServer, addPodcastSegmentsServer } from '~/server/utils/podcastDatabaseServerUtils'; // Import server-side database utils

interface Persona { // This interface is for the `personas` object used by processPodcastScript
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
  personas: { // Used by processPodcastScript for voice matching
    hostPersona?: Persona; // Matches processPodcastScript's expectation
    guestPersonas?: Persona[];
  };
  // Additional fields for podcast metadata
  language: string;      // e.g., 'en', 'es'
  topic?: string; // Optional topic for the podcast
  // Optional context for linking the podcast
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
      personas,
      language,
      topic, // Include topic from body
      museumId,
      galleryId,
      objectId,
    } = body;

    // Validation for all required fields
    if (
      !podcastTitle ||
      !script ||
      !Array.isArray(script) ||
      !personas ||
      !language
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid request body. "podcastTitle", "script" array, "personas" object, and "language" are required.',
      });
    }

    console.log(`API: Processing script for podcast: "${podcastTitle}"`);

    // Use server-side database utils
    let podcastRecord = null;
    let segmentRecords = null;

    // ---- BEGIN DATABASE INSERT LOGIC ----
    if (script.length > 0) {
      try {
        // 1. Create the podcast record using server-side util
        podcastRecord = await createPodcastServer(event, {
          title: podcastTitle,
          topic: topic,
          // Add other metadata fields here if needed, based on your table structure
          // e.g., user_id, description, cover_url, status
        });
        console.log(`DB: Podcast record CREATED successfully. ID: ${podcastRecord.podcast_id}, Title: "${podcastTitle}", Topic: "${topic || 'N/A'}"`);

        // 2. Prepare segments for insertion
        const segmentsToInsert = script.map((segment, index) => ({
          idx: index, // Use index as the order
          speaker: segment.speaker,
          text: segment.text,
          // podcast_id will be added by addPodcastSegmentsServer
        }));

        // 3. Add segments to the podcast using server-side util
        segmentRecords = await addPodcastSegmentsServer(event, podcastRecord.podcast_id, segmentsToInsert);
        console.log(`DB: ${segmentRecords.length} Segments ADDED successfully to podcast ID: ${podcastRecord.podcast_id}.`);
        if (segmentsToInsert.length > 0 && segmentRecords.length > 0) {
          console.log(`DB: First segment info - ID: ${segmentRecords[0].segment_text_id}, IDX: ${segmentsToInsert[0].idx}, Speaker: "${segmentsToInsert[0].speaker}", Text snippet: "${segmentsToInsert[0].text.substring(0, 70)}..."`);
        }

      } catch (dbError: any) {
        console.error(
          `Database operation error for podcast "${podcastTitle}": ${dbError.message}`,
          dbError
        );
        // Decide how to handle DB errors: fail the API or log and continue?
        // For now, we'll log and still attempt script processing if possible,
        // but the frontend might need to handle the case where podcastRecord is null.
      }
    } else {
      console.log(`Input script for podcast "${podcastTitle}" was empty. Not creating database records.`);
    }
    // ---- END DATABASE INSERT LOGIC ----

    // Continue with script processing regardless of DB insert success for now
    // You might want to adjust this logic based on whether DB insertion is critical
    const stringPodcastId = podcastTitle // Keep generating string ID for processPodcastScript if it needs it
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "");

    const preparedSegments: PreparedSegmentForSynthesis[] =
      await processPodcastScript(stringPodcastId, script, personas);

    // Check if script processing had errors
    const isScriptProcessingSuccessful = preparedSegments.every(
      (segment) => !segment.error
    );

    if (!isScriptProcessingSuccessful) {
       console.log(
        `Script processing for podcast "${podcastTitle}" had errors in one or more segments.`
      );
      // You might want to return a different status or message here
    }


    return {
      success: true,
      // Return the actual database generated podcast ID (UUID)
      podcastId: podcastRecord?.podcast_id || null,
      preparedSegments: preparedSegments,
      message: `Script processed and segments prepared for podcast "${podcastTitle}". Database records created: ${!!podcastRecord}. Next step: synthesize segments.`,
    };
  } catch (error: any) {
    console.error(
      `Error in /api/podcast/process/script.post.ts:`,
      error.message || error
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
