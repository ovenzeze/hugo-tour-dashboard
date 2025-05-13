import { useRuntimeConfig } from '#imports';
import { fetchElevenLabsAPI } from '../utils/elevenlabsClient'; // Import the custom fetch helper
// fs and path imports will be replaced by storageService methods
import { IStorageService } from '../services/storageService'; // Corrected import path

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
  const apiKey = runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('ElevenLabs API key is missing');
    throw new Error('ElevenLabs API key is missing');
  }
  
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
      // Use the custom fetchElevenLabsAPI helper
      const audioResult = await fetchElevenLabsAPI({
        endpoint: `/text-to-speech/${voiceId}/with-timestamps`, // Assuming baseUrl from config includes /v1
        method: 'POST',
        body: {
          text: text,
          model_id: 'eleven_multilingual_v2', // Use the same default model as the API endpoint
          // voice_settings: {}, // Optional: specify voice settings
          // optimize_streaming_latency: 3, // Optional: specify latency optimization
        },
        responseType: 'json', // Expecting JSON response with audio and timestamps
      });

      let audioFilePath: string | undefined = undefined;
      let timestampsFilePath: string | undefined = undefined;
      const safeSpeakerName = speaker.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 50);
      const baseFilename = `${String(segmentIndex).padStart(3, '0')}_${safeSpeakerName}`;

      if (audioResult.audio_base64) {
        const audioBuffer = Buffer.from(audioResult.audio_base64, 'base64');
        const audioFilename = `${baseFilename}.mp3`;
        // Path for storage operations (relative to project root for LocalStorageService)
        const audioStoragePath = storageService.joinPath(segmentsStoragePath, audioFilename);
        await storageService.writeFile(audioStoragePath, audioBuffer);
        // Path for public URL (relative to public dir)
        audioFilePath = storageService.getPublicUrl(storageService.joinPath(segmentsPublicPath, audioFilename));
        console.log(`Saved audio for ${speaker} to ${audioFilePath}`);
      }

      if (audioResult.alignment) {
        const timestampsFilename = `${baseFilename}.json`;
        // Path for storage operations
        const timestampsStoragePath = storageService.joinPath(segmentsStoragePath, timestampsFilename);
        await storageService.writeFile(timestampsStoragePath, JSON.stringify(audioResult.alignment, null, 2));
        // Path for public URL
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