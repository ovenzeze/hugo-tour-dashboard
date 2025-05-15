// server/services/timedAudioService.ts
import { ElevenLabsClient } from 'elevenlabs';
import type { IStorageService } from './storageService';

export interface TimedAudioSegmentResult {
  audioFileUrl?: string;
  timestampFileUrl?: string;
  error?: string;
}

export async function generateAndStoreTimedAudioSegment(
  params: {
    text: string;
    voiceId: string;
    storageService: IStorageService;
    elevenLabsApiKey: string;
    publicOutputDirectory: string; // Relative to public root, e.g., 'podcasts/podcastId/segments'
    storageOutputDirectory: string; // Relative to project root for storage, e.g., 'public/podcasts/podcastId/segments'
    baseFilename: string;    // e.g., '001_speaker_name' (without extension)
    defaultModelId?: string; // e.g., 'eleven_multilingual_v2'
    voiceSettings?: {
      stability?: number;
      similarity_boost?: number;
      style?: number;
      use_speaker_boost?: boolean;
    };
  }
): Promise<TimedAudioSegmentResult> {
  const {
    text,
    voiceId,
    storageService,
    elevenLabsApiKey,
    publicOutputDirectory,
    storageOutputDirectory,
    baseFilename,
    defaultModelId,
    voiceSettings,
  } = params;
  console.log('[timedAudioService] Received storageOutputDirectory:', storageOutputDirectory);
  console.log('[timedAudioService] Received publicOutputDirectory:', publicOutputDirectory);

  if (!elevenLabsApiKey) {
    console.error('[timedAudioService] ElevenLabs API key is missing.');
    return { error: 'ElevenLabs API key is missing.' };
  }

  const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

  try {
    console.log(`[timedAudioService] Calling ElevenLabs convertWithTimestamps for voice: ${voiceId}, baseFilename: ${baseFilename}`);

    const ttsRequest: any = { text: text };
    if (defaultModelId) {
      ttsRequest.model_id = defaultModelId;
    }
    if (voiceSettings) {
      ttsRequest.voice_settings = voiceSettings;
    }

    const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, ttsRequest);

    console.log('[timedAudioService] ElevenLabs SDK response received.');
    // console.dir(response, { depth: null }); // Commented out to reduce log verbosity

    const responseAsAny = response as any;

    const hasAudioBase64 = responseAsAny && typeof responseAsAny.audio_base64 === 'string';
    const hasValidAlignment = responseAsAny && responseAsAny.alignment && Array.isArray(responseAsAny.alignment.characters);

    if (!hasAudioBase64 || !hasValidAlignment) {
      console.error('[timedAudioService] Validation failed for ElevenLabs SDK response structure.');
      console.error(`[timedAudioService] Has Audio Base64: ${hasAudioBase64}, Has Valid Alignment: ${hasValidAlignment}`);
      if (responseAsAny && !hasAudioBase64) {
        console.error(`[timedAudioService] response.audio_base64 is missing or not a string. Found:`, responseAsAny.audio_base64);
      }
      if (responseAsAny && responseAsAny.alignment) {
        console.error(`[timedAudioService] Actual response.alignment:`, responseAsAny.alignment);
      } else {
        console.error(`[timedAudioService] response.alignment is missing.`);
      }
      return { error: 'Invalid response structure from ElevenLabs SDK (expected audio_base64 string and alignment data).' };
    }

    const audioBuffer = Buffer.from(responseAsAny.audio_base64, 'base64');
    const alignmentData = responseAsAny.alignment;

    const audioExtension = 'mp3'; // Assuming MP3 from base64 audio
    const audioFilename = `${baseFilename}.${audioExtension}`;
    const timestampFilename = `${baseFilename}.json`;

    const audioStoragePath = storageService.joinPath(storageOutputDirectory, audioFilename);
    const timestampStoragePath = storageService.joinPath(storageOutputDirectory, timestampFilename);

    await storageService.writeFile(audioStoragePath, audioBuffer);
    await storageService.writeFile(timestampStoragePath, JSON.stringify(alignmentData, null, 2));

    const audioFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, audioFilename));
    const timestampFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, timestampFilename));

    console.log(`[timedAudioService] Saved audio to ${audioFileUrl}`);
    console.log(`[timedAudioService] Saved timestamps to ${timestampFileUrl}`);

    return {
      audioFileUrl,
      timestampFileUrl,
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during ElevenLabs TTS or file storage.';
    console.error(`[timedAudioService] Error for ${baseFilename}: ${errorMessage}`, error);
    if (error.stack) {
        console.error(error.stack);
    }
    return { error: `TTS/Storage Error: ${errorMessage}` };
  }
}