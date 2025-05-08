// server/services/tts/types.ts

/**
 * Represents the common parameters for a text-to-speech synthesis request.
 */
export interface VoiceSynthesisRequest {
  text: string;
  voiceId: string; // Provider-specific voice identifier
  modelId?: string; // Provider-specific model identifier (optional for some providers)
  languageCode?: string; // e.g., 'en-US', 'zh-CN' (optional, provider might infer)
  outputFormat?: string; // e.g., 'mp3_44100_128', 'pcm' (provider-specific, or we can define common ones)
  providerOptions?: Record<string, any>; // For any provider-specific settings like stability, style, etc.
}

/**
 * Represents the common response from a text-to-speech synthesis request.
 */
export interface VoiceSynthesisResponse {
  audioData: ArrayBuffer; // The synthesized audio data
  contentType: string; // e.g., 'audio/mpeg', 'audio/wav'
  durationSeconds?: number; // Optional: duration of the audio in seconds
  fileName?: string; // Optional: suggested filename
}

/**
 * Represents an available voice model from a TTS provider.
 */
export interface VoiceModel {
  id: string; // Provider-specific voice ID
  name: string; // Human-readable name of the voice
  gender?: string; // e.g., 'male', 'female', 'neutral'
  languageCodes?: string[]; // List of supported language codes
  provider: string; // The ID of the provider this voice belongs to (e.g., 'elevenlabs')
  providerMetadata?: Record<string, any>; // Any other relevant metadata from the provider
}

/**
 * Interface for a Text-to-Speech (TTS) provider.
 * All TTS provider implementations should adhere to this contract.
 */
export interface TextToSpeechProvider {
  /**
   * A unique identifier for the TTS provider (e.g., "elevenlabs", "google-tts").
   */
  readonly providerId: string;

  /**
   * Generates speech audio from the given text.
   * @param request - The parameters for the voice synthesis.
   * @returns A promise that resolves to the synthesized audio data and its metadata.
   * @throws Error if synthesis fails.
   */
  generateSpeech(request: VoiceSynthesisRequest): Promise<VoiceSynthesisResponse>;

  /**
   * (Optional) Lists available voices from the provider.
   * Providers might filter voices by language.
   * @param languageCode - Optional ISO 639-1 language code (e.g., "en", "es") to filter voices.
   * @returns A promise that resolves to an array of available voice models.
   * @throws Error if listing voices fails or is not supported.
   */
  listVoices?(languageCode?: string): Promise<VoiceModel[]>;

  /**
   * (Optional) Validates the provider-specific configuration (e.g., API keys).
   * @param config - The runtime configuration containing API keys and other settings.
   * @returns True if the configuration is valid, otherwise throws an error or returns false.
   */
  validateConfig?(config: Record<string, any>): boolean | Promise<boolean>;

  /**
   * Creates a podcast conversation using the provider's capabilities.
   * This is optional as not all TTS providers support podcast generation.
   * @param request - The parameters for the podcast creation.
   * @returns A promise that resolves to the podcast creation status and identifiers.
   * @throws Error if podcast creation fails.
   */
  createPodcastConversation?(request: PodcastCreationRequest): Promise<PodcastCreationResponse>;
}

/**
 * Represents the parameters for a podcast creation request, specifically for conversation mode.
 */
export interface PodcastCreationRequest {
  elevenLabsApiKey: string; // Should be retrieved from runtimeConfig, but good to have for explicitness if passed around
  elevenLabsProjectId: string; // The ID of the project in ElevenLabs Studio
  podcastName: string;
  scriptText: string; // Formatted script: "Host: ...\nGuest: ..."
  hostVoiceId: string;
  guestVoiceId: string;
  modelId?: string; // e.g., 'eleven_multilingual_v2', defaults can be handled in implementation
  titleVoiceId?: string; // Optional: Voice ID for the podcast title
  voiceSettingsId?: string; // Optional: Voice settings ID for paragraphs
}

/**
 * Represents the response from a podcast creation request from ElevenLabs.
 * Based on ElevenLabs' PodcastResponseModel.
 */
export interface PodcastCreationResponse {
  project_id: string;
  podcast_id: string;
  name: string;
  status: 'creating' | 'created' | 'failed' | string; // string for future-proofing if new statuses are added
  source_type: string;
  created_at_unix: number;
  updated_at_unix: number;
  // Potentially a URL to the generated content or a way to poll for it
  // For now, returning the core identifiers and status as per API docs.
  [key: string]: any; // Allow other properties that might be returned
}
