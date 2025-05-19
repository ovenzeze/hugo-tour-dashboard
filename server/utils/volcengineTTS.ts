import { v4 as uuidv4 } from 'uuid';
import { H3Error } from 'h3';
// import type { NitroFetchOptions } from 'nitropack'; // Removing explicit import

// --- Interfaces based on Volcengine TTS API ---

interface VolcengineAppConfig {
  appid: string;
  token: string; // This is the Access Token
  cluster: string;
  instance_id: string;
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

export interface SynthesizeSpeechParams {
  text: string;
  voice?: VolcengineVoiceType;
  enableTimestamps?: boolean;
  encoding?: 'mp3' | 'pcm' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
}

export interface SynthesizedAudioResult {
  audioBase64: string | null;
  timestamps: FrontendTimestampData | null;
  durationMs: number | null;
  error?: string | null;
  rawResponse?: VolcengineTTSApiResponse; // For debugging
}

export async function synthesizeSpeechVolcengine(
  params: SynthesizeSpeechParams,
): Promise<SynthesizedAudioResult> {
  const {
    text,
    voice = 'female', // Default to female voice
    enableTimestamps = true,
    encoding = 'mp3',
    speedRatio = 1.0,
    volumeRatio = 1.0,
    pitchRatio = 1.0,
  } = params;

  const config = useRuntimeConfig();
  const { volcengine: volcConfig } = config;

  if (
    !volcConfig ||
    !volcConfig.appId ||
    !volcConfig.accessToken ||
    !volcConfig.cluster
  ) {
    console.error('Volcengine TTS configuration missing in runtimeConfig.');
    return {
      audioBase64: null,
      timestamps: null,
      durationMs: null,
      error: 'Server configuration error for Volcengine TTS.',
    };
  }

  const selectedVoiceType = VOICE_TYPES[voice as keyof typeof VOICE_TYPES] || voice;

  const requestPayload: VolcengineTTSApiRequest = {
    app: {
      appid: volcConfig.appId,
      token: volcConfig.accessToken,
      cluster: volcConfig.cluster,
      instance_id: volcConfig.instanceId || 'Speech_Synthesis_Default_InstanceID', // Use configured or a default
    },
    user: {
      uid: uuidv4(),
    },
    audio: {
      voice_type: selectedVoiceType,
      encoding,
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio,
    },
    request: {
      reqid: uuidv4(),
      text,
      text_type: 'plain',
      operation: 'query',
      with_frontend: enableTimestamps ? 1 : 0,
      frontend_type: enableTimestamps ? 'unitTson' : undefined,
      need_timestamps: enableTimestamps ? 1 : undefined, // Ensure this is correctly set for timestamps
    },
  };

  try {
    // Let TypeScript infer the type of fetchOptions
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${volcConfig.accessToken}`,
      },
      body: requestPayload,
    };
    const response = await $fetch<VolcengineTTSApiResponse>(VOLCENGINE_TTS_API_URL, fetchOptions);

    // Volcengine API seems to return code 3000 for success in some cases based on Python logs
    if (response.code !== 0 && response.code !== 3000) {
      console.error('Volcengine TTS API Error:', response);
      return {
        audioBase64: null,
        timestamps: null,
        durationMs: null,
        error: `API Error ${response.code}: ${response.message}`,
        rawResponse: response,
      };
    }

    const audioBase64 = response.data || null;
    const timestamps = response.addition?.frontend || null;
    const durationMs = response.addition?.duration ? parseInt(response.addition.duration, 10) : null;

    return {
      audioBase64,
      timestamps,
      durationMs,
      error: null,
      rawResponse: response,
    };
  } catch (error: any) {
    console.error('Error calling Volcengine TTS API:', error);
    let errorMessage = 'Failed to synthesize speech.';
    if (error instanceof H3Error && error.data) {
      errorMessage = `API Request Failed: ${error.data.statusMessage || error.message}`;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return {
      audioBase64: null,
      timestamps: null,
      durationMs: null,
      error: errorMessage,
    };
  }
}
