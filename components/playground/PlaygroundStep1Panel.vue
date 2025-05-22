<template>
  <div class="flex flex-col md:flex-row gap-4 flex-1 p-4 bg-background h-full">
    <!-- Left Form Area, Scrolls Independently -->
    <Card class="flex-1 min-h-0 h-full p-2 bg-muted/60 border-none shadow-md overflow-y-auto relative">
      <!-- Loading Overlay for Left Card -->
      <div
        v-if="isLeftCardLoading"
        class="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg"
      >
        <Icon name="ph:spinner-gap" class="w-10 h-10 animate-spin text-primary" />
        <p class="mt-4 text-sm text-muted-foreground">Processing, please wait...</p>
      </div>
      <PodcastSettingsForm
        :model-value="podcastSettings"
        @update:model-value="handlePodcastSettingsUpdate"
      />
    </Card>
    <!-- Right Script Editing Area, Scrolls Independently -->
    <Card class="flex-1 min-h-0 h-full flex flex-col bg-background/25 border-none shadow-md overflow-y-auto p-1 relative">
      <!-- Success Message -->
      <Transition name="fade-fast">
        <div
          v-if="showSuccessMessage"
          class="absolute top-4 right-4 bg-green-100 dark:bg-green-800  text-green-700 dark:text-green-200 px-4 py-2 rounded-md shadow-lg text-sm z-20"
        >
          <Icon name="ph:check-circle" class="inline w-5 h-5 mr-2" />
          Script generated successfully!
        </div>
      </Transition>

      <template v-if="isLoadingFromStore">
        <div class="flex flex-col items-center justify-center h-full space-y-4">
          <div class="flex flex-col items-center">
            <Icon name="ph:spinner-gap" class="w-12 h-12 animate-spin text-primary" />
            <div class="mt-4 bg-muted/30 rounded-full h-2 w-64 overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300 ease-in-out"
                :style="{ width: `${loadingProgress}%` }"
              ></div>
            </div>
          </div>
          <div class="w-full space-y-3 mt-6">
            <Skeleton class="h-8 w-3/4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-5/6" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-4/6" />
            <Skeleton class="h-8 w-1/2 mt-4" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-3/4" />
          </div>
          <h3 class="text-center text-lg font-semibold mt-6">
            <template v-if="isScriptGenerating">
              <span v-if="aiScriptStep === 1">Analyzing input...</span>
              <span v-else-if="aiScriptStep === 2">Building outline...</span>
              <span v-else-if="aiScriptStep === 3">Generating script content...</span>
              <span v-else>Generating script...</span>
            </template>
            <template v-else-if="isValidating">
              Validating script...
            </template>
            <template v-else>
              Processing...
            </template>
          </h3>
          <p class="text-center text-sm text-muted-foreground max-w-md">
            {{ aiScriptStepText || 'Please wait, this may take a moment...' }}
          </p>
          <p class="text-xs text-muted-foreground">
            Estimated time remaining: {{ estimatedTimeRemaining }}
          </p>
          <Transition name="fade">
            <div v-if="mainEditorContent" class="w-full mt-6">
              <Textarea
                :model-value="mainEditorContent"
                placeholder="Script is being generated..."
                class="flex-1 w-full h-full resize-none min-h-[120px] rounded-lg border border-input bg-background p-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition placeholder:text-muted-foreground opacity-80 leading-relaxed"
                readonly
              />
            </div>
          </Transition>
        </div>
      </template>
      <template v-else-if="scriptError">
        <div class="flex flex-col items-center justify-center h-full text-center">
          <Icon name="ph:x-circle" class="w-16 h-16 text-destructive mb-4" />
          <h3 class="text-xl font-semibold text-destructive mb-2">Script Generation Failed</h3>
          <p class="text-muted-foreground max-w-md">{{ scriptError }}</p>
          <Button variant="outline" @click="handleClearErrorAndRetry" class="mt-6">
            <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </template>
      <Textarea
        v-else-if="!selectedPersonaIdForHighlighting"
        :model-value="mainEditorContent"
        placeholder="Script will appear here once generated or type your script..."
        class="flex-1 w-full h-full resize-none min-h-[200px] rounded- border-input bg-background p-4 text-base  transition placeholder:text-muted-foreground leading-relaxed"
        @update:model-value="handleMainEditorContentUpdate"
      />
      <div
        v-else
        class="flex-1 w-full h-full overflow-y-auto p-4 text-sm leading-relaxed"
        v-html="highlightedScript"
      ></div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PodcastSettingsForm from './PodcastSettingsForm.vue';

import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { FullPodcastSettings } from '~/types/playground';
import type { Persona } from '~/types/persona';
import type { ScriptSegment } from '~/types/api/podcast';


const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();
const uiStore = usePlaygroundUIStore();
const processStore = usePlaygroundProcessStore();
const personaCache = usePersonaCache();

// Props are removed as their state is now managed by Pinia stores
// interface Props {
//   selectedPersonaIdForHighlighting: number | null;
//   highlightedScript: string;
//   aiScriptStep?: number;
//   aiScriptStepText?: string;
// }
// const props = withDefaults(defineProps<Props>(), { ... });

// --- Store-driven reactive data ---
const podcastSettings = computed(() => settingsStore.podcastSettings);
const mainEditorContent = computed(() => scriptStore.scriptContent);
const personasForForm = computed(() => personaCache.personas.value); // For PodcastSettingsForm persona selection
const personasLoading = computed(() => personaCache.isLoading.value); // For PodcastSettingsForm persona selection

