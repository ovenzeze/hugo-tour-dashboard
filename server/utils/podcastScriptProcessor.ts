// server/utils/podcastScriptProcessor.ts
import { useRuntimeConfig } from '#imports'; // May not be needed if no runtimeConfig specific logic remains

// Interface for persona data
interface Persona {
  name: string;
  voice_model_identifier: string;
}

// Interface for individual script segments from input
interface ScriptSegment {
  speaker: string;
  text: string;
}

// New interface for the output of this function, preparing segments for the next synthesis step
export interface PreparedSegmentForSynthesis {
  segmentIndex: number;
  text: string;
  voiceId: string;
  speakerName: string; // Original speaker name, can be used by next step for filename
  error?: string;     // For errors like voiceId not found
}

/**
 * Processes the raw podcast script and personas to prepare segments for TTS synthesis.
 * This function identifies the speaker, text, and voiceId for each segment.
 * It does NOT perform TTS itself.
 */
export async function processPodcastScript(
  podcastId: string, // podcastId might still be useful for context or logging
  script: ScriptSegment[],
  personas: { hostPersona?: Persona; guestPersonas?: Persona[] }
  // storageService is no longer passed as this function doesn't write files
): Promise<PreparedSegmentForSynthesis[]> {
  // const runtimeConfig = useRuntimeConfig(); // Uncomment if needed for any other logic

  const preparedSegments: PreparedSegmentForSynthesis[] = [];
  let segmentIndex = 0;

  for (const segment of script) {
    segmentIndex++;
    const { speaker, text } = segment;

    if (!speaker || !text) {
      console.warn(`[processPodcastScript] Skipping segment ${segmentIndex} for podcast "${podcastId}" due to missing speaker or text.`);
      preparedSegments.push({
        segmentIndex,
        text: text || '',
        speakerName: speaker || 'Unknown',
        voiceId: '', // No voiceId if speaker/text is missing
        error: 'Segment missing speaker or text.',
      });
      continue;
    }

    // Find the voiceId for the speaker
    let voiceId: string | null = null;
    if (personas.hostPersona && personas.hostPersona.name && personas.hostPersona.name.startsWith(speaker)) {
      voiceId = personas.hostPersona.voice_model_identifier;
    } else if (personas.guestPersonas && Array.isArray(personas.guestPersonas)) {
      const guest = personas.guestPersonas.find(p => p.name && p.name.startsWith(speaker));
      if (guest) {
        voiceId = guest.voice_model_identifier;
      }
    }

    if (!voiceId) {
      console.warn(`[processPodcastScript] Could not find voiceId for speaker: "${speaker}" in segment ${segmentIndex} for podcast "${podcastId}".`);
      preparedSegments.push({
        segmentIndex,
        text,
        speakerName: speaker,
        voiceId: '', // No voiceId found
        error: `Could not find voiceId for speaker: ${speaker}`,
      });
      continue;
    }

    // Segment is ready for the next synthesis step
    preparedSegments.push({
      segmentIndex,
      text,
      voiceId, // voiceId is guaranteed to be a string here
      speakerName: speaker,
    });
  }

  console.log(`[processPodcastScript] Prepared ${preparedSegments.length} segments for podcast "${podcastId}".`);
  return preparedSegments;
}