<template>
  <div class="grid grid-cols-1 gap-x-6 gap-y-4">
    <div class="space-y-2 p-4 border rounded-md bg-muted/30">
      <h3 class="text-sm font-medium text-muted-foreground">Selected Personas (Read-only)</h3>
      <div v-if="selectedHostPersona" class="text-sm">
        <strong>Host:</strong> {{ selectedHostPersona.name }}
      </div>
      <div v-if="selectedGuestPersonas.length > 0" class="text-sm">
        <strong>Guests:</strong>
        <ul>
          <li v-for="guest in selectedGuestPersonas" :key="guest.persona_id">- {{ guest.name }}</li>
        </ul>
      </div>
      <div v-if="!selectedHostPersona && selectedGuestPersonas.length === 0" class="text-sm text-muted-foreground">
        No personas selected in the previous step.
      </div>
    </div>

    <div class="space-y-2">
      <Label for="scriptContentArea" class="text-base font-medium">Script Content</Label>
      <Textarea 
        id="scriptContentArea"
        :value="scriptContent" 
        @input="$emit('update:scriptContent', ($event.target as HTMLTextAreaElement).value)" 
        class="min-h-[200px] font-mono text-sm"
        placeholder="Your script will appear here. You can make minor edits."
      />
    </div>

    <!-- Synthesis Parameters from playgroundStore -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Voice Temperature ({{ playgroundStore.synthesisParams.temperature.toFixed(1) }})</Label>
        <HoverCard>
          <HoverCardTrigger as-child>
            <Button variant="ghost" size="icon">
              <HelpCircle class="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p class="text-sm">Controls the degree of voice variation. Higher values produce more variation, while lower values result in more stable output.</p>
          </HoverCardContent>
        </HoverCard>
      </div>
      <Slider
        :model-value="playgroundStore.synthesisParams.temperatureArray"
        @update:model-value="(value: number[]) => playgroundStore.updateSynthesisParams({ temperature: value[0] })"
        :min="0"
        :max="1"
        :step="0.1"
      />
    </div>

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Speech Rate ({{ playgroundStore.synthesisParams.speed.toFixed(1) }}x)</Label>
        <HoverCard>
          <HoverCardTrigger as-child>
            <Button variant="ghost" size="icon">
              <HelpCircle class="h-4 w-4" />
            </Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <p class="text-sm">Adjust the playback speed of the voice. 1.0 is normal speed, greater than 1.0 speeds up, less than 1.0 slows down.</p>
          </HoverCardContent>
        </HoverCard>
      </div>
      <Slider
        :model-value="playgroundStore.synthesisParams.speedArray"
        @update:model-value="(value: number[]) => playgroundStore.updateSynthesisParams({ speed: value[0] })"
        :min="0.5"
        :max="2"
        :step="0.1"
      />
    </div>

    <div class="space-y-2">
      <Label for="performanceTaskType">Performance Task Type</Label>
      <Select v-model="performanceTaskType">
        <SelectTrigger id="performanceTaskType" class="w-full">
          <SelectValue placeholder="Select task type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="monologue">Monologue (Single Speaker)</SelectItem>
            <SelectItem value="dialogue">Dialogue (Multiple Speakers)</SelectItem>
            <SelectItem value="narration">Narration</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="ttsProvider">TTS Provider</Label>
      <Select v-model="ttsProvider" @change="onProviderChange">
        <SelectTrigger id="ttsProvider" class="w-full">
          <SelectValue placeholder="Select TTS provider" />
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

    <div v-if="ttsProvider" class="space-y-2">
      <Label for="selectedVoice">Voice</Label>
      <Select v-model="selectedVoice" :disabled="isLoadingVoices || availableVoices.length === 0">
        <SelectTrigger id="selectedVoice">
          <SelectValue :placeholder="isLoadingVoices ? 'Loading voices...' : (availableVoices.length === 0 ? 'No voices available' : 'Select voice')" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
       <p v-if="isLoadingVoices" class="text-sm text-muted-foreground flex items-center"><Loader2 class="w-4 h-4 mr-2 animate-spin"/> Fetching voices...</p>
    </div>

    <div v-if="performanceTaskType === 'dialogue' && speakersInScript.length" class="space-y-4">
      <h4 class="text-base font-medium">Speaker Assignment</h4>
      <div v-for="speaker in speakersInScript" :key="speaker" class="p-4 border rounded-md space-y-2 bg-muted/50">
        <p class="font-semibold">Speaker: {{ speaker }}</p>
        <Label :for="`speaker-voice-${speaker}`" class="text-sm text-muted-foreground">Assign Voice:</Label>
        <Select v-model="speakerAssignments[speaker]" :disabled="isLoadingVoices || availableVoices.length === 0">
          <SelectTrigger :id="`speaker-voice-${speaker}`">
            <SelectValue :placeholder="isLoadingVoices ? 'Loading voices...' : (availableVoices.length === 0 ? 'No voices available' : 'Select voice for ' + speaker)" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="voice in availableVoices" :key="voice.id" :value="voice.id">{{ voice.name }}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>

    <!-- New Section: Script Breakdown -->
    <div v-if="performanceTaskType === 'dialogue' && parsedScriptSegments.length > 0" class="space-y-4">
      <h4 class="text-base font-medium">Script Breakdown & Preview</h4>
      <div v-for="(segment, index) in parsedScriptSegments" :key="`segment-${index}`" class="p-4 border rounded-md space-y-3 bg-muted/40">
        <div class="flex justify-between items-center">
          <p class="text-sm font-semibold">Segment {{ index + 1 }}: <span class="font-bold text-primary">{{ segment.speakerTag }}</span></p>
          <!-- Placeholder for Preview Button -->
          <!-- <Button size="sm" variant="outline">Preview</Button> -->
        </div>
        
        <div class="space-y-1">
          <Label class="text-xs text-muted-foreground">Text:</Label>
          <p class="text-sm p-2 border rounded bg-background/50 max-h-28 overflow-y-auto">{{ segment.text }}</p>
        </div>

        <div class="grid grid-cols-2 gap-x-4">
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Assigned Voice:</Label>
            <p class="text-sm font-medium">{{ speakerAssignments[segment.speakerTag] ? getVoiceNameById(speakerAssignments[segment.speakerTag]) : 'Not Assigned' }}</p>
          </div>
          <div class="space-y-1">
            <Label class="text-xs text-muted-foreground">Associated Persona:</Label>
            <p class="text-sm font-medium">{{ getPersonaForSpeaker(segment.speakerTag)?.name || 'None' }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits, defineExpose } from 'vue';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-vue-next';
