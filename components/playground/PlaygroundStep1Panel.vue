<template>
  <div class="flex flex-col md:flex-row gap-4 flex-1 p-4 bg-background h-full">
    <!-- Left Form Area, Scrolls Independently -->
    <Card class="md:w-1/3 w-full p-4 flex-shrink-0 bg-muted/60 border-none shadow-md overflow-y-auto h-full">
      <PodcastSettingsForm
        :model-value="podcastSettings"
        :personas="personasForForm"
        :personas-loading="personasLoading"
        @update:model-value="emit('update:podcastSettings', $event)"
      />
    </Card>
    <!-- Right Script Editing Area, Scrolls Independently -->
    <Card class="flex-1 min-h-[240px] flex flex-col bg-background border-none shadow-md overflow-y-auto h-full">
      <template v-if="isScriptGenerating || isValidating">
        <div class="flex flex-col items-center justify-center h-full">
          <!-- Progress Indicator -->
          <div class="relative mb-6">
            <div class="w-32 h-32 rounded-full flex items-center justify-center bg-muted/20">
              <div class="w-24 h-24 rounded-full flex items-center justify-center bg-background shadow-inner">
                <div class="text-center">
                  <div class="text-xl font-bold text-primary">
                    {{ aiScriptStep === 1 ? '1/2' : '2/2' }}
                  </div>
                  <div class="text-xs text-muted-foreground">Step</div>
                </div>
              </div>
            </div>
            <!-- Rotating Ring -->
            <div class="absolute inset-0 w-32 h-32">
              <svg class="w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                <circle 
                  cx="50" cy="50" r="45" 
                  fill="none" 
                  stroke="currentColor" 
                  stroke-width="8"
                  stroke-linecap="round"
                  stroke-dasharray="70 283"
                  class="text-primary"
                />
              </svg>
            </div>
          </div>
          
          <!-- Status Title -->
          <h3 class="text-center text-xl font-semibold mb-2">
            <template v-if="isScriptGenerating && aiScriptStep">
              <span v-if="aiScriptStep === 1">Creating Podcast Metadata</span>
              <span v-else-if="aiScriptStep === 2">Generating Complete Script</span>
              <span v-else>AI Script Generation</span>
            </template>
            <template v-else>
              {{ isScriptGenerating ? 'Standardizing Script...' : 'Validating Script...' }}
            </template>
          </h3>
          
          <!-- Detailed Status Description -->
          <div class="text-center text-sm text-muted-foreground max-w-md">
            <template v-if="isScriptGenerating && aiScriptStep === 1">
              <p class="mb-2">AI is analyzing your settings and creating the podcast structure, including:</p>
              <ul class="text-left list-disc pl-6 space-y-1">
                <li>Determining the optimal podcast title</li>
                <li>Planning conversation structure and flow</li>
                <li>Designing character traits for host and guests</li>
              </ul>
            </template>
            <template v-else-if="isScriptGenerating && aiScriptStep === 2">
              <p class="mb-2">AI is creating the complete script based on metadata, including:</p>
              <ul class="text-left list-disc pl-6 space-y-1">
                <li>Writing natural and fluid dialogue</li>
                <li>Ensuring content matches your chosen topic and style</li>
                <li>Balancing participation across all characters</li>
              </ul>
            </template>
            <template v-else>
              {{ isScriptGenerating ? 'Processing and saving script...' : '验证脚本格式和内容，准备进入下一步...' }}
            </template>
          </div>
          
          <!-- Status Text -->
          <p class="mt-4 text-sm italic text-muted-foreground">
            {{ aiScriptStepText || 'Please wait, this may take a moment...' }}
          </p>
        </div>
      </template>
      <Textarea
        v-else-if="!selectedPersonaIdForHighlighting"
        :model-value="mainEditorContent"
        placeholder="Script will appear here after generation..."
        class="flex-1 w-full h-full resize-none min-h-[200px] rounded-lg border border-input bg-background p-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition placeholder:text-muted-foreground"
        @update:model-value="emit('update:mainEditorContent', $event)"
      />
      <div
        v-else
        class="flex-1 w-full h-full overflow-y-auto p-4 text-sm"
        v-html="highlightedScript"
      ></div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
// Icon is auto-imported
import PodcastSettingsForm from './PodcastSettingsForm.vue';
// Import types expected by PodcastSettingsForm
import type { FullPodcastSettings, Persona } from '~/types/playground';

interface Props {
  podcastSettings: FullPodcastSettings; // Use FullPodcastSettings from ~/types/playground
  personasForForm: Persona[]; // Use Persona from ~/types/playground
  personasLoading: boolean;
  isScriptGenerating: boolean;
  isValidating: boolean;
  mainEditorContent: string;
  selectedPersonaIdForHighlighting: number | null;
  highlightedScript: string;
  aiScriptStep?: number;
  aiScriptStepText?: string;
}

const props = defineProps<Props>();

const aiScriptStep = props.aiScriptStep ?? 0;
const aiScriptStepText = props.aiScriptStepText ?? '';

const emit = defineEmits(['update:podcastSettings', 'update:mainEditorContent']);
</script>

<style scoped>
.animate-spin-slow {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
