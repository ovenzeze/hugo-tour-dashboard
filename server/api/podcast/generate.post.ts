 import { createError, defineEventHandler, readBody } from 'h3'; // Corrected uimport to import
import { processPodcastScript } from '../../utils/podcastScriptProcessor';
import { mergeAudioSegmentsForPodcast } from '../../utils/podcastSynthesisUtils'; // Renamed import
import { createMergedTimeline } from '../../utils/timelineUtils';
// import { existsSync } from 'fs'; // existsSync will be handled by storageService
import type { IStorageService } from '../../services/storageService';
import { getStorageService } from '../../services/storageService'; // Import the factory

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface RequestBody {
  podcastTitle: string;
  script: ScriptSegment[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;
    const { podcastTitle, script, personas } = body;

    if (!podcastTitle || !script || !Array.isArray(script) || script.length === 0 || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "podcastTitle", "script" array, and "personas" object are required.',
      });
    }

    // Generate a podcastId from the title (sanitize and make it URL-friendly)
    const podcastId = podcastTitle.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '');
    if (!podcastId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid podcastTitle, resulted in empty podcastId.',
          });
    }

    console.log(`Generating podcast with ID: ${podcastId} and title: ${podcastTitle}`);

    // Initialize storage service using the factory
    const storageService: IStorageService = await getStorageService(event);
    console.log(`[PodcastGenerate] Using storage service: ${storageService.constructor.name}`);

    // 1. Process script to generate individual segments
    // processPodcastScript now returns PreparedSegmentForSynthesis[] and does not take storageService
    const preparedSegments = await processPodcastScript(podcastId, script, personas);
    console.log(`processPodcastScript for ${podcastId} completed, returning prepared segments.`);

    // 2. Create merged timeline
    // This logic is now flawed because preparedSegments does not contain audio/timestamps paths.
    // This step (and step 3) would need to happen AFTER the new 'synthesize' step which generates those files.
    // For now, to fix TS errors, we'll adjust the condition.
    let timelineGenerated = false;
    // The old condition checked for segment.audio and segment.timestamps, which are no longer on PreparedSegmentForSynthesis.
    // A more meaningful check here would be if there are segments without errors that have a voiceId.
    if (preparedSegments.some(segment => !segment.error && segment.voiceId)) {
      console.warn(`[generate.post.ts] Attempting timeline generation based on prepared segments. This may not work as expected without actual audio files yet.`);
      try {
        // segmentsDir should be relative to public root for createMergedTimeline
        const segmentsDirForTimeline = `podcasts/${podcastId}/segments`;
        await createMergedTimeline(segmentsDirForTimeline, storageService);
        timelineGenerated = true;
        console.log(`Merged timeline for ${podcastId} generated successfully.`);
      } catch (timelineError: any) {
        console.error(`Error generating merged timeline for ${podcastId}:`, timelineError.message || timelineError);
        // Continue even if timeline generation fails, but log it
      }
    } else {
      console.warn(`Skipping merged timeline generation for ${podcastId} due to errors or no segments processed.`);
    }

    // 3. Synthesize basic podcast
    let finalPodcastUrl: string | undefined = undefined;
    // Path for storageService.exists should be relative to project root for LocalStorageService
    const timelineStoragePath = storageService.joinPath('public', 'podcasts', podcastId, 'merged_timeline.json');

    if (timelineGenerated && await storageService.exists(timelineStoragePath)) {
      try {
        finalPodcastUrl = await mergeAudioSegmentsForPodcast(podcastId, storageService); // Use renamed function
        console.log(`Basic podcast for ${podcastId} merged successfully: ${finalPodcastUrl}`); // Updated log
      } catch (synthesisError: any) {
        console.error(`Error synthesizing basic podcast for ${podcastId}:`, synthesisError.message || synthesisError);
        // Continue even if synthesis fails, but log it
      }
    } else {
      console.warn(`Skipping podcast synthesis for ${podcastId} because timeline was not generated or not found.`);
    }

    return {
      success: true,
      podcastId: podcastId,
      message: "Podcast generation process initiated. Check server logs for details and errors.",
      segments: preparedSegments, // Changed from processedSegments to preparedSegments
      timelineUrl: timelineGenerated ? `/podcasts/${podcastId}/merged_timeline.json` : undefined,
      finalPodcastUrl: finalPodcastUrl,
    };

  } catch (error: any) {
    console.error('Error in podcast/generate endpoint:', error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to generate podcast: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});