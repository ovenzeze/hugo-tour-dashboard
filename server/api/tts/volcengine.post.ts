import { defineEventHandler, readBody } from 'h3';
import {
  synthesizeSpeechVolcengine,
  type SynthesizeSpeechParams,
  type SynthesizedAudioResult,
} from '~/server/utils/volcengineTTS'; // Adjusted path if utils is directly under server

export default defineEventHandler(async (event): Promise<SynthesizedAudioResult> => {
  try {
    const body = await readBody<Partial<SynthesizeSpeechParams>>(event);

    if (!body || !body.text) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing text in request body.',
      });
    }

    const params: SynthesizeSpeechParams = {
      text: body.text,
      voice: body.voice || 'female', // Default voice
      enableTimestamps: body.enableTimestamps !== undefined ? body.enableTimestamps : true,
      encoding: body.encoding || 'mp3',
      speedRatio: body.speedRatio,
      volumeRatio: body.volumeRatio,
      pitchRatio: body.pitchRatio,
    };

    const result = await synthesizeSpeechVolcengine(params);

    if (result.error) {
      throw createError({
        statusCode: 500,
        statusMessage: result.error || 'Failed to synthesize speech via Volcengine.',
        data: result.rawResponse, // Include raw API response for debugging if available
      });
    }

    return result;
  } catch (error: any) {
    console.error('[Volcengine TTS API Route Error]:', error);
    // Ensure a proper error response is sent
    // createError is a Nuxt utility for throwing H3Errors
    if (error.statusCode) { // If it's already an H3Error
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error while synthesizing speech.',
    });
  }
});
