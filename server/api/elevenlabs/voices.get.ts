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
    const response = await elevenlabs.voices.getAll();

    console.log('Received response from ElevenLabs voices.getAll():', JSON.stringify(response)); // Log the actual structure

    // Check if the response object exists and has a 'voices' property that is an array
    if (response && Array.isArray(response.voices)) {
      return {
        success: true,
        voices: response.voices, // Access the .voices property from the response object
      };
    } else {
      // This case means the SDK's response structure is not { voices: Voice[] }
      console.error('Unexpected response structure from ElevenLabsClient voices.getAll(). Expected an object with a `voices` array. Actual response:', response);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve voices from ElevenLabs API: Unexpected response structure from SDK.',
        data: response, // Include the actual response for debugging
      });
    }

  } catch (error: any) {
    console.error('Error in elevenlabs/voices.get.ts endpoint:', error.message || error);
    // Check if the error already has statusCode and statusMessage (e.g., from createError)
    if (error.isH3Error === true) { // More reliable check for H3 errors
        throw error; // Re-throw the original H3 error
    }
    // Otherwise, create a new H3 error
    throw createError({
      statusCode: 500, // Default to 500 if not specified
      statusMessage: `Failed to list ElevenLabs voices: ${error.message || 'Unknown error'}`,
      data: error, // Include the original error for debugging
    });
  }
});