import { defineEventHandler, createError } from 'h3';
import { ElevenLabsClient } from 'elevenlabs';
import { useRuntimeConfig } from '#imports';

export default defineEventHandler(async (event) => {
  try {
    console.log('Calling ElevenLabs API to list voices (voices.get.ts)...');

    const runtimeConfig = useRuntimeConfig();
    const apiKey = runtimeConfig.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error('ElevenLabs API key is missing in voices.get.ts');
      throw createError({
        statusCode: 500,
        statusMessage: 'ElevenLabs API key is missing'
      });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey
    });

    // Use the ElevenLabsClient to get the list of voices
    const voices = await elevenlabs.voices.getAll();

    console.log('Received response from ElevenLabs voices.getAll().');

    // The response from voices.getAll() is directly an array of voice objects
    if (Array.isArray(voices)) {
      return {
        success: true,
        voices: voices, // The client directly returns the array of voice objects
      };
    } else {
      // This case should ideally not be reached if the SDK works as expected
      console.error('Unexpected response structure from ElevenLabsClient voices.getAll():', voices);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve voices from ElevenLabs API: Unexpected response structure from SDK.',
        data: voices,
      });
    }

  } catch (error: any) {
    console.error('Error in elevenlabs/voices.get.ts endpoint:', error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to list ElevenLabs voices: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});