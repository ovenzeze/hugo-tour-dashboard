// server/services/tts/elevenlabs.ts
import type {
  TextToSpeechProvider,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceModel,
  PodcastCreationRequest,
  PodcastCreationResponse,
  VoiceSynthesisWithTimestampsResponse, // Added import
} from './types';
import { $fetch } from 'ofetch'; // Nuxt's built-in fetch utility
import { ElevenLabsClient } from 'elevenlabs'; // Added import for ElevenLabsClient

// Interface for ElevenLabs specific configuration
interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModelId?: string;
}

// Define a more specific type for the /voices API response
interface ElevenLabsVoice { 
  voice_id: string;
  name: string;
  // Add other relevant properties from the API as needed, e.g.:
  // samples: any[];
  // category: string;
  // fine_tuning: any;
  // labels: Record<string, string>;
  // description: string | null;
  // preview_url: string;
  // available_for_tiers: string[];
  // settings: any | null;
  sharing: any | null; // Actual structure might be more complex
  settings?: { stability: number; similarity_boost: number; style?: number; use_speaker_boost?: boolean };
  [key: string]: any; // Allow other properties
}

interface ElevenLabsVoicesResponse {
  voices: ElevenLabsVoice[];
}

export class ElevenLabsProvider implements TextToSpeechProvider {
  readonly providerId = 'elevenlabs';
  private config: ElevenLabsConfig;
  private elevenLabsBaseUrl: string;
  private elevenLabsClient: ElevenLabsClient; // Added ElevenLabsClient instance

  constructor(runtimeConfig: any) { // Expects the full runtimeConfig or a dedicated part of it
    const elevenlabsConfig = runtimeConfig.elevenlabs || {}; // Assuming config is under runtimeConfig.elevenlabs
    
    if (!elevenlabsConfig.apiKey) {
      throw new Error('ElevenLabs API key (runtimeConfig.elevenlabs.apiKey) is required.');
    }
    this.config = {
        apiKey: elevenlabsConfig.apiKey,
        baseUrl: elevenlabsConfig.baseUrl || 'https://api.elevenlabs.io/v1',
        defaultModelId: elevenlabsConfig.defaultModelId || 'eleven_multilingual_v2',
    };
    this.elevenLabsBaseUrl = this.config.baseUrl!; // Assert non-null as it has a default
    this.elevenLabsClient = new ElevenLabsClient({ apiKey: this.config.apiKey }); // Initialize client
  }

