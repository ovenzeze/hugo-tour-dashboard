// server/api/podcast/process/synthesize.post.ts
// This endpoint is responsible for generating individual timed audio segments.
import { defineEventHandler, readBody, createError } from 'h3';
import { useRuntimeConfig } from '#imports';
import { getStorageService } from '../../../services/storageService';
import type { IStorageService } from '../../../services/storageService';
import { generateAndStoreTimedAudioSegment, type TimedAudioSegmentResult } from '../../../services/timedAudioService';

interface InputSegment {
  segmentIndex: number;
  text: string;
  voiceId: string;
  speakerName: string;
}

/**
 * 支持两种输入格式：
 * 1. 传统格式：{ podcastId, segments, ... }
 * 2. validate结构化格式：{ podcastTitle, script, voiceMap, hostPersonaId, language, ... }
 */
interface RequestBody {
  // 传统格式
  podcastId?: string;
  segments?: InputSegment[];
  defaultModelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  // validate结构化格式
  podcastTitle?: string;
  script?: Array<{ role: string; name?: string; text: string }>;
  voiceMap?: Record<string, { personaId: number; voice_model_identifier: string }>;
  hostPersonaId?: number;
  language?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;

    // 支持validate结构化数据自动组装segments
    let podcastId = body.podcastId;
    let segments = body.segments;
    const defaultModelId = body.defaultModelId;
    const voiceSettings = body.voiceSettings;

    if ((!podcastId || !segments || segments.length === 0) && body.script && body.voiceMap) {
      // 自动组装segments
      podcastId = body.podcastId || body.podcastTitle || 'untitled';
      segments = body.script.map((seg, idx) => {
        // 优先用name查voiceMap，否则用role
        const voiceMap = body.voiceMap ?? {};
        let voiceKey = seg.name && voiceMap[seg.name] ? seg.name : seg.role;
        let voice = voiceMap[voiceKey] || voiceMap[seg.role] || {};
        return {
          segmentIndex: idx,
          text: seg.text,
          voiceId: voice.voice_model_identifier || '',
          speakerName: seg.name || seg.role
        };
      });
    }

    if (!podcastId || !Array.isArray(segments) || segments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: "podcastId" and a non-empty "segments" array are required.',
      });
    }

    const runtimeConfig = useRuntimeConfig(event);
    const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      console.error('[synthesize.post.ts] ElevenLabs API key is missing.');
      throw createError({ statusCode: 500, statusMessage: 'ElevenLabs API key is not configured.' });
    }

    const storageService: IStorageService = await getStorageService(event);
    const results: (TimedAudioSegmentResult & { segmentIndex: number })[] = [];

    const publicOutputDirectory = storageService.joinPath('podcasts', podcastId, 'segments');
    const storageOutputDirectory = storageService.joinPath(runtimeConfig.public?.publicDirName || 'public', 'podcasts', podcastId, 'segments');
    
    await storageService.ensureDir(storageOutputDirectory);

    for (const segment of segments) {
      const safeSpeakerName = segment.speakerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segment.segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;
      
      const result = await generateAndStoreTimedAudioSegment({
        text: segment.text,
        voiceId: segment.voiceId,
        storageService,
        elevenLabsApiKey,
        publicOutputDirectory: publicOutputDirectory,
        storageOutputDirectory: storageOutputDirectory,
        baseFilename,
        defaultModelId: defaultModelId, 
        voiceSettings: voiceSettings, 
      });
      results.push({ ...result, segmentIndex: segment.segmentIndex });
    }

    const allFailed = results.every(r => r.error);
    if (allFailed && segments.length > 0) {
        const errorSummary = results.map(r => `Segment ${r.segmentIndex}: ${r.error}`).join('; ');
        console.error(`[synthesize.post.ts] All segments failed for podcastId ${podcastId}: ${errorSummary}`);
        throw createError({
            statusCode: 500,
            statusMessage: `Failed to synthesize any audio segments for podcast ${podcastId}. Errors: ${errorSummary}`,
        });
    }
    
    return {
      success: !allFailed,
      podcastId: podcastId,
      generatedSegments: results,
      message: `Segment synthesis process completed for podcast ${podcastId}. Check segment results for individual errors.`,
    };

  } catch (error: any) {
    console.error(`Error in /api/podcast/process/synthesize.post.ts:`, error.message || error, error.stack);
    if (error.statusCode && error.statusMessage) { // It's already an H3 error
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to synthesize segments: ${error.message || 'Unknown internal server error.'}`,
      data: { stack: error.stack, originalError: String(error) },
    });
  }
});