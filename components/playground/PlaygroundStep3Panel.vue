<template>
  <div class="flex-1 p-4 flex flex-col items-center justify-center bg-background h-full space-y-6">
    <template v-if="audioUrl">
      <div class="w-full max-w-md text-center">
        <h3 class="text-xl font-semibold mb-4 text-primary">Podcast Ready!</h3>
        <p class="text-muted-foreground mb-1">Your podcast audio has been synthesized.</p>
        <p v-if="podcastPerformanceConfig" class="text-xs text-muted-foreground">
          Type: {{ (podcastPerformanceConfig as any)?.provider || 'N/A' }} | Voices: {{ getAssignedVoicesString() }}
        </p>
      </div>
      <div class="w-full max-w-xl p-4 border rounded-lg shadow-md bg-muted/30">
        <p class="font-medium text-sm mb-2 text-center">Final Audio Preview:</p>
        <audio :src="audioUrl" controls class="w-full"></audio>
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PodcastPerformanceConfig = any;

interface Props {
  audioUrl: string | null;
  podcastPerformanceConfig: PodcastPerformanceConfig | null;
  isGeneratingOverall: boolean;
}

const props = defineProps<Props>();

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
</script>