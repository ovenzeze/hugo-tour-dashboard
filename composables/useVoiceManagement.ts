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
    const normalizedSpeakerTag = speakerTag.replace(/\s+/g, '').toLowerCase();
    if (selectedHostPersona.value && selectedHostPersona.value.name.replace(/\s+/g, '').toLowerCase() === normalizedSpeakerTag) {
      return selectedHostPersona.value;
    }
    return selectedGuestPersonas.value.find(p => p.name.replace(/\s+/g, '').toLowerCase() === normalizedSpeakerTag);
  }

  function assignVoicesToSpeakers() {
    console.info('[useVoiceManagement] Entering assignVoicesToSpeakers.');
    const localSpeakers = speakersInScript.value; 
    const localPersonas = personaStore.personas;

    if (localPersonas.length === 0) {
      console.warn('[useVoiceManagement] Personas not loaded yet. Skipping voice assignment.');
      return;
    }

    // Initialize newAssignments with existing assignments
    const newAssignments: Record<string, string> = { ...speakerAssignments.value };

    localSpeakers.forEach(speaker => {
      // Only assign a voice if the speaker doesn't already have one assigned
      if (!newAssignments[speaker]) {
        let persona = findPersonaBySpeakerName(speaker);

        // Fallback: If not found in selected personas (via findPersonaBySpeakerName),
        // try searching directly in all available personas from the store (localPersonas).
        if (!persona) {
          const normalizedSpeakerTag = speaker.replace(/\s+/g, '').toLowerCase();
          const fallbackPersona = localPersonas.find(p => p.name.replace(/\s+/g, '').toLowerCase() === normalizedSpeakerTag);
          if (fallbackPersona) {
            persona = fallbackPersona;
            console.log(`[useVoiceManagement] Found persona for '${speaker}' via fallback search in localPersonas.`);
          }
        }

        let voiceId = '';

        if (persona) {
          if (persona.voice_model_identifier) {
            voiceId = persona.voice_model_identifier;
            console.log(`[useVoiceManagement] Assigned voice '${voiceId}' from voice_model_identifier to speaker '${speaker}'.`);
          } else if (persona.tts_provider === 'volcengine' && persona.description) {
            // Attempt to parse voice ID from description for Volcengine
            const match = persona.description.match(/实例ID\/名称:\s*(.+)/);
            if (match && match[1]) {
              voiceId = match[1].trim();
              console.log(`[useVoiceManagement] Parsed and assigned voice '${voiceId}' from description for Volcengine speaker '${speaker}'.`);
            } else {
              console.warn(`[useVoiceManagement] For Volcengine speaker '${speaker}' (persona: ${persona.name}), voice_model_identifier is missing and description ('${persona.description}') does not contain a parsable ID using regex /实例ID\\/名称:\\s*(.+)/.`);
            }
          }
        }

        if (voiceId) {
          newAssignments[speaker] = voiceId;
        } else {
          // Keep it as empty string if no persona/voice found or parsed
          newAssignments[speaker] = '';
          console.warn(`[useVoiceManagement] No voice assigned for speaker '${speaker}'.`);
        }
      } else {
        console.log(`[useVoiceManagement] Speaker '${speaker}' already has a voice assigned. Skipping automatic assignment.`);
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