// server/api/podcast/process/synthesize-segments.post.ts
import { defineEventHandler, readBody, createError } from 'h3';
import { useRuntimeConfig } from '#imports';
import { getStorageService } from '../../../services/storageService'; // Adjust path as needed
import type { IStorageService } from '../../../services/storageService'; // Adjust path as needed
import { generateAndStoreTimedAudioSegment, type TimedAudioSegmentResult } from '../../../services/timedAudioService'; // Adjust path

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
    const body = await readBody(event) as RequestBody;
    const { podcastId, segments, defaultModelId, voiceSettings } = body;

    if (!podcastId || !Array.isArray(segments) || segments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: "podcastId" and a non-empty "segments" array are required.',
      });
    }

    const runtimeConfig = useRuntimeConfig(event);
    const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      console.error('[synthesize-segments] ElevenLabs API key is missing.');
      throw createError({ statusCode: 500, statusMessage: 'ElevenLabs API key is not configured.' });
    }

    const storageService: IStorageService = await getStorageService(event);

    const results: (TimedAudioSegmentResult & { segmentIndex: number })[] = [];

    // Define base paths for storage
    // publicOutputDirectory is relative to the public root, used for generating public URLs
    const publicOutputDirectory = storageService.joinPath('podcasts', podcastId, 'segments');
    // storageOutputDirectory is the actual path where files are written by the storage service.
    // For LocalStorageService, this needs to be relative to the project root, typically including 'public'.
    // Example: If project root is /app, public dir is /app/public, then storageOutputDirectory for
    // a segment could be 'public/podcasts/podcastId/segments'.
    // We assume LocalStorageService's constructor sets its projectRoot and publicRoot correctly.
    // If LocalStorageService.joinPath for writing is relative to projectRoot, then 'public/...' is correct.
    // If LocalStorageService.ensureDir/writeFile expect paths relative to its internal `this.projectRoot`,
    // then `storageService.joinPath('public', publicOutputDirectory)` is one way if publicDir is 'public'.
    // Let's assume `LocalStorageService` handles `public/` prefixing internally if needed,
    // or that `storageService.joinPath` for write operations resolves correctly from project root.
    // A common pattern for LocalStorageService is to have a publicDir constructor arg (e.g., "public").
    // `storageService.ensureDir` and `writeFile` in `LocalStorageService` use `this.getAbsolutePath` which resolves from `this.projectRoot`.
    // So, `storageOutputDirectory` for `generateAndStoreTimedAudioSegment` should be relative to project root.
    const storageOutputDirectory = storageService.joinPath(runtimeConfig.public?.publicDirName || 'public', 'podcasts', podcastId, 'segments');
    
    // Ensure the main segments directory exists once
    await storageService.ensureDir(storageOutputDirectory); // This path must be resolvable by storageService.ensureDir

    for (const segment of segments) {
      const safeSpeakerName = segment.speakerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segment.segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;
      
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
      results.push({ ...result, segmentIndex: segment.segmentIndex });
    }

    const allFailed = results.every(r => r.error);
    if (allFailed && segments.length > 0) {
        const errorSummary = results.map(r => `Segment ${r.segmentIndex}: ${r.error}`).join('; ');
        console.error(`[synthesize-segments] All segments failed for podcastId ${podcastId}: ${errorSummary}`);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to synthesize any audio segments for podcast ${podcastId}. Errors: ${errorSummary}`,
        });
    }
    
    return {
      success: !allFailed,
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