import { usePlaygroundStore, type Persona } from '@/stores/playground';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-vue-next';
import { Slider } from '@/components/ui/slider';

const props = defineProps<{ scriptContent: string }>();
const emit = defineEmits(['update:scriptContent']);

const playgroundStore = usePlaygroundStore();

const performanceTaskType = ref('');
const ttsProvider = ref('');
const availableVoices = ref<{id: string, name: string}[]>([]);
const selectedVoice = ref('');
const isLoadingVoices = ref(false);
const speakerAssignments = ref<Record<string, string>>({});

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

const mockVoices = {
  elevenlabs: [{id: 'el_voice1', name: 'ElevenLabs - Rachel'}, {id: 'el_voice2', name: 'ElevenLabs - Adam'}],
  azure: [{id: 'az_voice1', name: 'Azure - Jenny (Neural)'}, {id: 'az_voice2', name: 'Azure - Guy (Neural)'}],
  openai_tts: [{id: 'oa_voice1', name: 'OpenAI - Nova'}, {id: 'oa_voice2', name: 'OpenAI - Alloy'}]
};

// Helper for @change on TTS Provider select because v-model might not update early enough for the watch
const onProviderChange = (value: string) => {
  ttsProvider.value = value;
};

watch(ttsProvider, async (newProvider) => {
  if (!newProvider) {
    availableVoices.value = [];
    selectedVoice.value = '';
    return;
  }
  isLoadingVoices.value = true;
  selectedVoice.value = ''; // Reset selected voice when provider changes
  Object.keys(speakerAssignments.value).forEach(key => speakerAssignments.value[key] = ''); // Reset speaker assignments
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API call
  availableVoices.value = mockVoices[newProvider as keyof typeof mockVoices] || [];
  isLoadingVoices.value = false;
  // selectedVoice.value = availableVoices.value.length > 0 ? availableVoices.value[0].id : ''; 
}, { immediate: false }); // immediate false to avoid running on init if ttsProvider has initial value

