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
  appId: string; // Add appId
  accessToken: string; // Add accessToken
  cluster: string; // Add cluster
  instanceId: string; // Add instanceId
  publicOutputDirectory: string;
  storageOutputDirectory: string;
  baseFilename: string;
  encoding?: 'mp3' | 'pcm' | 'wav';
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
  enableTimestamps?: boolean; // Added for consistency, was previously hardcoded in the function
  emotion?: string;         // 音色情感
  enableEmotion?: boolean;  // 是否启用情感
  emotionScale?: number;    // 情绪值强度
  loudnessRatio?: number;   // 音量调节
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
    appId,
    accessToken,
    cluster,
    instanceId,
    publicOutputDirectory,
    storageOutputDirectory,
    baseFilename,
    encoding = 'mp3',
    speedRatio = 1.0,
    volumeRatio = 1.0,
    pitchRatio = 1.0,
    enableTimestamps = true,
    emotion = 'happy',        // 默认开心情感
    enableEmotion = true,     // 默认启用情感
    emotionScale = 4.5,       // 稍微提高情绪强度
    loudnessRatio = 1.2       // 稍微提高音量
  } = params;

  console.log('[Volcengine Config Debug - timedAudioService] Received Volcengine config parameters:');
  console.log('[Volcengine Config Debug - timedAudioService] AppId:', appId);
  console.log('[Volcengine Config Debug - timedAudioService] AccessToken:', accessToken);
  console.log('[Volcengine Config Debug - timedAudioService] Cluster:', cluster);
  console.log('[Volcengine Config Debug - timedAudioService] InstanceId:', instanceId);

  try {
    const volcengineApiParams: VolcengineSynthesizeParams = {
      text,
      appId, // Pass appId
      accessToken, // Pass accessToken
      cluster, // Pass cluster
      voiceType, // Pass voiceType (renamed from 'voice' in VolcengineSynthesizeParams to 'voiceType' here for clarity)
      instanceId, // Pass instanceId
      enableTimestamps: enableTimestamps, 
      encoding,
      speedRatio,
      volumeRatio,
      pitchRatio,
      emotion,
      enableEmotion,
      emotionScale,
      loudnessRatio
    };

    const volcResponse = await synthesizeSpeechVolcengine(volcengineApiParams);

    if (!volcResponse) { // Handle null response if synthesizeSpeechVolcengine returns null on error
      console.error('[timedAudioService - Volcengine] Error from synthesizeSpeechVolcengine: Received null response.');
      return { error: 'Failed to get audio or timestamps from Volcengine (null response).', provider: 'volcengine' };
    }

    if (volcResponse.error || !volcResponse.audioBuffer || !volcResponse.timestamps) {
      console.error('[timedAudioService - Volcengine] Error from synthesizeSpeechVolcengine:', volcResponse.error);
      return { error: volcResponse.error || 'Failed to get audio or timestamps from Volcengine.', provider: 'volcengine' };
    }

    const audioBuffer = volcResponse.audioBuffer; // audioBuffer is already an ArrayBuffer, no need to Buffer.from(..., 'base64') here
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
      durationMs: volcResponse.durationMs === null ? undefined : volcResponse.durationMs, // Ensure null is handled
      provider: 'volcengine',
    };

  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error during Volcengine TTS or file storage.';
    console.error(`[timedAudioService - Volcengine] Error for ${baseFilename}: ${errorMessage}`, error);
    return { error: `TTS/Storage Error: ${errorMessage}`, provider: 'volcengine' };
  }
}
