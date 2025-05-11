<template>
  <div class="space-y-6 text-sm">
    <div class="space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Content & Structure</h3>
      <Input id="podcast-name" v-model="podcastSettings.title" placeholder="Podcast Episode Title (e.g., Exploring Deep Space)" />
      
      <Textarea
        id="podcast-topic"
        v-model="podcastSettings.topic"
        placeholder="Main Topic / Theme (e.g., The future of AI in education...)"
        rows="3"
      />

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input 
          id="podcast-segments" 
          v-model.number="podcastSettings.numberOfSegments" 
          type="number" 
          placeholder="Number of Segments (e.g., 3)" 
          min="1"
        />
        <Input 
          id="podcast-style" 
          v-model="podcastSettings.style" 
          placeholder="Podcast Style / Tone (e.g., Conversational)" 
        />
      </div>

      <Textarea
        id="podcast-keywords"
        v-model="podcastSettings.keywords"
        placeholder="Key Talking Points / Keywords (comma-separated, e.g., AI, future, ethics)"
        rows="2"
      />
    </div>

    <div class="space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Voice & Personas</h3>
      <Select v-model="selectedProviderForPodcast" @update:model-value="onProviderChange" id="podcast-provider-select">
        <SelectTrigger class="w-full">
          <SelectValue placeholder="Select voice provider" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="provider in props.providers" :key="provider.id" :value="provider.id">
            {{ provider.name }}
          </SelectItem>
        </SelectContent>
      </Select>

      <!-- Host Persona Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Host Persona</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select v-model="podcastSettings.hostPersonaId" :disabled="props.personasLoading">
              <SelectTrigger class="w-full border-blue-300 dark:border-blue-700">
                <SelectValue :placeholder="props.personasLoading ? 'Loading...' : 'Select host persona'" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="persona in props.personas" :key="persona.id" :value="persona.id">
                  {{ persona.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <!-- Guest Personas Selection -->
      <div class="mb-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Guest Personas</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Add up to 3 guest personas for your podcast.</p>
        <div v-for="(guestId, index) in podcastSettings.guestPersonaIds" :key="index" class="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="text-md font-medium text-gray-800 dark:text-gray-200">Guest {{ index + 1 }}</h4>
            <Button variant="ghost" size="sm" @click="removeGuest(index)" v-if="podcastSettings.guestPersonaIds.length > 0">
              <X class="h-4 w-4" />
              Remove
            </Button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select v-model="podcastSettings.guestPersonaIds[index]" :disabled="props.personasLoading">
                <SelectTrigger class="w-full border-green-300 dark:border-green-700">
                  <SelectValue :placeholder="props.personasLoading ? 'Loading...' : `Select guest persona ${index + 1}`" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="persona in availableGuestPersonas(guestId)" :key="persona.id" :value="persona.id">
                    {{ persona.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Button class="mt-2" variant="outline" @click="addGuest" :disabled="podcastSettings.guestPersonaIds.length >= 3">
          <Plus class="h-4 w-4 mr-2" />
          Add Guest
        </Button>
      </div>
    </div>

    <div class="space-y-4">
      <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">Audio & Effects</h3>
      <Input 
        id="podcast-music" 
        v-model="podcastSettings.backgroundMusic" 
        placeholder="Background Music Theme (e.g., Uplifting, Chill, Mysterious... or None)" 
      />
    </div>

    <!-- Configuration Completeness -->
    <div class="mt-2 text-xs" :class="configCompleteness.textColor">
      Configuration Status: {{ configCompleteness.statusText }} ({{ configCompleteness.percentage }}%)
    </div>
    <!-- Save Status -->
    <div v-if="showSaveStatus" class="mt-2 text-xs text-green-600 dark:text-green-400">
      Settings applied!
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, reactive } from 'vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Plus } from 'lucide-vue-next';
import type { Persona } from '@/types/persona'; 
import type { FullPodcastSettings } from '@/stores/playground'; 

interface VoiceProvider {
  id: string;
  name: string;
}

const props = defineProps<{
  personas: Persona[];
  personasLoading: boolean;
  providers: VoiceProvider[];
  currentSelectedProvider: string | undefined;
  initialSettings: FullPodcastSettings; // Ensure initialSettings is defined as a required prop
}>();

const emit = defineEmits<{ 
  (e: 'update:selectedProvider', providerId: string | undefined): void;
  (e: 'update:podcastSettings', settings: FullPodcastSettings): void;
}>();

const podcastSettings = ref<FullPodcastSettings>({
  ...(props.initialSettings || {}),
  guestPersonaIds: props.initialSettings?.guestPersonaIds || []
});

const showSaveStatus = ref(false);
let saveStatusTimeout: NodeJS.Timeout | null = null;

// Update podcastSettings if initialSettings prop changes from parent
watch(() => props.initialSettings, (newSettings) => {
  podcastSettings.value = {
    ...(newSettings || {}), // Default to empty object if newSettings is undefined
    guestPersonaIds: newSettings?.guestPersonaIds || [] // Use optional chaining and fallback
  };
}, { deep: true, immediate: true });

// Emit changes to parent whenever podcastSettings changes
const emitSettings = () => {
  emit('update:podcastSettings', { ...podcastSettings.value });
  showSaveStatus.value = true;
  if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    showSaveStatus.value = false;
  }, 2000);
};

watch(podcastSettings, () => {
  emitSettings();
}, { deep: true });

const configCompleteness = computed(() => {
  let completedFields = 0;
  const totalFields = 4; // title, topic, hostPersonaId, voiceProvider

  if (podcastSettings.value.title?.trim()) completedFields++;
  if (podcastSettings.value.topic?.trim()) completedFields++;
  if (podcastSettings.value.hostPersonaId) completedFields++;
  if (selectedProviderForPodcast.value) completedFields++; // Assuming selectedProviderForPodcast reflects voice_provider_id

  const percentage = Math.round((completedFields / totalFields) * 100);
  let statusText = 'Incomplete';
  let textColor = 'text-red-600 dark:text-red-400';

  if (percentage === 100) {
    statusText = 'Ready to Generate';
    textColor = 'text-green-600 dark:text-green-400';
  } else if (percentage > 50) {
    statusText = 'Almost Ready';
    textColor = 'text-yellow-600 dark:text-yellow-400';
  }
  return { percentage, statusText, textColor };
});

const selectedProviderForPodcast = ref(props.currentSelectedProvider);

const onProviderChange = (providerId: string | undefined) => {
  selectedProviderForPodcast.value = providerId;
  emit('update:selectedProvider', providerId);
};

const addGuest = () => {
  if (podcastSettings.value.guestPersonaIds.length < 3) {
    podcastSettings.value.guestPersonaIds.push('');
  }
};

const removeGuest = (index: number) => {
  podcastSettings.value.guestPersonaIds.splice(index, 1);
};

// Compute available personas for guests (exclude selected host and other selected guests)
const availableGuestPersonas = computed(() => {
  return (currentGuestId: number | undefined) => {
    return props.personas.filter(persona => {
      // Exclude the host persona
      if (persona.id === podcastSettings.value.hostPersonaId) return false;
      // Exclude other selected guest personas, unless it's the current slot being edited
      if (podcastSettings.value.guestPersonaIds.some((id, idx) => id === persona.id && currentGuestId !== undefined && idx !== currentGuestId)) return false;
      return true;
    });
  };
});

onMounted(() => {
  // Ensure initial settings are emitted on mount if needed
  emitSettings();
});
</script>
