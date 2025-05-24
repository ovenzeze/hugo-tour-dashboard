import { defineEventHandler, readBody } from 'h3';
import {
  synthesizeSpeechVolcengine,
  type VolcengineSynthesizeParams, // Unified to VolcengineSynthesizeParams
  type SynthesizedAudioResult,
} from '~/server/utils/volcengineTTS'; // Adjusted path if utils is directly under server
import { DEFAULT_TTS_CONFIG } from '~/server/config/volcengineTTSConfig';

export default defineEventHandler(async (event): Promise<SynthesizedAudioResult> => {
  try {
    // Assuming body might send 'voice' or 'voiceType', and other fields matching VolcengineSynthesizeParams
    const body = await readBody<Partial<VolcengineSynthesizeParams & { voice?: string }>>(event);

    if (!body || !body.text) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Missing text in request body.',
      });
    }

    // Constructing params for synthesizeSpeechVolcengine, which expects VolcengineSynthesizeParams
    // Read configuration from environment variables
    const runtimeConfig = useRuntimeConfig();
    const volcengineConfig = runtimeConfig.volcengine;

    const volcengineAppId = volcengineConfig.appId;
    const volcengineAccessKeyId = volcengineConfig.accessToken; // Using Access Token from runtimeConfig
    const volcengineCluster = volcengineConfig.cluster;
    const volcengineInstanceId = volcengineConfig.instanceId;

    // Basic validation for required environment variables
    if (!volcengineConfig || !volcengineConfig.appId || !volcengineConfig.accessToken || !volcengineConfig.cluster || !volcengineConfig.instanceId) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal Server Error: Volcengine configuration missing. Please ensure NUXT_VOLCENGINE_APP_ID, NUXT_VOLCENGINE_ACCESS_KEY_ID, NUXT_VOLCENGINE_CLUSTER, and NUXT_VOLCENGINE_INSTANCE_ID are set in your environment variables.',
      });
    }

    const params: VolcengineSynthesizeParams = {
      text: body.text,
      // Use body.voiceType if available, otherwise fallback to body.voice, then to default
      voiceType: body.voiceType || body.voice || 'female', // Maps to voiceType
      enableTimestamps: body.enableTimestamps !== undefined ? body.enableTimestamps : true,
      encoding: body.encoding || 'mp3',
      speedRatio: body.speedRatio || DEFAULT_TTS_CONFIG.speedRatio,
      volumeRatio: body.volumeRatio || DEFAULT_TTS_CONFIG.volumeRatio,
      pitchRatio: body.pitchRatio || DEFAULT_TTS_CONFIG.pitchRatio,
      emotion: body.emotion || DEFAULT_TTS_CONFIG.emotion,           // 使用配置文件的默认情感
      enableEmotion: body.enableEmotion !== undefined ? body.enableEmotion : true,
      emotionScale: body.emotionScale || DEFAULT_TTS_CONFIG.emotionScale,     // 使用配置文件的情绪强度
      loudnessRatio: body.loudnessRatio || DEFAULT_TTS_CONFIG.loudnessRatio,   // 使用配置文件的音量设置
      // Provide actual values from environment variables
      appId: volcengineAppId,
      accessToken: volcengineAccessKeyId, // Using Access Key ID as Access Token for Bearer header
      cluster: volcengineCluster,
      instanceId: volcengineInstanceId,
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
