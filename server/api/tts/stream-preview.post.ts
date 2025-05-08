import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const { text, voiceId, modelId, outputFormat = 'mp3_44100_64' } = await readBody(event);

  console.log('[API /api/tts/stream-preview] Received request with text:', text ? text.substring(0, 30) + '...' : null, 'voiceId:', voiceId, 'modelId:', modelId);

  const runtimeConfig = useRuntimeConfig();
  const apiKey = runtimeConfig.elevenlabsApiKey;

  if (!apiKey) {
    throw new Error('ElevenLabs API key is not configured.');
  }

  if (!text || !voiceId) {
    throw new Error('Missing required parameters: text and voiceId.');
  }

  const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${outputFormat}&optimize_streaming_latency=1`;

  try {
    const response = await fetch(elevenLabsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text: text,
        model_id: modelId || 'eleven_multilingual_v2', // Default model, consider faster ones like eleven_turbo_v2 or eleven_flash_v2_5
        // voice_settings: { // Optional: Include if you need to adjust stability/similarity
        //   stability: 0.5,
        //   similarity_boost: 0.75
        // }
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`ElevenLabs API Error: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`ElevenLabs API Error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    // Return the ReadableStream directly
    // H3 and Nitro should handle streaming this back to the client
    return response.body;

  } catch (error: any) {
    console.error('Error calling ElevenLabs streaming API:', error);
    // Ensure a proper error response is sent to the client
    // You might want to customize the status code and message
    event.node.res.statusCode = 500;
    return { error: 'Failed to stream audio from ElevenLabs', details: error.message };
  }
});
