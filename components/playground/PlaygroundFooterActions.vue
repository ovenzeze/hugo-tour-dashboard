<template>
  <CardFooter class="border-t p-3 flex flex-col md:flex-row justify-between items-center flex-shrink-0 bg-background gap-2 md:gap-4">
    <!-- Left Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto">
      <Button
        v-if="currentStepIndex > 1"
        variant="outline"
        @click="emit('previous-step')"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
        Previous
      </Button>
      <Button
        variant="ghost"
        @click="emit('reset')"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-counter-clockwise" class="w-4 h-4 mr-2" />
        Reset
      </Button>
      <template v-if="currentStepIndex === 1">

        <Button
          @click="emit('generate-ai-script')"
          :disabled="isGeneratingOverall"
          :variant="textToSynthesize ? 'outline' : 'destructive'"
          class="w-full md:w-auto"
        >
        
          <Icon v-if="isScriptGenerating" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:robot" class="w-4 h-4" />
          <span v-if="isScriptGenerating">Generating...</span>
          <span v-else>AI Script</span>
        </Button>
                <Button variant="outline" @click="emit('use-preset-script')" :disabled="isGeneratingOverall" class="w-full md:w-auto">
          <Icon name="ph:book-open-text" class="w-4 h-4" /> Use Preset
        </Button>
      </template>
    </div>
    <!-- Right Main Action Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto justify-end">
      <template v-if="currentStepIndex === 1">
        <Button
          variant="default"
          :disabled="!textToSynthesize || isGeneratingOverall || isValidating"
          @click="emit('proceed-without-validation')"
          class="w-full md:w-auto"
        >
          Next <Icon name="ph:arrow-right" class="w-4 h-4 ml-2" />
        </Button>
      </template>
      <template v-if="currentStepIndex === 2">
        <Button
          variant="outline"
          @click="emit('generate-audio-preview')"
          :disabled="!canProceedFromStep2 || isGeneratingAudioPreview"
        >
          <Icon v-if="isGeneratingAudioPreview" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:broadcast" class="w-4 h-4 mr-2" />
          {{ isGeneratingAudioPreview ? 'Generating...' : 'Generate Audio Preview' }}
        </Button>
        <Button
          @click="emit('next-from-step2')"
          :disabled="!canProceedFromStep2"
        >
          Proceed to Synthesis
          <Icon name="ph:arrow-right" class="w-4 h-4 ml-2" />
        </Button>
      </template>
      <template v-if="currentStepIndex === 3">
        <Button
          v-if="audioUrl"
          variant="outline"
          @click="emit('download-audio')"
        >
          <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
          Download Audio
        </Button>
        <Button
          @click="emit('synthesize-podcast')"
          :disabled="isGeneratingOverall || isSynthesizing"
        >
          <Icon v-if="isSynthesizing" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:broadcast" class="w-4 h-4 mr-2" />
          Synthesize Podcast
        </Button>
      </template>
    </div>
  </CardFooter>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
// Icon is auto-imported

interface Props {
  currentStepIndex: number;
  isGeneratingOverall: boolean;
  isScriptGenerating: boolean; // Specifically for AI Script button
  isSynthesizing: boolean; // Specifically for Synthesize Podcast button
  isValidating: boolean;
  canProceedFromStep2: boolean;
  isGeneratingAudioPreview: boolean;
  textToSynthesize: string | null | undefined;
  audioUrl: string | null;
}

defineProps<Props>();

const emit = defineEmits([
  'previous-step',
  'reset',
  'use-preset-script',
  'generate-ai-script',
  'proceed-without-validation',
  'generate-audio-preview',
  'next-from-step2',
  'download-audio',
  'synthesize-podcast',
]);
</script>