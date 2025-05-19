// server/api/podcast/process/synthesize.post.ts
// This endpoint is responsible for generating individual timed audio segments.
import { defineEventHandler, readBody, createError } from 'h3';
import { useRuntimeConfig } from '#imports';
import { getStorageService } from '../../../services/storageService';
import type { IStorageService } from '../../../services/storageService';
import { 
  generateAndStoreTimedAudioSegmentElevenLabs, 
  generateAndStoreTimedAudioSegmentVolcengine,
  type TimedAudioSegmentResult,
  type ElevenLabsParams,
  type VolcengineParams,
} from '../../../services/timedAudioService';
// Import server-side database utilities
import { createServerPodcastDatabase } from '~/server/composables/useServerPodcastDatabase';
import { serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';

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
  voiceSettings?: { // Primarily for ElevenLabs
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  synthesisParams?: { // Generic params, can be mapped
    temperature?: number; // For ElevenLabs style
    speed?: number;       // For ElevenLabs speed, Volcengine speed_ratio
    pitch?: number;       // For Volcengine pitch_ratio
    volume?: number;      // For Volcengine volume_ratio
    // Volcengine specific params can be added if needed, or mapped from generic ones
    volcengineEncoding?: 'mp3' | 'pcm' | 'wav';
    [key: string]: any;
  };
  ttsProvider?: 'elevenlabs' | 'volcengine'; // New field to select TTS provider
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
    const defaultModelId = body.defaultModelId; // Primarily for ElevenLabs
    const voiceSettings = body.voiceSettings; // Primarily for ElevenLabs
    const ttsProvider = body.ttsProvider || 'elevenlabs'; // Default to elevenlabs
    
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

    const runtimeConfig = useRuntimeConfig(event); // Ensure this is called once at the top if possible
    
    // API Key validation will happen within the respective service functions
    // but we can pre-check if needed, or rely on the service to throw.
    // For now, let the service functions handle their specific API key checks.

    const results: (TimedAudioSegmentResult & { segmentIndex: number })[] = [];

    // For Supabase Storage, both publicOutputDirectory and storageOutputDirectory
    // will refer to the path within the bucket.
    const supabasePathSuffix = storageService.joinPath('podcasts', podcastId, 'segments');
    const publicOutputDirectory = supabasePathSuffix;
    const storageOutputDirectory = supabasePathSuffix;
    console.log('[synthesize.post.ts] Calculated Supabase storageOutputDirectory:', storageOutputDirectory);
    console.log('[synthesize.post.ts] Calculated Supabase publicOutputDirectory:', publicOutputDirectory);
    
    await storageService.ensureDir(storageOutputDirectory); // For Supabase, this might be a no-op

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
        speed: synthesisParams.speed || 1.0, 
        temperature: synthesisParams.temperature || 0.7,
      };

      let result: TimedAudioSegmentResult;

      if (ttsProvider === 'volcengine') {
        if (!runtimeConfig.volcengine?.appId || !runtimeConfig.volcengine?.accessToken || !runtimeConfig.volcengine?.cluster) {
          console.error('[synthesize.post.ts] Volcengine TTS configuration missing for segment:', segment.segmentIndex);
          results.push({ error: 'Volcengine configuration missing.', segmentIndex: segment.segmentIndex, provider: 'volcengine' });
          continue;
        }
        const volcengineTTSParams: VolcengineParams = {
          text: segment.text,
          voiceType: segment.voiceId, // Assuming voiceId for Volcengine is its voiceType string
          storageService,
          publicOutputDirectory,
          storageOutputDirectory,
          baseFilename,
          encoding: synthesisParams.volcengineEncoding || 'mp3',
          speedRatio: mergedVoiceSettings.speed, // Map from generic speed
          pitchRatio: synthesisParams.pitch,    // Map from generic pitch
          volumeRatio: synthesisParams.volume,  // Map from generic volume
        };
        result = await generateAndStoreTimedAudioSegmentVolcengine(volcengineTTSParams);
      } else { // Default to ElevenLabs
        const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey;
        if (!elevenLabsApiKey) {
          console.error('[synthesize.post.ts] ElevenLabs API key is missing for segment:', segment.segmentIndex);
          results.push({ error: 'ElevenLabs API key is not configured.', segmentIndex: segment.segmentIndex, provider: 'elevenlabs' });
          continue;
        }
        const elevenLabsTTSParams: ElevenLabsParams = {
          text: segment.text,
          voiceId: segment.voiceId,
          storageService,
          elevenLabsApiKey,
          publicOutputDirectory,
          storageOutputDirectory,
          baseFilename,
          defaultModelId: defaultModelId,
          voiceSettings: { // Pass specific ElevenLabs voice settings
            stability: mergedVoiceSettings.stability,
            similarity_boost: mergedVoiceSettings.similarity_boost,
            style: voiceSettings?.style, // original voiceSettings might have this
            use_speaker_boost: voiceSettings?.use_speaker_boost,
          },
          // Note: ElevenLabs SDK might handle speed/temperature differently or not at all via these params.
          // The `elevenlabs.textToSpeech.convertWithTimestamps` might not directly accept speed/temp.
          // These are usually part of voice_settings if supported.
        };
        result = await generateAndStoreTimedAudioSegmentElevenLabs(elevenLabsTTSParams);
      }
      
      results.push({ ...result, segmentIndex: segment.segmentIndex });

      // ---- BEGIN DATABASE INSERT FOR AUDIO URL ----
      // Only save to DB if audio generation was successful
      if (result.audioFileUrl && !result.error) {
        try {
          // Get the database segment ID using the segment index
          // We need the podcast ID to fetch segments from the DB
          // Use server-side Supabase client and database utilities
          const supabase = await serverSupabaseServiceRole<Database>(event);
          if (!supabase) {
            console.error(`[synthesize.post.ts] Failed to get Supabase service role client for segment ${segment.segmentIndex} of podcast ${podcastId}. Skipping DB save.`);
            continue; // Skip to next segment if Supabase client fails
          }
          const podcastDb = createServerPodcastDatabase(supabase);
          const dbSegments = await podcastDb.getSegmentsByPodcastId(podcastId);
          const dbSegment = dbSegments.find(s => s.idx === segment.segmentIndex);

          if (dbSegment) {
            // Save the audio URL and metadata to segment_audios table
            // Construct a more detailed params object for database logging
            const dbAudioParams: Record<string, any> = {
              ttsProvider: ttsProvider,
              voiceIdUsed: segment.voiceId, // The actual voiceId/voiceType used for this segment
              timestampFileUrl: result.timestampFileUrl,
              durationMs: result.durationMs,
              // Provider-specific settings that were applied
              ...(ttsProvider === 'elevenlabs' && {
                modelId: defaultModelId, // Global defaultModelId if used
                stability: mergedVoiceSettings.stability,
                similarity_boost: mergedVoiceSettings.similarity_boost,
                style: voiceSettings?.style,
                use_speaker_boost: voiceSettings?.use_speaker_boost,
                // Explicitly log generic params if they influenced ElevenLabs settings
                appliedSpeed: mergedVoiceSettings.speed, // Speed might not be directly settable in EL SDK this way
                appliedTemperature: mergedVoiceSettings.temperature, // Temperature might be part of 'style' or not directly settable
              }),
              ...(ttsProvider === 'volcengine' && {
                encoding: synthesisParams.volcengineEncoding || 'mp3',
                speedRatio: mergedVoiceSettings.speed, // Mapped from generic speed
                pitchRatio: synthesisParams.pitch,
                volumeRatio: synthesisParams.volume,
              }),
              // Optionally, store the raw input params for full traceability if needed
              // rawRequestBodySynthesisParams: synthesisParams,
              // rawRequestBodyVoiceSettings: voiceSettings,
            };

            await podcastDb.addSegmentAudio(
              dbSegment.segment_text_id, 
              result.audioFileUrl,
              'v1', // Using 'v1' as the version tag. This can be made dynamic if needed.
              dbAudioParams 
            );
            console.log(`Successfully saved audio URL for segment ${segment.segmentIndex} (DB ID: ${dbSegment.segment_text_id}) to database with detailed params.`);
          } else {
            console.warn(`Could not find database segment for index ${segment.segmentIndex} in podcast ${podcastId}. Audio URL not saved to DB.`);
          }
        } catch (dbError: any) {
          console.error(
            `Database insert error for segment audio (podcastId: ${podcastId}, segmentIndex: ${segment.segmentIndex}): ${dbError.message}`,
            dbError
          );
          // Log error but do not fail the API response for this segment
        }
      } else if (result.error) {
        console.warn(`Audio generation failed for segment ${segment.segmentIndex}. Skipping database save.`);
      }
      // ---- END DATABASE INSERT FOR AUDIO URL ----
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
