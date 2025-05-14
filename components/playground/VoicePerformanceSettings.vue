<template>
  <div class="space-y-4">
<!-- Top Control Bar -->
    <div class="flex items-center justify-between p-3 border rounded-md bg-muted/10">
      <div class="flex-shrink-0 w-1/3">
        <Select v-model="ttsProvider" @change="onProviderChange">
          <SelectTrigger id="ttsProvider" class="w-full">
            <SelectValue placeholder="Select TTS Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              <SelectItem value="azure">Azure TTS</SelectItem>
              <SelectItem value="openai_tts">OpenAI TTS</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      
      <div class="flex-1 flex items-center space-x-4 px-4">
        <!-- Voice Temperature Slider -->
        <div class="flex items-center gap-2 flex-1">
          <Label class="whitespace-nowrap text-sm">Temperature: {{ playgroundStore.synthesisParams.temperature.toFixed(1) }}</Label>
          <Slider
            class="flex-1"
            :model-value="playgroundStore.synthesisParams.temperatureArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ temperature: value[0] }) }"
            :min="0"
            :max="1"
            :step="0.1"
          />
        </div>
        
        <!-- Speech Speed Slider -->
        <div class="flex items-center gap-2 flex-1">
          <Label class="whitespace-nowrap text-sm">Speed: {{ playgroundStore.synthesisParams.speed.toFixed(1) }}x</Label>
          <Slider
            class="flex-1"
            :model-value="playgroundStore.synthesisParams.speedArray"
            @update:model-value="(value: number[] | undefined) => { if (value && value.length > 0) playgroundStore.updateSynthesisParams({ speed: value[0] }) }"
            :min="0.5"
            :max="2"
            :step="0.1"
          />
        </div>
      </div>
    </div>

    <!-- Speaker Voice Assignment -->
    <div v-if="parsedScriptSegments.length > 0" class="border rounded-md p-4 space-y-3">
      <div class="flex items-center justify-between pb-2 border-b">
        <h4 class="font-medium">Voice Assignment</h4>
        <!--
        <Button 
          variant="outline" 
          size="sm"
          :disabled="!canProceed"
          @click="previewAll"
        >
          <Play class="w-3.5 h-3.5 mr-1" />
          Preview All
        </Button>
        -->
      </div>
      
      <div class="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        <div v-for="(segment, index) in enhancedScriptSegments" :key="`segment-${index}`" 
          class="border rounded-md p-3"
          :class="{'bg-blue-50/20 dark:bg-blue-900/5': segment.roleType === 'host', 
                   'bg-green-50/20 dark:bg-green-900/5': segment.roleType === 'guest'}">
          
          <!-- Speaker Info and Controls -->
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center gap-2">
              <Badge 
                :variant="segment.roleType === 'host' ? 'default' : 'secondary'"
                class="uppercase text-xs font-semibold px-2 py-0.5"
              >
                {{ segment.roleType === 'host' ? 'Host' : 'Guest' }}
              </Badge>
              
              <div class="flex items-center gap-2">
                <div v-if="segment.persona?.avatar_url" class="w-6 h-6 rounded-full overflow-hidden">
                  <img :src="segment.persona.avatar_url" class="w-full h-full object-cover" alt="Avatar" />
                </div>
                <div v-else class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                  {{ segment.speakerTag.charAt(0).toUpperCase() }}
                </div>
                
                <span class="font-medium">{{ segment.speakerTag }}</span>
              </div>
            </div>
            
            <!-- Voice Selection -->
            <div class="flex items-center gap-2">
              <Select 
                v-model="speakerAssignments[segment.speakerTag]" 
                :disabled="isLoadingVoices || availableVoices.length === 0"
              >
                <SelectTrigger :id="`speaker-voice-${segment.speakerTag}`" class="h-8 text-sm w-36">
                  <SelectValue :placeholder="getVoiceSelectionPlaceholder(segment)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel v-if="segment.validationVoiceId" class="text-xs py-1 flex items-center font-semibold">
                      <Star class="h-3 w-3 text-amber-500 mr-1" /> Recommended Voice
                    </SelectLabel>
                    <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">
                      {{ voice.name }}
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <!-- Generate Button -->
              <Button
                size="sm"
                variant="outline"
                :disabled="!speakerAssignments[segment.speakerTag] || isPreviewingSegment === index || (segmentStates[index]?.status === 'loading')"
                @click="previewSegment(segment, index)"
                class="w-auto px-2 py-1 h-8" 
              >
                <Loader2 v-if="isPreviewingSegment === index || segmentStates[index]?.status === 'loading'" class="w-3 h-3 mr-1.5 animate-spin" />
                <Sparkles v-else class="w-3 h-3 mr-1.5" />
                {{ isPreviewingSegment === index || segmentStates[index]?.status === 'loading' ? 'Generating...' : (segmentPreviews[index]?.audioUrl ? 'Re-preview' : 'Preview') }}
              </Button>
            </div>
          </div>
          
          <!-- Text Content -->
          <div class="text-sm text-muted-foreground mb-2">
            {{ segment.text }}
          </div>
          
          <!-- Status and Audio Player -->
          <div class="flex flex-col gap-1">
            <div v-if="segmentStates[index]" class="text-xs flex items-center gap-2">
              <Loader2 v-if="segmentStates[index].status === 'loading'" class="w-3 h-3 animate-spin" />
              <CheckCircle v-else-if="segmentStates[index].status === 'success'" class="w-3 h-3 text-green-500" />
              <AlertCircle v-else-if="segmentStates[index].status === 'error'" class="w-3 h-3 text-red-500" />
              <span :class="{
                'text-muted-foreground': segmentStates[index].status === 'idle',
                'text-blue-500': segmentStates[index].status === 'loading',
                'text-green-500': segmentStates[index].status === 'success',
                'text-red-500': segmentStates[index].status === 'error'
              }">{{ segmentStates[index].message }}</span>
            </div>
            
            <div v-if="segmentPreviews[index]?.audioUrl">
              <audio 
                :src="segmentPreviews[index].audioUrl" 
                controls
                class="w-full h-7 rounded"
                :ref="el => { if (el) audioRefs[index] = el as HTMLAudioElement }"
                @play="onSegmentPlay(index)"
                @pause="onSegmentPauseOrEnd(index)"
                @ended="onSegmentPauseOrEnd(index)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Global Preview Area -->
    <div v-if="combinedPreviewUrl" class="border rounded-md p-4 space-y-2">
      <h4 class="font-medium">Full Audio Preview</h4>
      <audio :src="combinedPreviewUrl" controls class="w-full" />
    </div>

    <!-- Role Information Summary -->
    <div v-if="selectedHostPersona || selectedGuestPersonas.length > 0" class="text-xs text-muted-foreground p-3 border rounded-md">
      <span class="font-medium">Roles: </span>
      <span v-if="selectedHostPersona">{{ selectedHostPersona.name }} (Host)</span>
      <span v-if="selectedGuestPersonas.length > 0">
        <template v-if="selectedHostPersona">, </template>
        {{ selectedGuestPersonas.map(g => g.name).join(', ') }}
        (Guest<template v-if="selectedGuestPersonas.length > 1">s</template>)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits, defineExpose, onMounted } from 'vue';
