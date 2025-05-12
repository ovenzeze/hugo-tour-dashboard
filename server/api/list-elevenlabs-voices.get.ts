import { defineEventHandler, createError } from 'h3';
import { fetchElevenLabsAPI } from '../utils/elevenlabsClient'; // Import the custom fetch helper

export default defineEventHandler(async (event) => {
  try {
    console.log('Calling ElevenLabs API to list voices...');

    // Call the fetchElevenLabsAPI helper to get the list of voices
    const voicesResult = await fetchElevenLabsAPI({
      endpoint: '/voices', // Assuming baseUrl from config includes /v1
      method: 'GET',
      responseType: 'json', // Expecting JSON response with voice data
    });

    console.log('Received response from ElevenLabs /voices endpoint.');

    // The response structure for /v1/voices is typically { voices: [...] }
    if (voicesResult && Array.isArray(voicesResult.voices)) {
      // Filter for generic voices if needed, or just return the list
      // For now, return the full list for the user to choose
      return {
        success: true,
        voices: voicesResult.voices,
      };
    } else {
      console.error('Unexpected response structure from /v1/voices:', voicesResult);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to retrieve voices from ElevenLabs API: Unexpected response structure.',
        data: voicesResult,
      });
    }

  } catch (error: any) {
    console.error('Error in list-elevenlabs-voices endpoint:', error.message || error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to list ElevenLabs voices: ${error.statusMessage || error.message}`,
      data: error.data || error,
    });
  }
});