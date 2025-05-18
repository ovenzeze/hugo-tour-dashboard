import { ref, watch, computed } from 'vue';
import { usePlaygroundPersonaStore, type Persona } from '../stores/playgroundPersona';
import { usePlaygroundScriptStore } from '../stores/playgroundScript';
import { toast } from 'vue-sonner';
import type { Tables } from '~/types/supabase';

// Duplicating Voice interface here, consider moving to a shared types file if used elsewhere
export interface Voice {
  id: string;
  name: string;
  personaId?: number | null;
  description?: string | null;
  avatarUrl?: string | null;
}

// Define parsedScriptSegments type based on its usage in the original component
export interface ParsedScriptSegment {
  speakerTag: string;
  text: string;
  // Potentially other fields if added by parsing logic not shown here
}


export function useVoiceManagement(
  scriptContent: globalThis.Ref<string>, // Pass as a ref
  parsedScriptSegments: globalThis.Ref<ParsedScriptSegment[]>, // Pass as a ref
  selectedHostPersona: globalThis.Ref<Persona | undefined>, // Pass as a ref
  selectedGuestPersonas: globalThis.Ref<Persona[]> // Pass as a ref
) {
  const personaStore = usePlaygroundPersonaStore();
  const scriptStore = usePlaygroundScriptStore();

  const ttsProvider = ref('elevenlabs'); // This is the local ttsProvider for this composable
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

  async function fetchVoices(provider: string) {
    isLoadingVoices.value = true;
    try {
      const previousAssignments = { ...speakerAssignments.value };
      
      if (personaStore.personas.length === 0) {
        await personaStore.fetchPersonas();
      }
      
      let fetchedVoices: Voice[] = [];

      if (provider === 'elevenlabs') {
        const personaVoices = personaStore.personas
          .filter(p => p.voice_model_identifier && p.tts_provider === 'elevenlabs')
          .map(p => ({
            id: p.voice_model_identifier || '',
            name: `${p.name} (${p.voice_model_identifier?.split('.')[0] || 'Unknown'})`,
            personaId: p.persona_id,
            description: p.description || '',
            avatarUrl: p.avatar_url || ''
          }))
          .filter(v => v.id);
        
        fetchedVoices.push(...personaVoices);

        if (personaVoices.length < 3) { // Arbitrary threshold, adjust as needed
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
                    avatarUrl: null
                  }));
                fetchedVoices.push(...apiVoices);
              }
            }
          } catch (error) {
            console.error('Failed to fetch additional ElevenLabs voices:', error);
          }
        }
      } else if (provider === 'azure') {
        const personaVoices = personaStore.personas
          .filter(p => p.voice_model_identifier && p.tts_provider === 'azure')
          .map(p => ({
            id: p.voice_model_identifier || '',
            name: `${p.name} (${p.voice_model_identifier || 'Unknown'})`,
            personaId: p.persona_id,
            description: p.description || '',
            avatarUrl: p.avatar_url || ''
          }))
          .filter(v => v.id);
        fetchedVoices.push(...personaVoices);
        if (personaVoices.length < 2) { // Arbitrary threshold
          fetchedVoices.push(
            {id: 'az_voice1', name: 'Jenny (Female)', personaId: null, description: null, avatarUrl: null},
            {id: 'az_voice2', name: 'Guy (Male)', personaId: null, description: null, avatarUrl: null}
          );
        }
      } else if (provider === 'openai_tts') {
        const personaVoices = personaStore.personas
          .filter(p => p.voice_model_identifier && p.tts_provider === 'openai')
          .map(p => ({
            id: p.voice_model_identifier || '',
            name: `${p.name} (${p.voice_model_identifier || 'Unknown'})`,
            personaId: p.persona_id,
            description: p.description || '',
            avatarUrl: p.avatar_url || ''
          }))
          .filter(v => v.id);
        fetchedVoices.push(...personaVoices);
        if (personaVoices.length < 2) { // Arbitrary threshold
          fetchedVoices.push(
            {id: 'oa_voice1', name: 'Nova (Female)', personaId: null, description: null, avatarUrl: null},
            {id: 'oa_voice2', name: 'Alloy (Male)', personaId: null, description: null, avatarUrl: null}
          );
        }
      }
      availableVoices.value = fetchedVoices;
      tryRestoreVoiceAssignments(previousAssignments);
      if (Object.keys(speakerAssignments.value).filter(k => speakerAssignments.value[k]).length === 0) {
        autoAssignVoices();
      }
    } catch (error) {
      console.error('Failed to fetch voices:', error);
      toast.error('Failed to load voices');
      availableVoices.value = [];
    } finally {
      isLoadingVoices.value = false;
    }
  }

  function tryRestoreVoiceAssignments(previousAssignments: Record<string, string>) {
    if (Object.keys(previousAssignments).length === 0) return;
    
    Object.keys(speakerAssignments.value).forEach(speaker => {
      const previousVoiceId = previousAssignments[speaker];
      if (!previousVoiceId) return;
      
      const matchingVoice = availableVoices.value.find(v => v.id === previousVoiceId);
      if (matchingVoice) {
        speakerAssignments.value[speaker] = matchingVoice.id;
      } else {
        const nameMatchVoice = availableVoices.value.find(v => 
          v.name.toLowerCase().includes(speaker.toLowerCase())
        );
        if (nameMatchVoice) {
          speakerAssignments.value[speaker] = nameMatchVoice.id;
        }
      }
    });
  }

  function assignDefaultVoice(speakerName: string) {
    if (availableVoices.value.length === 0) return;
    
    let voiceIndex = 0;
    const assignedSpeakerTags = Object.keys(speakerAssignments.value).filter(tag => speakerAssignments.value[tag]);

    if (assignedSpeakerTags.length === 0) {
      voiceIndex = 0;
    } else if (availableVoices.value.length > 1) {
      const usedVoiceIds = new Set(assignedSpeakerTags.map(tag => speakerAssignments.value[tag]));
      const unusedVoice = availableVoices.value.find(v => !usedVoiceIds.has(v.id));
      
      if (unusedVoice) {
        speakerAssignments.value[speakerName] = unusedVoice.id;
        console.log(`Assigned unused voice ${unusedVoice.name} to ${speakerName}`);
        return;
      }
      voiceIndex = assignedSpeakerTags.length % availableVoices.value.length;
    }
    
    if(availableVoices.value[voiceIndex]) {
        speakerAssignments.value[speakerName] = availableVoices.value[voiceIndex].id;
        console.log(`Assigned default voice ${availableVoices.value[voiceIndex].name} to ${speakerName}`);
    } else {
        console.warn(`Could not assign default voice to ${speakerName}, voiceIndex out of bounds or availableVoices is empty.`);
    }
  }

  function autoAssignVoices() {
    console.log('Starting auto voice assignment...');
    let assigned_something = false;

    if (scriptStore.validationResult?.structuredData?.voiceMap) {
      console.log('Voice map from validation:', scriptStore.validationResult.structuredData.voiceMap);
      const { voiceMap } = scriptStore.validationResult.structuredData;
      const scriptValidationData = scriptStore.validationResult.structuredData.script;
      
      const roleTypeToNameMap: Record<string, string> = {};
      if (scriptValidationData && Array.isArray(scriptValidationData)) {
        scriptValidationData.forEach(entry => {
          roleTypeToNameMap[entry.role] = entry.name; // e.g. host -> "Host_Name_From_Script"
          roleTypeToNameMap[entry.name] = entry.name; // Allow direct name mapping
        });
      }

      parsedScriptSegments.value.forEach(segment => {
        const speakerName = segment.speakerTag;
        if (speakerAssignments.value[speakerName]) return; // Already assigned

        let voiceInfo = voiceMap[speakerName];
        if (!voiceInfo) {
          const mappedName = roleTypeToNameMap[speakerName] || 
                             (selectedHostPersona.value?.name === speakerName ? selectedHostPersona.value.name : undefined) ||
                             (selectedGuestPersonas.value.find(p => p.name === speakerName)?.name);
          if (mappedName) {
             voiceInfo = voiceMap[mappedName];
          }
        }
        
        if (voiceInfo && voiceInfo.voice_model_identifier) {
          const voiceExistsInProviderList = availableVoices.value.some(v => v.id === voiceInfo.voice_model_identifier);
          if(voiceExistsInProviderList) {
            speakerAssignments.value[speakerName] = voiceInfo.voice_model_identifier;
            console.log(`Assigned voice ${voiceInfo.voice_model_identifier} to ${speakerName} from validation.`);
            assigned_something = true;
          } else {
            console.warn(`Voice ${voiceInfo.voice_model_identifier} for ${speakerName} from validation not in available voices for ${ttsProvider.value}.`);
            assignDefaultVoice(speakerName); // Fallback if validated voice not available for current provider
          }
        } else {
          assignDefaultVoice(speakerName);
        }
      });

    } else { // Fallback if no validation data
      parsedScriptSegments.value.forEach(segment => {
        const speakerName = segment.speakerTag;
        if (speakerAssignments.value[speakerName]) return;

        let matchingPersona: Persona | undefined = undefined;
        if (selectedHostPersona.value && selectedHostPersona.value.name === speakerName) {
          matchingPersona = selectedHostPersona.value;
        } else {
          matchingPersona = selectedGuestPersonas.value.find(p => p.name === speakerName);
        }
        
        if (matchingPersona?.voice_model_identifier) {
           const voiceExistsInProviderList = availableVoices.value.some(v => v.id === matchingPersona.voice_model_identifier);
           if(voiceExistsInProviderList) {
            speakerAssignments.value[speakerName] = matchingPersona.voice_model_identifier;
            console.log(`Assigned voice ${matchingPersona.voice_model_identifier} to ${speakerName} from persona data.`);
            assigned_something = true;
           } else {
             console.warn(`Voice ${matchingPersona.voice_model_identifier} for ${speakerName} from persona not in available voices for ${ttsProvider.value}.`);
             assignDefaultVoice(speakerName);
           }
        } else {
          assignDefaultVoice(speakerName);
        }
      });
    }
    if (assigned_something) {
        toast.success('Voices have been automatically assigned based on available data.');
    }
    console.log('Voice assignment results:', { ...speakerAssignments.value });
  }

  const onProviderChange = (value: string) => {
    ttsProvider.value = value;
    // speakerAssignments.value = {}; // Reset assignments when provider changes? Or try to keep?
                                    // Current fetchVoices tries to restore.
    fetchVoices(value);
  };

  watch(ttsProvider, (newProvider) => {
    if (!newProvider) {
      availableVoices.value = [];
      return;
    }
    fetchVoices(newProvider);
  }, { immediate: true });


  // Watchers for re-triggering auto-assignment if relevant data changes
  watch(
    () => scriptStore.validationResult,
    (newResult) => {
      if (newResult?.structuredData?.voiceMap && Object.keys(speakerAssignments.value).filter(k => speakerAssignments.value[k]).length === 0) {
         console.log("Validation result changed, re-attempting auto-assignment.");
         autoAssignVoices();
      }
    }, 
    { deep: true }
  );

  watch(
    [parsedScriptSegments, selectedHostPersona, selectedGuestPersonas, availableVoices],
    () => {
      // Re-evaluate assignments if the script segments change or personas change,
      // but only if no assignments have been made yet or if available voices list populates.
      const noAssignmentsMade = Object.values(speakerAssignments.value).every(v => !v);
      if (noAssignmentsMade && availableVoices.value.length > 0) {
        console.log("Relevant data changed (segments, personas, or voices loaded), re-attempting auto-assignment.");
        autoAssignVoices();
      }
    },
    { deep: true }
  );


  return {
    ttsProvider,
    availableVoices,
    isLoadingVoices,
    speakerAssignments,
    speakersInScript, // Expose this computed property
    fetchVoices,
    autoAssignVoices, // Expose for potential manual trigger
    onProviderChange
  };
} 