import { defineEventHandler, createError } from 'h3';
import { synthesizeBasicPodcast } from '../utils/podcastSynthesisUtils'; // Adjust path if necessary
// import { existsSync } from 'fs'; // No longer needed directly
// import { resolve } from 'path'; // No longer needed directly
import { LocalStorageService, IStorageService } from '../services/storageService'; // Import storage service

export default defineEventHandler(async (event) => {
  try {
    const podcastId = 'test_podcast_001'; // Define a consistent podcastId for testing
    const storageService: IStorageService = new LocalStorageService();
    
    // Path for storageService.exists should be relative to project root for LocalStorageService
    const timelineStoragePath = storageService.joinPath('public', 'podcasts', podcastId, 'merged_timeline.json');
  
    // Check if merged_timeline.json exists
    if (!await storageService.exists(timelineStoragePath)) {
      console.error(`Merged timeline file not found at: ${timelineStoragePath}`);
      throw createError({
        statusCode: 404,
        statusMessage: `Merged timeline file not found for podcastId ${podcastId}. Please ensure segments and timeline are generated first.`,
      });
    }
      
    console.log(`Calling synthesizeBasicPodcast for podcastId: ${podcastId}`);
  
    const finalPodcastPath = await synthesizeBasicPodcast(podcastId, storageService);
    console.log('Sequential podcast synthesized successfully.');

    return {
      success: true,
      message: `Sequential podcast synthesized successfully.`,
      podcastUrl: finalPodcastPath, // e.g., /audio/final_sequential_podcast.mp3
    };

  } catch (error: any) {
    console.error('Error in synthesize-sequential-podcast endpoint:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to synthesize sequential podcast',
      data: error,
    });
  }
});