  async generateSpeech(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse> {
    const { text, voiceId, modelId, providerOptions } = request;

    const effectiveModelId = modelId || this.config.defaultModelId;
    const apiUrl = `${this.elevenLabsBaseUrl}/text-to-speech/${voiceId}`;

    const payload: any = {
      text: text,
      model_id: effectiveModelId,
    };

    if (providerOptions) {
      payload.voice_settings = {
        stability: providerOptions.stability,
        similarity_boost: providerOptions.similarity_boost,
        style: providerOptions.style,
        use_speaker_boost: providerOptions.use_speaker_boost,
      };
    }

    try {
      console.log(`Calling ElevenLabs API: ${apiUrl} with model ${effectiveModelId}`);
      const response = await $fetch.raw(apiUrl, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg', // Requesting MP3 format
        },
        body: payload,
        responseType: 'arrayBuffer' // Crucial for receiving binary audio data
      });

      const audioData = response._data as ArrayBuffer;
      const contentType = response.headers.get('content-type') || 'audio/mpeg';

      // Note: durationSeconds and fileName might be handled by the calling API endpoint
      // if they require external libraries or more complex logic (e.g., temp files).
      return {
        audioData,
        contentType,
      };
    } catch (error: any) {      
      const errorMessage = error.data?.detail?.message || error.data?.message || error.message || 'Unknown ElevenLabs API error';
      console.error(`ElevenLabs API error (${this.providerId}): ${errorMessage}`, error.data || error);
      throw new Error(`ElevenLabs TTS generation failed: ${errorMessage}`);
    }
  }

  async generateSpeechWithTimestamps(request: VoiceSynthesisRequest): Promise<VoiceSynthesisWithTimestampsResponse> {
    const { text, voiceId, modelId, providerOptions, outputFormat } = request;

    try {
      console.log(`Calling ElevenLabsClient textToSpeech.convertWithTimestamps for voice: ${voiceId}`);
      
      const ttsRequestPayload: any = {
        text: text,
      };
      
      if (modelId) {
        ttsRequestPayload.modelId = modelId;
      } else if (this.config.defaultModelId) {
        ttsRequestPayload.modelId = this.config.defaultModelId;
      }

      if (providerOptions) {
        ttsRequestPayload.voiceSettings = {
            stability: providerOptions.stability,
            similarityBoost: providerOptions.similarity_boost,
            style: providerOptions.style,
            useSpeakerBoost: providerOptions.use_speaker_boost
        };
      }

      const sdkResponse: any = await this.elevenLabsClient.textToSpeech.convertWithTimestamps(
        voiceId,
        ttsRequestPayload
      );

      // 处理新的响应格式
      // 检查是否有audio_base64字段（新格式）
      if (sdkResponse && sdkResponse.audio_base64) {
        console.log('Processing new ElevenLabs response format with audio_base64');
        
        // 将Base64字符串转换为ArrayBuffer
        const binaryString = atob(sdkResponse.audio_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const audioData = bytes.buffer;
        
        // 从alignment或normalized_alignment中提取时间戳
        let timestamps = [];
        if (sdkResponse.alignment && sdkResponse.alignment.characters) {
          timestamps = this.extractTimestampsFromAlignment(sdkResponse.alignment);
        } else if (sdkResponse.normalized_alignment && sdkResponse.normalized_alignment.characters) {
          timestamps = this.extractTimestampsFromAlignment(sdkResponse.normalized_alignment);
        }
        
        return {
          audioData,
          contentType: outputFormat === 'pcm' ? 'audio/pcm' : 'audio/mpeg',
          timestamps,
        };
      }
      // 处理旧的响应格式
      else if (sdkResponse && typeof sdkResponse.audio !== 'undefined' && typeof sdkResponse.timestamps !== 'undefined') {
        console.log('Processing old ElevenLabs response format with audio and timestamps');
        
        return {
          audioData: sdkResponse.audio as ArrayBuffer,
          contentType: outputFormat === 'pcm' ? 'audio/pcm' : 'audio/mpeg',
          timestamps: sdkResponse.timestamps,
        };
      }
      
      // 如果都不匹配，抛出错误
      console.error('Unexpected response structure from ElevenLabsClient.convertWithTimestamps:', sdkResponse);
      throw new Error('Invalid response structure from ElevenLabs SDK for convertWithTimestamps.');
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown ElevenLabs SDK error in generateSpeechWithTimestamps';
      console.error(`ElevenLabs SDK error (${this.providerId}) in generateSpeechWithTimestamps: ${errorMessage}`, error);
      throw new Error(`ElevenLabs TTS generation with timestamps failed: ${errorMessage}`);
    }
  }

  // 辅助方法：从alignment对象中提取时间戳
  private extractTimestampsFromAlignment(alignment: any): any[] {
    if (!alignment || !alignment.characters || !Array.isArray(alignment.characters)) {
      return [];
    }
    
    // 创建与ElevenLabs旧格式兼容的时间戳数组
    const timestamps = [];
    const characters = alignment.characters;
    const startTimes = alignment.character_start_times_seconds || [];
    const endTimes = alignment.character_end_times_seconds || [];
    
    // 按单词分组字符
    let currentWord = '';
    let wordStartTime = 0;
    let wordEndTime = 0;
    let inWord = false;
    
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const startTime = startTimes[i] || 0;
      const endTime = endTimes[i] || 0;
      
      // 如果是空格或标点，结束当前单词
      if (char === ' ' || /[.,!?;:]/.test(char)) {
        if (inWord) {
          // 添加当前单词的时间戳
          timestamps.push({
            word: currentWord,
            start_time: wordStartTime,
            end_time: wordEndTime
          });
          
          // 重置单词状态
          currentWord = '';
          inWord = false;
        }
        
        // 如果是标点，也将其作为单独的"单词"
        if (char !== ' ') {
          timestamps.push({
            word: char,
            start_time: startTime,
            end_time: endTime
          });
        }
      } else {
        // 如果是字母，添加到当前单词
        if (!inWord) {
          // 开始新单词
          inWord = true;
          wordStartTime = startTime;
        }
        
        currentWord += char;
        wordEndTime = endTime;
      }
    }
    
    // 添加最后一个单词（如果有）
    if (currentWord) {
      timestamps.push({
        word: currentWord,
        start_time: wordStartTime,
        end_time: wordEndTime
      });
    }
    
    return timestamps;
  }

  async listVoices(languageCode?: string): Promise<VoiceModel[]> {
    // Using ElevenLabsClient for consistency
    try {
      const voicesResponse = await this.elevenLabsClient.voices.getAll();
      
      if (!voicesResponse || !Array.isArray(voicesResponse)) {
        console.error('Invalid response structure from ElevenLabs voices.getAll():', voicesResponse); // Corrected variable name
        throw new Error('Failed to list ElevenLabs voices: Invalid API response structure.');
      }

      const voices: VoiceModel[] = voicesResponse.map((v: ElevenLabsVoice) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender,
        // Corrected language mapping: remove v.settings.language
        languageCodes: v.labels?.language ? [v.labels.language] :
                       (Array.isArray(v.languages) && v.languages.length > 0 ? v.languages.map((lang: any) => lang.language_id) : []),
        provider: this.providerId,
        providerMetadata: {
          category: v.category,
          description: v.description,
          labels: v.labels,
          preview_url: v.preview_url,
          settings: v.settings, // This is the voice_settings object
          sharing: v.sharing,
          // Add other relevant fields from ElevenLabsVoice if needed
        },
      }));

      if (languageCode) {
        return voices.filter(voice => 
            voice.languageCodes?.some(lc => lc.toLowerCase().startsWith(languageCode.toLowerCase())) ||
            voice.providerMetadata?.labels?.accent?.toLowerCase().includes(languageCode.toLowerCase())
        );
      }
      return voices;
    } catch (error: any) {
      const errorMessage = error.data?.detail?.message || error.data?.message || error.message || 'Unknown ElevenLabs API error';
      console.error(`ElevenLabs API error fetching voices (${this.providerId}): ${errorMessage}`, error.data || error);
      throw new Error(`Failed to list ElevenLabs voices: ${errorMessage}`);
    }
  }
  
  validateConfig?(config: Record<string, any>): boolean | Promise<boolean> {
    if (!config || !config.elevenlabs || !config.elevenlabs.apiKey) {
      throw new Error('ElevenLabs configuration requires runtimeConfig.elevenlabs.apiKey');
    }
    return true;
  }

  async createPodcastConversation(request: PodcastCreationRequest): Promise<PodcastCreationResponse> {
    const { 
      elevenLabsApiKey, // This should ideally come from this.config.apiKey
      elevenLabsProjectId,
      podcastName,
      scriptText,
      hostVoiceId,
      guestVoiceId,
      modelId,
      titleVoiceId,
      // voiceSettingsId, // Not directly used in the podcast creation body from docs
    } = request;

    if (!elevenLabsProjectId) {
      throw new Error('ElevenLabs Project ID is required to create a podcast.');
    }

    const effectiveModelId = modelId || this.config.defaultModelId || 'eleven_multilingual_v2';
    const apiUrl = `${this.elevenLabsBaseUrl}/studio/projects/${elevenLabsProjectId}/podcasts`;

    // Construct the request body for ElevenLabs Podcast API
    const payload: any = {
      name: podcastName,
      model_id: effectiveModelId,
      source_type: 'text',
      source: {
        type: 'text',
        text: scriptText, // Already formatted "Host: ...\nGuest: ..."
      },
      mode: {
        type: 'conversation',
        conversation: {
          host_voice_id: hostVoiceId,
          guest_voice_id: guestVoiceId,
        },
      },
    };

    // Optional fields
    if (titleVoiceId) {
      payload.title_voice_id = titleVoiceId;
    }
    // Note: The API documentation for POST /v1/studio/projects/{project_id}/podcasts
    // doesn't explicitly mention 'voice_settings_id' at the top level for podcast creation.
    // It's usually part of text-to-speech calls. If it's needed, it would be part of 'mode' or 'source'.
    // For now, assuming it's not directly part of this specific API call's top-level body.

    try {
      console.log(`Calling ElevenLabs Create Podcast API: ${apiUrl}`);
      console.log('Request payload:', JSON.stringify(payload, null, 2));

      const response = await $fetch(apiUrl, {
        method: 'POST',
        headers: {
          'xi-api-key': this.config.apiKey, // Use apiKey from internal config
          'Content-Type': 'application/json',
        },
        body: payload,
      }) as PodcastCreationResponse;

      console.log('ElevenLabs Create Podcast API response:', response);
      return response; // The API directly returns the PodcastCreationResponse structure

    } catch (error: any) {
      const errorMessage = error.data?.detail?.message || error.data?.message || error.message || 'Unknown ElevenLabs Podcast API error';
      console.error(`ElevenLabs Podcast API error (${this.providerId}): ${errorMessage}`, error.data || error);
      // Try to parse the error response if it's JSON
      let errorDetails = {};
      if (error.data && typeof error.data === 'string') {
        try {
          errorDetails = JSON.parse(error.data);
        } catch (e) {
          // ignore if not JSON
        }
      } else if (error.data) {
        errorDetails = error.data;
      }
      throw new Error(`ElevenLabs Podcast creation failed: ${errorMessage} - Details: ${JSON.stringify(errorDetails)}`);
    }
  }
}
