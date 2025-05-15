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
 * Supports three input formats:
 * 1. Traditional format: { podcastId, segments, ... }
 * 2. Validate structured format: { podcastTitle, script, voiceMap, hostPersonaId, language, ... }
 * 3. Update: Support specifying segments to synthesize via segmentIndices
 */
interface RequestBody {
  // Traditional format
  podcastId: string;
  segments?: InputSegment[];
  segmentIndices?: number[] | 'all'; // New: used to specify which segments to synthesize
  defaultModelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  synthesisParams?: {
    temperature?: number;
    speed?: number;
    [key: string]: any;
  };
  // Validate structured format
  podcastTitle?: string;
  script?: Array<{ role: string; name?: string; text: string }>;
  voiceMap?: Record<string, { personaId: number; voice_model_identifier: string }>;
  hostPersonaId?: number;
  language?: string;
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestBody;
    
    // Required parameter validation
    if (!body.podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: "podcastId" is required.',
      });
    }
    
    const podcastId = body.podcastId;
    let segments = body.segments;
    const segmentIndices = body.segmentIndices;
    const defaultModelId = body.defaultModelId;
    const voiceSettings = body.voiceSettings;
    
    // Check for preset voice parameters
    const synthesisParams = body.synthesisParams || {};
    
    const storageService: IStorageService = await getStorageService(event);
    
    // If segmentIndices is provided, read corresponding segments from existing timeline
    if (segmentIndices && (!segments || segments.length === 0)) {
      // Check if timeline exists
      const timelineStoragePath = storageService.joinPath('public', 'podcasts', podcastId, 'merged_timeline.json');
      const timelineExists = await storageService.exists(timelineStoragePath);
      
      if (!timelineExists) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Timeline not found. Generate timeline first before synthesizing specific segments.',
        });
      }
      
      // Read timeline
      const timelineContent = await storageService.readFile(timelineStoragePath, 'utf-8') as string;
      const timelineData = JSON.parse(timelineContent);
      
      if (!Array.isArray(timelineData) || timelineData.length === 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Timeline exists but contains no segments.',
        });
      }
      
      // Build list of segments to synthesize
      if (segmentIndices === 'all') {
        // Synthesize all segments
        segments = timelineData.map((segment, index) => ({
          segmentIndex: index,
          text: segment.text || '',
          voiceId: segment.voiceId || '', // Timeline may need to include this info
          speakerName: segment.speaker
        }));
      } else if (Array.isArray(segmentIndices) && segmentIndices.length > 0) {
        // Synthesize specific segments by index
        segments = segmentIndices
          .filter(index => index >= 0 && index < timelineData.length)
          .map(index => ({
            segmentIndex: index,
            text: timelineData[index].text || '',
            voiceId: timelineData[index].voiceId || '',
            speakerName: timelineData[index].speaker
          }));
      }
    }

    // Assemble segments from structured validation data
    if ((!segments || segments.length === 0) && body.script && body.voiceMap) {
      // Auto-assemble segments
      segments = body.script.map((seg, idx) => {
        // Prefer name for voiceMap lookup, fallback to role
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

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No valid segments to synthesize.',
      });
    }

    const runtimeConfig = useRuntimeConfig(event);
    const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

    if (!elevenLabsApiKey) {
      console.error('[synthesize.post.ts] ElevenLabs API key is missing.');
      throw createError({ statusCode: 500, statusMessage: 'ElevenLabs API key is not configured.' });
    }

    const results: (TimedAudioSegmentResult & { segmentIndex: number })[] = [];

    const publicOutputDirectory = storageService.joinPath('podcasts', podcastId, 'segments');
    const storageOutputDirectory = storageService.joinPath(runtimeConfig.public?.publicDirName || 'public', 'podcasts', podcastId, 'segments');
    
    await storageService.ensureDir(storageOutputDirectory);

    // Filter out segments without voice IDs
    const validSegments = segments.filter(segment => segment.voiceId);
    
    if (validSegments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'No segments with valid voice IDs found.',
      });
    }

    for (const segment of validSegments) {
      const safeSpeakerName = segment.speakerName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segment.segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;
      
      // Apply synthesis parameters
      const mergedVoiceSettings = {
        ...voiceSettings,
        stability: synthesisParams.stability || voiceSettings?.stability,
        similarity_boost: synthesisParams.similarity_boost || voiceSettings?.similarity_boost,
        speed: synthesisParams.speed || 1.0, // Default speed 1.0
        temperature: synthesisParams.temperature || 0.7, // Default temperature 0.7
      };
      
      const result = await generateAndStoreTimedAudioSegment({
        text: segment.text,
        voiceId: segment.voiceId,
        storageService,
        elevenLabsApiKey,
        publicOutputDirectory: publicOutputDirectory,
        storageOutputDirectory: storageOutputDirectory,
        baseFilename,
        defaultModelId: defaultModelId, 
        voiceSettings: mergedVoiceSettings,
      });
      results.push({ ...result, segmentIndex: segment.segmentIndex });
    }

    const allFailed = results.every(r => r.error);
    if (allFailed && validSegments.length > 0) {
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