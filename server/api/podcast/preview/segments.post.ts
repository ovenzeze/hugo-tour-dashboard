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
  script: { speaker: string; text: string }[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as RequestPayload;
    const { script, personas } = body;
    const runtimeConfig = useRuntimeConfig(event);

    if (!script || !Array.isArray(script) || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "script" array and "personas" object are required.',
      });
    }

    const segmentsWithTimestamps: any[] = [];
    // Assuming 'elevenlabs' for now, could be made dynamic
    const ttsProvider = getTtsProvider('elevenlabs', runtimeConfig); 

    if (!ttsProvider.generateSpeechWithTimestamps) {
      throw createError({
        statusCode: 501,
        statusMessage: 'The configured TTS provider does not support generating speech with timestamps.',
      });
    }

    for (const segment of script) {
      const { speaker, text } = segment;

      if (!speaker || !text) {
        console.warn('Skipping segment due to missing speaker or text:', segment);
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
        segmentsWithTimestamps.push({
          speaker, text, error: `Voice ID for speaker ${speaker} not found.`
        });
        continue;
      }

      console.log(`Generating audio with timestamps for speaker: ${speaker} with voiceId: ${voiceId} via TTS Provider`);

      try {
        const synthesisRequest: VoiceSynthesisRequest = {
          text: text,
          voiceId: voiceId,
          // modelId, voiceSettings can be passed via providerOptions if needed by the provider
          // outputFormat: 'mp3_44100_128' // Default handled by provider or can be specified
        };
        
        const ttsResult: VoiceSynthesisWithTimestampsResponse = await ttsProvider.generateSpeechWithTimestamps(synthesisRequest);
        
        let audioBase64: string | undefined = undefined;
        if (ttsResult.audioData) {
          // Convert ArrayBuffer to Base64 string
          audioBase64 = Buffer.from(ttsResult.audioData).toString('base64');
        }

        segmentsWithTimestamps.push({
          speaker: speaker,
          text: text,
          audio: audioBase64, 
          timestamps: ttsResult.timestamps,
          contentType: ttsResult.contentType,
        });

      } catch (ttsError: any) {
        console.error(`Error generating TTS for speaker ${speaker}:`, ttsError.message || ttsError);
        // Decide how to handle errors for individual segments (e.g., skip, include error info)
        segmentsWithTimestamps.push({
          speaker: speaker,
          text: text,
          error: `Failed to generate audio: ${ttsError.statusMessage || ttsError.message}`,
        });
      }
    }

    return {
      segments: segmentsWithTimestamps,
    };

  } catch (error: any) {
    console.error('Error in generate-timed-segments:', error.message || error); // Consider updating log message to new path
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate timed segments',
      data: error,
    });
  }
});
