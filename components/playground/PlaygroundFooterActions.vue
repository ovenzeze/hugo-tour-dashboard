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

        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                @click="emit('generate-ai-script')"
                :disabled="isGeneratingOverall"
                :variant="textToSynthesize ? 'outline' : 'default'"
                class="w-full md:w-auto relative overflow-hidden group"
              >
                <div class="flex items-center justify-center">
                  <div v-if="isScriptGenerating" class="absolute inset-0 bg-primary/10 animate-pulse"></div>
                  <div class="flex items-center justify-center relative z-10">
                    <Icon 
                      v-if="isScriptGenerating" 
                      name="ph:sparkle" 
                      class="w-4 h-4 mr-2 animate-pulse text-primary" 
                    />
                    <Icon 
                      v-else 
                      name="ph:magic-wand" 
                      class="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300" 
                    />
                    <span v-if="isScriptGenerating">AI Creating...</span>
                    <span v-else>AI Create Script</span>
                  </div>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Use AI to automatically generate a podcast script based on your settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
                <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button 
                variant="outline" 
                @click="emit('use-preset-script')" 
                :disabled="isGeneratingOverall" 
                class="w-full md:w-auto group"
              >
                <Icon 
                  name="ph:book-open-text" 
                  class="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300" 
                />
                <span>Use Preset Script</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Load a preset example script for quick testing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </template>
    </div>
    <!-- Right Main Action Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto justify-end">
      <template v-if="currentStepIndex === 1">
        <TooltipProvider>
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                :disabled="!textToSynthesize || isGeneratingOverall || isValidating"
                @click="emit('proceed-without-validation')"
                class="w-full md:w-auto relative overflow-hidden group"
              >
                <div class="flex items-center justify-center">
                  <div v-if="isValidating" class="absolute inset-0 bg-primary/10 animate-pulse"></div>
                  <div class="flex items-center justify-center relative z-10">
                    <Icon
                      v-if="isValidating"
                      name="ph:spinner"
                      class="w-4 h-4 mr-2 animate-spin text-primary"
                    />
                    <span v-if="isValidating">Validating...</span>
                    <span v-else>Next</span>
                    <Icon v-if="!isValidating" name="ph:arrow-right" class="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent v-if="isValidating">
              <p>正在验证脚本并准备下一步...</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
        <TooltipProvider v-if="currentStepIndex === 2">
          <Tooltip :delay-duration="200">
            <TooltipTrigger as-child>
              <Button
                variant="default"
                :disabled="!isPodcastGenerationAllowed || isGeneratingAudioPreview"
                @click="emit('synthesize-podcast')"
                class="w-full md:w-auto"
              >
                Synthesize Podcast
                <Icon name="ph:rocket-launch" class="w-4 h-4 ml-2" />
              </Button>
            </TooltipTrigger>
            <TooltipContent v-if="!isPodcastGenerationAllowed">
              <p>Please ensure all audio segments have been successfully previewed.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  isPodcastGenerationAllowed?: boolean; // Added for step 2 podcast synthesis button
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
