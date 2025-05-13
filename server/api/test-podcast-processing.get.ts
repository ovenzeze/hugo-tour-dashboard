import { defineEventHandler, createError } from 'h3';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { processPodcastScript } from '../utils/podcastScriptProcessor'; // Adjust path if necessary
import { createMergedTimeline } from '../utils/timelineUtils'; // Import the new utility
import { synthesizeBasicPodcast } from '../utils/podcastSynthesisUtils'; // Import synthesis utility
import { LocalStorageService, IStorageService } from '../services/storageService'; // Import storage service

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface RequestPayload {
  script: { speaker: string; text: string }[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
}

export default defineEventHandler(async (event) => {
  try {
    // Read the test data from the JSON file
    const testDataPath = resolve(process.cwd(), 'audio_example/timing/processed_script_request_body.json');
    const testDataContent = readFileSync(testDataPath, 'utf-8');
    const testData: RequestPayload = JSON.parse(testDataContent);

    const { script, personas } = testData;

    if (!script || !Array.isArray(script) || !personas) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to load valid test data.',
      });
    }

    const podcastId = 'test_podcast_001'; // Define a podcastId for testing
    console.log(`Calling processPodcastScript with test data for podcastId: ${podcastId}...`);

    const storageService: IStorageService = new LocalStorageService();

    // Call the processPodcastScript function
    const processedSegments = await processPodcastScript(podcastId, script, personas, storageService);

    console.log('processPodcastScript returned:', {
      segmentsCount: processedSegments.length,
      firstSegment: processedSegments.length > 0 ? processedSegments[0] : null,
    });

    // Automatically generate the merged timeline after processing segments
    if (processedSegments.some(segment => !segment.error)) { // Only generate timeline if segments were processed
      try {
        // segmentsDir should be relative to public root for createMergedTimeline
        const segmentsDirForTimeline = `podcasts/${podcastId}/segments`;
        await createMergedTimeline(segmentsDirForTimeline, storageService);
        console.log('Merged timeline generation triggered successfully.');
      } catch (timelineError: any) {
        // Log the error but don't fail the main request if timeline generation fails
        console.error('Error generating merged timeline:', timelineError.message || timelineError);
      }
    } else {
      console.warn('Skipping merged timeline generation due to errors in segment processing.');
    }

    let finalPodcastPath: string | undefined = undefined;
    // Automatically synthesize the basic podcast after timeline generation
    if (processedSegments.some(segment => !segment.error)) { // Only synthesize if segments and timeline were likely processed
      try {
        finalPodcastPath = await synthesizeBasicPodcast(podcastId, storageService);
        console.log(`Basic podcast synthesized successfully: ${finalPodcastPath}`);
      } catch (synthesisError: any) {
        // Log the error but don't fail the main request if synthesis fails
        console.error('Error synthesizing basic podcast:', synthesisError.message || synthesisError);
      }
    } else {
      console.warn('Skipping podcast synthesis due to errors in segment processing.');
    }

    return {
      success: true,
      segments: processedSegments,
      finalPodcastUrl: finalPodcastPath,
    };

  } catch (error: any) {
    console.error('Error in test-podcast-processing endpoint:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to process podcast script with test data',
      data: error,
    });
  }
});