// server/api/podcast/process/merge.post.ts
import { defineEventHandler, readBody, createError } from 'h3';
// Assuming mergeAudioSegmentsForPodcast will be in podcastSynthesisUtils
import { mergeAudioSegmentsForPodcast } from '../../../utils/podcastSynthesisUtils'; 
import { getStorageService } from '../../../services/storageService';
import type { IStorageService } from '../../../services/storageService';

interface RequestBody {
  podcastId: string;
  // Potentially, this could also take an array of segment file URLs if not read from a manifest by the utility
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;
    const { podcastId } = body;

    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "podcastId" is required.',
      });
    }
    
    const storageService: IStorageService = await getStorageService(event);

    console.log(`API: Merging audio segments for podcastId: ${podcastId}`);
    // The utility function mergeAudioSegmentsForPodcast will handle:
    // 1. Reading timeline data (e.g., from public/podcasts/{podcastId}/merged_timeline.json)
    // 2. Finding individual audio segment files (e.g., in public/podcasts/{podcastId}/segments/)
    // 3. Concatenating them using an audio tool (e.g., ffmpeg)
    // 4. Saving the final merged file and returning its public URL.
    const finalPodcastUrl = await mergeAudioSegmentsForPodcast(podcastId, storageService); 
    
    return {
      success: true,
      podcastId: podcastId,
      finalPodcastUrl: finalPodcastUrl,
      message: `Final podcast audio merged successfully for ${podcastId}.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/merge.post.ts:`, error.message || error, error.stack);
    if (error.statusCode && error.statusMessage) { // It's already an H3 error
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to merge podcast audio: ${error.message || 'Unknown internal server error.'}`,
      data: { stack: error.stack, originalError: String(error) },
    });
  }
});