// server/services/tts/factory.ts
import type { TextToSpeechProvider } from './types';
import { ElevenLabsProvider } from './elevenlabs'; // Assuming ElevenLabs is our first provider

// You will import other providers here as you add them
// import { GoogleTTSProvider } from './google';
// import { AzureTTSProvider } from './azure';

/**
 * A map holding all registered TTS provider classes.
 * The key is the providerId (e.g., "elevenlabs").
 */
const providerMap: Record<string, new (runtimeConfig: any) => TextToSpeechProvider> = {
  'elevenlabs': ElevenLabsProvider,
  // 'google': GoogleTTSProvider,
  // 'azure': AzureTTSProvider,
};

/**
 * Retrieves an instance of a TextToSpeechProvider based on the providerId.
 *
 * @param providerId - The unique identifier of the TTS provider (e.g., "elevenlabs").
 * @param runtimeConfig - The application's runtime configuration, which should contain
 *                        API keys and other settings for the TTS providers.
 *                        Each provider might expect its config under a specific key
 *                        (e.g., runtimeConfig.elevenlabs, runtimeConfig.googleTts).
 * @returns An instance of the requested TextToSpeechProvider.
 * @throws Error if the providerId is not recognized or if the provider's
 *               configuration is invalid or missing.
 */
export function getTtsProvider(providerId: string, runtimeConfig: any): TextToSpeechProvider {
  const ProviderClass = providerMap[providerId.toLowerCase()];

  if (!ProviderClass) {
    throw new Error(`TTS provider with id "${providerId}" not found. Available providers: ${Object.keys(providerMap).join(', ')}`);
  }

  try {
    const providerInstance = new ProviderClass(runtimeConfig);
    
    // Optionally, validate provider configuration if a validateConfig method is implemented
    if (typeof providerInstance.validateConfig === 'function') {
      const isValid = providerInstance.validateConfig(runtimeConfig);
      if (isValid === false) { // Check explicitly for false, as it might return Promise<boolean> or void
          throw new Error(`Configuration validation failed for TTS provider "${providerId}". Check server logs for details.`);
      }
      // If it returns a Promise, we might need to handle it if we want to await here,
      // but for constructor-time/initialization validation, synchronous is often simpler.
    }
    
    return providerInstance;
  } catch (error: any) {
    console.error(`Error instantiating TTS provider "${providerId}": ${error.message}`);
    // Re-throw or throw a more specific error
    throw new Error(`Failed to initialize TTS provider "${providerId}": ${error.message}`);
  }
}

/**
 * Optional: Lists all available/registered provider IDs.
 * @returns An array of registered provider IDs.
 */
export function listAvailableTtsProviders(): string[] {
    return Object.keys(providerMap);
}
