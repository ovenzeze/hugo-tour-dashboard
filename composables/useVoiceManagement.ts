import { ref, watch, computed, type Ref } from 'vue';
import { usePlaygroundPersonaStore, type Persona } from '../stores/playgroundPersona';
import { usePlaygroundScriptStore } from '../stores/playgroundScript';
import { toast } from 'vue-sonner';
import type { Tables } from '~/types/supabase';
import { useRuntimeConfig } from 'nuxt/app'; // Corrected import path

// Duplicating Voice interface here, consider moving to a shared types file if used elsewhere
export interface Voice {
  id: string;
  name: string;
  personaId: number | null; // Should be number for persona-derived, null for generic
  description?: string | null;
  avatarUrl?: string | null;
  provider?: string; // Added to store the provider for this voice
}

// Define parsedScriptSegments type based on its usage in the original component
export interface ParsedScriptSegment {
  speakerTag: string;
  text: string;
  // Potentially other fields if added by parsing logic not shown here
}

export function useVoiceManagement(
  scriptContent: Ref<string>, // Pass as a ref
  parsedScriptSegments: Ref<ParsedScriptSegment[]>, // Pass as a ref
  selectedHostPersona: Ref<Persona | undefined>, // Pass as a ref
  selectedGuestPersonas: Ref<Persona[]> // Pass as a ref
) {
  const personaStore = usePlaygroundPersonaStore();
  const scriptStore = usePlaygroundScriptStore();
  const runtimeConfig = useRuntimeConfig(); // Get runtime config

  const availableVoices = ref<Voice[]>([]);
  const isLoadingVoices = ref(false);
  const speakerAssignments = ref<Record<string, string>>({}); // speakerTag -> voice_id

  const speakersInScript = computed(() => {
    if (scriptContent.value) {
      const speakerPattern = /^([A-Za-z0-9_\u4e00-\u9fa5]+):/gm;
      const matches = [...scriptContent.value.matchAll(speakerPattern)];
      const uniqueSpeakers = [...new Set(matches.map(match => match[1]))];
      
      uniqueSpeakers.forEach(speaker => {
        if (!(speaker in speakerAssignments.value)) {
          speakerAssignments.value[speaker] = '';
        }
      });
      
      Object.keys(speakerAssignments.value).forEach(assignedSpeaker => {
        if (!uniqueSpeakers.includes(assignedSpeaker)) {
          delete speakerAssignments.value[assignedSpeaker];
        }
      });
      
      return uniqueSpeakers;
    }
    return [];
  });

  async function fetchVoices() { // Removed provider parameter
    isLoadingVoices.value = true;
    try {
      const previousAssignments = { ...speakerAssignments.value };
      
      if (personaStore.personas.length === 0) {
        await personaStore.fetchPersonas();
      }
      
      let fetchedVoices: Voice[] = [];

      // Fetch voices from ALL personas, regardless of their provider
      const personaVoices = personaStore.personas
        .filter(p => p.voice_model_identifier)
        .map(p => ({
          id: p.voice_model_identifier!,
          name: `${p.name} (${p.voice_model_identifier?.split('.')[0] || 'Unknown'})`,
          personaId: p.persona_id,
          description: p.description || '',
          avatarUrl: p.avatar_url || '',
          provider: p.tts_provider || undefined // Store the provider
        }));
      fetchedVoices.push(...personaVoices);

      // Add generic voices if needed, e.g., from ElevenLabs API or config, these might not have a specific persona provider
      // Example for ElevenLabs generic voices (can be adapted for others or made more generic)
      try {
        const response = await fetch('/api/elevenlabs/voices');
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.voices)) {
            const existingIds = new Set(fetchedVoices.map(v => v.id));
            const apiVoices = data.voices
              .filter((voice: any) => !existingIds.has(voice.voice_id || voice.id))
              .map((voice: any) => ({
                id: voice.voice_id || voice.id,
                name: voice.name,
                personaId: null,
                description: null,
                avatarUrl: null,
                provider: 'elevenlabs' // Mark these as elevenlabs generic
              }));
            fetchedVoices.push(...apiVoices);
          }
        }
      } catch (error) {
        console.error('Failed to fetch additional ElevenLabs voices:', error);
      }
      
      // Example for Volcengine generic voice from runtimeConfig
      const defaultVolcengineVoiceIdFromConfig = runtimeConfig.public.volcengineVoiceType as string;
      if (defaultVolcengineVoiceIdFromConfig && !fetchedVoices.some(v => v.id === defaultVolcengineVoiceIdFromConfig)) {
        fetchedVoices.push({
          id: defaultVolcengineVoiceIdFromConfig,
          name: `通用声音 (${defaultVolcengineVoiceIdFromConfig})`,
          personaId: null, 
          description: '来自配置的默认火山通用声音',
          avatarUrl: null,
          provider: 'volcengine'
        });
      }

      availableVoices.value = fetchedVoices;
      // Restore previous assignments if the voice still exists or is a persona voice
      // This part needs careful re-evaluation: if a voiceId is globally unique, direct restore is fine.
      // If not, need to consider provider context if restoring generic voices.
      // For now, let's assume assignVoicesToSpeakers will correctly re-assign based on persona.
      // speakerAssignments.value = previousAssignments; 
      // assignVoicesToSpeakers(); // Call this to ensure assignments are updated with new voices

    } catch (error) {
      console.error('Error fetching voices:', error);
      toast.error('Failed to load voice list.');
    } finally {
      isLoadingVoices.value = false;
    }
  }

  function findPersonaBySpeakerName(speakerTag: string): Persona | undefined {
    if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
      return selectedHostPersona.value;
    }
    return selectedGuestPersonas.value.find(p => p.name === speakerTag);
  }

  function assignVoicesToSpeakers() {
    console.info('[useVoiceManagement] Entering assignVoicesToSpeakers.');
    const localSpeakers = speakersInScript.value; 
    const localPersonas = personaStore.personas;

    if (localPersonas.length === 0) {
      console.warn('[useVoiceManagement] Personas not loaded yet. Skipping voice assignment.');
      return;
    }

    const newAssignments: Record<string, string> = {};

    localSpeakers.forEach(speaker => {
      const persona = findPersonaBySpeakerName(speaker);
      if (persona && persona.voice_model_identifier) {
        newAssignments[speaker] = persona.voice_model_identifier; // Assign the persona's voice_model_identifier
        console.log(`[useVoiceManagement] Assigned voice '${persona.voice_model_identifier}' from provider '${persona.tts_provider}' to speaker '${speaker}'.`);
      } else {
        newAssignments[speaker] = ''; // No voice assigned or persona/voice_model_identifier not found
        if (persona) {
          console.warn(`[useVoiceManagement] Persona '${speaker}' found, but no voice_model_identifier. Cannot assign voice.`);
        } else {
          console.warn(`[useVoiceManagement] Persona not found for speaker '${speaker}'. Cannot assign voice.`);
        }
      }
    });

    // Update speakerAssignments reactively
    // Only update if there are actual changes to avoid unnecessary re-renders
    if (JSON.stringify(speakerAssignments.value) !== JSON.stringify(newAssignments)) {
      speakerAssignments.value = newAssignments;
    }
    
    console.info('[useVoiceManagement] Final speakerAssignments:', JSON.parse(JSON.stringify(speakerAssignments.value)));
  }

  // Watch for changes that require re-fetching or re-assigning voices
  // Watch for script content changes to update speakersInScript and re-assign voices
  watch(scriptContent, () => {
    // speakersInScript will update, which in turn triggers the watch below
  }, { deep: true });

  // Initial fetch and re-fetch if personas change (e.g. after initial load or if store is refreshed)
  watch(() => personaStore.personas, (newPersonas, oldPersonas) => {
    if (newPersonas.length > 0) {
      console.log('[useVoiceManagement] Personas loaded or changed. Fetching all voices.');
      fetchVoices(); // Fetch all voices
    }
  }, { immediate: true, deep: true });

  // Automatically assign voices when available voices or script speakers or personas change
  watch([availableVoices, speakersInScript, () => personaStore.personas], () => {
    console.log('[useVoiceManagement] availableVoices, speakersInScript, or personas changed. Re-assigning voices.');
    assignVoicesToSpeakers();
  }, { deep: true });
  
  // Function to get the assigned voice ID for a speaker tag
  const getVoiceIdForSpeaker = (speakerTag: string) => {
    return speakerAssignments.value[speakerTag] || '';
  };

  return {
    availableVoices,
    isLoadingVoices,
    speakerAssignments,
    speakersInScript,
    assignVoicesToSpeakers, // Expose if manual trigger is needed
    getVoiceIdForSpeaker
  };
}