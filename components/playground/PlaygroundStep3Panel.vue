<template>
  <div class="flex-1 p-4 flex flex-col items-center justify-center bg-background h-full space-y-6">
    <template v-if="finalAudioUrl">
      <div class="w-full max-w-md text-center">
        <h3 class="text-xl font-semibold mb-4 text-primary">Podcast Ready!</h3>
        <p class="text-muted-foreground mb-1">Your podcast audio has been synthesized.</p>
        <p class="text-xs text-muted-foreground">
          Type: {{ selectedTtsProvider || 'N/A' }} | Voices: {{ getAssignedVoicesString() }}
        </p>
      </div>
      <div class="w-full max-w-xl p-4 border rounded-lg shadow-md bg-muted/30">
        <p class="font-medium text-sm mb-2 text-center">Final Audio Preview:</p>
        <audio :src="finalAudioUrl" controls class="w-full"></audio>
      </div>
      <!-- Buttons will be handled by PlaygroundFooterActions.vue -->
    </template>
    <template v-else-if="isGeneratingOverall">
      <div class="flex flex-col items-center justify-center h-full">
        <Icon name="ph:spinner" class="h-12 w-12 animate-spin text-primary mb-4" />
        <p class="text-center text-lg font-medium">Synthesizing Podcast...</p>
        <p class="text-center text-sm text-muted-foreground mt-2">Please wait while the final audio is being generated.</p>
      </div>
    </template>
    <template v-else-if="synthesizeError">
      <div class="text-center text-destructive">
        <Icon name="ph:warning-circle" class="h-12 w-12 mx-auto mb-4" />
        <p class="text-lg font-medium">Error Synthesizing Podcast</p>
        <p class="text-sm">{{ synthesizeError }}</p>
      </div>
    </template>
    <template v-else>
      <div class="text-center">
        <Icon name="ph:speaker-high" class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p class="text-lg font-medium text-muted-foreground">No audio synthesized yet.</p>
        <p class="text-sm text-muted-foreground">Complete the previous steps to generate your podcast.</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore'; // Added UI Store
import type { Persona } from '~/types/persona';
import type { AssignedVoicePerformance } from '~/stores/playgroundUIStore'; // Import the interface

const playgroundProcessStore = usePlaygroundProcessStore();
const playgroundSettingsStore = usePlaygroundSettingsStore();
const playgroundUIStore = usePlaygroundUIStore(); // Instantiate UI Store

const {
  isSynthesizing: isGeneratingOverall, // Aliased for template compatibility
  error: synthesizeError, // Use the general error from process store
} = storeToRefs(playgroundProcessStore);

const {
  podcastSettings, // Get the whole object to access ttsProvider
} = storeToRefs(playgroundSettingsStore);

const {
  finalAudioUrl, // From UI Store state
  availableVoices, // From UI Store getter
  assignedVoicePerformances, // From UI Store getter
} = storeToRefs(playgroundUIStore);

// Computed property for selectedTtsProvider for cleaner template access
const selectedTtsProvider = computed(() => podcastSettings.value.ttsProvider);

const getAssignedVoicesString = () => {
  const performances = assignedVoicePerformances.value; // This is now Record<string, AssignedVoicePerformance>
  // availableVoices.value is already Persona[]

  if (!performances || Object.keys(performances).length === 0) return 'N/A';

  const voiceMap = new Map<string, string>();
  for (const speakerTag in performances) {
    const performanceDetail: AssignedVoicePerformance | undefined = performances[speakerTag];
    if (performanceDetail) {
      // Use persona_name if available, otherwise fallback to speakerTag or voice_id
      const displayName = performanceDetail.persona_name || performanceDetail.voice_id || speakerTag;
      voiceMap.set(speakerTag, displayName);
    }
  }

  if (voiceMap.size === 0) return 'N/A';
  return Array.from(voiceMap.entries())
    .map(([speaker, voice]) => `${speaker}: ${voice}`)
    .join(', ');
};
</script>