import { usePlaygroundPersonaStore, type Persona } from '../stores/playgroundPersona';
import { usePlaygroundScriptStore } from '../stores/playgroundScript';
import { toast } from 'vue-sonner';
import type { Tables } from '~/types/supabase';
import { useRuntimeConfig } from 'nuxt/app';

export interface Voice {
  id: string;
  name: string;
  personaId: number | null;
  description?: string | null;
  avatarUrl?: string | null;
  provider?: string;
}

export interface ParsedScriptSegment {
  speakerTag: string;
  text: string;
}

export function useVoiceManagement(
  scriptContent: Ref<string>,
  parsedScriptSegments: Ref<ParsedScriptSegment[]>,
  selectedHostPersona: Ref<Persona | undefined>,
  selectedGuestPersonas: Ref<Persona[]>
) {
  const personaStore = usePlaygroundPersonaStore();
  const scriptStore = usePlaygroundScriptStore();
  const runtimeConfig = useRuntimeConfig();

  const speakerAssignments = ref<Record<string, string>>({});

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
        newAssignments[speaker] = persona.voice_model_identifier;
        console.log(`[useVoiceManagement] Assigned voice '${persona.voice_model_identifier}' to speaker '${speaker}'.`);
      } else {
        newAssignments[speaker] = '';
        console.warn(`[useVoiceManagement] No voice assigned for speaker '${speaker}'.`);
      }
    });

    if (JSON.stringify(speakerAssignments.value) !== JSON.stringify(newAssignments)) {
      speakerAssignments.value = newAssignments;
    }
    
    console.info('[useVoiceManagement] Final speakerAssignments:', JSON.parse(JSON.stringify(speakerAssignments.value)));
  }

  watch(scriptContent, () => {
    // speakersInScript will update, which in turn triggers the watch below
  }, { deep: true });

  watch(() => personaStore.personas, (newPersonas, oldPersonas) => {
    if (newPersonas.length > 0) {
      console.log('[useVoiceManagement] Personas loaded or changed. Re-assigning voices.');
      assignVoicesToSpeakers();
    }
  }, { immediate: true, deep: true });

  watch([speakersInScript, () => personaStore.personas], () => {
    console.log('[useVoiceManagement] speakersInScript or personas changed. Re-assigning voices.');
    assignVoicesToSpeakers();
  }, { deep: true });
  
  const getVoiceIdForSpeaker = (speakerTag: string) => {
    return speakerAssignments.value[speakerTag] || '';
  };

  return {
    speakerAssignments,
    speakersInScript,
    assignVoicesToSpeakers,
    getVoiceIdForSpeaker
  };
}