// server/api/podcast/process/synthesize.post.ts
import { defineEventHandler, readBody, createError, type H3Event } from 'h3';
import { useRuntimeConfig } from '#imports';
import { consola } from 'consola';
import { getStorageService } from '../../../services/storageService'; // Restored correct path
import type { IStorageService } from '../../../services/storageService'; // Restored correct path
import {
  generateAndStoreTimedAudioSegmentElevenLabs,
  generateAndStoreTimedAudioSegmentVolcengine,
  type TimedAudioSegmentResult,
  type ElevenLabsParams,
  type VolcengineParams,
} from '../../../services/timedAudioService'; // Restored correct path
import { createServerPodcastDatabase } from '~/server/composables/useServerPodcastDatabase';
import { serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';
import type { SynthesisParams } from '~/types/api/podcast'; // Import shared SynthesisParams
import { getPersonaById, type AutoSelectedPersona } from '~/server/utils/personaFetcher';

// Define the expected structure for each segment in the request
interface SynthesizeSegmentRequestData {
  text: string;
  speakerPersonaId: number;
  speakerName?: string; // Optional: for logging or if needed by TTS service directly
  segmentIndex: number; // Keep segmentIndex for mapping results
}

// Define the overall request body structure for this endpoint
interface SynthesizeRequestBody {
  podcastId: string;
  segments: SynthesizeSegmentRequestData[];
  defaultModelId?: string; // Optional: Primarily for ElevenLabs if a global model is preferred over persona's
  globalTtsProvider?: 'elevenlabs' | 'volcengine'; // Optional: A global TTS provider hint
  globalSynthesisParams?: SynthesisParams; // Optional: Global synthesis parameters
}

// Define the structure for a processed segment before TTS call
interface ProcessedSegment extends SynthesizeSegmentRequestData {
  persona: AutoSelectedPersona; // Contains voice_model_identifier and tts_provider
}

function sanitizeProviderForResults(provider: string | null | undefined): 'elevenlabs' | 'volcengine' | undefined {
  if (provider === 'elevenlabs' || provider === 'volcengine') {
    return provider;
  }
  if (provider) {
    consola.warn(`[synthesize.post.ts] Unknown TTS provider string '${provider}' encountered. Storing as undefined in results.`);
  }
  return undefined;
}

export default defineEventHandler(async (event: H3Event) => {
  try {
    const body = await readBody<SynthesizeRequestBody>(event);
    consola.info('[synthesize.post.ts] Received request:', { podcastId: body.podcastId, segmentCount: body.segments?.length });

    // 1. Validate Request Body
    if (!body.podcastId || !body.segments || !Array.isArray(body.segments) || body.segments.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request: "podcastId" and a non-empty "segments" array are required.',
      });
    }

    for (const segment of body.segments) {
      if (typeof segment.text !== 'string' || typeof segment.speakerPersonaId !== 'number' || typeof segment.segmentIndex !== 'number') {
        throw createError({
          statusCode: 400,
          statusMessage: `Invalid segment at index ${segment.segmentIndex}. Each segment must have "text" (string), "speakerPersonaId" (number), and "segmentIndex" (number).`,
        });
      }
    }
    
    const { podcastId, segments: inputSegments, defaultModelId, globalTtsProvider, globalSynthesisParams = {} } = body;
    const storageService: IStorageService = await getStorageService(event);
    const runtimeConfig = useRuntimeConfig(event);
    const results: (TimedAudioSegmentResult & { segmentIndex: number; provider?: string; voiceModelUsed?: string | null })[] = [];

    const supabasePathSuffix = storageService.joinPath('podcasts', podcastId, 'segments');
    const publicOutputDirectory = supabasePathSuffix;
    const storageOutputDirectory = supabasePathSuffix;
    await storageService.ensureDir(storageOutputDirectory);
    consola.info(`[synthesize.post.ts] Storage output directory: ${storageOutputDirectory}`);

    // 2. Fetch Persona details for each segment
    const processedSegments: ProcessedSegment[] = [];
    for (const seg of inputSegments) {
      const persona = await getPersonaById(event, seg.speakerPersonaId);
      if (!persona) {
        consola.warn(`[synthesize.post.ts] Persona not found for ID: ${seg.speakerPersonaId} (segmentIndex: ${seg.segmentIndex}). Skipping segment.`);
        results.push({ error: `Persona with ID ${seg.speakerPersonaId} not found.`, segmentIndex: seg.segmentIndex });
        continue;
      }
      if (!persona.voice_model_identifier) {
        consola.warn(`[synthesize.post.ts] Persona ID ${seg.speakerPersonaId} (name: ${persona.name}) is missing 'voice_model_identifier'. Skipping segment ${seg.segmentIndex}.`);
        results.push({ error: `Persona ${persona.name} (ID: ${seg.speakerPersonaId}) is missing voice model identifier.`, segmentIndex: seg.segmentIndex });
        continue;
      }
      if (!persona.tts_provider) {
        consola.warn(`[synthesize.post.ts] Persona ID ${seg.speakerPersonaId} (name: ${persona.name}) is missing 'tts_provider'. Skipping segment ${seg.segmentIndex}.`);
        results.push({ error: `Persona ${persona.name} (ID: ${seg.speakerPersonaId}) is missing TTS provider configuration.`, segmentIndex: seg.segmentIndex });
        continue;
      }
      processedSegments.push({ ...seg, persona });
    }

    if (processedSegments.length === 0) {
      consola.warn('[synthesize.post.ts] No segments could be processed after fetching persona details.');
      // Return early if all segments failed persona lookup, but include individual errors in results.
      return {
        success: false,
        podcastId: podcastId,
        generatedSegments: results, // Contains errors for segments that failed persona lookup
        message: 'No segments could be processed due to persona lookup issues.',
      };
    }
    consola.info(`[synthesize.post.ts] Successfully processed ${processedSegments.length} segments with persona data.`);

    // 3. Synthesize audio for each processed segment
    for (const segment of processedSegments) {
      const safeSpeakerName = (segment.speakerName || segment.persona.name).replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segment.segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;
      
      // Determine TTS provider: Persona's provider > globalTtsProvider from request
      const actualTtsProvider = segment.persona.tts_provider || globalTtsProvider;
      let cleanedTtsProvider = actualTtsProvider;
      if (cleanedTtsProvider && cleanedTtsProvider.startsWith("'") && cleanedTtsProvider.endsWith("'")) {
        cleanedTtsProvider = cleanedTtsProvider.substring(1, cleanedTtsProvider.length - 1);
      }
      const actualVoiceId = segment.persona.voice_model_identifier; // This is guaranteed by the check above

      if (!cleanedTtsProvider || !actualVoiceId) { // Used cleanedTtsProvider
        consola.error(`[synthesize.post.ts] Critical error: Missing TTS provider or voice ID for segment ${segment.segmentIndex} after persona processing. This should not happen.`);
        results.push({ error: 'Internal error: Missing TTS provider or voice ID.', segmentIndex: segment.segmentIndex });
        continue;
      }
      
      // Merge global and persona-specific synthesis params (TODO: define clear merge strategy if needed)
      // For now, globalSynthesisParams are applied, specific services might override with persona defaults if not provided
      const currentSynthesisParams: SynthesisParams = {
        ...globalSynthesisParams, // Apply global params first
        // Potentially override with persona-specific params if they were stored on the persona object
        // For now, we assume globalSynthesisParams are the primary source for overrides.
      };
      
      consola.info(`[TTS] Segment ${segment.segmentIndex} ('${segment.text.substring(0,20)}...'): Provider='${cleanedTtsProvider}', VoiceID='${actualVoiceId}'`); // Used cleanedTtsProvider

      try {
        let segmentResult: TimedAudioSegmentResult | null = null;

        if (cleanedTtsProvider.toLowerCase() === 'volcengine') { // Used cleanedTtsProvider
          if (!runtimeConfig.volcengine?.appId || !runtimeConfig.volcengine?.accessToken || !runtimeConfig.volcengine?.cluster || !runtimeConfig.volcengine?.instanceId) {
            consola.error('[synthesize.post.ts] Volcengine TTS configuration missing for segment:', segment.segmentIndex);
            results.push({ error: 'Volcengine configuration missing.', segmentIndex: segment.segmentIndex, provider: 'volcengine', voiceModelUsed: actualVoiceId });
            continue;
          }
          const volcConfig: VolcengineParams = {
            text: segment.text,
            voiceType: actualVoiceId,
            storageService,
            appId: runtimeConfig.volcengine.appId,
            accessToken: runtimeConfig.volcengine.accessToken,
            cluster: runtimeConfig.volcengine.cluster,
            instanceId: runtimeConfig.volcengine.instanceId,
            publicOutputDirectory,
            storageOutputDirectory,
            baseFilename,
            encoding: currentSynthesisParams.volcengineEncoding || 'mp3',
            speedRatio: currentSynthesisParams.speed,
            volumeRatio: currentSynthesisParams.volume,
            pitchRatio: currentSynthesisParams.pitch,
            enableTimestamps: true,
          };
          segmentResult = await generateAndStoreTimedAudioSegmentVolcengine(volcConfig);
        } else if (cleanedTtsProvider.toLowerCase() === 'elevenlabs') { // Used cleanedTtsProvider
          const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey;
          if (!elevenLabsApiKey) {
             consola.error('[synthesize.post.ts] ElevenLabs API key missing for segment:', segment.segmentIndex);
             results.push({ error: 'ElevenLabs API key missing.', segmentIndex: segment.segmentIndex, provider: 'elevenlabs', voiceModelUsed: actualVoiceId });
             continue;
          }
          const elevenLabsTTSParams: ElevenLabsParams = {
            text: segment.text,
            voiceId: actualVoiceId,
            storageService,
            elevenLabsApiKey,
            publicOutputDirectory,
            storageOutputDirectory,
            baseFilename,
            defaultModelId: defaultModelId, // Use global defaultModelId if provided
            voiceSettings: { // Apply relevant params from merged SynthesisParams
              stability: currentSynthesisParams.stability,
              similarity_boost: currentSynthesisParams.similarity_boost,
              style: currentSynthesisParams.style,
              use_speaker_boost: currentSynthesisParams.use_speaker_boost,
            },
             // speed is not directly part of ElevenLabsParams for textToSpeech.convertWithTimestamps
             // It might be part of a voice's settings or a different API endpoint.
             // For now, we pass it if present in currentSynthesisParams, but the service function needs to handle it.
          };
          segmentResult = await generateAndStoreTimedAudioSegmentElevenLabs(elevenLabsTTSParams);
        } else {
          consola.warn(`[synthesize.post.ts] Unsupported TTS provider '${cleanedTtsProvider}' for segment ${segment.segmentIndex}.`); // Used cleanedTtsProvider
          results.push({ error: `Unsupported TTS provider: ${cleanedTtsProvider}`, segmentIndex: segment.segmentIndex, provider: sanitizeProviderForResults(cleanedTtsProvider), voiceModelUsed: actualVoiceId }); // Used cleanedTtsProvider
          continue;
        }
        
        results.push({ ...segmentResult, segmentIndex: segment.segmentIndex, provider: sanitizeProviderForResults(cleanedTtsProvider), voiceModelUsed: actualVoiceId }); // Used cleanedTtsProvider

        // ---- DATABASE INSERT FOR AUDIO URL ----
        if (segmentResult && segmentResult.audioFileUrl && !segmentResult.error) {
          try {
            const supabase = await serverSupabaseServiceRole<Database>(event);
            if (!supabase) {
              consola.error(`[DB] Failed to get Supabase client for segment ${segment.segmentIndex}. Skipping DB save.`);
              continue;
            }
            const podcastDb = createServerPodcastDatabase(supabase);
            const dbSegments = await podcastDb.getSegmentsByPodcastId(podcastId); // Assumes podcast record exists
            const dbSegment = dbSegments.find(s => s.idx === segment.segmentIndex);

            if (dbSegment && dbSegment.segment_text_id) {
              const dbAudioParams: Record<string, any> = {
                ttsProvider: actualTtsProvider,
                voiceIdUsed: actualVoiceId,
                timestampFileUrl: segmentResult.timestampFileUrl,
                durationMs: segmentResult.durationMs,
                // Log applied synthesis parameters
                appliedSynthesisParams: {
                    ...(actualTtsProvider.toLowerCase() === 'elevenlabs' && {
                        modelId: defaultModelId, // Global defaultModelId if used
                        stability: currentSynthesisParams.stability,
                        similarity_boost: currentSynthesisParams.similarity_boost,
                        style: currentSynthesisParams.style,
                        use_speaker_boost: currentSynthesisParams.use_speaker_boost,
                    }),
                    ...(actualTtsProvider.toLowerCase() === 'volcengine' && {
                        encoding: currentSynthesisParams.volcengineEncoding || 'mp3',
                        speedRatio: currentSynthesisParams.speed,
                        pitchRatio: currentSynthesisParams.pitch,
                        volumeRatio: currentSynthesisParams.volume,
                    }),
                }
              };
              await podcastDb.addSegmentAudio(dbSegment.segment_text_id, segmentResult.audioFileUrl, 'v1', dbAudioParams);
              consola.info(`[DB] Saved audio URL for segment ${segment.segmentIndex} (DB ID: ${dbSegment.segment_text_id})`);
            } else {
              consola.warn(`[DB] Could not find DB segment for index ${segment.segmentIndex} in podcast ${podcastId}. Audio URL not saved.`);
            }
          } catch (dbError: any) {
            consola.error(`[DB] Error saving audio for segment ${segment.segmentIndex}: ${dbError.message}`, dbError);
          }
        } else if (segmentResult && segmentResult.error) {
          consola.warn(`[TTS] Audio generation failed for segment ${segment.segmentIndex}. Skipping DB save. Error: ${segmentResult.error}`);
        }
        // ---- END DATABASE INSERT ----
      } catch (error: any) {
        consola.error(`[TTS] Error generating segment ${segment.segmentIndex}: ${error.message}`, error);
        results.push({ error: error.message || 'Unknown TTS error.', segmentIndex: segment.segmentIndex, provider: sanitizeProviderForResults(actualTtsProvider), voiceModelUsed: actualVoiceId });
      }
    }

    const allFailed = results.every(r => r.error && r.audioFileUrl === undefined); // More precise check for failure
    const successfulSegmentsCount = results.filter(r => r.audioFileUrl && !r.error).length;

    consola.info(`[synthesize.post.ts] Synthesis complete. Successful: ${successfulSegmentsCount}, Failed: ${results.length - successfulSegmentsCount}`);
    
    return {
      success: successfulSegmentsCount > 0, // Overall success if at least one segment succeeded
      podcastId: podcastId,
      generatedSegments: results,
      message: `Segment synthesis process completed for podcast ${podcastId}. Successful: ${successfulSegmentsCount}/${inputSegments.length}.`,
    };

  } catch (error: any) {
    consola.error(`[synthesize.post.ts] Critical error in handler: ${error.message}`, error);
    if (error.statusCode && error.statusMessage) {
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to synthesize segments: ${error.message || 'Unknown internal server error.'}`,
      data: { stack: error.stack, originalError: String(error) },
    });
  }
});