import { Label } from '../../components/ui/label/index.js';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectLabel } from '../../components/ui/select/index.js';
import { Loader2, Play, HelpCircle, Info, AlertTriangle, Check, Star, CheckCircle, AlertCircle, Volume2, Pause, Sparkles } from 'lucide-vue-next';
import { usePlaygroundStore, type Persona } from '../../stores/playground.js';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '../../components/ui/hover-card/index.js';
import { Button } from '../../components/ui/button/index.js';
import { Slider } from '../../components/ui/slider/index.js';
import { Badge } from '../../components/ui/badge/index.js';
import { toast } from 'vue-sonner';
import type { Tables } from '~/types/supabase';

const props = defineProps<{ scriptContent: string }>();
const emit = defineEmits(['update:scriptContent', 'next', 'back']);

const playgroundStore = usePlaygroundStore();

// 定义语音类型接口
interface Voice {
  id: string;
  name: string;
  personaId?: number | null;
  description?: string | null;
  avatarUrl?: string | null;
}

// Set default values
const ttsProvider = ref('elevenlabs');
const availableVoices = ref<Voice[]>([]);
const isLoadingVoices = ref(false);
const speakerAssignments = ref<Record<string, string>>({});

// Preview state management
const isPreviewingSegment = ref<number | null>(null);
const segmentPreviews = ref<Record<number, { audioUrl: string, timestamps?: any[] }>>({});
const combinedPreviewUrl = ref<string | null>(null);

// Define state for each segment
interface SegmentState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  error?: string;
  audioUrl?: string;
}
const segmentStates = ref<Record<number, SegmentState>>({});

// audioRefs will store references to the <audio> elements
const audioRefs = ref<Record<number, HTMLAudioElement | null>>({}); 
const audioPlayingState = ref<Record<number, boolean>>({});

const selectedHostPersona = computed<Persona | undefined>(() => {
  if (!playgroundStore.podcastSettings.hostPersonaId) return undefined;
  return playgroundStore.personas.find((p: Persona) => p.persona_id === Number(playgroundStore.podcastSettings.hostPersonaId));
});

const selectedGuestPersonas = computed<Persona[]>(() => {
  if (!playgroundStore.podcastSettings.guestPersonaIds || playgroundStore.podcastSettings.guestPersonaIds.length === 0) return [];
  return playgroundStore.podcastSettings.guestPersonaIds
    .map((id: string | number | undefined) => playgroundStore.personas.find((p: Persona) => p.persona_id === Number(id)))
    .filter((p: Persona | undefined): p is Persona => p !== undefined);
});

