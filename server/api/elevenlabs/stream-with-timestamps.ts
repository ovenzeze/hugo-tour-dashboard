import { defineEventHandler } from 'h3'
import { ElevenLabsClient } from 'elevenlabs'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, voiceId, modelId, voiceSettings, optimizeStreamingLatency } = body

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY
  })

  const stream = await elevenlabs.textToSpeech.streamWithTimestamps({
    voiceId: voiceId || 'default',
    modelId: modelId || 'eleven_multilingual_v2',
    text,
    voiceSettings,
    optimizeStreamingLatency: optimizeStreamingLatency || 3
  })

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  return sendStream(event, stream)
})
