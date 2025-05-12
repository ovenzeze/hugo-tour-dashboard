import { defineEventHandler, createError } from 'h3';
import { createMergedTimeline } from '../utils/timelineUtils'; // Adjust path if necessary

export default defineEventHandler(async (event) => {
  try {
    const segmentsDir = 'public/audio/timed_segments';
    console.log(`Calling createMergedTimeline for directory: ${segmentsDir}`);

    const mergedTimeline = createMergedTimeline(segmentsDir);

    if (!mergedTimeline || mergedTimeline.length === 0) {
      console.warn('No segments found or timeline generation failed.');
      // Optionally, you could return an error or an empty success response
    }
    
    console.log('Merged timeline generated successfully.');

    return {
      success: true,
      message: `Merged timeline generated and saved to ${segmentsDir}/merged_timeline.json`,
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