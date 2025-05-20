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
        @update:model-value="emit('update:podcastSettings', $event)"
      />
    </Card>
    <!-- Right Script Editing Area, Scrolls Independently -->
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

      <template v-if="isScriptGenerating || isValidating">
        <div class="flex flex-col items-center justify-center h-full space-y-4">
          <!-- Loading Indicator -->
          <div class="flex flex-col items-center">
            <Icon name="ph:spinner-gap" class="w-12 h-12 animate-spin text-primary" />
            <div class="mt-4 bg-muted/30 rounded-full h-2 w-64 overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300 ease-in-out"
                :style="{ width: `${loadingProgress}%` }"
              ></div>
            </div>
          </div>

          <!-- Skeleton Loader -->
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

          <!-- Status Title -->
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
          </h3>

          <!-- Detailed Status Description -->
          <p class="text-center text-sm text-muted-foreground max-w-md">
            {{ aiScriptStepText || 'Please wait, this may take a moment...' }}
          </p>
          <p class="text-xs text-muted-foreground">
            Estimated time remaining: {{ estimatedTimeRemaining }}
          </p>

          <!-- 新增：部分内容生成时淡入显示 -->
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
          <Button variant="outline" @click="emit('clearErrorAndRetry')" class="mt-6">
            <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </template>
      <Textarea
        v-else-if="!selectedPersonaIdForHighlighting"
        :model-value="mainEditorContent"
        placeholder="Script will appear here once generated..."
        class="flex-1 w-full h-full resize-none min-h-[200px] rounded- border-input bg-background p-4 text-base  transition placeholder:text-muted-foreground leading-relaxed"
        @update:model-value="emit('update:mainEditorContent', $event)"
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
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton
import { Button } from '@/components/ui/button'; // Import Button
// Icon is auto-imported
import PodcastSettingsForm from './PodcastSettingsForm.vue';
// Import types expected by PodcastSettingsForm
import type { FullPodcastSettings } from '~/types/playground'; // Persona type will come from the store
import type { Persona } from '@/stores/playgroundPersona'; // Import Persona from the store
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'; // Import Vue composition API functions

interface Props {
  podcastSettings: FullPodcastSettings; // Use FullPodcastSettings from ~/types/playground
  personasForForm: Persona[]; // Use Persona from the store
  personasLoading: boolean;
  isScriptGenerating: boolean;
  isValidating: boolean;
  mainEditorContent: string;
  selectedPersonaIdForHighlighting: number | null;
  highlightedScript: string;
  aiScriptStep?: number; // 1: Analyzing, 2: Outlining, 3: Generating Content
  aiScriptStepText?: string;
  scriptError?: string | null; // To display error messages
}

const props = withDefaults(defineProps<Props>(), {
  aiScriptStep: 0,
  aiScriptStepText: '',
  scriptError: null,
});

// Computed property for left card loading state
const isLeftCardLoading = computed(() => {
  if (props.isValidating) {
    return true; // Always load left card during validation/standardization (Next Step)
  }
  // Load left card if script is generating AND it's in the meta-information phase (steps 1 or 2)
  if (props.isScriptGenerating && props.aiScriptStep <= 2) {
    return true;
  }
  return false;
});

const emit = defineEmits([
  'update:podcastSettings',
  'update:mainEditorContent',
  'clearErrorAndRetry',
]);

// Loading progress simulation
const loadingProgress = ref(0);
const estimatedTimeRemaining = ref('计算中...');
let loadingInterval: NodeJS.Timeout | null = null;
let startTime: number | null = null;

// Success message handling
const showSuccessMessage = ref(false);
let successMessageTimeout: NodeJS.Timeout | null = null;

// Function to start loading progress simulation
function startLoadingProgress() {
  if (loadingInterval) clearInterval(loadingInterval);
  loadingProgress.value = 0;
  startTime = Date.now();
  
  // Simulate progress with realistic acceleration and deceleration
  loadingInterval = setInterval(() => {
    // Calculate elapsed time in seconds
    const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
    
    // Progress calculation with sigmoid-like curve
    // Faster at beginning, slows down as it approaches 90%
    if (loadingProgress.value < 90) {
      const increment = Math.max(0.1, (90 - loadingProgress.value) / 20);
      loadingProgress.value = Math.min(90, loadingProgress.value + increment);
    }
    
    // Update estimated time remaining
    if (elapsed > 2) {
      const totalEstimated = elapsed * 100 / loadingProgress.value;
      const remaining = Math.max(0, totalEstimated - elapsed);
      
      if (remaining < 60) {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining)} seconds`;
      } else {
        estimatedTimeRemaining.value = `~${Math.ceil(remaining / 60)} minutes`;
      }
    }
  }, 300);
}

// Function to complete loading progress
function completeLoadingProgress() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
  loadingProgress.value = 100;
  estimatedTimeRemaining.value = 'Complete';
  
  // Reset after a delay
  setTimeout(() => {
    loadingProgress.value = 0;
  }, 1000);
}

watch(
  () => [props.isScriptGenerating, props.isValidating, props.scriptError],
  ([generating, validating, error], [prevGenerating, prevValidating]) => {
    const isLoading = generating || validating;
    const wasLoading = prevGenerating || prevValidating;

    // Start loading progress when loading begins
    if (!wasLoading && isLoading) {
      startLoadingProgress();
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }

    // Complete loading progress when loading ends
    if (wasLoading && !isLoading) {
      completeLoadingProgress();
      
      // Show success message if no error
      if (!error) {
        showSuccessMessage.value = true;
        if (successMessageTimeout) clearTimeout(successMessageTimeout);
        successMessageTimeout = setTimeout(() => {
          showSuccessMessage.value = false;
        }, 3000); // Show for 3 seconds
      }
    }

    // If an error occurs, hide the success message immediately
    if (error) {
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }
  },
  { immediate: false } // Optional: Add watch options if needed, like immediate or deep. Defaulting to false for immediate.
);
// Ensure to clear all timeouts and intervals on unmount
onUnmounted(() => {
  if (successMessageTimeout) clearTimeout(successMessageTimeout);
  if (loadingInterval) clearInterval(loadingInterval);
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
