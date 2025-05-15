// server/api/podcast/process/synthesize-segments.post.ts
import { useRuntimeConfig } from "#imports";
import { serverSupabaseClient } from "#supabase/server"; // Import server Supabase client
import { createError, defineEventHandler, readBody } from "h3";
import type { Database, Tables } from "~/types/supabase"; // Import database types and Tables
import type { IStorageService } from "../../../services/storageService"; // Adjust path as needed
import { getStorageService } from "../../../services/storageService"; // Adjust path as needed
// server/api/podcast/process/synthesize-segments.post.ts
import { useRuntimeConfig } from "#imports";
import { serverSupabaseClient } from "#supabase/server"; // Import server Supabase client
import { createError, defineEventHandler, readBody } from "h3";
import type { Database, Tables } from "~/types/supabase"; // Import database types and Tables
import type { IStorageService } from "../../../services/storageService"; // Adjust path as needed
import { getStorageService } from "../../../services/storageService"; // Adjust path as needed
import {
  addSegmentAudioServer, // Import the specific function
  getSegmentsByPodcastIdServer, // Import the specific function
} from "~/server/utils/podcastDatabaseServerUtils"; // Adjust path as needed
import {
  generateAndStoreTimedAudioSegment,
  type TimedAudioSegmentResult,
} from "../../../services/timedAudioService"; // Adjust path

// Define the Segment type from your database types
type Segment = Tables<"podcast_segments">;

// Expected input structure for each segment
interface InputSegment {
  segmentIndex: number;
  text: string;
  voiceId: string;
  speakerName: string; // For generating a safe base filename
  // Potentially add modelId, voiceSettings if they can vary per segment
}

interface RequestBody {
  podcastId: string;
  segments: InputSegment[];
  // Optional: global defaultModelId, global voiceSettings if not per segment
  defaultModelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RequestBody;
    const { podcastId, segments, defaultModelId, voiceSettings } = body;

    if (!podcastId || !Array.isArray(segments) || segments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid request: "podcastId" and a non-empty "segments" array are required.',
      });
    }

    const runtimeConfig = useRuntimeConfig(event);
    const elevenLabsApiKey =
      runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      console.error("[synthesize-segments] ElevenLabs API key is missing.");
      throw createError({
        statusCode: 500,
        statusMessage: "ElevenLabs API key is not configured.",
      });
    }

    const storageService: IStorageService = await getStorageService(event);
    // No need to create a database instance here, use the imported functions directly
    // const supabase = await serverSupabaseClient<Database>(event);
    // const podcastDatabase = createServerPodcastDatabase(supabase);

    const results: (TimedAudioSegmentResult & { segmentIndex: number })[] = [];

    // Define base paths for storage
    // publicOutputDirectory is relative to the public root, used for generating public URLs
    // For Supabase Storage, both publicOutputDirectory and storageOutputDirectory
    // will refer to the path within the bucket.
    const supabasePathSuffix = storageService.joinPath(
      "podcasts",
      podcastId,
      "segments"
    );
    const publicOutputDirectory = supabasePathSuffix;
    const storageOutputDirectory = supabasePathSuffix;
    console.log(
      "[synthesize-segments.post.ts] Calculated Supabase storageOutputDirectory:",
      storageOutputDirectory
    );
    console.log(
      "[synthesize-segments.post.ts] Calculated Supabase publicOutputDirectory:",
      publicOutputDirectory
    );

    // Ensure the main segments directory exists once (for Supabase, this might be a no-op or create a placeholder)
    await storageService.ensureDir(storageOutputDirectory);

    // Fetch existing segments for this podcast to get their segment_text_id
    // Use the imported server utility function
    const existingSegments = await getSegmentsByPodcastIdServer(
      event, // Pass the event object
      podcastId
    );
    const segmentIdMap = new Map(
      existingSegments.map((seg: Segment) => [seg.idx, seg.segment_text_id])
    );

    for (const segment of segments) {
      const safeSpeakerName = segment.speakerName
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .substring(0, 50);
      const baseFilename = `${String(segment.segmentIndex).padStart(
        3,
        "0"
      )}_${safeSpeakerName}`;

      const result = await generateAndStoreTimedAudioSegment({
        text: segment.text,
        voiceId: segment.voiceId,
        storageService,
        elevenLabsApiKey,
        publicOutputDirectory: publicOutputDirectory, // Used for generating final public URL
        storageOutputDirectory: storageOutputDirectory, // Used for writing files
        baseFilename,
        defaultModelId: defaultModelId,
        voiceSettings: voiceSettings,
      });

      // Add result to the list
      results.push({ ...result, segmentIndex: segment.segmentIndex });

      // If audio was successfully generated and stored (no error), save to database
      if (!result.error && result.audioFileUrl) {
        const segmentTextId = segmentIdMap.get(segment.segmentIndex);
        if (segmentTextId) {
          try {
            // Use the imported server utility function
            await addSegmentAudioServer(
              event, // Pass the event object
              segmentTextId,
              result.audioFileUrl,
              "preview", // Use 'preview' as version tag for segment previews
              {
                // Optional params
                voiceId: segment.voiceId,
                modelId: defaultModelId,
                voiceSettings: voiceSettings,
                timestampFileUrl: result.timestampFileUrl, // Save timestamp URL if available
              }
            );
            console.log(
              `[synthesize-segments] Saved audio for segment ${segment.segmentIndex} to database.`
            );
          } catch (dbError: any) {
            console.error(
              `[synthesize-segments] Failed to save segment audio to database for segment ${segment.segmentIndex}:`,
              dbError.message
            );
            // Optionally add a warning to the result for this segment
            const segmentResult = results.find(
              (r) => r.segmentIndex === segment.segmentIndex
            );
            if (segmentResult) {
              segmentResult.error = segmentResult.error
                ? `${segmentResult.error}; DB Save Failed: ${dbError.message}`
                : `DB Save Failed: ${dbError.message}`;
            }
          }
        } else {
          console.warn(
            `[synthesize-segments] Could not find segment_text_id for segment index ${segment.segmentIndex}. Skipping database save.`
          );
          const segmentResult = results.find(
            (r) => r.segmentIndex === segment.segmentIndex
          );
          if (segmentResult) {
            segmentResult.error = segmentResult.error
              ? `${segmentResult.error}; DB Save Skipped: Segment ID not found`
              : `DB Save Skipped: Segment ID not found`;
          }
        }
      }
    }

    // Determine overall success based on whether *any* segment succeeded
    const anySuccess = results.some((r) => !r.error);
    const allFailed = results.every((r) => r.error);


    if (allFailed && segments.length > 0) {
        const errorSummary = results.map(r => `Segment ${r.segmentIndex}: ${r.error}`).join('; ');
        console.error(`[synthesize-segments] All segments failed for podcastId ${podcastId}: ${errorSummary}`);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to synthesize any audio segments for podcast ${podcastId}. Errors: ${errorSummary}`,
        });
    }
    
    return {
      success: anySuccess, // Report success if at least one segment succeeded
      podcastId: podcastId,
      generatedSegments: results,
      message: `Segment synthesis process completed for podcast ${podcastId}. Check segment results for individual errors.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/synthesize-segments.post.ts:`, error.message || error, error.stack);
    // Ensure we throw an H3 error or return a properly formatted error response
    if (error.statusCode && error.statusMessage) { // It's already an H3 error
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to synthesize segments: ${error.message || 'Unknown internal server error.'}`,
      data: { stack: error.stack, originalError: String(error) },
    });
  }
});
