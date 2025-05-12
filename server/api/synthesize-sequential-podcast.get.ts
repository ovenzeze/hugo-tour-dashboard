import { defineEventHandler, createError } from 'h3';
import { synthesizeBasicPodcast } from '../utils/podcastSynthesisUtils'; // Adjust path if necessary
import { existsSync } from 'fs';
import { resolve } from 'path';

export default defineEventHandler(async (event) => {
  try {
    const podcastId = 'test_podcast_001'; // Define a consistent podcastId for testing
      const timelineJsonPath = `public/podcasts/${podcastId}/merged_timeline.json`;
  
      // Check if merged_timeline.json exists
      const fullTimelinePath = resolve(process.cwd(), timelineJsonPath);
      if (!existsSync(fullTimelinePath)) {
        console.error(`Merged timeline file not found at: ${fullTimelinePath}`);
        throw createError({
          statusCode: 404,
          statusMessage: `Merged timeline file not found for podcastId ${podcastId}. Please ensure segments and timeline are generated first.`,
        });
      }
      
      console.log(`Calling synthesizeBasicPodcast for podcastId: ${podcastId}`);
  
      const finalPodcastPath = await synthesizeBasicPodcast(podcastId);
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