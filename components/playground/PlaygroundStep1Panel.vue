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
        :personas="personasForForm"
        :personas-loading="personasLoading"
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
              <span v-if="props.aiScriptStep === 1">Analyzing input...</span>
              <span v-else-if="props.aiScriptStep === 2">Building outline...</span>
              <span v-else-if="props.aiScriptStep === 3">Generating script content...</span>
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
            {{ props.aiScriptStepText || 'Please wait, this may take a moment...' }}
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
        v-else-if="!props.selectedPersonaIdForHighlighting"
        :model-value="mainEditorContent"
        placeholder="Script will appear here once generated or type your script..."
        class="flex-1 w-full h-full resize-none min-h-[200px] rounded- border-input bg-background p-4 text-base  transition placeholder:text-muted-foreground leading-relaxed"
        @update:model-value="handleMainEditorContentUpdate"
      />
      <div
        v-else
        class="flex-1 w-full h-full overflow-y-auto p-4 text-sm leading-relaxed"
        v-html="props.highlightedScript"
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

import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { FullPodcastSettings } from '~/types/playground'; // Keep for PodcastSettingsForm if it still expects it directly
// Persona type will now come from usePersonaCache or common types if defined
// import type { Persona } from '@/stores/playgroundPersona'; // Remove old store import
import type { Persona } from '~/types/persona'; // Assuming common Persona type

const playgroundStore = usePlaygroundUnifiedStore();
const personaCache = usePersonaCache();

// Props that might still be needed if controlled by a parent orchestrator for multi-step scenarios
// For a fully store-driven component, these might also be removed or simplified.
interface Props {
  // Example: if a parent component needs to know about highlighting, it could still be a prop
  selectedPersonaIdForHighlighting: number | null;
  highlightedScript: string;
  // aiScriptStep & aiScriptStepText might be moved to store if they represent global generation state
  aiScriptStep?: number; 
  aiScriptStepText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPersonaIdForHighlighting: null,
  highlightedScript: '',
  aiScriptStep: 0,
  aiScriptStepText: '',
});

// --- Store-driven reactive data ---
const podcastSettings = computed(() => playgroundStore.podcastSettings);
const mainEditorContent = computed(() => playgroundStore.scriptContent);
const personasForForm = computed(() => personaCache.personas.value);
const personasLoading = computed(() => personaCache.isLoading.value);

// Combined loading state from the store. 
// You might need more granular states in the store if "isScriptGenerating" and "isValidating" have distinct UI implications.
const isLoadingFromStore = computed(() => playgroundStore.isLoading);
const scriptError = computed(() => playgroundStore.error);

// UI specific loading/status (can be driven by store state too)
const isLeftCardLoading = computed(() => {
  // Example: Loading left card if store is loading and it's a script generation phase (e.g. step < 3)
  // This logic might need to be adapted based on how `isLoading` and step management is done in the store
  return playgroundStore.isLoading && (props.aiScriptStep ? props.aiScriptStep <= 2 : false) ; 
});

const isScriptGenerating = computed(() => playgroundStore.isLoading && playgroundStore.currentStep === 2); // Assuming step 2 is script generation
const isValidating = computed(() => playgroundStore.isLoading && playgroundStore.currentStep === 3); // Assuming step 3 is validation


const emit = defineEmits([
  // 'update:podcastSettings', // Will be handled by store actions
  // 'update:mainEditorContent', // Will be handled by store actions
  // 'clearErrorAndRetry', // Will be handled by store actions
  // Emit events that are truly for parent communication if any remain
]);

// Fetch personas on mount
onMounted(() => {
  if (personasForForm.value.length === 0) {
    personaCache.fetchPersonas();
  }
});

// Function to handle updates from PodcastSettingsForm
const handlePodcastSettingsUpdate = (newSettings: FullPodcastSettings) => {
  playgroundStore.updatePodcastSettings(newSettings);
};

// Function to handle script content updates from Textarea
const handleMainEditorContentUpdate = (newContent: string) => {
  playgroundStore.updateScriptContent(newContent);
};

// Function to handle retry
const handleClearErrorAndRetry = () => {
  playgroundStore.error = null; // Clear error in store
  // Potentially reset other relevant states or re-trigger an action, e.g.,
  // playgroundStore.generateScript(); // If retry means re-generating script
  // This depends on the desired retry behavior.
  // For now, just clearing the error. UI can then allow re-triggering actions.
};


// --- Existing UI logic for loading progress, success messages etc. ---
// This section (loadingProgress, estimatedTimeRemaining, showSuccessMessage, etc.)
// will need to be re-evaluated. Much of it can be simplified or driven directly
// by `playgroundStore.isLoading` and `playgroundStore.error`.
// For instance, the complex progress simulation might be simplified or removed
// if the backend provides real progress, or if a simpler spinner is sufficient.

const loadingProgress = ref(0);
const estimatedTimeRemaining = ref('计算中...');
let loadingInterval: NodeJS.Timeout | null = null;
let startTime: number | null = null;
const showSuccessMessage = ref(false);
let successMessageTimeout: NodeJS.Timeout | null = null;

function startLoadingProgress() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingProgress.value = 0;
  startTime = Date.now();
  loadingInterval = setInterval(() => {
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    if (loadingProgress.value < 90) {
      const increment = Math.max(0.1, (90 - loadingProgress.value) / 20);
      loadingProgress.value = Math.min(90, loadingProgress.value + increment);
    }
    if (elapsed > 2) {
      const totalEstimated = elapsed * 100 / (loadingProgress.value || 1); // avoid division by zero
      const remaining = Math.max(0, totalEstimated - elapsed);
      if (remaining < 60) {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining)} seconds`;
      } else {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining / 60)} minutes`;
      }
    }
  }, 300);
}

function completeLoadingProgress() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
  loadingProgress.value = 100;
  estimatedTimeRemaining.value = 'Complete';
  setTimeout(() => {
    loadingProgress.value = 0;
  }, 1000);
}

watch(
  () => [playgroundStore.isLoading, playgroundStore.error],
  ([isLoading, error], [wasLoading]) => {
    if (!wasLoading && isLoading) {
      startLoadingProgress();
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }
    if (wasLoading && !isLoading) {
      completeLoadingProgress();
      if (!error) {
        showSuccessMessage.value = true;
        if (successMessageTimeout) clearTimeout(successMessageTimeout);
        successMessageTimeout = setTimeout(() => {
          showSuccessMessage.value = false;
        }, 3000); // Show success for 3 seconds
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
/* Simple fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
