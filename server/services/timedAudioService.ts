// server/services/timedAudioService.ts
import { ElevenLabsClient } from 'elevenlabs';
import type { IStorageService } from './storageService';
import {
  synthesizeSpeechVolcengine,
  type SynthesizeSpeechParams as VolcengineSynthesizeParams,
  type SynthesizedAudioResult as VolcengineSynthesizedAudioResult,
  type FrontendTimestampData as VolcengineTimestamps,
} from '~/server/utils/volcengineTTS'; // Assuming volcengineTTS.ts is in server/utils

export interface TimedAudioSegmentResult {
  audioFileUrl?: string;
  timestampFileUrl?: string;
  durationMs?: number;
  error?: string;
  provider?: 'elevenlabs' | 'volcengine'; // Optional: to indicate which provider was used
}

// Parameters for ElevenLabs
export interface ElevenLabsParams {
  text: string;
  voiceId: string; // ElevenLabs specific voice ID
  storageService: IStorageService;
  elevenLabsApiKey: string;
  publicOutputDirectory: string;
  storageOutputDirectory: string;
  baseFilename: string;
  defaultModelId?: string;
  voiceSettings?: {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
}

// Parameters for Volcengine
export interface VolcengineParams {
  text: string;
  voiceType: string; // Volcengine specific voice type (e.g., 'BV001_streaming')
  storageService: IStorageService;
  // Volcengine config (appId, accessToken, cluster, instanceId) will be read from runtimeConfig by synthesizeSpeechVolcengine
  publicOutputDirectory: string;
  storageOutputDirectory: string;
  baseFilename: string;
  encoding?: 'mp3' | 'pcm' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
}

export async function generateAndStoreTimedAudioSegmentElevenLabs(
  params: ElevenLabsParams
): Promise<TimedAudioSegmentResult> {
  const {
    text,
    voiceId, // This is the ElevenLabs voiceId
    storageService,
    elevenLabsApiKey,
    publicOutputDirectory,
    storageOutputDirectory,
    baseFilename,
    defaultModelId,
    voiceSettings,
  } = params;
  console.log('[timedAudioService - ElevenLabs] Received storageOutputDirectory:', storageOutputDirectory);
  console.log('[timedAudioService - ElevenLabs] Received publicOutputDirectory:', publicOutputDirectory);

  if (!elevenLabsApiKey) {
    console.error('[timedAudioService - ElevenLabs] API key is missing.');
    return { error: 'ElevenLabs API key is missing.', provider: 'elevenlabs' };
  }

  const elevenlabs = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

  try {
    console.log(`[timedAudioService - ElevenLabs] Calling convertWithTimestamps for voice: ${voiceId}, baseFilename: ${baseFilename}`);

    const ttsRequest: any = { text: text };
    if (defaultModelId) {
      ttsRequest.model_id = defaultModelId;
    }
    if (voiceSettings) {
      ttsRequest.voice_settings = voiceSettings;
    }

    const response = await elevenlabs.textToSpeech.convertWithTimestamps(voiceId, ttsRequest);
    const responseAsAny = response as any; // ElevenLabs SDK types might not be fully up-to-date or complete

    const hasAudioBase64 = responseAsAny && typeof responseAsAny.audio_base64 === 'string';
    const hasValidAlignment = responseAsAny && responseAsAny.alignment && Array.isArray(responseAsAny.alignment.characters);

    if (!hasAudioBase64 || !hasValidAlignment) {
      console.error('[timedAudioService - ElevenLabs] Validation failed for SDK response structure.');
      return { error: 'Invalid response structure from ElevenLabs SDK.', provider: 'elevenlabs' };
    }

    const audioBuffer = Buffer.from(responseAsAny.audio_base64, 'base64');
    const alignmentData = responseAsAny.alignment; // This is ElevenLabs specific alignment format

    const audioExtension = 'mp3';
    const audioFilename = `${baseFilename}.${audioExtension}`;
    const timestampFilename = `${baseFilename}.elevenlabs.json`; // Differentiate timestamp format

    const audioStoragePath = storageService.joinPath(storageOutputDirectory, audioFilename);
    const timestampStoragePath = storageService.joinPath(storageOutputDirectory, timestampFilename);

    await storageService.writeFile(audioStoragePath, audioBuffer);
    await storageService.writeFile(timestampStoragePath, JSON.stringify(alignmentData, null, 2));

    const audioFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, audioFilename));
    const timestampFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, timestampFilename));
    
    const durationMs = responseAsAny.duration_ms;

    return {
      audioFileUrl,
      timestampFileUrl,
      durationMs,
      provider: 'elevenlabs',
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during ElevenLabs TTS or file storage.';
    console.error(`[timedAudioService - ElevenLabs] Error for ${baseFilename}: ${errorMessage}`, error);
    return { error: `TTS/Storage Error: ${errorMessage}`, provider: 'elevenlabs' };
  }
}


