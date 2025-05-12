import { defineEventHandler, readBody, createError } from 'h3';
import { $fetch } from 'ofetch';

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

    if (!script || !Array.isArray(script) || !personas) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. "script" array and "personas" object are required.',
      });
    }

    const segmentsWithTimestamps: any[] = [];

    for (const segment of script) {
      const { speaker, text } = segment;

      if (!speaker || !text) {
        console.warn('Skipping segment due to missing speaker or text:', segment);
        continue;
      }

      // Find the voiceId for the speaker
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
        // Optionally, use a default voiceId here if desired
        // voiceId = 'default';
        continue;
      }

      console.log(`Generating audio with timestamps for speaker: ${speaker} with voiceId: ${voiceId}`);

      try {
        // Call the internal tts-with-timestamps endpoint
        const ttsResult = await $fetch('/api/elevenlabs/tts-with-timestamps', {
          method: 'POST',
          body: {
            text: text,
            voiceId: voiceId,
            // You can add other parameters like modelId, voiceSettings, optimizeStreamingLatency here if needed
          },
        });

        segmentsWithTimestamps.push({
          speaker: speaker,
          text: text,
          audio: ttsResult.audio, // Assuming the endpoint returns base64 audio
          timestamps: ttsResult.timestamps,
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
    console.error('Error in generate-timed-segments:', error.message || error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate timed segments',
      data: error,
    });
  }
});