<template>
  <div class="flex items-center space-x-2 mb-4 flex-wrap">
    <Button @click="$emit('generate-script')" :disabled="isGeneratingScript || isSynthesizing" variant="secondary">
      <Icon :name="isGeneratingScript ? 'ph:spinner' : 'ph:pen-nib'" :class="{'animate-spin': isGeneratingScript, 'mr-2 h-4 w-4': true}" />
      <span>{{ isGeneratingScript ? 'Generating...' : 'AI Script' }}</span>
    </Button>
    <Button @click="$emit('preview-audio')" variant="outline" :disabled="!canPreviewOrSynthesize || isGeneratingScript || isSynthesizing">
      <Icon name="ph:waveform" class="mr-2 h-4 w-4" />
      <span>Preview</span>
    </Button>
    <Button @click="$emit('synthesize-audio')" :disabled="!canPreviewOrSynthesize || isSynthesizing || isGeneratingScript" variant="secondary">
      <Icon :name="isSynthesizing ? 'ph:spinner' : 'ph:speaker-high'" :class="{'animate-spin': isSynthesizing, 'mr-2 h-4 w-4': true}" />
      <span>{{ isSynthesizing ? 'Synthesizing...' : 'Synthesize' }}</span>
    </Button>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button @click="$emit('toggle-play')" variant="outline" :disabled="!audioUrl || isGeneratingScript || isSynthesizing" class="w-10 h-10 p-0">
            <Icon :name="isPlaying ? 'ph:pause' : 'ph:play'" class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{{ isPlaying ? 'Pause Audio' : 'Play Audio' }}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button @click="$emit('download-audio')" variant="outline" :disabled="!audioUrl || isPlaying || isGeneratingScript || isSynthesizing" class="w-10 h-10 p-0">
            <Icon name="ph:download-simple" class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Download Audio</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button @click="$emit('reset-content')" variant="destructive" class="ml-auto w-10 h-10 p-0">
            <Icon name="ph:arrow-counter-clockwise" class="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Reset Content</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <audio 
      ref="audioPlayerRef" 
      :src="audioUrl || undefined" 
      @ended="$emit('audio-ended')" 
      @play="$emit('audio-played')"
      @pause="$emit('audio-paused')"
      class="hidden">
    </audio>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Button } from '@/components/ui/button';
// Icon component is often auto-imported in Nuxt 3 projects, or globally registered.
// If not, ensure it's imported, e.g., import Icon from '#components'; or similar depending on setup.
// For this example, I'll assume Icon is available similar to how it was in the original file.
// If you use a specific Icon component like <nuxt-icon>, adjust accordingly.
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const props = defineProps<{
  isGeneratingScript: boolean;
  isSynthesizing: boolean;
  canPreviewOrSynthesize: boolean; // Combined prop: e.g. !!textToSynthesize && !!selectedPersonaId
  audioUrl: string | null;
  isPlaying: boolean;
}>();

const emit = defineEmits([
  'generate-script',
  'preview-audio',
  'synthesize-audio',
  'toggle-play',
  'download-audio',
  'reset-content',
  'audio-ended',
  'audio-played',
  'audio-paused',
]);

const audioPlayerRef = ref<HTMLAudioElement | null>(null);

watch(() => props.audioUrl, (newUrl, oldUrl) => {
  // If the audio URL changes and it's different from the old one, reload the audio player
  if (audioPlayerRef.value && newUrl !== oldUrl) {
    audioPlayerRef.value.load(); 
  }
});

// Expose methods for the parent component to call if needed
defineExpose({
  play: () => audioPlayerRef.value?.play(),
  pause: () => audioPlayerRef.value?.pause(),
  load: () => audioPlayerRef.value?.load(), // Allows parent to explicitly reload if necessary
  getAudioPlayerRef: () => audioPlayerRef.value // To attach more listeners or advanced control
});
</script>
