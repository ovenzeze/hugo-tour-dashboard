import { defineEventHandler, readBody, createError } from 'h3';
import { synthesizeBasicPodcast } from '../../../utils/podcastSynthesisUtils';
// import { LocalStorageService } from '../../../services/storageService'; // No longer directly instantiating
import { getStorageService } from '../../../services/storageService'; // Import the factory
import type { IStorageService } from '../../../services/storageService';

interface RequestBody {
  podcastId: string;
  // storageServiceType?: 'local' | 'supabase'; // Optional: to select storage service
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
    
    // Initialize storage service using the factory
    const storageService: IStorageService = await getStorageService(event);

    console.log(`API: Synthesizing final podcast for podcastId: ${podcastId} using ${storageService.constructor.name}`);
    const finalPodcastUrl = await synthesizeBasicPodcast(podcastId, storageService);
    
    return {
      success: true,
      podcastId: podcastId,
      finalPodcastUrl: finalPodcastUrl,
      message: `Final podcast synthesized for ${podcastId}.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/synthesize.post.ts:`, error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to synthesize podcast: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});