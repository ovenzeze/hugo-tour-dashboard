<template>
  <div class="bg-background flex items-center justify-between space-x-2 sticky top-0 z-20">
    <!-- Toolbar content will go here -->
    <div class="flex items-center gap-2">
      <!-- Mode/Step specific buttons -->
      <template v-if="synthesisMode === 'standard'">
        <Button 
          v-if="currentStepIndex === 1" 
          @click="$emit('synthesize-standard')" 
          :disabled="isGenerating"
          size="sm"
        >
          <Loader2 v-if="isGenerating" class="w-4 h-4 mr-2 animate-spin" />
          <Wand2 v-else class="w-4 h-4 mr-2" />
          Synthesize
        </Button>
      </template>

      <template v-if="synthesisMode === 'podcast'">
        <Button 
          v-if="currentStepIndex === 1" 
          @click="$emit('generate-script')" 
          :disabled="isGenerating"
          size="sm"
        >
          <Loader2 v-if="isGenerating" class="w-4 h-4 mr-2 animate-spin" />
          <Sparkles v-else class="w-4 h-4 mr-2" />
          Generate Script
        </Button>
        <Button 
          v-if="currentStepIndex === 1"
          variant="secondary"
          @click="$emit('use-preset-script')" 
          :disabled="isGenerating"
          size="sm"
        >
          <BookOpenText class="w-4 h-4 mr-2" />
          使用预设脚本
        </Button>
        <Button 
          v-if="currentStepIndex === 1" 
          variant="outline" 
          @click="$emit('skip-script')"
          :disabled="isGenerating"
          size="sm"
        >
          <SkipForward class="w-4 h-4 mr-2" />
          Use My Script
        </Button>

        <Button 
          v-if="currentStepIndex === 2" 
          @click="$emit('proceed-to-synthesis')" 
          :disabled="isGenerating"
          size="sm"
        >
          <!-- Potentially add a check icon or similar later based on state -->
          Next: Synthesize Audio
          <ArrowRight class="w-4 h-4 ml-2" />
        </Button>

        <Button 
          v-if="currentStepIndex === 3" 
          @click="$emit('synthesize-podcast-audio')" 
          :disabled="isGenerating || !currentAudioUrl" 
          size="sm"
        >
          <Loader2 v-if="isGenerating && !currentAudioUrl" class="w-4 h-4 mr-2 animate-spin" />
          <RadioTower v-else class="w-4 h-4 mr-2" />
          Synthesize Podcast
        </Button>
      </template>
    </div>

    <div class="flex items-center gap-2">
       <Button 
        v-if="currentAudioUrl"
        variant="outline" 
        @click="$emit('download-audio')"
        size="sm"
      >
        <Download class="w-4 h-4 mr-2" />
        Download Audio
      </Button>
      <Button 
        v-if="synthesisMode === 'standard' && currentStepIndex === 1 && currentAudioUrl" 
        variant="ghost" 
        @click="$emit('reset-view')" 
        size="sm"
      >
        <RotateCcw class="w-4 h-4 mr-2" />
        New Synthesis
      </Button>
       <!-- More generic Reset / Clear button might be useful too -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Sparkles, SkipForward, ArrowRight, RadioTower, Download, RotateCcw, BookOpenText } from 'lucide-vue-next';

interface Props {
  synthesisMode: 'podcast' | 'standard';
  currentStepIndex: number;
  currentAudioUrl?: string | null;
  isGenerating?: boolean;
  // Add more specific loading states if needed, e.g., isScriptGenerating, isAudioSynthesizing
}

const props = defineProps<Props>();

const emit = defineEmits([
  'generate-script',
  'skip-script',
  'proceed-to-synthesis',
  'synthesize-standard',
  'synthesize-podcast-audio',
  'download-audio',
  'reset-view',
  'use-preset-script'
]);

// Logic for button disabled states or visibility can be refined here
// For example, check if script is present for podcast synthesis, etc.

</script>

<style scoped>
/* Styles for the toolbar */
</style> 