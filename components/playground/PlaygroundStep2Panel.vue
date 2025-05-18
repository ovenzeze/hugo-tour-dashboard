<template>
  <div class="flex flex-col flex-1 h-full">
    <VoicePerformanceSettings
      :script-content="scriptContent"
      :synth-progress="synthProgress"
      class="w-full overflow-y-auto p-2 md:p-4 flex-1"
      @update:script-content="emit('update:scriptContent', $event)"
      ref="voicePerformanceSettingsRef"
    />
    <div v-if="audioUrl" class="p-4 border-t bg-background flex-shrink-0">
      <p class="font-medium text-sm mb-2">Audio Preview:</p>
      <audio :src="audioUrl" controls class="w-full"></audio>
      <div v-if="podcastPerformanceConfig && audioUrl" class="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
        <p class="font-medium text-sm text-foreground mb-1">Podcast Audio Details:</p>
        <p><strong>Type:</strong> {{ (podcastPerformanceConfig as any)?.provider || 'N/A' }}</p>
        <p><strong>Voices:</strong> {{ getAssignedVoicesString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VoicePerformanceSettings from './VoicePerformanceSettings.vue'; // Assuming it's in the same directory or adjust path

interface SynthProgress {
  synthesized: number; // Changed from number | undefined
  total: number;     // Changed from number | undefined
}

// Define a more specific type for podcastPerformanceConfig if possible, based on its actual structure
// For now, using 'any' as it was in the original component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PodcastPerformanceConfig = any;

interface Props {
  scriptContent: string;
  synthProgress?: SynthProgress; // Made the prop optional to align with VoicePerformanceSettings
  audioUrl: string | null;
  podcastPerformanceConfig: PodcastPerformanceConfig | null;
}

const props = defineProps<Props>();
const emit = defineEmits(['update:scriptContent']);

const voicePerformanceSettingsRef = ref(null);

const getAssignedVoicesString = () => {
  if (!props.podcastPerformanceConfig) return 'N/A';

  const config = props.podcastPerformanceConfig as any;
  if (!config.segments || !Array.isArray(config.segments)) return 'N/A';

  const voiceMap = new Map<string, string>();

  config.segments.forEach((segment: any) => {
    if (segment.speakerTag && segment.voiceId) {
      const voiceName = config.availableVoices?.find((v: any) => v.id === segment.voiceId)?.name || segment.voiceId;
      voiceMap.set(segment.speakerTag, voiceName);
    }
  });

  if (voiceMap.size === 0) return 'N/A';

  return Array.from(voiceMap.entries())
    .map(([speaker, voice]) => `${speaker}: ${voice}`)
    .join(', ');
};

// Expose methods or properties of VoicePerformanceSettings if needed by the parent
// This allows the parent component to call methods on VoicePerformanceSettings
// For example, to get performance config or check form validity.
defineExpose({
  getPerformanceConfig: () => {
    return (voicePerformanceSettingsRef.value as any)?.getPerformanceConfig();
  },
  isFormValid: computed(() => {
    return (voicePerformanceSettingsRef.value as any)?.isFormValid;
  }),
  synthesizedSegmentsCount: computed(() => {
    return (voicePerformanceSettingsRef.value as any)?.synthesizedSegmentsCount;
  }),
  totalSegmentsCount: computed(() => {
    return (voicePerformanceSettingsRef.value as any)?.totalSegmentsCount;
  }),
});
</script>