import { defineEventHandler, createError, readBody } from 'h3';
import { processPodcastScript } from '../../utils/podcastScriptProcessor';
import { createMergedTimeline } from '../../utils/timelineUtils';
import { synthesizeBasicPodcast } from '../../utils/podcastSynthesisUtils';
import { existsSync } from 'fs'; // For checking timeline file before synthesis
import { resolve } from 'path'; // For resolving path for existsSync
import { LocalStorageService, IStorageService } from '../../services/storageService'; // Import storage service

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

    const storageService: IStorageService = new LocalStorageService();

    // 1. Process script to generate individual segments
    const processedSegments = await processPodcastScript(podcastId, script, personas, storageService);
    console.log(`processPodcastScript for ${podcastId} completed.`);

    // 2. Create merged timeline
    let timelineGenerated = false;
    if (processedSegments.some(segment => !segment.error && segment.audio && segment.timestamps)) {
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
        finalPodcastUrl = await synthesizeBasicPodcast(podcastId, storageService);
        console.log(`Basic podcast for ${podcastId} synthesized successfully: ${finalPodcastUrl}`);
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
      segments: processedSegments,
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