import { defineEventHandler, readBody, createError } from 'h3'; // Corrected syntax error
// import { $fetch } from 'ofetch'; // No longer needed if using TTS provider directly
import { getTtsProvider } from '../../../services/tts/factory'; // Corrected import path
import type { VoiceSynthesisRequest, VoiceSynthesisWithTimestampsResponse } from '../../../services/tts/types'; // Corrected import path
import { useRuntimeConfig } from '#imports'; // For runtime config

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface RequestPayload {
  script?: { speaker: string; text: string }[];
  personas?: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
  // Add support for format sent by frontend
  config?: {
    ttsProvider: string;
    speakerAssignments: Record<string, string>;
    segments: { speakerTag: string; text: string; timestamps?: any[] }[];
  };
  synthesisParams?: any;
  // Add retry-related parameters
  retrySegments?: number[]; // Indexes of segments to retry
  maxRetries?: number; // Maximum number of retries
}

// Define interface for segment processing result
interface SegmentResult {
  speaker: string;
  text: string;
  audio?: string; // Base64 encoded audio
  timestamps?: any[];
  contentType?: string;
  error?: string; // Contains error message if processing failed
  retryCount?: number; // Number of retries already attempted
  status: 'success' | 'failed' | 'skipped'; // Processing status
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestPayload;
    const runtimeConfig = useRuntimeConfig(event);
    
    // Handle two different data formats
    let script: { speaker: string; text: string }[] = [];
    let personas: { hostPersona?: Persona; guestPersonas?: Persona[] } = {};
    let ttsProviderName = 'elevenlabs'; // Default to using elevenlabs
    const maxRetries = body.maxRetries || 2; // Default maximum retries is 2
    
    if (body.script && body.personas) {
      // Original format
      script = body.script;
      personas = body.personas;
    } else if (body.config) {
      // New format - extract data from config
      ttsProviderName = body.config.ttsProvider || 'elevenlabs';
      
      // Convert segments to script format
      script = body.config.segments.map(seg => ({
        speaker: seg.speakerTag,
        text: seg.text
      }));
      
      // Create personas from speakerAssignments
      // Simplified handling: treat all roles as guests
      const guestPersonas: Persona[] = [];
      
      for (const speakerTag in body.config.speakerAssignments) {
        const voiceId = body.config.speakerAssignments[speakerTag];
        if (voiceId) {
          guestPersonas.push({
            name: speakerTag,
            voice_model_identifier: voiceId
          });
        }
      }
      
      personas = {
        guestPersonas
      };
    }
    
    // Validate data
    if (!script || !Array.isArray(script) || script.length === 0 || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "script" array and "personas" object are required.',
      });
    }

    const segmentResults: SegmentResult[] = [];
    // Use the specified TTS provider
    const ttsProvider = getTtsProvider(ttsProviderName, runtimeConfig); 

    if (!ttsProvider.generateSpeechWithTimestamps) {
      throw createError({
        statusCode: 501,
        statusMessage: 'The configured TTS provider does not support generating speech with timestamps.',
      });
    }

    // Determine segments to process
    const segmentsToProcess = body.retrySegments && body.retrySegments.length > 0
      ? body.retrySegments.map(index => ({ index, segment: script[index] })).filter(item => item.segment)
      : script.map((segment, index) => ({ index, segment }));

    // Process each segment
    for (const { index, segment } of segmentsToProcess) {
      const { speaker, text } = segment;

      if (!speaker || !text) {
        console.warn('Skipping segment due to missing speaker or text:', segment);
        segmentResults[index] = {
          speaker: speaker || 'unknown',
          text: text || '',
          error: 'Missing speaker or text',
          status: 'skipped'
        };
        continue;
      }

      let voiceId = null;
      if (personas.hostPersona && personas.hostPersona.name === speaker) {
        voiceId = personas.hostPersona.voice_model_identifier;
      } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
        const guest = personas.guestPersonas.find(p => p.name === speaker);
        if (guest) {
          voiceId = guest.voice_model_identifier;
        }
      }

      if (!voiceId) {
        console.warn(`Could not find voiceId for speaker: ${speaker}. Skipping segment.`);
        segmentResults[index] = {
          speaker,
          text,
          error: `Voice ID for speaker ${speaker} not found.`,
          status: 'skipped'
        };
        continue;
      }

      console.log(`Generating audio with timestamps for speaker: ${speaker} with voiceId: ${voiceId} via TTS Provider`);

      // Get current retry count
      const currentRetryCount = segmentResults[index]?.retryCount || 0;
      
      try {
        const synthesisRequest: VoiceSynthesisRequest = {
          text: text,
          voiceId: voiceId,
          // If there are synthesis parameters, they can be added to the request
          ...(body.synthesisParams ? { providerOptions: body.synthesisParams } : {})
        };
        
        const ttsResult: VoiceSynthesisWithTimestampsResponse = await ttsProvider.generateSpeechWithTimestamps(synthesisRequest);
        
        let audioBase64: string | undefined = undefined;
        if (ttsResult.audioData) {
          // Convert ArrayBuffer to Base64 string
          audioBase64 = Buffer.from(ttsResult.audioData).toString('base64');
        }

        segmentResults[index] = {
          speaker,
          text,
          audio: audioBase64, 
          timestamps: ttsResult.timestamps,
          contentType: ttsResult.contentType,
          retryCount: currentRetryCount,
          status: 'success'
        };

      } catch (ttsError: any) {
        console.error(`Error generating TTS for speaker ${speaker}:`, ttsError.message || ttsError);
        
        // Check if retry is possible
        if (currentRetryCount < maxRetries) {
          console.log(`Will retry segment ${index} for speaker ${speaker}, retry ${currentRetryCount + 1}/${maxRetries}`);
          segmentResults[index] = {
            speaker,
            text,
            error: `Failed to generate audio: ${ttsError.statusMessage || ttsError.message}`,
            retryCount: currentRetryCount + 1,
            status: 'failed'
          };
        } else {
          console.log(`Max retries (${maxRetries}) reached for segment ${index}, speaker ${speaker}`);
          segmentResults[index] = {
            speaker,
            text,
            error: `Failed after ${maxRetries} retries: ${ttsError.statusMessage || ttsError.message}`,
            retryCount: currentRetryCount,
            status: 'failed'
          };
        }
      }
    }

    // Summarize processing results
    const successCount = segmentResults.filter(seg => seg?.status === 'success').length;
    const failedCount = segmentResults.filter(seg => seg?.status === 'failed').length;
    const skippedCount = segmentResults.filter(seg => seg?.status === 'skipped').length;
    const totalCount = script.length;
    
    // Get indexes of segments to retry
    const segmentsToRetry = segmentResults
      .map((seg, idx) => seg?.status === 'failed' && (seg.retryCount || 0) < maxRetries ? idx : -1)
      .filter(idx => idx !== -1);

    return {
      segments: segmentResults,
      summary: {
        total: totalCount,
        success: successCount,
        failed: failedCount,
        skipped: skippedCount,
        canRetry: segmentsToRetry.length > 0,
        segmentsToRetry
      }
    };

  } catch (error: any) {
    console.error('Error in generate-timed-segments:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate timed segments',
      data: error,
    });
  }
});
