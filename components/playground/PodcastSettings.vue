<template>
  <div class="space-y-6">
    <div class="space-y-4">
      <h2 class="text-xl font-semibold">Podcast Script Generation Setup</h2>

      <!-- 1. Voice Provider -->
      <div>
        <Select v-model="selectedProviderForPodcast" @update:model-value="onProviderChange" id="podcast-provider-select">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select voice provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="provider in props.providers" :key="provider.id" :value="provider.id" class="dark:hover:bg-gray-700">
              {{ provider.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 2. Host Persona -->
      <div>
        <Select v-model="selectedHostPersonaId" :disabled="!selectedProviderForPodcast || props.personasLoading || !props.personas || props.personas.length === 0" id="host-persona-select">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select Host Persona" />
          </SelectTrigger>
          <SelectContent>
            <p v-if="props.personasLoading" class="p-2 text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
            <SelectItem v-else v-for="persona in props.personas" :key="persona.persona_id" :value="String(persona.persona_id)" class="dark:hover:bg-gray-700">
              {{ persona.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 3. Guest Persona -->
      <div>
        <Select v-model="selectedGuestPersonaId" :disabled="!selectedProviderForPodcast || props.personasLoading || !props.personas || props.personas.length === 0" id="guest-persona-select">
          <SelectTrigger class="w-full">
            <SelectValue placeholder="Select Guest Persona" />
          </SelectTrigger>
          <SelectContent>
            <p v-if="props.personasLoading" class="p-2 text-sm text-gray-500 dark:text-gray-400">Loading personas...</p>
            <SelectItem v-else v-for="persona in props.personas" :key="persona.persona_id" :value="String(persona.persona_id)" class="dark:hover:bg-gray-700">
              {{ persona.name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- 4. User Instruction -->
      <div>
        <Textarea
          id="podcast-user-instruction"
          v-model="podcastUserInstruction"
          placeholder="Podcast Topic / Instructions (e.g., A 3-segment podcast discussing the future of AI in education...)"
          class="min-h-[150px]"
        />
      </div>
      
      <!-- 5. System Prompt (Fixed) -->
      <div>
        <div
          id="podcast-system-prompt-display"
          class="p-3 bg-muted/40 dark:bg-muted/30 rounded-md border border-dashed text-sm text-muted-foreground min-h-[100px] whitespace-pre-wrap select-text"
          aria-label="System Prompt (Preset)"
        >
          {{ podcastSystemPrompt }} 
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType, onMounted } from 'vue';
// import { toast } from 'vue-sonner'; // toast will be handled by the component triggering API call
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
// import { Input } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label'; // Label might still be useful for section titles if needed later
// import { Button } from '@/components/ui/button';
// import { Icon } from '@iconify/vue';
import type { Database, Tables } from '@/types/supabase';
import { usePlaygroundStore } from '@/stores/playground'; // Assuming this is your Pinia store

type Persona = Tables<'personas'>;

interface VoiceProvider {
  id: string;
  name: string;
}

// Interface for script segments might be needed by the store or parent component later
// interface PodcastScriptSegment {
//   id?: string; 
//   role: string;
//   text: string;
// }

const props = defineProps({
  personas: {
    type: Array as PropType<Persona[]>,
    default: () => []
  },
  personasLoading: {
    type: Boolean,
    default: false
  },
  providers: {
    type: Array as PropType<VoiceProvider[]>,
    default: () => []
  },
  currentSelectedProvider: {
    type: String as PropType<string | undefined>,
    default: undefined
  }
});

// const emit = defineEmits(['update:selectedProvider']); // Not emitting for now, parent updates prop

const playgroundStore = usePlaygroundStore();

const initialPodcastInstruction = `Podcast Topic: "The Ethics of AI"

Cast:
- Host: [Selected via dropdown]
- Guest: [Selected via dropdown]

Key Discussion Points / Script Outline:
- Segment 1: Discuss current AI advancements and public perception.
- Segment 2: Explore ethical challenges (e.g., bias, privacy).
- Segment 3: Cover future outlook and responsible AI development.

Overall Tone: Informative and engaging.`;

const podcastUserInstruction = ref(initialPodcastInstruction);
const selectedProviderForPodcast = ref<string | undefined>(props.currentSelectedProvider);
const selectedHostPersonaId = ref<Persona['persona_id'] | null>(null);
const selectedGuestPersonaId = ref<Persona['persona_id'] | null>(null);

// Watch for prop changes to sync provider if necessary
watch(() => props.currentSelectedProvider, (newVal) => {
  if (selectedProviderForPodcast.value !== newVal) {
    selectedProviderForPodcast.value = newVal;
    // Also update store if parent changes it, assuming parent is the source of truth for this prop
    // playgroundStore.updatePodcastProvider(newVal); 
  }
});

const onProviderChange = (newProviderId: string) => {
  selectedProviderForPodcast.value = newProviderId;
  // Emit or call store action if this component can change the shared provider state
  // emit('update:selectedProvider', newProviderId);
  // playgroundStore.updatePodcastProvider(newProviderId);
};

// Update Pinia store when local settings change
watch(podcastUserInstruction, (newValue) => {
  playgroundStore.updatePodcastInstruction(newValue); // Assumed action
});
watch(selectedProviderForPodcast, (newValue) => {
  if(newValue) playgroundStore.updatePodcastProvider(newValue); // Assumed action
});
watch(selectedHostPersonaId, (newValue) => {
  playgroundStore.updatePodcastHostPersona(newValue); // Assumed action
});
watch(selectedGuestPersonaId, (newValue) => {
  playgroundStore.updatePodcastGuestPersona(newValue); // Assumed action
});

// Initialize store with default values on mount if they are not already set
onMounted(() => {
  // Check if store already has values, if not, initialize them from local defaults
  // This prevents overwriting store values if they were set by other means or persisted
  if (playgroundStore.podcastInstruction === undefined || playgroundStore.podcastInstruction === '') {
      playgroundStore.updatePodcastInstruction(podcastUserInstruction.value);
  }
  if (selectedProviderForPodcast.value && (playgroundStore.podcastProviderId === undefined || playgroundStore.podcastProviderId === '')){
      playgroundStore.updatePodcastProvider(selectedProviderForPodcast.value);
  }
  // Initializing personas to null is fine, no need to check store if they are already null
  if (playgroundStore.podcastHostPersonaId === undefined) {
    playgroundStore.updatePodcastHostPersona(selectedHostPersonaId.value);
  }
  if (playgroundStore.podcastGuestPersonaId === undefined) {
    playgroundStore.updatePodcastGuestPersona(selectedGuestPersonaId.value);
  }
});


const presetSystemPrompt = "This is a preset system prompt for podcast generation. The AI will generate a multi-turn dialogue script based on the user instructions, host, and guest personas. Ensure the conversation flows naturally and adheres to the defined roles.";

const podcastSystemPrompt = computed(() => {
  return presetSystemPrompt;
});

</script>

<style scoped>
/* Add any specific styles for the PodcastSettings component here */
</style>
