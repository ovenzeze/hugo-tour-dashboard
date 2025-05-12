import { defineEventHandler, readBody, createError } from 'h3'
import { ElevenLabsClient } from 'elevenlabs'
import { useRuntimeConfig } from '#imports'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { text, voiceId, modelId, voiceSettings, optimizeStreamingLatency } = body
    
    // 获取API密钥
    const runtimeConfig = useRuntimeConfig()
    const apiKey = runtimeConfig.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY
    
    if (!apiKey) {
      console.error('ElevenLabs API key is missing')
      throw new Error('ElevenLabs API key is missing')
    }
    
    console.log('TTS with timestamps request:', {
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
      console.log('Using mock ElevenLabs response')
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
      const audio = await elevenlabs.textToSpeech.convertWithTimestamps({
        voiceId: voiceId || 'default',
        modelId: modelId || 'eleven_multilingual_v2',
        text,
        voiceSettings,
        optimizeStreamingLatency: optimizeStreamingLatency || 3
      })
      
      console.log('TTS with timestamps response received:', {
        hasAudio: !!audio.audio,
        timestampsCount: audio.timestamps?.length || 0
      })
      
      return {
        audio: audio.audio,
        timestamps: audio.timestamps
      }
    } catch (error: any) {
      console.error('ElevenLabs API error:', error.message || error)
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate audio with timestamps',
        data: error
      })
    }
  } catch (error: any) {
    console.error('General error in tts-with-timestamps:', error.message || error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate audio with timestamps',
      data: error
    })
  }
})
