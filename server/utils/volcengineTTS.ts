import { v4 as uuidv4 } from 'uuid';
import { H3Error } from 'h3';
import { 
  DEFAULT_TTS_CONFIG, 
  validateTTSParams,
  enhanceTextWithSSML,
  validateAndCleanSSML,
  getSSMLRecommendationForPodcast
} from '../config/volcengineTTSConfig';

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
  emotion?: string;        // 音色情感，如 "happy", "sad", "angry", "neutral" 等
  enable_emotion?: boolean; // 是否启用音色情感
  emotion_scale?: number;   // 情绪值设置，范围1~5，默认4，数值越大情感越明显
  loudness_ratio?: number;  // 音量调节，范围[0.5,2]，默认1
}

interface VolcengineRequestConfig {
  reqid: string;
  text: string;
  text_type: 'plain' | 'ssml';
  operation: 'query'; // 'query' for real-time synthesis
  with_frontend?: 0 | 1; // 1 to get phonemes and word timestamps
  frontend_type?: 'unitTson'; // Required if with_frontend is 1
  with_timestamp?: 0 | 1; // 1 to enable timestamps in 'addition.frontend'
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
// --- Utility Function ---

export interface VolcengineSynthesizeParams {
  text: string;
  appId: string;
  accessToken: string; // Used for Authorization: Bearer header
  cluster: string;
  voiceType: string; // This is the actual voice_type for the API request
  instanceId: string;
  enableTimestamps?: boolean;
  encoding?: 'mp3' | 'pcm' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
  emotion?: string;         // 音色情感
  enableEmotion?: boolean;  // 是否启用情感
  emotionScale?: number;    // 情绪值强度
  loudnessRatio?: number;   // 音量调节
  // 新增SSML相关参数
  enableSSML?: boolean;     // 是否启用SSML
  autoEnhanceSSML?: boolean; // 是否自动增强SSML
  speakerRole?: string;     // 说话人角色，用于SSML优化
}

export interface SynthesizedAudioResult {
  audioBuffer: ArrayBuffer | null;
  timestamps: FrontendTimestampData | null;
  durationMs?: number | null; // Duration in milliseconds, if available
  error?: string;
  rawResponse?: any; // Added for detailed error logging
}

export async function synthesizeSpeechVolcengine(params: VolcengineSynthesizeParams): Promise<SynthesizedAudioResult> {
  const {
    text,
    appId,
    accessToken,
    cluster,
    voiceType, // This is the actual voice_type to be used in the API request
    instanceId,
    enableTimestamps,
    encoding = 'mp3',
    speedRatio = DEFAULT_TTS_CONFIG.speedRatio,
    volumeRatio = DEFAULT_TTS_CONFIG.volumeRatio,
    pitchRatio = DEFAULT_TTS_CONFIG.pitchRatio,
    emotion = DEFAULT_TTS_CONFIG.emotion,        // 使用配置文件的默认情感
    enableEmotion = true,     // 默认启用情感
    emotionScale = DEFAULT_TTS_CONFIG.emotionScale,    // 使用配置文件的情绪强度
    loudnessRatio = DEFAULT_TTS_CONFIG.loudnessRatio,   // 使用配置文件的音量设置
    // SSML相关参数
    enableSSML = false,
    autoEnhanceSSML = false,
    speakerRole = 'podcast_host'
  } = params;

  // 处理SSML增强
  let processedText = text;
  let textType: 'plain' | 'ssml' = 'plain';
  
  if (enableSSML || autoEnhanceSSML) {
    // 获取SSML推荐
    const recommendation = getSSMLRecommendationForPodcast(text.length, 1, text);
    
    if (autoEnhanceSSML && recommendation.shouldUseSSML) {
      console.log('[VolcengineTTS] 自动启用SSML增强:', recommendation.reasons);
      processedText = enhanceTextWithSSML(text, {
        enableBreaks: true,
        enableEmphasis: true,
        enableNumberOptimization: true,
        speakerRole
      });
      textType = 'ssml';
    } else if (enableSSML) {
      // 如果文本已经包含SSML标签，验证并清理
      if (text.includes('<speak>') || text.includes('<') && text.includes('>')) {
        const ssmlValidation = validateAndCleanSSML(text);
        if (!ssmlValidation.isValid) {
          console.warn('[VolcengineTTS] SSML验证警告:', ssmlValidation.errors);
        }
        processedText = ssmlValidation.cleanedSSML;
        textType = 'ssml';
      } else {
        // 简单文本，包装为SSML
        processedText = `<speak>${text}</speak>`;
        textType = 'ssml';
      }
    }
    
    console.log('[VolcengineTTS] SSML处理结果:', {
      original: text.substring(0, 50) + '...',
      processed: processedText.substring(0, 100) + '...',
      textType,
      enableSSML,
      autoEnhanceSSML
    });
  }

  // 验证参数是否在官方文档规定的范围内
  const validation = validateTTSParams({
    emotionScale,
    loudnessRatio,
    speedRatio,
    volumeRatio,
    pitchRatio
  });

  if (!validation.isValid) {
    console.warn('[VolcengineTTS] 参数验证警告:', validation.errors);
  }

  const requestBody: VolcengineTTSApiRequest = {
    app: {
      appid: appId,
      token: accessToken, // Use the provided accessToken
      cluster: cluster,
    },
    user: {
      uid: uuidv4(),
    },
    audio: {
      voice_type: voiceType, // Directly use the provided voiceType
      encoding: encoding,
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio,
      emotion: emotion,
      enable_emotion: enableEmotion,
      emotion_scale: emotionScale,
      loudness_ratio: loudnessRatio,
    },
    request: {
      reqid: uuidv4(), 
      text: processedText,
      text_type: textType, 
      operation: 'query',
      instance_id: instanceId,
      with_frontend: enableTimestamps ? 1 : 0,
      frontend_type: enableTimestamps ? 'unitTson' : undefined,
      with_timestamp: enableTimestamps ? 1 : 0, // Changed from need_timestamps to with_timestamp
    },
  };

  try {
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer;${accessToken}`,
      },
      body: JSON.stringify(requestBody),
    };

    console.log('[VolcengineTTS] Sending request payload:', JSON.stringify(requestBody, null, 2));

    const response = await $fetch<VolcengineTTSApiResponse>(VOLCENGINE_TTS_API_URL, fetchOptions);

    // 增强错误检测 - 根据火山引擎官方文档的错误码
    if (response.code !== 0 && response.code !== 3000) {
      console.error('Volcengine TTS API Error:', response);
      
      // 根据错误码判断问题类型
      let errorType = 'UNKNOWN';
      let errorMessage = response.message;
      
      switch (response.code) {
        case 4001:
          errorType = 'AUTHENTICATION_FAILED';
          errorMessage = '认证失败，请检查AppID、AccessToken等配置信息';
          break;
        case 4003:
          errorType = 'INSUFFICIENT_BALANCE';
          errorMessage = '账户余额不足，请充值后再试';
          break;
        case 4004:
          errorType = 'QUOTA_EXCEEDED';
          errorMessage = '调用次数已达上限，请稍后再试或升级套餐';
          break;
        case 4005:
          errorType = 'PERMISSION_DENIED';
          errorMessage = '没有权限使用该功能，请检查账户权限设置';
          break;
        case 4006:
          errorType = 'INVALID_VOICE_TYPE';
          errorMessage = '音色类型无效或不支持，请检查voiceType参数';
          break;
        case 5001:
          errorType = 'TEXT_TOO_LONG';
          errorMessage = '文本过长，请缩短文本后重试';
          break;
        case 5002:
          errorType = 'INVALID_PARAMETERS';
          errorMessage = '参数无效，请检查请求参数';
          break;
        default:
          errorType = 'API_ERROR';
          errorMessage = `API错误 ${response.code}: ${response.message}`;
      }
      
      console.error(`[VolcengineTTS] 错误类型: ${errorType}`);
      console.error(`[VolcengineTTS] 错误信息: ${errorMessage}`);
      
      // 如果是欠费问题，特别标记
      if (response.code === 4003) {
        console.error('🔴 [VolcengineTTS] 检测到欠费问题！请前往火山引擎控制台充值');
      }
      
      return {
        audioBuffer: null,
        timestamps: null,
        durationMs: null,
        error: `${errorType}: ${errorMessage}`,
        rawResponse: response, // Store raw error response
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
        error: 'No audio data found in response or data is not a string.',
        rawResponse: response, // Store raw response when audio data is missing
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
      error: `Error synthesizing speech: ${error.message}`,
      rawResponse: error, // Store raw error object on catch
    };
  }
}
