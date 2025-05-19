import { defineEventHandler, readBody, createError } from 'h3';
import { consola } from 'consola';
import { useRuntimeConfig } from '#imports'; // For accessing runtime configuration
import { getTtsProvider } from '../../../services/tts/factory'; // CORRECTED IMPORT
import type { TextToSpeechProvider, VoiceSynthesisRequest, VoiceSynthesisWithTimestampsResponse } from '../../../services/tts/types'; // CORRECTED IMPORT: Removed local types

// Define the expected request body structure based on useSegmentPreview.ts
// These interfaces are local to this API endpoint
interface SynthesizeRequestBody {
  podcastId: string;
  segments: Array<{
    segmentIndex: number;
    text: string;
    voiceId: string;
    speakerName: string;
  }>;
  defaultModelId?: string; // e.g., an ElevenLabs model or project ID
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  ttsProvider?: string; // e.g., 'elevenlabs', 'volcengine'
}

// Define the expected response structure
// These interfaces are local to this API endpoint
interface GeneratedSegmentResult {
  segmentIndex: number;
  audioFileUrl?: string;
  timestampFileUrl?: string;
  error?: string;
  message?: string;
}

interface SynthesizeResponseBody {
  success: boolean;
  generatedSegments: GeneratedSegmentResult[];
  message?: string;
  error?: string;
}

export default defineEventHandler(async (event): Promise<SynthesizeResponseBody> => {
  consola.info('[API /synthesize-segments] Received request');
  const runtimeConfig = useRuntimeConfig(); // Get runtime config

  try {
    const body = await readBody<SynthesizeRequestBody>(event);
    consola.info('[API /synthesize-segments] Request body:', body);

    if (!body.segments || body.segments.length === 0) {
      consola.warn('[API /synthesize-segments] No segments provided for synthesis.');
      throw createError({
        statusCode: 400,
        statusMessage: 'No segments provided for synthesis.',
      });
    }

    const ttsProviderId = body.ttsProvider || 'elevenlabs'; // Default to elevenlabs if not provided
    const generatedSegmentsOutput: GeneratedSegmentResult[] = []; // Renamed to avoid conflict

    consola.info(`[API /synthesize-segments] Processing with TTS Provider: ${ttsProviderId}`);

    let ttsProvider: TextToSpeechProvider;
    try {
      // @ts-ignore TODO: Refine provider type from factory if possible
      ttsProvider = getTtsProvider(ttsProviderId, runtimeConfig); // CORRECTED CALL
    } catch (factoryError: any) {
      consola.error(`[API /synthesize-segments] Failed to create TTS provider '${ttsProviderId}':`, factoryError.message);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to initialize TTS provider: ${factoryError.message}`,
      });
    }
    
    const providerForComparison = ttsProviderId.toLowerCase();

    for (const segment of body.segments) {
      consola.info(`[API /synthesize-segments] Attempting to synthesize segment ${segment.segmentIndex}: "${segment.text.substring(0,30)}..." with voice ${segment.voiceId}`);
      
      try {
        if (providerForComparison === 'volcengine') {
          // TODO: Implement Volcengine TTS call using ttsProvider
          consola.warn(`[API /synthesize-segments] Volcengine TTS for voice ${segment.voiceId} not yet implemented.`);
          generatedSegmentsOutput.push({
            segmentIndex: segment.segmentIndex,
            error: `Volcengine TTS for voice ${segment.voiceId} not implemented. Text: ${segment.text}`,
          });
        } else if (providerForComparison === 'elevenlabs') {
          const synthesisRequest: VoiceSynthesisRequest = {
            text: segment.text,
            voiceId: segment.voiceId,
            modelId: body.defaultModelId, // Pass defaultModelId from request body
            providerOptions: body.voiceSettings, // Pass voiceSettings as providerOptions
            // outputFormat: 'mp3', // Or determine based on needs, elevenlabs.ts defaults to mpeg or pcm
          };

          // @ts-ignore TODO: Ensure TextToSpeechProvider interface includes generateSpeechWithTimestamps or use type assertion
          const response: VoiceSynthesisWithTimestampsResponse = await ttsProvider.generateSpeechWithTimestamps(synthesisRequest);

          // TODO: 1. Upload response.audioData to object storage
          // TODO: 2. Get audioFileUrl from storage
          // TODO: 3. (Optional) Upload response.timestamps to object storage, get timestampFileUrl
          // TODO: 4. Update database with audioFileUrl, timestampFileUrl, etc.

          // For now, mock these steps and log the data
          const mockAudioFileUrl = 'https://mockstorage.example.com/audio.mp3';
          const mockTimestampFileUrl = 'https://mockstorage.example.com/timestamps.json';
          
          consola.info(`[API /synthesize-segments] Segment ${segment.segmentIndex} (ElevenLabs) raw audioData length: ${response.audioData?.byteLength}, Timestamps count: ${response.timestamps?.length}`);

          generatedSegmentsOutput.push({
            segmentIndex: segment.segmentIndex,
            message: `Successfully synthesized segment ${segment.segmentIndex} with ElevenLabs.`,
            audioFileUrl: mockAudioFileUrl, // Placeholder
            timestampFileUrl: mockTimestampFileUrl, // Placeholder
          });

        } else {
          consola.error(`[API /synthesize-segments] Unsupported TTS Provider: ${ttsProviderId}`);
          generatedSegmentsOutput.push({
            segmentIndex: segment.segmentIndex,
            error: `Unsupported TTS Provider: ${ttsProviderId}. Text: ${segment.text}`,
          });
        }
      } catch (synthesisError: any) {
        consola.error(`[API /synthesize-segments] Error synthesizing segment ${segment.segmentIndex} with ${ttsProviderId}:`, synthesisError.message);
        generatedSegmentsOutput.push({
          segmentIndex: segment.segmentIndex,
          error: `Failed to synthesize segment ${segment.segmentIndex}: ${synthesisError.message}`,
        });
      }
    }

    if (generatedSegmentsOutput.some(s => s.error)) {
      return {
        success: false,
        generatedSegments: generatedSegmentsOutput,
        message: 'One or more segments failed to synthesize.',
      };
    }

    return {
      success: true,
      generatedSegments: generatedSegmentsOutput,
      message: 'Segments processed successfully.', // Updated message
    };

  } catch (error: any) {
    consola.error('[API /synthesize-segments] Error processing request:', error);
    // Ensure generatedSegmentsOutput is defined in this scope for the return type, even if empty
    const finalGeneratedSegments = (error.generatedSegmentsOutput && Array.isArray(error.generatedSegmentsOutput)) 
                                   ? error.generatedSegmentsOutput 
                                   : [];
    return {
      success: false,
      generatedSegments: finalGeneratedSegments, // Use the variable from the try block if available
      error: error.message || 'An unknown error occurred',
      message: `Failed to process synthesis request: ${error.statusMessage || error.message}`,
    };
  }
});