const speakersInScript = computed(() => {
  if (props.scriptContent && performanceTaskType.value === 'dialogue') {
    const speakerPattern = /^([A-Za-z0-9_]+):/gm;
    const matches = [...props.scriptContent.matchAll(speakerPattern)];
    const uniqueSpeakers = [...new Set(matches.map(match => match[1]))];
    uniqueSpeakers.forEach(speaker => {
      if (!(speaker in speakerAssignments.value)) {
        speakerAssignments.value[speaker] = '';
      }
    });
    // Clean up assignments for speakers no longer in script
    Object.keys(speakerAssignments.value).forEach(assignedSpeaker => {
      if (!uniqueSpeakers.includes(assignedSpeaker)) {
        delete speakerAssignments.value[assignedSpeaker];
      }
    });
    return uniqueSpeakers;
  }
  return [];
});

const parsedScriptSegments = computed(() => {
  if (props.scriptContent && performanceTaskType.value === 'dialogue') {
    const segments: { speakerTag: string, text: string }[] = [];
    const script = props.scriptContent.trim();
    if (!script) return [];

    // Regex to capture speaker and their lines until the next speaker or end of script
    const segmentPattern = /^([A-Za-z0-9_]+):\\s*([\\s\\S]*?)(?=(?:^[A-Za-z0-9_]+:|$))/gm;
    let match;
    while ((match = segmentPattern.exec(script)) !== null) {
      const speakerTag = match[1];
      const text = match[2].trim();
      if (text) { // Only add if there's actual text
        segments.push({ speakerTag, text });
      }
    }
    return segments;
  }
  return [];
});

const getVoiceNameById = (voiceId: string) => {
  const voice = availableVoices.value.find(v => v.id === voiceId);
  return voice ? voice.name : 'N/A';
};

const getPersonaForSpeaker = (speakerTag: string): Persona | undefined => {
  if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
    return selectedHostPersona.value;
  }
  return selectedGuestPersonas.value.find(p => p.name === speakerTag);
};

const canProceed = computed(() => {
  if (!performanceTaskType.value || !ttsProvider.value || isLoadingVoices.value) return false;
  if (performanceTaskType.value === 'dialogue') {
    if (speakersInScript.value.length === 0) return false; // Must have speakers for dialogue
    return speakersInScript.value.every(sp => speakerAssignments.value[sp] && availableVoices.value.some(v => v.id === speakerAssignments.value[sp]));
  }
  return !!selectedVoice.value && availableVoices.value.some(v => v.id === selectedVoice.value);
});

// Expose performance config and validation state
defineExpose({
  getPerformanceConfig: () => {
    if (!canProceed.value) return null;

    const baseConfig = {
      taskType: performanceTaskType.value,
      provider: ttsProvider.value,
      script: props.scriptContent, // Keep full script for general context if needed
      availableVoices: availableVoices.value, // Useful for the consumer
    };

    if (performanceTaskType.value === 'dialogue') {
      const segments: { speakerTag: string, voiceId: string, text: string, personaId?: number }[] = [];
      const script = props.scriptContent.trim();
      if (!script) return { ...baseConfig, segments: [] }; // Handle empty script

      // Regex to capture speaker and their lines until the next speaker or end of script
      // Matches "SPEAKER_TAG:" followed by text. Handles multi-line text for a single speaker.
      const segmentPattern = /^([A-Za-z0-9_]+):\s*([\s\S]*?)(?=(?:^[A-Za-z0-9_]+:|$))/gm;
      let match;
      
      while ((match = segmentPattern.exec(script)) !== null) {
        const speakerTag = match[1];
        const text = match[2].trim();
        const voiceId = speakerAssignments.value[speakerTag];

        if (text && voiceId) { // Only add segment if there's text and an assigned voice
          let personaId: number | undefined = undefined;
          
          // Try to match speakerTag with selected personas
          if (selectedHostPersona.value && selectedHostPersona.value.name === speakerTag) {
            personaId = selectedHostPersona.value.persona_id;
          } else {
            const guestPersona = selectedGuestPersonas.value.find(p => p.name === speakerTag);
            if (guestPersona) {
              personaId = guestPersona.persona_id;
            }
          }
          
          segments.push({
            speakerTag,
            voiceId,
            text,
            personaId,
          });
        }
      }
      
      return {
        ...baseConfig, // Includes taskType, provider, full script, availableVoices
        assignments: { ...speakerAssignments.value }, // Keep original assignments map as well
        segments, // The newly parsed segments
      };
    } else {
      // Monologue or other types
      return {
        ...baseConfig,
        voice: selectedVoice.value,
      };
    }
  },
  isFormValid: canProceed
});

watch(performanceTaskType, (newType) => {
  // Reset voice/assignments when task type changes
  selectedVoice.value = '';
  speakerAssignments.value = {}; 
});

</script>