// Define parsedScriptSegments computed property
const parsedScriptSegments = computed(() => {
  if (props.scriptContent) {
    const segments: { speakerTag: string, text: string }[] = [];
    const script = props.scriptContent.trim();
    if (!script) return [];

    // Capture role and lines with regex
    const segmentPattern = /^([A-Za-z0-9_\u4e00-\u9fa5]+):\s*([\s\S]*?)(?=(?:^[A-Za-z0-9_\u4e00-\u9fa5]+:|$))/gm;
    let match;
    while ((match = segmentPattern.exec(script)) !== null) {
      const speakerTag = match[1];
      const text = match[2].trim();
      if (text) { // Only add paragraphs with actual text
        segments.push({ speakerTag, text });
      }
    }
    return segments;
  }
  return [];
});

// Define speakersInScript computed property first
const speakersInScript = computed(() => {
  if (props.scriptContent) {
    const speakerPattern = /^([A-Za-z0-9_\u4e00-\u9fa5]+):/gm;
    const matches = [...props.scriptContent.matchAll(speakerPattern)];
    const uniqueSpeakers = [...new Set(matches.map(match => match[1]))];
    
    // Initialize assignments for each role
    uniqueSpeakers.forEach(speaker => {
      if (!(speaker in speakerAssignments.value)) {
        speakerAssignments.value[speaker] = '';
      }
    });
    
    // Clear assignments for roles that no longer exist
    Object.keys(speakerAssignments.value).forEach(assignedSpeaker => {
      if (!uniqueSpeakers.includes(assignedSpeaker)) {
        delete speakerAssignments.value[assignedSpeaker];
      }
    });
    
    return uniqueSpeakers;
  }
  return [];
});

// Define getPersonaForSpeaker function
const getPersonaForSpeaker = (speakerTag: string): Persona | undefined => {
  // Get personaId from validation result (preferred)
  const validationInfo = playgroundStore.validationResult?.structuredData?.voiceMap?.[speakerTag];
  if (validationInfo?.personaId) {
    const personaId = Number(validationInfo.personaId);
    const matchingPersona = playgroundStore.personas.find(p => p.persona_id === personaId);
    if (matchingPersona) {
      console.log(`Found persona for ${speakerTag} by ID ${personaId}:`, matchingPersona.name);
      return matchingPersona;
    }
  }
  
  // If not found in validation result, try to find role info from script structure
  if (playgroundStore.validationResult?.structuredData?.script) {
    const scriptEntry = playgroundStore.validationResult.structuredData.script.find(
      entry => entry.name === speakerTag
    );
    
    if (scriptEntry) {
      // If it's a host, use the selected host persona
      if (scriptEntry.role === 'host' && selectedHostPersona.value) {
        console.log(`Matched ${speakerTag} as host with persona:`, selectedHostPersona.value.name);
        return selectedHostPersona.value;
      }
      
      // If it's a guest, try to find a match among the selected guests
      if (scriptEntry.role === 'guest' && selectedGuestPersonas.value.length > 0) {
        // Try to find an unassigned guest
        const availableGuest = selectedGuestPersonas.value[0]; // For simplicity, use the first guest
        console.log(`Matched ${speakerTag} as guest with persona:`, availableGuest.name);
        return availableGuest;
      }
    }
  }
  
  // If all above fail, try matching by name (less reliable, but as a fallback)
  if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
    return selectedHostPersona.value;
  }
  
  const guestPersona = selectedGuestPersonas.value.find(p => p.name === speakerTag);
  if (guestPersona) return guestPersona;
  
  // If still not found, return undefined
  return undefined;
};

// Define enhancedScriptSegments computed property
const enhancedScriptSegments = computed(() => {
  return parsedScriptSegments.value.map(segment => {
    // Get role information
    const persona = getPersonaForSpeaker(segment.speakerTag);
    
    // Get role information from validation data
    const validationInfo = playgroundStore.validationResult?.structuredData?.voiceMap?.[segment.speakerTag];
    
    // Find role type from validation result
    let roleType: 'host' | 'guest' = 'guest'; // Defaults to guest
    
    // First, look in the script data from the validation result
    if (playgroundStore.validationResult?.structuredData?.script) {
      const scriptEntry = playgroundStore.validationResult.structuredData.script.find(
        entry => entry.name === segment.speakerTag
      );
      if (scriptEntry) {
        roleType = scriptEntry.role;
      }
    }
    
    // If not found in validation result, determine based on the currently selected host
    if (!playgroundStore.validationResult?.structuredData?.script) {
      if (selectedHostPersona.value && selectedHostPersona.value.name === segment.speakerTag) {
        roleType = 'host';
      }
    }
    
    // Collect more details about the role
    const personaDetails = persona ? {
      id: persona.persona_id,
      name: persona.name,
      avatar_url: persona.avatar_url || null,
      voice_model_identifier: persona.voice_model_identifier || null,
      description: persona.description || null,
    } : null;
    
    // voice_model_identifier obtained from validation result
    const validationVoiceId = validationInfo?.voice_model_identifier;
    
    return {
      ...segment,
      persona,
      personaId: persona?.persona_id || validationInfo?.personaId,
      roleType,
      personaDetails,
      validationVoiceId
    };
  });
});

