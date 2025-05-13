// Utility functions for interacting with ElevenLabs API within Deno environment

interface ElevenLabsApiOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  responseType?: 'json' | 'arraybuffer' | 'blob' | 'text';
  headers?: Record<string, string>;
  apiKey?: string; // Allow passing API key directly or use env var
  baseUrl?: string; // Allow passing base URL directly or use env var
}

/**
 * Fetches data from the ElevenLabs API using Deno environment variables.
 */
export async function fetchElevenLabsDeno(options: ElevenLabsApiOptions) {
  const {
    endpoint,
    method = 'GET',
    body,
    responseType = 'json',
    headers = {}
  } = options;

  // Get config from options or environment variables
  const apiKey = options.apiKey ?? Deno.env.get('ELEVENLABS_API_KEY');
  const baseUrl = options.baseUrl ?? Deno.env.get('ELEVENLABS_BASE_URL') ?? 'https://api.elevenlabs.io'; // Default base URL

  if (!apiKey) {
    console.error('[fetchElevenLabsDeno] Error: ELEVENLABS_API_KEY is missing!');
    throw new Error('ElevenLabs API Key is not configured in environment variables.');
  }

  const url = `${baseUrl}${endpoint}`;

  // Set request headers
  const requestHeaders: Record<string, string> = {
    'xi-api-key': apiKey,
    ...headers
  };

  if (body && method !== 'GET' && !headers['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  try {
    console.log(`[fetchElevenLabsDeno] Sending ${method} request to ${url}`);
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body && typeof body === 'object' ? JSON.stringify(body) : body
    });

    console.log(`[fetchElevenLabsDeno] Received response: Status ${response.status}`);

    if (!response.ok) {
      let errorText = `ElevenLabs API Error (${response.status})`;
      let errorDetails = null;
      try {
        const errorData = await response.json();
        console.error('[fetchElevenLabsDeno] Error response detail:', errorData);
        errorText = `ElevenLabs API Error: ${JSON.stringify(errorData.detail || errorData)}`;
        errorDetails = errorData.detail || errorData;
      } catch (e) {
        errorText = await response.text() || errorText;
        console.error('[fetchElevenLabsDeno] Non-JSON error response:', errorText);
      }
      throw new Error(errorText); // Throw a standard Error for Deno functions
    }

    // Handle response type
    if (responseType === 'arraybuffer') {
      const buffer = await response.arrayBuffer();
      console.log(`[fetchElevenLabsDeno] Received ArrayBuffer, size: ${buffer.byteLength} bytes`);
      if (buffer.byteLength < 100) {
         console.warn(`[fetchElevenLabsDeno] Warning: Received small audio buffer (${buffer.byteLength} bytes)`);
      }
      return buffer;
    } else if (responseType === 'blob') {
      const blob = await response.blob();
      console.log(`[fetchElevenLabsDeno] Received Blob, size: ${blob.size} bytes, type: ${blob.type}`);
      return blob;
    } else if (responseType === 'text') {
      const text = await response.text();
      console.log(`[fetchElevenLabsDeno] Received text response, length: ${text.length}`);
      return text;
    } else { // json
      const json = await response.json();
      console.log(`[fetchElevenLabsDeno] Received JSON response`);
      return json;
    }

  } catch (error: any) {
    console.error('[fetchElevenLabsDeno] Request failed:', error);
    // Re-throw the error to be caught by the main function handler
    throw new Error(`ElevenLabs API request failed: ${error.message}`);
  }
}

/**
 * Synthesizes speech for a given text segment using ElevenLabs.
 * Returns the audio data as a Blob.
 */
export async function synthesizeSpeechSegment(
  text: string,
  voiceId: string,
  apiKey?: string, // Optional: pass directly or use env
  modelId: string = 'eleven_multilingual_v2', // Default model
  stability?: number,
  similarityBoost?: number
): Promise<Blob> {

  const endpoint = `/v1/text-to-speech/${voiceId}`; // Use non-streaming for simpler Blob return
  const body: any = {
    text: text,
    model_id: modelId,
  };

  // Add optional parameters if provided
  if (stability !== undefined) body.voice_settings = { ...(body.voice_settings || {}), stability };
  if (similarityBoost !== undefined) body.voice_settings = { ...(body.voice_settings || {}), similarity_boost: similarityBoost };


  console.log(`[synthesizeSpeechSegment] Requesting synthesis for voice ${voiceId} with body:`, body);

  const audioBlob = await fetchElevenLabsDeno({
    endpoint: endpoint,
    method: 'POST',
    body: body,
    responseType: 'blob', // Get audio as Blob for easy upload
    apiKey: apiKey,
     headers: {
       'Accept': 'audio/mpeg' // Request MP3 format
     }
  });

  if (!(audioBlob instanceof Blob)) {
      throw new Error('ElevenLabs API did not return a Blob for audio synthesis.');
  }
   if (audioBlob.size < 100) {
       console.warn(`[synthesizeSpeechSegment] Warning: Synthesized audio Blob size is very small (${audioBlob.size} bytes).`);
   }


  return audioBlob;
}