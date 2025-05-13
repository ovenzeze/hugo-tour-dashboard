import { defineEventHandler, readBody, createError, setHeader, sendStream } from 'h3' // Corrected import statement
import { ElevenLabsClient } from 'elevenlabs'
import { useRuntimeConfig } from '#imports'
import { Readable } from 'stream'

// Utility to convert AsyncIterable to Node.js Readable stream
function readableFromAsyncIterable<T>(asyncIterable: AsyncIterable<T>): Readable {
  const readable = new Readable({
    objectMode: true, // Assuming the chunks are objects/buffers, adjust if plain strings/bytes
    async read() {
      try {
        for await (const chunk of asyncIterable) {
          if (!this.push(chunk)) {
            // If push returns false, stop reading until _read is called again.
            return;
          }
        }
        this.push(null); // Signal end of stream
      } catch (err: any) {
        this.destroy(err);
      }
    }
  });
  return readable;
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { text, voiceId, modelId, voiceSettings, optimizeStreamingLatency } = body

  // Get API key
  const runtimeConfig = useRuntimeConfig(event)
  const apiKey = runtimeConfig.elevenLabsApiKey || process.env.ELEVENLABS_API_KEY

  if (!apiKey) {
    console.error('ElevenLabs API key is missing in stream-with-timestamps')
    throw createError({
      statusCode: 500,
      statusMessage: 'ElevenLabs API key is missing'
    })
  }

  const elevenlabs = new ElevenLabsClient({
    apiKey // Use the retrieved apiKey
  })

  // Call streamWithTimestamps with (voiceId, text, options)
  // The AsyncIterable will have its type inferred or can be set to any if specific chunk type is unknown
  const elevenLabsStream: AsyncIterable<any> = // Changed type to AsyncIterable<any>
    await elevenlabs.textToSpeech.streamWithTimestamps(
      voiceId || '21m00Tcm4TlvDq8ikWAM', // Default voiceId if not provided
      text,
      { // Options object
        // model_id: modelId || 'eleven_multilingual_v2', // Removed model_id
        // voiceSettings, // Removed voiceSettings
        // optimizeStreamingLatency: optimizeStreamingLatency || undefined, // Removed optimizeStreamingLatency
        // outputFormat: 'mp3_44100_128' // Example, if you need to specify output format
      }
    );

  // Convert the ElevenLabs stream to a Node.js Readable stream
  const nodeReadableStream = readableFromAsyncIterable(elevenLabsStream);

  setHeader(event, 'Content-Type', 'text/event-stream') // Or 'audio/mpeg' if just streaming audio data directly
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  // H3's sendStream expects a Node.js ReadableStream
  return sendStream(event, nodeReadableStream)
})