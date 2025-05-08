// server/services/tts/elevenlabs.ts
import type {
  TextToSpeechProvider,
  VoiceSynthesisRequest,
  VoiceSynthesisResponse,
  VoiceModel,
} from './types';
import { $fetch } from 'ofetch'; // Nuxt's built-in fetch utility

// Interface for ElevenLabs specific configuration
interface ElevenLabsConfig {
  apiKey: string;
  baseUrl?: string;
  defaultModelId?: string;
}

export class ElevenLabsProvider implements TextToSpeechProvider {
  readonly providerId = 'elevenlabs';
  private config: ElevenLabsConfig;
  private elevenLabsBaseUrl: string;

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

  async listVoices(languageCode?: string): Promise<VoiceModel[]> {
    const apiUrl = `${this.elevenLabsBaseUrl}/voices`;
    try {
      const response = await $fetch<any>(apiUrl, { // Specify expected response type if known
        method: 'GET',
        headers: {
          'xi-api-key': this.config.apiKey,
        },
      });

      if (!response || !Array.isArray(response.voices)) {
        console.error('Invalid response structure from ElevenLabs /voices endpoint:', response);
        throw new Error('Failed to list ElevenLabs voices: Invalid API response structure.');
      }

      const voices: VoiceModel[] = response.voices.map((v: any) => ({
        id: v.voice_id,
        name: v.name,
        gender: v.labels?.gender,
        languageCodes: v.labels?.language ? [v.labels.language] : (v.settings?.language ? [v.settings.language] : []), // Placeholder
        provider: this.providerId,
        providerMetadata: {
          category: v.category,
          description: v.description,
          labels: v.labels,
          preview_url: v.preview_url,
          settings: v.settings,
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
  
  validateConfig?(): boolean {
    if (!this.config.apiKey) {
        console.error("ElevenLabs API Key (runtimeConfig.elevenlabs.apiKey) is missing.");
        return false;
    }
    return true;
  }
}
