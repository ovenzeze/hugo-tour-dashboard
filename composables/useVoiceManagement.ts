// Removed: import { usePlaygroundUnifiedStore } from '../stores/playgroundUnified';
import { usePersonaCache } from '../composables/usePersonaCache';
// Removed: import { toast } from 'vue-sonner'; // Not used in this composable
import type { Persona } from '~/types/persona';
// Removed: import type { Tables } from '~/types/supabase'; // Not directly used
// Removed: import { useRuntimeConfig } from 'nuxt/app'; // Not directly used

// Voice interface can remain if it's a useful abstraction internally or for other components
export interface Voice {
  id: string; // voice_model_identifier
  name: string; // Persona name or voice name
  personaId: number | null;
  description?: string | null;
  avatarUrl?: string | null;
  provider?: string; // 'elevenlabs' | 'volcengine'
}

// This interface defines the structure of segments as processed or expected by this composable.
// It should use 'speaker' to align with the rest of the application (e.g., ScriptSegment type).
export interface ProcessedScriptSegmentForVoiceManagement {
  speaker: string;
  text: string;
  speakerPersonaId?: number | null; // Optional, but useful if available from upstream parsing
}

export function useVoiceManagement(
  // scriptContent: Ref<string>, // Raw script content is less relevant if parsed segments are provided
  // The composable should operate on already parsed segments from playgroundScriptStore.
  // These segments should conform to ScriptSegment from types/api/podcast.d.ts or a compatible structure.
  parsedSegments: Ref<{ speaker: string; text: string; speakerPersonaId: number | null }[]>,
  selectedHostPersona: Ref<Persona | undefined>,
  selectedGuestPersonas: Ref<Persona[]>
) {
  // Removed: const unifiedStore = usePlaygroundUnifiedStore();
  const personaCache = usePersonaCache();
  // Removed: const runtimeConfig = useRuntimeConfig();

  // Stores assignments: speakerName -> { voiceId (voice_model_identifier), provider }
  const speakerAssignments = ref<Record<string, { voiceId: string; provider: string }>>({});

  // speakersInScript should now derive from the input `parsedSegments`
  const speakersInScript = computed(() => {
    // Ensure parsedSegments.value is accessed, and it's an array before mapping
    if (!parsedSegments.value || !Array.isArray(parsedSegments.value)) {
      return [];
    }
    const uniqueSpeakers = new Set(parsedSegments.value.map(segment => segment.speaker));
    const speakersArray = Array.from(uniqueSpeakers);

    // Initialize or clean up assignments based on current speakers in script
    speakersArray.forEach(speaker => {
      if (!(speaker in speakerAssignments.value)) {
        speakerAssignments.value[speaker] = { voiceId: '', provider: '' };
      }
    });
    Object.keys(speakerAssignments.value).forEach(assignedSpeaker => {
      if (!speakersArray.includes(assignedSpeaker)) {
        delete speakerAssignments.value[assignedSpeaker];
      }
    });
    return speakersArray;
  });

  function findPersonaBySpeakerName(speakerName: string): Persona | undefined {
    const normalizedSpeakerName = String(speakerName || '').replace(/\s+/g, '').toLowerCase();
    if (selectedHostPersona.value && selectedHostPersona.value.name.replace(/\s+/g, '').toLowerCase() === normalizedSpeakerName) {
      return selectedHostPersona.value;
    }
    return selectedGuestPersonas.value.find(p => p.name.replace(/\s+/g, '').toLowerCase() === normalizedSpeakerName);
  }

  function assignVoicesToSpeakers() {
    console.info('[useVoiceManagement] Entering assignVoicesToSpeakers.');
    const localSpeakers = speakersInScript.value;
    const allAvailablePersonas = personaCache.personas.value; // All personas from cache

    if (allAvailablePersonas.length === 0) {
      console.warn('[useVoiceManagement] Personas not loaded yet. Skipping voice assignment.');
      return;
    }

    const newAssignments: Record<string, { voiceId: string; provider: string }> = { ...speakerAssignments.value };

    localSpeakers.forEach(speaker => {
      // Only attempt to auto-assign if not already manually assigned or if current assignment is empty
      if (!newAssignments[speaker] || !newAssignments[speaker].voiceId) {
        // Try to find a persona whose name matches the speaker name from the script
        let persona = findPersonaBySpeakerName(speaker); // Checks selected host/guests first

        if (!persona) { // If not among selected, check all available personas
          const normalizedSpeakerName = String(speaker || '').replace(/\s+/g, '').toLowerCase();
          persona = allAvailablePersonas.find(p => String(p.name || '').replace(/\s+/g, '').toLowerCase() === normalizedSpeakerName);
          if (persona) {
            console.log(`[useVoiceManagement] Found persona for '${speaker}' by matching name in allAvailablePersonas.`);
          }
        }
        
        // If a segment from `parsedSegments` has a speakerPersonaId, prioritize that
        const segmentWithThisSpeaker = parsedSegments.value.find(s => s.speaker === speaker && s.speakerPersonaId !== null && s.speakerPersonaId !== undefined);
        if (segmentWithThisSpeaker && segmentWithThisSpeaker.speakerPersonaId) {
            const personaFromSegmentId = personaCache.getPersonaById(segmentWithThisSpeaker.speakerPersonaId);
            if (personaFromSegmentId) {
                persona = personaFromSegmentId; // Prioritize persona matched by ID from script store
                console.log(`[useVoiceManagement] Prioritized persona for '${speaker}' using speakerPersonaId from scriptStore: ${persona.name}`);
            }
        }


        let voiceId = '';
        let provider = '';

        if (persona) {
          voiceId = persona.voice_model_identifier || '';
          // Ensure tts_provider is accessed safely, it's optional on Persona type
          provider = persona.tts_provider || '';
          
          if (voiceId) {
            console.log(`[useVoiceManagement] Assigned voice '${voiceId}' and provider '${provider}' from persona '${persona.name}' to speaker '${speaker}'.`);
          } else {
            console.warn(`[useVoiceManagement] Persona '${persona.name}' found for speaker '${speaker}', but is missing voice_model_identifier.`);
          }
        } else {
            console.warn(`[useVoiceManagement] No persona found for speaker '${speaker}'. Voice not assigned.`);
        }
        
        // If provider is still empty but voiceId suggests one (legacy or specific format)
        if (voiceId && !provider) {
            if (voiceId.includes('_mars_') || voiceId.includes('_volc_')) {
                provider = 'volcengine';
            } else if (voiceId.includes('_eleven_')) {
                provider = 'elevenlabs';
            }
            if (provider) {
                 console.log(`[useVoiceManagement] Derived provider '${provider}' for voiceId '${voiceId}' for speaker '${speaker}'.`);
            }
        }

        newAssignments[speaker] = { voiceId, provider: provider || '' }; // Ensure provider is at least an empty string
      } else {
         console.log(`[useVoiceManagement] Speaker '${speaker}' already has an assignment: ${JSON.stringify(newAssignments[speaker])}. Skipping automatic assignment.`);
      }
    });

    if (JSON.stringify(speakerAssignments.value) !== JSON.stringify(newAssignments)) {
      speakerAssignments.value = newAssignments;
    }
    
    console.info('[useVoiceManagement] Final speakerAssignments:', JSON.parse(JSON.stringify(speakerAssignments.value)));
  }

  // Watch for changes in parsed segments, or selected personas, or the persona cache itself
  watch([parsedSegments, selectedHostPersona, selectedGuestPersonas, () => personaCache.personas.value], () => {
    console.log('[useVoiceManagement] Detected change in parsed segments, selected personas, or persona cache. Re-assigning voices.');
    assignVoicesToSpeakers();
  }, { deep: true, immediate: true });
  // `immediate: true` ensures assignVoicesToSpeakers is called once initially.
  // The internal logic of assignVoicesToSpeakers checks if personas are loaded.

  // Removed redundant watch on personaCache.personas.value as it's covered above.

  const getVoiceInfoForSpeaker = (speakerName: string): { voiceId: string; provider: string } => {
    return speakerAssignments.value[speakerName] || { voiceId: '', provider: '' };
  };

  return {
    speakerAssignments,
    speakersInScript,
    assignVoicesToSpeakers,
    getVoiceInfoForSpeaker
  };
}
