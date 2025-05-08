// server/api/tts/voices.get.ts
import type { H3Event } from 'h3';
import { getTtsProvider, listAvailableTtsProviders } from '../../services/tts/factory'; // Adjusted path
import type { VoiceModel } from '../../services/tts/types'; // Adjusted path

export default defineEventHandler(async (event: H3Event) => {
  const query = getQuery(event);
  const providerId = query.providerId as string | undefined;
  const languageCode = query.languageCode as string | undefined; // Optional language filter

  const runtimeConfig = useRuntimeConfig(event);

  if (!providerId) {
    // If no providerId is given, we could list all available provider IDs
    // or default to a specific one, or return an error.
    // Let's return an error for now, or list available providers.
    // const availableProviders = listAvailableTtsProviders();
    // return createError({
    //   statusCode: 400,
    //   statusMessage: `Bad Request: Missing providerId query parameter. Available providers: ${availableProviders.join(', ')}`,
    // });
    // For now, let's default to 'elevenlabs' if not provided, common use case.
    console.warn("providerId not specified in /api/tts/voices, defaulting to 'elevenlabs'");
    const defaultProviderId = 'elevenlabs'; 
    try {
        const defaultTtsProvider = getTtsProvider(defaultProviderId, runtimeConfig);
        if (!defaultTtsProvider.listVoices) {
            throw createError({ statusCode: 501, statusMessage: `Provider '${defaultProviderId}' does not support listing voices.` });
        }
        const voices = await defaultTtsProvider.listVoices(languageCode);
        return voices;
    } catch (error: any) {
        console.error(`Error fetching voices for default provider '${defaultProviderId}':`, error);
        throw createError({
            statusCode: error.statusCode || 500,
            statusMessage: error.statusMessage || `Failed to list voices for ${defaultProviderId}: ${error.message}`,
        });
    }
  }

  try {
    const ttsProvider = getTtsProvider(providerId, runtimeConfig);

    if (!ttsProvider.listVoices) {
      throw createError({ statusCode: 501, statusMessage: `Provider '${providerId}' does not support listing voices.` });
    }

    const voices: VoiceModel[] = await ttsProvider.listVoices(languageCode);
    return voices;
  } catch (error: any) {
    console.error(`Error fetching voices for provider '${providerId}':`, error);
    // Check if it's a H3Error from createError (e.g., from getTtsProvider if provider not found)
    if (error.statusCode && error.statusMessage) {
        throw error;
    }
    // Generic error
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to list voices for ${providerId}: ${error.message}`,
    });
  }
});