export async function generateAndStoreTimedAudioSegmentVolcengine(
  params: VolcengineParams
): Promise<TimedAudioSegmentResult> {
  const {
    text,
    voiceType,
    storageService,
    publicOutputDirectory,
    storageOutputDirectory,
    baseFilename,
    encoding = 'mp3', // Default to mp3 for Volcengine as well
    speedRatio,
    volumeRatio,
    pitchRatio,
  } = params;

  console.log('[timedAudioService - Volcengine] Received storageOutputDirectory:', storageOutputDirectory);
  console.log('[timedAudioService - Volcengine] Received publicOutputDirectory:', publicOutputDirectory);

  try {
    const volcengineParams: VolcengineSynthesizeParams = {
      text,
      voice: voiceType,
      enableTimestamps: true, // Always enable for this service's purpose
      encoding,
      speedRatio,
      volumeRatio,
      pitchRatio,
    };

    console.log(`[timedAudioService - Volcengine] Calling synthesizeSpeechVolcengine for voice: ${voiceType}, baseFilename: ${baseFilename}`);
    const volcResponse = await synthesizeSpeechVolcengine(volcengineParams);

    if (volcResponse.error || !volcResponse.audioBase64 || !volcResponse.timestamps) {
      console.error('[timedAudioService - Volcengine] Error from synthesizeSpeechVolcengine:', volcResponse.error);
      return { error: volcResponse.error || 'Failed to get audio or timestamps from Volcengine.', provider: 'volcengine' };
    }

    const audioBuffer = Buffer.from(volcResponse.audioBase64, 'base64');
    // Volcengine provides timestamps in `FrontendTimestampData` format (words, phonemes)
    const timestampData: VolcengineTimestamps = volcResponse.timestamps;

    const audioExtension = encoding; // mp3, wav, pcm
    const audioFilename = `${baseFilename}.${audioExtension}`;
    const timestampFilename = `${baseFilename}.volcengine.json`; // Differentiate timestamp format

    const audioStoragePath = storageService.joinPath(storageOutputDirectory, audioFilename);
    const timestampStoragePath = storageService.joinPath(storageOutputDirectory, timestampFilename);

    await storageService.writeFile(audioStoragePath, audioBuffer);
    await storageService.writeFile(timestampStoragePath, JSON.stringify(timestampData, null, 2));

    const audioFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, audioFilename));
    const timestampFileUrl = storageService.getPublicUrl(storageService.joinPath(publicOutputDirectory, timestampFilename));
    
    return {
      audioFileUrl,
      timestampFileUrl,
      durationMs: volcResponse.durationMs === null ? undefined : volcResponse.durationMs,
      provider: 'volcengine',
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during Volcengine TTS or file storage.';
    console.error(`[timedAudioService - Volcengine] Error for ${baseFilename}: ${errorMessage}`, error);
    return { error: `TTS/Storage Error: ${errorMessage}`, provider: 'volcengine' };
  }
}
