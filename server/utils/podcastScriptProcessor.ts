import { useRuntimeConfig } from '#imports';
// Removed: import { fetchElevenLabsAPI } from '../utils/elevenlabsClient';
import { getTtsProvider } from '../services/tts/factory'; // Import TTS Provider factory
import type { VoiceSynthesisRequest, VoiceSynthesisWithTimestampsResponse } from '../services/tts/types'; // Import types
import { IStorageService } from '../services/storageService';

interface Persona {
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface ProcessedSegment extends ScriptSegment {
  audio?: string; // Path to the saved audio file
  timestamps?: string; // Path to the saved timestamp JSON file
  error?: string;
}

export async function processPodcastScript(
  podcastId: string,
  script: ScriptSegment[],
  personas: { hostPersona?: Persona; guestPersonas?: Persona[] },
  storageService: IStorageService // Add storageService parameter
): Promise<ProcessedSegment[]> {
  const runtimeConfig = useRuntimeConfig();
  // API key check will be handled by the TTS provider
  
  // Define paths relative to the storage service's public root
  const podcastPublicPath = storageService.joinPath('podcasts', podcastId);
  const segmentsPublicPath = storageService.joinPath(podcastPublicPath, 'segments');
  
  // Ensure directories exist using storage service
  // storageService.ensureDir expects path relative to project root for LocalStorageService
  // For LocalStorageService, public/podcasts/podcastId/segments
  const segmentsStoragePath = storageService.joinPath('public', segmentsPublicPath);
  await storageService.ensureDir(segmentsStoragePath);

  const processedSegments: ProcessedSegment[] = [];
  let segmentIndex = 0;

  for (const segment of script) {
    segmentIndex++;
    const { speaker, text } = segment;

    if (!speaker || !text) {
      console.warn('Skipping segment due to missing speaker or text:', segment);
      continue;
    }

    // Find the voiceId for the speaker
    let voiceId = null;
    if (personas.hostPersona && personas.hostPersona.name.startsWith(speaker)) {
      voiceId = personas.hostPersona.voice_model_identifier;
    } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
      const guest = personas.guestPersonas.find(p => p.name.startsWith(speaker));
      if (guest) {
        voiceId = guest.voice_model_identifier; // Corrected access based on user-provided persona structure
      }
    }

    if (!voiceId) {
      console.warn(`Could not find voiceId for speaker: ${speaker}. Skipping segment.`);
      processedSegments.push({
        speaker: speaker,
        text: text,
        error: `Could not find voiceId for speaker: ${speaker}`,
      });
      continue;
    }

    console.log(`Generating audio with timestamps for speaker: ${speaker} with voiceId: ${voiceId}`);

    try {
      // Determine TTS provider (assuming ElevenLabs for now, but could be dynamic)
      const ttsProviderId = 'elevenlabs'; // This could come from persona or config
      const ttsProvider = getTtsProvider(ttsProviderId, runtimeConfig);

      if (!ttsProvider.generateSpeechWithTimestamps) {
        throw new Error(`TTS Provider ${ttsProviderId} does not support generateSpeechWithTimestamps.`);
      }

      const synthesisRequest: VoiceSynthesisRequest = {
        text: text,
        voiceId: voiceId,
        // modelId: 'eleven_multilingual_v2', // Model can be set in provider or here if needed
        // providerOptions: {}, // Voice settings can be passed here
        outputFormat: 'mp3_44100_128' // Example, ensure provider handles this
      };

      const ttsResult: VoiceSynthesisWithTimestampsResponse = await ttsProvider.generateSpeechWithTimestamps(synthesisRequest);

      let audioFilePath: string | undefined = undefined;
      let timestampsFilePath: string | undefined = undefined;
      const safeSpeakerName = speaker.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;

      if (ttsResult.audioData) {
        // audioData is ArrayBuffer, convert to Buffer for writeFile
        const audioBuffer = Buffer.from(ttsResult.audioData);
        // Infer extension from contentType or default to mp3
        const extension = ttsResult.contentType.includes('mpeg') ? 'mp3' :
                          ttsResult.contentType.includes('wav') ? 'wav' : 'mp3';
        const audioFilename = `${baseFilename}.${extension}`;
        
        const audioStoragePath = storageService.joinPath(segmentsStoragePath, audioFilename);
        await storageService.writeFile(audioStoragePath, audioBuffer);
        audioFilePath = storageService.getPublicUrl(storageService.joinPath(segmentsPublicPath, audioFilename));
        console.log(`Saved audio for ${speaker} to ${audioFilePath} (Content-Type: ${ttsResult.contentType})`);
      }

      if (ttsResult.timestamps) {
        // Assuming ttsResult.timestamps is already in the desired format (e.g., AlignmentData)
        // If not, transformation would be needed here.
        // The `timelineUtils` expects `AlignmentData` { characters, character_start_times_seconds, character_end_times_seconds }
        // The ElevenLabs SDK's convertWithTimestamps likely returns this or similar.
        const timestampsFilename = `${baseFilename}.json`;
        const timestampsStoragePath = storageService.joinPath(segmentsStoragePath, timestampsFilename);
        await storageService.writeFile(timestampsStoragePath, JSON.stringify(ttsResult.timestamps, null, 2));
        timestampsFilePath = storageService.getPublicUrl(storageService.joinPath(segmentsPublicPath, timestampsFilename));
        console.log(`Saved timestamps for ${speaker} to ${timestampsFilePath}`);
      }

      processedSegments.push({
        speaker: speaker,
        text: text,
        audio: audioFilePath,
        timestamps: timestampsFilePath,
      });

    } catch (ttsError: any) {
      console.error(`Error generating TTS for speaker ${speaker}:`, ttsError.message || ttsError);
      processedSegments.push({
        speaker: speaker,
        text: text,
        error: `Failed to generate audio: ${ttsError.message}`,
      });
    }
  }

  return processedSegments;
}