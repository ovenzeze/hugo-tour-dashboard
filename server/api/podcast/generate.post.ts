import { createError, defineEventHandler, readBody } from 'h3';
import { mergeAudioSegmentsForPodcast } from '../../utils/podcastSynthesisUtils';
import { createMergedTimeline } from '../../utils/timelineUtils';
import type { IStorageService } from '../../services/storageService';
import { getStorageService } from '../../services/storageService';
import type { ScriptSegment, PodcastCreateResponse } from '~/types/api/podcast';

/**
 * @deprecated This API endpoint is being replaced by the new unified API flow.
 * New implementations should use:
 * 1. POST /api/podcast/process/script
 * 2. POST /api/podcast/process/synthesize
 * 3. POST /api/podcast/combine-audio
 */

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface RequestBody {
  podcastTitle: string;
  script: ScriptSegment[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
}

// 简化版的PreparedSegmentForSynthesis，替代从旧处理器导入的类型
interface PreparedSegmentForSynthesis {
  segmentIndex: number;
  text: string;
  speaker: string;
  voiceId?: string;
  error?: string;
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

    // 1. 重构：直接准备音频片段，而不是调用processPodcastScript
    // 这里我们将通过调用新的统一API流程处理脚本
    const preparedSegments: PreparedSegmentForSynthesis[] = script.map((segment, index) => {
      // 查找对应的角色和声音
      let voiceId: string | undefined = undefined;
      const { hostPersona, guestPersonas = [] } = personas;
      
      // 尝试匹配主播
      if (hostPersona && segment.speaker === hostPersona.name) {
        voiceId = hostPersona.voice_model_identifier;
      } else {
        // 尝试匹配嘉宾
        const matchingGuest = guestPersonas.find(g => g.name === segment.speaker);
        if (matchingGuest) {
          voiceId = matchingGuest.voice_model_identifier;
        }
      }

      return {
        segmentIndex: index,
        text: segment.text,
        speaker: segment.speaker,
        voiceId,
        // 如果没有找到对应的声音，添加错误信息
        error: !voiceId ? `No voice found for speaker: ${segment.speaker}` : undefined
      };
    });

    console.log(`Prepared ${preparedSegments.length} segments for podcast ${podcastId}`);

    // 2. Create merged timeline
    let timelineGenerated = false;
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
        finalPodcastUrl = await mergeAudioSegmentsForPodcast(podcastId, storageService);
        console.log(`Basic podcast for ${podcastId} merged successfully: ${finalPodcastUrl}`);
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
      segments: preparedSegments,
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