// Now it's safe to define the fetchVoices function as all variables it uses are already defined
async function fetchVoices(provider: string) {
  isLoadingVoices.value = true;
  try {
    // Save current assignments to try and preserve them when switching providers
    const previousAssignments = { ...speakerAssignments.value };
    
    // First, ensure we have the latest persona data
    if (playgroundStore.personas.length === 0) {
      await playgroundStore.fetchPersonas();
    }
    
    // 使用persona数据创建可用语音列表
    if (provider === 'elevenlabs') {
      // Extract ElevenLabs voices from persona data
      const personaVoices = playgroundStore.personas
        .filter(p => p.voice_model_identifier && p.tts_provider === 'elevenlabs')
        .map(p => ({
          id: p.voice_model_identifier || '',
          name: `${p.name} (${p.voice_model_identifier?.split('.')[0] || 'Unknown'})`,
          personaId: p.persona_id,
          description: p.description || '',
          avatarUrl: p.avatar_url || ''
        }))
        .filter(v => v.id); // Filter out personas without voice_model_identifier
      
      console.log('Persona-based ElevenLabs voices:', personaVoices);
      
      // If there aren't enough voices in persona, fetch more from the API
      if (personaVoices.length < 3) {
        try {
          const response = await fetch('/api/elevenlabs/voices');
          if (response.ok) {
            const data = await response.json();
            if (data.success && Array.isArray(data.voices)) {
              // Add voices returned by the API, but avoid duplicates
              const existingIds = new Set(personaVoices.map(v => v.id));
              const apiVoices = data.voices
                .filter((voice: any) => !existingIds.has(voice.voice_id || voice.id))
                .map((voice: any) => ({
                  id: voice.voice_id || voice.id,
                  name: voice.name,
                  personaId: null,
                  description: null,
                  avatarUrl: null
                }));
              
              availableVoices.value = [...personaVoices, ...apiVoices];
              console.log('Combined voices (Persona + API):', availableVoices.value);
            } else {
              availableVoices.value = personaVoices;
            }
          } else {
            availableVoices.value = personaVoices;
          }
        } catch (error) {
          console.error('Failed to fetch additional voices:', error);
          availableVoices.value = personaVoices;
        }
      } else {
        availableVoices.value = personaVoices;
      }
    } else if (provider === 'azure') {
      // Extract Azure voices from persona data
      const personaVoices = playgroundStore.personas
        .filter(p => p.voice_model_identifier && p.tts_provider === 'azure')
        .map(p => ({
          id: p.voice_model_identifier || '',
          name: `${p.name} (${p.voice_model_identifier || 'Unknown'})`,
          personaId: p.persona_id,
          description: p.description || '',
          avatarUrl: p.avatar_url || ''
        }))
        .filter(v => v.id);
      
      // If there aren't enough Azure voices, add some default options
      if (personaVoices.length < 2) {
        const defaultVoices = [
          {id: 'az_voice1', name: 'Jenny (Female)', personaId: null, description: null, avatarUrl: null},
          {id: 'az_voice2', name: 'Guy (Male)', personaId: null, description: null, avatarUrl: null}
        ];
        availableVoices.value = [...personaVoices, ...defaultVoices];
      } else {
        availableVoices.value = personaVoices;
      }
    } else if (provider === 'openai_tts') {
      // Extract OpenAI voices from persona data
      const personaVoices = playgroundStore.personas
        .filter(p => p.voice_model_identifier && p.tts_provider === 'openai')
        .map(p => ({
          id: p.voice_model_identifier || '',
          name: `${p.name} (${p.voice_model_identifier || 'Unknown'})`,
          personaId: p.persona_id,
          description: p.description || '',
          avatarUrl: p.avatar_url || ''
        }))
        .filter(v => v.id);
      
      // If there aren't enough OpenAI voices, add some default options
      if (personaVoices.length < 2) {
        const defaultVoices = [
          {id: 'oa_voice1', name: 'Nova (Female)', personaId: null, description: null, avatarUrl: null},
          {id: 'oa_voice2', name: 'Alloy (Male)', personaId: null, description: null, avatarUrl: null}
        ];
        availableVoices.value = [...personaVoices, ...defaultVoices];
      } else {
        availableVoices.value = personaVoices;
      }
    }
    
    // Try to restore previous assignments
    tryRestoreVoiceAssignments(previousAssignments);
    
    // If there are no existing assignments, try to auto-assign voices
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

// Try to restore previous voice assignments
function tryRestoreVoiceAssignments(previousAssignments: Record<string, string>) {
  if (Object.keys(previousAssignments).length === 0) return;
  
  Object.keys(speakerAssignments.value).forEach(speaker => {
    const previousVoiceId = previousAssignments[speaker];
    if (!previousVoiceId) return;
    
    // Try to find a matching voice
    const matchingVoice = availableVoices.value.find(v => v.id === previousVoiceId);
    if (matchingVoice) {
      speakerAssignments.value[speaker] = matchingVoice.id;
    } else {
      // If no match, try matching by name
      const nameMatchVoice = availableVoices.value.find(v => 
        v.name.toLowerCase().includes(speaker.toLowerCase())
      );
      if (nameMatchVoice) {
        speakerAssignments.value[speaker] = nameMatchVoice.id;
      }
    }
  });
}

// Auto-assign voices
function autoAssignVoices() {
  console.log('Starting auto voice assignment...');
  console.log('Available voices:', availableVoices.value);
  console.log('Current speakers:', Object.keys(speakerAssignments.value));
  
  // Log data from validation result
  if (playgroundStore.validationResult?.structuredData) {
    console.log('Validation data structure:', playgroundStore.validationResult.structuredData);
    
    // Directly use voiceMap data from validation result
    if (playgroundStore.validationResult.structuredData.voiceMap) {
      console.log('Voice map from validation:', playgroundStore.validationResult.structuredData.voiceMap);
      
      const { voiceMap } = playgroundStore.validationResult.structuredData;
      const { script } = playgroundStore.validationResult.structuredData;
      
      // If script data is available, directly use the voice corresponding to the name in the script
      if (script && Array.isArray(script)) {
        // Create role mapping table: extract mapping from role type to role name from the script
        const roleTypeToNameMap: Record<string, string> = {};
        script.forEach(entry => {
          if (entry.role === 'host') {
            roleTypeToNameMap['host'] = entry.name;
            roleTypeToNameMap['Host'] = entry.name;
          } else if (entry.role === 'guest') {
            roleTypeToNameMap['guest'] = entry.name;
            roleTypeToNameMap['Guest'] = entry.name;
          }
        });
        console.log('Role type to name mapping:', roleTypeToNameMap);
        
        // Iterate through each segment in the script
        parsedScriptSegments.value.forEach(segment => {
          const speakerName = segment.speakerTag;
          
          // 1. Directly try to find the voice in voiceMap
          let voiceInfo = voiceMap[speakerName];
          
          // 2. If not found, check if it's a generic role name (like "Host"/"Guest")
          if (!voiceInfo) {
            const mappedName = roleTypeToNameMap[speakerName];
            if (mappedName) {
              voiceInfo = voiceMap[mappedName];
              console.log(`Mapped generic role "${speakerName}" to character "${mappedName}"`);
            }
          }
          
          if (voiceInfo && voiceInfo.voice_model_identifier) {
            // Found a matching voice, use it directly
            speakerAssignments.value[speakerName] = voiceInfo.voice_model_identifier;
            console.log(`Assigned voice ${voiceInfo.voice_model_identifier} to ${speakerName}`);
          } else {
            // If not found, use the default assignment method
            assignDefaultVoice(speakerName);
          }
        });
      } else {
        // No script data, use default assignment
        parsedScriptSegments.value.forEach(segment => {
          assignDefaultVoice(segment.speakerTag);
        });
      }
      
      // Summarize assignment results
      console.log('Voice assignment results:', { ...speakerAssignments.value });
      
      // If we successfully assigned any voices, show a notification
      if (Object.values(speakerAssignments.value).some(v => v)) {
        toast.success('Voices have been automatically assigned');
      }
      
      return;
    }
  }
  
  // If no validation data, use fallback method
  console.log('No validation data available, using fallback method');
  
  // Try to assign voices from persona data
  parsedScriptSegments.value.forEach(segment => {
    const speakerName = segment.speakerTag;
    
    // If already assigned, skip
    if (speakerAssignments.value[speakerName]) return;
    
    // Try to match persona
    let matchingPersona = undefined;
    
    // Check if it's the host
    if (selectedHostPersona.value && selectedHostPersona.value.name === speakerName) {
      matchingPersona = selectedHostPersona.value;
    } else {
      // Check if it's a guest
      matchingPersona = selectedGuestPersonas.value.find(p => p.name === speakerName);
    }
    
    if (matchingPersona?.voice_model_identifier) {
      speakerAssignments.value[speakerName] = matchingPersona.voice_model_identifier;
      console.log(`Assigned voice ${matchingPersona.voice_model_identifier} to ${speakerName} from persona data`);
    } else {
      assignDefaultVoice(speakerName);
    }
  });
  
  // Summarize assignment results
  console.log('Voice assignment results:', { ...speakerAssignments.value });
  
  // If we successfully assigned any voices, show a notification
  if (Object.values(speakerAssignments.value).some(v => v)) {
    toast.success('Voices have been automatically assigned');
  }
}

// Helper function: Assign default voice to a role
function assignDefaultVoice(speakerName: string) {
  if (availableVoices.value.length === 0) return;
  
  // Assign different voices to different roles to avoid repetition
  let voiceIndex = 0;
  
  // If it's the first assignment, use the first voice
  if (Object.keys(speakerAssignments.value).length === 0) {
    voiceIndex = 0;
  }
  // If there are already assignments and multiple voices available, use a different voice
  else if (availableVoices.value.length > 1) {
    // Find used voice IDs
    const usedVoiceIds = new Set(Object.values(speakerAssignments.value));
    
    // Try to find an unused voice
    const unusedVoice = availableVoices.value.find(v => !usedVoiceIds.has(v.id));
    
    if (unusedVoice) {
      speakerAssignments.value[speakerName] = unusedVoice.id;
      console.log(`Assigned unused voice ${unusedVoice.name} to ${speakerName}`);
      return;
    }
    
    // If all voices are used, assign in rotation
    voiceIndex = Object.keys(speakerAssignments.value).length % availableVoices.value.length;
  }
  
  speakerAssignments.value[speakerName] = availableVoices.value[voiceIndex].id;
  console.log(`Assigned default voice ${availableVoices.value[voiceIndex].name} to ${speakerName}`);
}

// Handle TTS provider change
const onProviderChange = (value: string) => {
  ttsProvider.value = value;
  fetchVoices(value);
};

watch(ttsProvider, async (newProvider) => {
  if (!newProvider) {
    availableVoices.value = [];
    return;
  }
  
  await fetchVoices(newProvider);
}, { immediate: true }); // Execute immediately on initialization

const getVoiceNameById = (voiceId: string) => {
  const voice = availableVoices.value.find(v => v.id === voiceId);
  return voice ? voice.name : 'Unknown';
};

// Check if we can proceed to the next step
const canProceed = computed(() => {
  if (!ttsProvider.value || isLoadingVoices.value) return false;
  if (speakersInScript.value.length === 0) return false; // Must have roles to proceed
  return parsedScriptSegments.value.every(seg => 
    speakerAssignments.value[seg.speakerTag] && 
    availableVoices.value.some(v => v.id === speakerAssignments.value[seg.speakerTag])
  );
});

// Check if we can preview all
const canPreviewAll = computed(() => {
  return Object.keys(segmentPreviews.value).length > 0;
});

// Preview a single segment
async function previewSegment(segment: { speakerTag: string, text: string }, index: number) {
  if (!segment.text || !speakerAssignments.value[segment.speakerTag]) return;
  
  // Set status to loading
  if (!segmentStates.value[index]) {
    segmentStates.value[index] = { status: 'loading', message: 'Generating preview...' };
  } else {
    segmentStates.value[index].status = 'loading';
    segmentStates.value[index].message = 'Generating preview...';
  }
  
  isPreviewingSegment.value = index;
  try {
    const voiceId = speakerAssignments.value[segment.speakerTag];
    // Use a consistent podcastId for the session, derived from title or a timestamp if title is not set
    const currentPodcastTitle = playgroundStore.podcastSettings.title?.trim();
    const podcastIdForPreview = currentPodcastTitle 
      ? `preview_session_${currentPodcastTitle.replace(/\s+/g, '_')}` 
      : `preview_session_${Date.now()}`;

    // Call /api/podcast/process/synthesize-segments.post.ts
    const response = await fetch('/api/podcast/process/synthesize-segments', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: podcastIdForPreview,
        segments: [
          {
            segmentIndex: index,      
            text: segment.text,
            voiceId: voiceId,         
            speakerName: segment.speakerTag
          }
        ],
        defaultModelId: 'eleven_multilingual_v2', // TODO: Make this configurable if needed
        voiceSettings: { // Pass global synthesis params from the store
          stability: playgroundStore.synthesisParams.temperature,
          similarity_boost: 0.75, // Example, adjust as needed or make configurable
          style: 0,             // Example, adjust as needed
          use_speaker_boost: true // Example, adjust as needed
        }
      })
    });
    
    if (!response.ok) {
      let errorText = 'Failed to generate preview audio due to server error.';
      try {
        errorText = await response.text();
      } catch (e) {
        // Ignore error while reading response text, use default message.
      }
      console.error('API Error Response Text:', errorText);
      throw new Error(`Failed to generate preview audio. Status: ${response.status}. Message: ${errorText || response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json(); 
      
      if (data.success && data.generatedSegments && data.generatedSegments.length > 0) {
        const segmentResult = data.generatedSegments[0]; 
        // Use audioFileUrl and timestampFileUrl from the API response
        if (segmentResult.audioFileUrl) { 
          segmentPreviews.value[index] = {
            audioUrl: segmentResult.audioFileUrl, 
            timestamps: segmentResult.timestampFileUrl ? await fetch(segmentResult.timestampFileUrl).then(r => r.json()).catch(()=>[]) : [] 
          };
          
          segmentStates.value[index].status = 'success';
          segmentStates.value[index].message = 'Preview successful';
          segmentStates.value[index].audioUrl = segmentResult.audioFileUrl;
        } else {
          const errorMsg = segmentResult.error || 'Synthesis failed for segment in API response (no audioFileUrl from backend)';
          segmentStates.value[index].status = 'error';
          segmentStates.value[index].message = errorMsg;
          throw new Error(errorMsg);
        }
      } else {
        throw new Error(data.message || 'API did not return expected successful segment data.');
      }
    } else {
      const responseText = await response.text();
      console.error('Unexpected content type or non-JSON response. Content-Type:', contentType, 'Response Text:', responseText);
      throw new Error(`Unexpected response from server. Expected JSON but received: ${contentType}. Response: ${responseText.substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.error('Preview generation failed:', error); 
    toast.error('Preview generation failed', { description: error instanceof Error ? error.message : 'Please check console for details.' });
    
    if (segmentStates.value[index]) {
      segmentStates.value[index].status = 'error';
      segmentStates.value[index].message = 'Preview failed';
      segmentStates.value[index].error = error instanceof Error ? error.message : 'Unknown error';
    }
  } finally {
    isPreviewingSegment.value = null;
  }
}

// Preview all segments
async function previewAll() {
  // Check if there are enough voice assignments
  const unassignedSpeakers = speakersInScript.value.filter(speaker => !speakerAssignments.value[speaker]);
  if (unassignedSpeakers.length > 0) {
    toast.error(`Please assign voices for the following speakers: ${unassignedSpeakers.join(', ')}`);
    return;
  }
  
  // Use the new generatePreviewAudio function
  const success = await generatePreviewAudio();
  
  if (success) {
    toast.success('All segment previews generated successfully');
  } else {
    toast.error('Preview generation failed, please check error messages');
  }
}

// Generate audio preview
async function generatePreviewAudio() {
  if (!canProceed.value) return false;
  
  try {
    // Prepare data - convert to the format expected by the preview/segments API
    const segments = parsedScriptSegments.value.map(segment => ({
      speakerTag: segment.speakerTag,
      text: segment.text
    }));
    
    // Prepare voice settings
    const voiceSettings = {
      stability: playgroundStore.synthesisParams.temperature,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    };
    
    // Set all segments to loading state
    parsedScriptSegments.value.forEach((_, index) => {
      if (!segmentStates.value[index]) {
        segmentStates.value[index] = { status: 'loading', message: 'Generating preview...' };
      } else {
        segmentStates.value[index].status = 'loading';
        segmentStates.value[index].message = 'Generating preview...';
      }
    });
    
    toast.info('Generating preview, please wait...');
    
    // Call the preview/segments API
    const response = await fetch('/api/podcast/preview/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        config: {
          ttsProvider: ttsProvider.value,
          speakerAssignments: speakerAssignments.value,
          segments: segments
        },
        synthesisParams: {
          stability: playgroundStore.synthesisParams.temperature,
          similarity_boost: 0.75,
          style: 0,
          use_speaker_boost: true
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Preview generation failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    if (result.segments && result.segments.length > 0) {
      // Process the returned audio segments
      result.segments.forEach((segment: any, index: number) => {
        if (segment.status === 'success' && segment.audio) {
          // Create temporary audio URL
          const binary = atob(segment.audio);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: segment.contentType || 'audio/mpeg' });
          const audioUrl = URL.createObjectURL(audioBlob);
          
          // 保存预览结果
          segmentPreviews.value[index] = {
            audioUrl,
            timestamps: segment.timestamps || []
          };
          
          // Set status to success
          segmentStates.value[index] = { 
            status: 'success',
            message: 'Preview successful',
            audioUrl
          };
        } else if (segment.status === 'failed' || segment.error) {
          segmentStates.value[index] = { 
            status: 'error',
            message: 'Preview failed',
            error: segment.error || 'Unknown error'
          };
        }
      });
      
      // Use the first successfully generated audio as the combined preview
      const successSegmentIndex = Object.keys(segmentPreviews.value)[0];
      if (successSegmentIndex) {
        combinedPreviewUrl.value = segmentPreviews.value[Number(successSegmentIndex)].audioUrl;
      }
      
      const successCount = result.summary?.success || 0;
      const totalCount = result.summary?.total || segments.length;
      
      toast.success(`Successfully previewed ${successCount}/${totalCount} audio segments`);
      return successCount > 0;
    } else {
      throw new Error('Server did not return any preview segments');
    }
  } catch (error) {
    console.error('Preview generation failed:', error);
    toast.error(`Preview generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Set all segments to error state
    parsedScriptSegments.value.forEach((_, index) => {
      if (segmentStates.value[index]) {
        segmentStates.value[index].status = 'error';
        segmentStates.value[index].message = 'Preview failed';
      }
    });
    
    return false;
  }
}

// Generate audio (Full synthesis)
async function generateAudio() {
  if (!canProceed.value) return false;
  
  try {
    // Prepare data - convert to the format expected by the process/synthesize API
    const segments = parsedScriptSegments.value.map((segment, index) => ({
      segmentIndex: index,
      text: segment.text,
      voiceId: speakerAssignments.value[segment.speakerTag],
      speakerName: segment.speakerTag
    }));
    
    // Generate temporary podcastId
    const podcastId = `preview_${Date.now()}`;
    
    // Prepare voice settings
    const voiceSettings = {
      stability: playgroundStore.synthesisParams.temperature,
      similarity_boost: 0.75,
      style: 0,
      use_speaker_boost: true
    };
    
    // Set all segments to loading state
    parsedScriptSegments.value.forEach((_, index) => {
      if (!segmentStates.value[index]) {
        segmentStates.value[index] = { status: 'loading', message: 'Synthesizing...' };
      } else {
        segmentStates.value[index].status = 'loading';
        segmentStates.value[index].message = 'Synthesizing...';
      }
    });
    
    toast.info('Synthesizing all audio, please wait...');
    
    // Call the process/synthesize API
    const response = await fetch('/api/podcast/process/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId,
        segments,
        defaultModelId: 'eleven_multilingual_v2',
        voiceSettings
      })
    });
    
    if (!response.ok) {
      throw new Error(`Audio generation failed: ${response.statusText}`);
    }
    
    // Define response type interface
    interface SegmentResult {
      segmentIndex: number;
      audioUrl?: string;
      error?: string;
    }
    
    const result = await response.json();
    
    if (result.success && result.generatedSegments && result.generatedSegments.length > 0) {
      // Process the returned audio segments
      const successfulSegments = result.generatedSegments.filter((seg: SegmentResult) => !seg.error && seg.audioUrl);
      
      // Update the status of each segment
      result.generatedSegments.forEach((segment: SegmentResult) => {
        const index = segment.segmentIndex;
        if (segment.error) {
          segmentStates.value[index] = { 
            status: 'error',
            message: 'Synthesis failed',
            error: segment.error
          };
        } else if (segment.audioUrl) {
          segmentStates.value[index] = { 
            status: 'success',
            message: 'Synthesis successful',
            audioUrl: segment.audioUrl
          };
          
          // Save to segmentPreviews for playback
          segmentPreviews.value[index] = {
            audioUrl: segment.audioUrl,
            timestamps: [] // This API might not return timestamps
          };
        }
      });
      
      if (successfulSegments.length > 0) {
        // Use the first successfully generated audio as the combined preview
        const firstSegment = successfulSegments[0];
        combinedPreviewUrl.value = firstSegment.audioUrl;
        toast.success(`Successfully synthesized ${successfulSegments.length}/${segments.length} audio segments`);
        
        // If there are failed segments, show a warning
        const failedCount = result.generatedSegments.filter((seg: SegmentResult) => seg.error).length;
        if (failedCount > 0) {
          toast.warning(`${failedCount} segments failed to synthesize`);
        }
        
        return true;
      } else {
        toast.error('No audio segments were successfully synthesized');
        return false;
      }
    } else {
      throw new Error(result.message || 'Server did not return any segments');
    }
  } catch (error) {
    console.error('Audio generation failed:', error);
    toast.error(`Audio synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Set all segments to error state
    parsedScriptSegments.value.forEach((_, index) => {
      if (segmentStates.value[index]) {
        segmentStates.value[index].status = 'error';
        segmentStates.value[index].message = 'Synthesis failed';
      }
    });
    
    return false;
  }
}

// Expose configuration and validation status
defineExpose({
  getPerformanceConfig: () => {
    if (!canProceed.value) return null;

    return {
      provider: ttsProvider.value,
      script: props.scriptContent,
      availableVoices: availableVoices.value,
      assignments: { ...speakerAssignments.value },
      segments: parsedScriptSegments.value.map(seg => ({
        speakerTag: seg.speakerTag,
        voiceId: speakerAssignments.value[seg.speakerTag],
        text: seg.text,
        personaId: getPersonaForSpeaker(seg.speakerTag)?.persona_id,
        timestamps: segmentPreviews.value[parsedScriptSegments.value.findIndex(s => s.speakerTag === seg.speakerTag)]?.timestamps || []
      })).filter(seg => seg.voiceId) // Only keep segments with assigned voices
    };
  },
  isFormValid: canProceed,
  generateAudio,
  generatePreviewAudio
});

// Helper function to get voice selection placeholder text
const getVoiceSelectionPlaceholder = (segment: any) => {
  if (isLoadingVoices.value) return 'Loading Voices...';
  if (availableVoices.value.length === 0) return 'No Voices Available';
  
  if (segment.validationVoiceId) {
    return 'Recommended Voice Available';
  }
  
  return 'Select Voice';
};

// Determine if validation-based voice recommendations are supported
const validationVoiceSupported = computed(() => {
  return !!playgroundStore.validationResult?.structuredData?.voiceMap;
});

// Simplify onMounted hook, remove duplicate auto-assignment logic
onMounted(() => {
  // Check if script validation data is available
  if (playgroundStore.validationResult?.structuredData) {
    console.log('Script validation data available:', playgroundStore.validationResult.structuredData);
    toast.info('Validation data is available for this script.');
  }
  
  // Voice loading and auto-assignment are already handled in the fetchVoices function
  // No need to implement here again
});

// Function to handle when a segment's audio starts playing
// This will pause other playing audio elements.
const onSegmentPlay = (playedIndex: number) => {
  audioPlayingState.value[playedIndex] = true;
  Object.entries(audioRefs.value).forEach(([indexStr, audioEl]) => {
    const currentIndex = Number(indexStr);
    if (audioEl && currentIndex !== playedIndex && !audioEl.paused) {
      audioEl.pause();
      audioPlayingState.value[currentIndex] = false;
    }
  });
};

// Function to handle when a segment's audio pauses or ends
const onSegmentPauseOrEnd = (pausedIndex: number) => {
  audioPlayingState.value[pausedIndex] = false;
};
</script>
