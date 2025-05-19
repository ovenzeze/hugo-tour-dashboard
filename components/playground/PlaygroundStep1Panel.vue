<template>
  <div class="flex flex-col md:flex-row gap-4 flex-1 p-4 bg-background h-full">
    <!-- Left Form Area, Scrolls Independently -->
    <Card class="flex-1 min-h-0 h-full p-2 bg-muted/60 border-none shadow-md overflow-y-auto relative">
      <!-- Loading Overlay for Left Card -->
      <div
        v-if="isLeftCardLoading"
        class="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg"
      >
        <Icon name="ph:circle-notch" class="w-10 h-10 animate-spin text-primary" />
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
          脚本生成成功！
        </div>
      </Transition>

      <template v-if="isScriptGenerating || isValidating">
        <div class="flex flex-col items-center justify-center h-full space-y-4">
          <!-- Skeleton Loader -->
          <div class="w-full space-y-3">
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
import { computed } from 'vue'; // Import computed

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

const showSuccessMessage = ref(false);
let successMessageTimeout: NodeJS.Timeout | null = null;

watch(
  () => [props.isScriptGenerating, props.isValidating, props.scriptError],
  ([generating, validating, error], [prevGenerating, prevValidating]) => {
    const isLoading = generating || validating;
    const wasLoading = prevGenerating || prevValidating;

    if (wasLoading && !isLoading && !error) {
      showSuccessMessage.value = true;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
      successMessageTimeout = setTimeout(() => {
        showSuccessMessage.value = false;
      }, 3000); // Show for 3 seconds
    }

    // If loading starts or an error occurs, hide the success message immediately
    if ((!wasLoading && isLoading) || error) {
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }
  },
);

// Ensure to clear timeout on unmount
onUnmounted(() => {
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
