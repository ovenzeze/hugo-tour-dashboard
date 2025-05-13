import { defineEventHandler, createError } from 'h3';
import { createMergedTimeline } from '../utils/timelineUtils'; // Adjust path if necessary
import { LocalStorageService, IStorageService } from '../services/storageService'; // Import storage service

export default defineEventHandler(async (event) => {
  try {
    const podcastId = 'test_podcast_001'; // Use a consistent test podcastId
    // segmentsDir should be relative to public root for createMergedTimeline
    const segmentsDirForTimeline = `podcasts/${podcastId}/segments`;
    console.log(`Calling createMergedTimeline for directory: ${segmentsDirForTimeline}`);

    const storageService: IStorageService = new LocalStorageService();
    const mergedTimeline = await createMergedTimeline(segmentsDirForTimeline, storageService);

    if (!mergedTimeline || mergedTimeline.length === 0) {
      console.warn('No segments found or timeline generation failed.');
      // Optionally, you could return an error or an empty success response
    }
    
    console.log('Merged timeline generated successfully.');

    const timelineJsonPath = `/podcasts/${podcastId}/merged_timeline.json`;
    return {
      success: true,
      message: `Merged timeline generated and saved to public${timelineJsonPath}`,
      timeline: mergedTimeline, // Optionally return the timeline data in the response
    };

  } catch (error: any) {
    console.error('Error in generate-merged-timeline endpoint:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate merged timeline',
      data: error,
    });
  }
});