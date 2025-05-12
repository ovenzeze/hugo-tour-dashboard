import { useRuntimeConfig } from '#imports';
import { fetchElevenLabsAPI } from '../utils/elevenlabsClient'; // Import the custom fetch helper
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

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
  podcastId: string, // New parameter for podcast identifier
  script: ScriptSegment[],
  personas: { hostPersona?: Persona; guestPersonas?: Persona[] }
): Promise<ProcessedSegment[]> {
  const runtimeConfig = useRuntimeConfig();
  // API Key check is now primarily handled by fetchElevenLabsAPI, but good to have here too.
  const apiKey = runtimeConfig.elevenlabs?.apiKey || process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('ElevenLabs API key is missing');
    throw new Error('ElevenLabs API key is missing');
  }
 
   const baseOutputDir = resolve(process.cwd(), 'public/podcasts', podcastId);
   const segmentsOutputDir = join(baseOutputDir, 'segments');
   if (!existsSync(segmentsOutputDir)) {
     mkdirSync(segmentsOutputDir, { recursive: true });
   }

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
        const fullAudioPath = join(segmentsOutputDir, audioFilename);
        writeFileSync(fullAudioPath, audioBuffer);
        audioFilePath = `/podcasts/${podcastId}/segments/${audioFilename}`;
        console.log(`Saved audio for ${speaker} to ${audioFilePath}`);
      }

      if (audioResult.alignment) {
        const timestampsFilename = `${baseFilename}.json`;
        const fullTimestampsPath = join(segmentsOutputDir, timestampsFilename);
        writeFileSync(fullTimestampsPath, JSON.stringify(audioResult.alignment, null, 2));
        timestampsFilePath = `/podcasts/${podcastId}/segments/${timestampsFilename}`;
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