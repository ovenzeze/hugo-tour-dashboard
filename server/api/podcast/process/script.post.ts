import { createError, defineEventHandler, readBody } from "h3";
import {
  processPodcastScript,
  type PreparedSegmentForSynthesis,
} from "../../../utils/podcastScriptProcessor";

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface RequestBody {
  podcastTitle: string; // Used to generate podcastId
  script: ScriptSegment[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
    // Potentially add ttsProviderId here if it can vary per request
  };
  // storageServiceType?: 'local' | 'supabase'; // Optional: to select storage service if multiple are available
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RequestBody;
    const { podcastTitle, script, personas } = body;

    if (
      !podcastTitle ||
      !script ||
      !Array.isArray(script) ||
      script.length === 0 ||
      !personas
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid request body. "podcastTitle", "script" array, and "personas" object are required.',
      });
    }

    // Generate a podcastId from the title
    const podcastId = podcastTitle
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid podcastTitle, resulted in empty podcastId.",
      });
    }

    // StorageService is no longer initialized here.
    // const storageService: IStorageService = await getStorageService(event);

    console.log(`API: Preparing script segments for podcastId: ${podcastId}`);
    // Call the refactored processPodcastScript, which no longer takes storageService
    const preparedSegments: PreparedSegmentForSynthesis[] =
      await processPodcastScript(podcastId, script, personas);

    return {
      success: true,
      podcastId: podcastId,
      preparedSegments: preparedSegments, // Return the segments prepared for the next step
      message: `Script processed and segments prepared for podcast ${podcastId}. Next step: synthesize segments.`,
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
