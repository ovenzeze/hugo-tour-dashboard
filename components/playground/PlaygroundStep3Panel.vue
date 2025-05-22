<template>
  <div class="flex-1 p-2 md:p-4 flex flex-col items-center justify-center bg-background h-full space-y-4 md:space-y-6 step3-container">
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
      <AudioSynthesisProgress 
        :is-processing="true"
        :progress-data="synthesisProgressData"
        :show-time-estimate="true"
      />
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
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore'; // Added UI Store
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import type { Persona } from '~/types/persona';
import type { AssignedVoicePerformance } from '~/stores/playgroundUIStore'; // Import the interface
import AudioSynthesisProgress from './AudioSynthesisProgress.vue';

const playgroundProcessStore = usePlaygroundProcessStore();
const playgroundSettingsStore = usePlaygroundSettingsStore();
const playgroundUIStore = usePlaygroundUIStore(); // Instantiate UI Store
const unifiedStore = usePlaygroundUnifiedStore();

// Use unifiedStore for synthesis state instead of playgroundProcessStore
const isGeneratingOverall = computed(() => unifiedStore.isSynthesizing);
const synthesizeError = computed(() => unifiedStore.error);

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

// Computed property for synthesis progress data
const synthesisProgressData = computed(() => {
  const totalSegments = unifiedStore.parsedSegments?.length || 0;
  
  // If synthesis is in progress but no progress data yet, initialize
  if (unifiedStore.isSynthesizing && !unifiedStore.synthesisProgress && totalSegments > 0) {
    return {
      completed: 0,
      total: totalSegments,
      currentSegment: 0,
      segments: unifiedStore.parsedSegments?.map((segment, index) => ({
        status: index === 0 ? 'processing' as const : 'waiting' as const,
        speaker: segment.speaker,
        text: segment.text
      })) || []
    };
  }
  
  // Get progress from unified store if available
  if (unifiedStore.synthesisProgress) {
    return {
      completed: unifiedStore.synthesisProgress.completed,
      total: unifiedStore.synthesisProgress.total,
      currentSegment: unifiedStore.synthesisProgress.currentSegment,
      segments: unifiedStore.parsedSegments?.map((segment, index) => ({
        status: index < unifiedStore.synthesisProgress!.completed ? 'completed' as const :
                index === unifiedStore.synthesisProgress!.currentSegment ? 'processing' as const :
                'waiting' as const,
        speaker: segment.speaker,
        text: segment.text
      }))
    };
  }
  
  // Fallback to basic progress when not synthesizing
  return {
    completed: 0,
    total: totalSegments,
    currentSegment: undefined,
    segments: unifiedStore.parsedSegments?.map((segment, index) => ({
      status: 'waiting' as const,
      speaker: segment.speaker,
      text: segment.text
    })) || []
  };
});

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

<style scoped>
.step3-container {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .step3-container {
    padding: 1rem 0.5rem;
  }
}
</style>