// Loading and error states from respective stores
const isLoadingFromStore = computed(() => processStore.isLoading || processStore.isSynthesizing || processStore.isValidating); // General loading indicator
const scriptError = computed(() => processStore.error || scriptStore.error); // Combine API errors and script parsing errors

// UI specific states from uiStore
const aiScriptStep = computed(() => uiStore.aiScriptGenerationStep);
const aiScriptStepText = computed(() => uiStore.aiScriptGenerationStepText);
const selectedPersonaIdForHighlighting = computed(() => uiStore.selectedPersonaIdForHighlighting);

const highlightedScript = computed(() => {
  if (!selectedPersonaIdForHighlighting.value || !scriptStore.parsedSegments) {
    return scriptStore.scriptContent; // Return raw content if no highlighting needed or no segments
  }
  return scriptStore.parsedSegments.map(segment => {
    const personaId = selectedPersonaIdForHighlighting.value;
    // Ensure personaId is treated as number for comparison if it's a string from UI store
    const numericPersonaId = typeof personaId === 'string' ? parseInt(personaId, 10) : personaId;

    if (segment.speakerPersonaId === numericPersonaId) {
      return `<mark class="bg-primary/20 rounded px-1">${segment.speaker}: ${segment.text}</mark>`;
    }
    return `${segment.speaker}: ${segment.text}`;
  }).join('\n');
});


// UI specific loading/status computations
const isLeftCardLoading = computed(() => {
  // Example: Loading left card if AI script generation is in an early phase
  return processStore.isLoading && (aiScriptStep.value > 0 && aiScriptStep.value <= 2);
});

const isScriptGenerating = computed(() => processStore.isLoading && uiStore.currentStep === 2 && aiScriptStep.value > 0);
const isValidating = computed(() => processStore.isValidating && uiStore.currentStep === 1); // Assuming validation happens in step 1 before script generation

// Emits are likely not needed if all actions are through stores
// const emit = defineEmits([]);

// Fetch personas on mount
onMounted(() => {
  if (personasForForm.value.length === 0 && !personasLoading.value) {
    personaCache.fetchPersonas();
  }
});

// Function to handle updates from PodcastSettingsForm
const handlePodcastSettingsUpdate = (newSettings: Partial<FullPodcastSettings>) => {
  settingsStore.updatePodcastSettings(newSettings);
};

// Function to handle script content updates from Textarea
const handleMainEditorContentUpdate = (newContent: string | number) => {
  // The Textarea component might emit a number in some edge cases, though unlikely for script content.
  // Ensure we pass a string to the store.
  scriptStore.updateScriptContent(String(newContent));
};

// Function to handle retry
const handleClearErrorAndRetry = () => {
  processStore.clearApiError();
  scriptStore.clearError();
  // Depending on the error, might need to reset UI step or re-trigger an action
  // For example, if it was an API error during script generation:
  // uiStore.setCurrentStep(1); // Or relevant step
};


// --- UI logic for loading progress, success messages etc. ---
const loadingProgress = ref(0);
const estimatedTimeRemaining = ref('Calculating...'); // Changed to English
let loadingInterval: NodeJS.Timeout | null = null;
let startTime: number | null = null;
const showSuccessMessage = ref(false);
let successMessageTimeout: NodeJS.Timeout | null = null;

function startLoadingProgress() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingProgress.value = 0;
  startTime = Date.now();
  estimatedTimeRemaining.value = 'Calculating...';
  loadingInterval = setInterval(() => {
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    if (loadingProgress.value < 90) {
      const increment = Math.max(0.1, (90 - loadingProgress.value) / 20); // Smoother increment
      loadingProgress.value = Math.min(90, loadingProgress.value + increment);
    }
    if (elapsed > 2) { // Start estimating after 2 seconds
      const totalEstimated = Math.max(elapsed, elapsed * 100 / (loadingProgress.value || 1)); // Ensure totalEstimated is at least elapsed
      const remaining = Math.max(0, totalEstimated - elapsed);
      if (remaining < 1) {
        estimatedTimeRemaining.value = '<1 second';
      } else if (remaining < 60) {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining)} seconds`;
      } else {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining / 60)} minutes`;
      }
    }
  }, 200); // Faster interval for smoother progress
}

function completeLoadingProgress() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
  loadingProgress.value = 100;
  estimatedTimeRemaining.value = 'Complete';
  setTimeout(() => {
    loadingProgress.value = 0; // Reset for next loading, or hide progress bar
  }, 1000);
}

// Watch relevant loading states from processStore
watch(
  () => [processStore.isLoading, processStore.isSynthesizing, processStore.isValidating, processStore.error],
  ([loading, synthesizing, validating, error], [wasLoading, wasSynthesizing, wasValidating]) => {
    const anyLoading = loading || synthesizing || validating;
    const anyWasLoading = wasLoading || wasSynthesizing || wasValidating;

    if (!anyWasLoading && anyLoading) {
      startLoadingProgress();
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }
    if (anyWasLoading && !anyLoading) {
      completeLoadingProgress();
      if (!error) { // Only show success if there was no error during the process
        showSuccessMessage.value = true;
        if (successMessageTimeout) clearTimeout(successMessageTimeout);
        successMessageTimeout = setTimeout(() => {
          showSuccessMessage.value = false;
        }, 3000);
      }
    }
  }
);

onUnmounted(() => {
  if (loadingInterval) clearInterval(loadingInterval);
  if (successMessageTimeout) clearTimeout(successMessageTimeout);
});

</script>

<style scoped>
/* Fade transition for success message */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.3s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

/* Fade transition for textarea visibility */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease-in-out;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
