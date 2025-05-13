import { defineEventHandler } from 'h3';

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const apiKey = runtimeConfig.elevenlabs?.apiKey;
  if (!apiKey) {
    return { error: 'No ElevenLabs API key configured.' };
  }
  try {
    const response = await $fetch('https://api.elevenlabs.io/v1/studio/projects', {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    return response;
  } catch (e: any) {
    return { error: e?.message || 'Failed to fetch projects from ElevenLabs.' };
  }
}); 