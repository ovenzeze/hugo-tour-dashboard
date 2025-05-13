import { defineEventHandler, readBody, createError } from 'h3'
import { ElevenLabsClient } from 'elevenlabs'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { text, voiceId, modelId, voiceSettings, optimizeStreamingLatency } = body
    
    // 获取API密钥
    const runtimeConfig = useRuntimeConfig() // Consider passing event if Nuxt version requires it for composables in server routes
    const apiKey = runtimeConfig.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      console.error('ElevenLabs API key is missing')
      // Use createError for H3-compatible error handling
      throw createError({
        statusCode: 500, // Internal Server Error
        statusMessage: 'ElevenLabs API key is missing'
      })
    }
    
    console.log('TTS with timestamps request (timing.post.ts):', {
      textLength: text?.length || 0,
      voiceId,
      modelId,
      hasVoiceSettings: !!voiceSettings
    })
    
    const elevenlabs = new ElevenLabsClient({
      apiKey
    })

    // 模拟响应，用于测试
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_ELEVENLABS === 'true') {
      console.log('Using mock ElevenLabs response for timing.post.ts')
      return {
        audio: 'SGVsbG8gV29ybGQ=', // Base64 encoded "Hello World"
        timestamps: [
          { text: text.substring(0, 5), timestamp: [0, 500] },
          { text: text.substring(5, 10), timestamp: [500, 1000] },
          { text: text.substring(10, 15), timestamp: [1000, 1500] }
        ]
      }
    }
    
    // 实际调用ElevenLabs API
    try {
      // Adjust call signature to (voiceId, text, options)
      // The response type 'AudioWithTimestampsResponse' might not directly expose .audio and .timestamps
      // This is a guess based on common SDK patterns; actual structure might differ.
      // For now, let's assume the response object itself might be what we need or contains methods to get data.
      const response: any = await elevenlabs.textToSpeech.convertWithTimestamps(
        voiceId || '21m00Tcm4TlvDq8ikWAM', // Default voiceId
        text,
        { // Options object - removing all optional parameters for now
          // modelId: modelId || 'eleven_multilingual_v2',
          // voiceSettings,
          // optimizeStreamingLatency: optimizeStreamingLatency || undefined
        }
      );
      
      // Log the raw response to understand its structure
      console.log('Raw ElevenLabs convertWithTimestamps response:', response);

      // The exact structure of 'AudioWithTimestampsResponse' is unknown.
      // The mock returns { audio: Buffer, timestamps: Array }.
      // If the actual SDK returns something different, this will need adjustment.
      // For example, if `response` is the audio buffer itself, and timestamps are elsewhere or not available.
      // Let's assume for now the SDK tries to match the mock structure.
      // If `response.audio` or `response.timestamps` is undefined, the client will receive undefined.
      
      const audioData = response?.audio || (response instanceof ArrayBuffer || Buffer.isBuffer(response) ? response : undefined);
      const timestampsData = response?.timestamps;

      console.log('TTS with timestamps response received (timing.post.ts):', {
        hasAudio: !!audioData,
        timestampsCount: Array.isArray(timestampsData) ? timestampsData.length : 0
      });
      
      return {
        audio: audioData,
        timestamps: timestampsData
      };
    } catch (error: any) {
      console.error('ElevenLabs API error in timing.post.ts:', error.message || error)
      throw createError({
        statusCode: error.statusCode || 500, // Use error's status code if available
        statusMessage: `Failed to generate audio with timestamps: ${error.message || 'Unknown API error'}`,
        data: error.data || error
      })
    }
  } catch (error: any) {
    console.error('General error in timing.post.ts:', error.message || error)
    // Ensure this also uses createError if it's not already an H3 error
    if (error.statusCode) {
        throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: `General failure in timing endpoint: ${error.message || 'Unknown error'}`,
      data: error
    })
  }
})