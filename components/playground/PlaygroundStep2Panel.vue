<template>
  <div class="flex flex-col flex-1 h-full">
    <VoicePerformanceSettings
      class="w-full overflow-y-auto p-2 md:p-4 flex-1"
      ref="voicePerformanceSettingsRef"
    />
    <!-- Display final/combined audio if available -->
    <div v-if="displayAudioUrl" class="p-4 border-t bg-background flex-shrink-0">
      <p class="font-medium text-sm mb-2">Audio Preview:</p>
      <audio :src="displayAudioUrl" controls class="w-full"></audio>
      <div class="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
        <p class="font-medium text-sm text-foreground mb-1">Podcast Audio Details:</p>
        <p><strong>TTS Provider:</strong> {{ settingsStore.podcastSettings.ttsProvider || 'N/A' }}</p>
        <p><strong>Assigned Voices:</strong> {{ assignedVoicesSummary }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VoicePerformanceSettings from './VoicePerformanceSettings.vue';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { Persona } from '~/types/persona';

const uiStore = usePlaygroundUIStore();
const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();
const personaCache = usePersonaCache();

const voicePerformanceSettingsRef = ref<InstanceType<typeof VoicePerformanceSettings> | null>(null);

// Determine which audio URL to display (prefer final, fallback to preview)
const displayAudioUrl = computed(() => uiStore.finalAudioUrl || uiStore.audioUrl);

const assignedVoicesSummary = computed(() => {
  // Access speakerAssignments from the exposed getPerformanceConfig method of VoicePerformanceSettings
  const performanceConfig = voicePerformanceSettingsRef.value?.getPerformanceConfig();
  if (!performanceConfig || !performanceConfig.speakerAssignments) return 'N/A';

  const assignments = performanceConfig.speakerAssignments as Record<string, { voiceId: string; provider: string }>;
  const uniqueSpeakers = scriptStore.uniqueSpeakers; // Assuming this getter exists in scriptStore

  if (uniqueSpeakers.length === 0 || Object.keys(assignments).length === 0) return 'No voices assigned yet.';

  const summaryParts: string[] = [];
  uniqueSpeakers.forEach(speakerName => {
    const assignment = assignments[speakerName];
    if (assignment && assignment.voiceId) {
      // Try to find the persona name for the voiceId for a more friendly display
      const personaForVoice = personaCache.personas.value.find(p => p.voice_model_identifier === assignment.voiceId);
      const voiceDisplayName = personaForVoice?.name || assignment.voiceId;
      summaryParts.push(`${speakerName}: ${voiceDisplayName}`);
    } else {
      summaryParts.push(`${speakerName}: Not Assigned`);
    }
  });

  return summaryParts.join('; ') || 'N/A';
});


// Expose methods or properties of VoicePerformanceSettings if needed by the parent orchestrator (e.g., the main playground page)
// This allows the main page to call methods on VoicePerformanceSettings via PlaygroundStep2Panel.
defineExpose({
  getPerformanceConfig: () => {
    return voicePerformanceSettingsRef.value?.getPerformanceConfig();
  },
  isFormValid: computed(() => {
    return voicePerformanceSettingsRef.value?.isFormValid;
  }),
  // synthesizedSegmentsCount and totalSegmentsCount might be derived from stores now
  // updateSegmentStats is likely handled internally by VoicePerformanceSettings or via stores
});
</script>