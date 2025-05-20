import { v4 as uuidv4 } from 'uuid';
import { H3Error } from 'h3';

// --- Interfaces based on Volcengine TTS API ---

interface VolcengineAppConfig {
  appid: string;
  token: string; // This is the Access Token
  cluster: string;
}

interface VolcengineUserConfig {
  uid: string;
}

interface VolcengineAudioConfig {
  voice_type: string;
  encoding: 'mp3' | 'pcm' | 'wav';
  speed_ratio?: number;
  volume_ratio?: number;
  pitch_ratio?: number;
}

interface VolcengineRequestConfig {
  reqid: string;
  text: string;
  text_type: 'plain' | 'ssml';
  operation: 'query'; // 'query' for real-time synthesis
  with_frontend?: 0 | 1; // 1 to get phonemes and word timestamps
  frontend_type?: 'unitTson'; // Required if with_frontend is 1
  need_timestamps?: 0 | 1; // 1 to enable timestamps in 'addition.frontend'
  instance_id?: string; // Add instance_id to the request payload
}

interface VolcengineTTSApiRequest {
  app: VolcengineAppConfig;
  user: VolcengineUserConfig;
  audio: VolcengineAudioConfig;
  request: VolcengineRequestConfig;
}

// Timestamp related interfaces (based on observed API responses)
export interface WordTimestamp {
  word: string;
  start_time: number; // in seconds
  end_time: number;   // in seconds
  unit_type: 'text' | 'mark';
}

export interface PhonemeTimestamp {
  phone: string;
  start_time: number; // in seconds
  end_time: number;   // in seconds
}

export interface FrontendTimestampData {
  words: WordTimestamp[];
  phonemes: PhonemeTimestamp[];
  // The full unitTson structure is complex, these are the most relevant parts for timing.
}

interface VolcengineTTSResponseAddition {
  duration?: string; // duration in milliseconds
  first_pkg?: string;
  frontend?: FrontendTimestampData; // Timestamps are here if requested
  description?: string; // May contain pinyin, etc.
  // other fields like unitTson might be present
}

interface VolcengineTTSApiResponse {
  reqid: string;
  code: number; // 0 for success, other values for errors (e.g., 3000 also seems to be success based on logs)
  operation: string;
  message: string;
  sequence: number;
  data?: string; // Base64 encoded audio data
  addition?: VolcengineTTSResponseAddition;
}

// --- Configuration ---

const VOLCENGINE_TTS_API_URL = 'https://openspeech.bytedance.com/api/v1/tts';

// Voice type mapping
const VOICE_TYPES = {
  female: 'BV001_streaming', // 通用女声 (as per Python script)
  male: 'BV002_streaming',   // 通用男声 (as per Python script)
  // Add more voice types as needed from Volcengine documentation
};

export type VolcengineVoiceType = keyof typeof VOICE_TYPES | string; // Allow custom voice_type strings

// --- Utility Function ---

export interface VolcengineSynthesizeParams {
  text: string;
  appId: string;
  accessToken: string;
  cluster: string;
  voiceType: string; // This is the actual voice_type for the API request
  instanceId: string;
  enableTimestamps?: boolean;
  encoding?: 'mp3' | 'pcm' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
}

export interface SynthesizedAudioResult {
  audioBuffer: ArrayBuffer | null;
  timestamps: FrontendTimestampData | null;
  durationMs?: number | null; // Duration in milliseconds, if available
  error?: string;
}

export async function synthesizeSpeechVolcengine(params: VolcengineSynthesizeParams): Promise<SynthesizedAudioResult> {
  const { 
    text, 
    appId, 
    accessToken, 
    cluster, 
    voiceType, 
    instanceId, 
    enableTimestamps, 
    encoding = 'mp3', 
    speedRatio = 1.0, 
    volumeRatio = 1.0, 
    pitchRatio = 1.0 
  } = params;

  const requestBody: VolcengineTTSApiRequest = {
    app: {
      appid: appId,
      token: 'M_Access_Token', // CRITICAL: Must be the literal string "M_Access_Token"
      cluster: cluster,
    },
    user: {
      uid: uuidv4(), 
    },
    audio: {
      voice_type: voiceType, 
      encoding: encoding,
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio,
    },
    request: {
      reqid: uuidv4(), 
      text: text,
      text_type: 'plain', 
      operation: 'query',
      instance_id: instanceId, // CORRECT: instance_id is here
      with_frontend: enableTimestamps ? 1 : 0,
      frontend_type: enableTimestamps ? 'unitTson' : undefined,
    },
  };

  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    };

    console.log('[VolcengineTTS] Sending request payload:', JSON.stringify(requestBody, null, 2));

    const response = await $fetch<VolcengineTTSApiResponse>(VOLCENGINE_TTS_API_URL, fetchOptions);

    if (response.code !== 0 && response.code !== 3000) {
      console.error('Volcengine TTS API Error:', response);
      return {
        audioBuffer: null,
        timestamps: null,
        durationMs: null,
        error: `API Error ${response.code}: ${response.message}`,
      };
    }

    const audioBase64 = response.data || null;
    const timestamps = response.addition?.frontend || null;
    const durationMs = response.addition?.duration ? parseInt(response.addition.duration, 10) : null;

    if (!audioBase64) {
      console.error('No audio data found in response or data is not a string:', response.data);
      return { 
        audioBuffer: null, 
        timestamps: null, 
        durationMs: null, 
        error: 'No audio data found in response or data is not a string.' 
      };
    }

    const binaryString = atob(audioBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    console.log('Successfully decoded base64 audio data.');

    return {
      audioBuffer: bytes.buffer,
      timestamps: timestamps,
      durationMs: durationMs,
    };

  } catch (error: any) {
    console.error('Error synthesizing speech with Volcengine:', error);
    return { 
      audioBuffer: null, 
      timestamps: null, 
      durationMs: null, 
      error: `Error synthesizing speech: ${error.message}` 
    };
  }
}
