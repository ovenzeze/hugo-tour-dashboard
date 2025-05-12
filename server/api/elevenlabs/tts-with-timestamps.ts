import { defineEventHandler } from 'h3'
import { ElevenLabsClient } from 'elevenlabs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, voiceId, modelId, voiceSettings, optimizeStreamingLatency } = body

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  })

  try {
    const audio = await elevenlabs.textToSpeech.convertWithTimestamps({
      voiceId: voiceId || 'default',
      modelId: modelId || 'eleven_multilingual_v2',
      text,
      voiceSettings,
      optimizeStreamingLatency: optimizeStreamingLatency || 3
    })

    return {
      audio: audio.audio,
      timestamps: audio.timestamps
    }
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate audio with timestamps',
      data: error
    })
  }
})
