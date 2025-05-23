<template>
  <div class="flex flex-col gap-4 md:gap-6 flex-1 p-4 md:p-6 bg-background h-full">
    <!-- 移动端垂直布局，桌面端双栏布局 -->
    <div class="flex flex-col lg:flex-row gap-4 md:gap-6 flex-1 min-h-0">
      <!-- Form Area - 更轻量的设计 -->
      <div class="flex-none lg:flex-1 min-h-0 max-h-[40vh] lg:max-h-none lg:h-full bg-muted/20 rounded-2xl md:rounded-3xl p-6 md:p-8 overflow-y-auto relative backdrop-blur-sm">
        <!-- Loading Overlay for Left Card -->
        <div
          v-if="isLeftCardLoading"
          class="absolute inset-0 bg-primary/5 backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-2xl md:rounded-3xl"
        >
          <Icon name="ph:spinner-gap" class="w-8 md:w-10 h-8 md:h-10 animate-spin text-primary" />
          <p class="mt-4 text-xs md:text-sm text-primary font-medium">Processing, please wait...</p>
        </div>
        <PodcastSettingsForm
          :model-value="podcastSettings"
          @update:model-value="handlePodcastSettingsUpdate"
        />
      </div>
      
      <!-- Script Editing Area - 去掉多余的边框 -->
      <div class="flex-1 min-h-0 flex flex-col bg-muted/20 rounded-2xl md:rounded-3xl overflow-hidden p-4 md:p-6 relative backdrop-blur-sm">
        <!-- Success Message -->
        <Transition name="fade-fast">
          <div
            v-if="showSuccessMessage"
            class="absolute top-4 right-4 bg-green-50/90 dark:bg-green-950/50 text-green-700 dark:text-green-200 px-4 py-2 rounded-xl backdrop-blur-sm text-sm z-20 border border-green-200/30 dark:border-green-800/30"
          >
            <Icon name="ph:check-circle" class="inline w-4 h-4 mr-2" />
            <span class="hidden sm:inline">Script generated successfully!</span>
            <span class="sm:hidden">Generated!</span>
          </div>
        </Transition>

        <!-- 移动端全屏编辑按钮 -->
        <div class="lg:hidden absolute top-4 left-4 z-10">
          <Button
            v-if="!isLoadingFromStore && !scriptError"
            variant="ghost"
            size="sm"
            @click="showMobileEditor = true"
            class="text-xs bg-background/60 backdrop-blur-sm hover:bg-background/80"
          >
            <Icon name="ph:arrows-out" class="w-3 h-3 mr-1" />
            <span>Expand</span>
          </Button>
        </div>

        <template v-if="isLoadingFromStore">
          <div class="flex flex-col items-center justify-center h-full space-y-6 p-6">
            <!-- 简化的加载状态 -->
            <div class="bg-primary/5 rounded-2xl p-8 w-full max-w-md">
              <div class="flex flex-col items-center">
                <div class="relative">
                  <Icon name="ph:spinner-gap" class="w-16 h-16 animate-spin text-primary" />
                  <div class="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                </div>
                <div class="mt-6 bg-muted/40 rounded-full h-2 w-64 overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-1000 ease-out relative"
                    :style="{ width: `${loadingProgress}%` }"
                  >
                    <!-- 进度条光效 -->
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
            
            <div class="w-full space-y-3">
              <Skeleton class="h-4 w-full rounded-lg bg-muted/40" />
              <Skeleton class="h-4 w-5/6 rounded-lg bg-muted/40" />
              <Skeleton class="h-4 w-4/6 rounded-lg bg-muted/40" />
              <Skeleton class="h-4 w-3/4 rounded-lg bg-muted/40" />
            </div>
            
            <div class="text-center bg-muted/10 rounded-2xl p-6 max-w-md">
              <h3 class="text-lg font-semibold mb-3">
                <template v-if="isScriptGenerating">
                  <span v-if="aiScriptStep === 1">Analyzing input...</span>
                  <span v-else-if="aiScriptStep === 2">Building outline...</span>
                  <span v-else-if="aiScriptStep === 3">Generating script content...</span>
                  <span v-else>Generating script...</span>
                </template>
                <template v-else-if="isValidating">
                  <template v-if="isAnalyzingUserScript">
                    <Icon name="ph:brain" class="w-5 h-5 inline mr-2 text-primary" />
                    <span class="hidden sm:inline">Analyzing script content...</span>
                    <span class="sm:hidden">Analyzing...</span>
                  </template>
                  <template v-else>
                    Validating script...
                  </template>
                </template>
                <template v-else>
                  Processing...
                </template>
              </h3>
              <p class="text-sm text-muted-foreground max-w-md mx-auto">
                <template v-if="isAnalyzingUserScript">
                  <span class="hidden md:inline">Intelligently analyzing script content, identifying language, extracting speaker information and generating metadata...</span>
                  <span class="md:hidden">Analyzing script structure and speakers...</span>
                </template>
                <template v-else>
                  {{ aiScriptStepText || 'Please wait, this may take a moment...' }}
                </template>
              </p>
              <p class="text-xs text-muted-foreground hidden md:block mt-2">
                Estimated time remaining: {{ estimatedTimeRemaining }}
              </p>
            </div>
            
            <Transition name="fade">
              <div v-if="mainEditorContent" class="w-full bg-muted/10 rounded-2xl p-2">
                <Textarea
                  :model-value="mainEditorContent"
                  placeholder="Script is being generated..."
                  class="flex-1 w-full h-full resize-none min-h-[120px] rounded-xl border-0 bg-background/60 p-4 text-base focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 transition placeholder:text-muted-foreground/50 leading-relaxed backdrop-blur-sm"
                  readonly
                />
              </div>
            </Transition>
          </div>
        </template>
        <template v-else-if="scriptError">
          <div class="flex flex-col items-center justify-center h-full text-center p-8">
            <!-- 简化的错误状态 -->
            <div class="bg-red-50/50 dark:bg-red-950/20 rounded-2xl p-8 max-w-md w-full">
              <Icon name="ph:x-circle" class="w-16 h-16 text-destructive mb-4 mx-auto" />
              <h3 class="text-xl font-semibold text-destructive mb-2">Script Generation Failed</h3>
              <p class="text-muted-foreground text-base mb-6">{{ scriptError }}</p>
              <Button variant="outline" @click="handleClearErrorAndRetry" class="bg-background/60 backdrop-blur-sm">
                <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </template>
        <div
          v-else-if="!selectedPersonaIdForHighlighting"
          class="flex-1 w-full h-full p-4 bg-muted/10 rounded-2xl"
        >
          <Textarea
            :model-value="mainEditorContent"
            :placeholder="isMobile ? mobileScriptPlaceholder : desktopScriptPlaceholder"
            class="flex-1 w-full h-full resize-none min-h-[200px] rounded-xl border-0 bg-background/60 backdrop-blur-sm p-4 text-base transition placeholder:text-muted-foreground/50 leading-relaxed focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            @update:model-value="handleMainEditorContentUpdate"
          />
        </div>
        <div
          v-else
          class="flex-1 w-full h-full overflow-y-auto p-4 text-sm leading-relaxed bg-muted/10 rounded-2xl"
          v-html="highlightedScript"
        ></div>
      </div>
    </div>
    
    <!-- 移动端全屏编辑器 -->
    <MobileScriptEditor
      v-model:visible="showMobileEditor"
      :content="mainEditorContent"
      @save="handleMobileEditorSave"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import PodcastSettingsForm from './PodcastSettingsForm.vue';
import MobileScriptEditor from './MobileScriptEditor.vue';

import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { FullPodcastSettings } from '~/types/playground';
import type { Persona } from '~/types/persona';
import type { ScriptSegment } from '~/types/api/podcast';


const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();
const unifiedStore = usePlaygroundUnifiedStore();
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
const mainEditorContent = computed(() => unifiedStore.scriptContent); // 使用unifiedStore而不是scriptStore
const personasForForm = computed(() => personaCache.personas.value); // For PodcastSettingsForm persona selection
const personasLoading = computed(() => personaCache.isLoading.value); // For PodcastSettingsForm persona selection

// 移动端检测
const isMobile = computed(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
});

// 移动端和桌面端的 placeholder 文本
const mobileScriptPlaceholder = computed(() => 
  "✨ Tap to enter script\n\n📝 Format:\nSpeaker: Content\n\n🎯 Example:\nHost: Welcome!\nGuest: Thanks!"
);

const desktopScriptPlaceholder = computed(() => 
  "✨ AI script will be generated here, or you can manually enter your script.\n\n📝 Script Format Requirements:\nSpeaker: Dialogue content\nSpeaker: More dialogue content\n\n🎯 Example Format:\nHost: Welcome to our podcast show!\nGuest: Thank you for having me, I'm excited to discuss today's topic.\nHost: Let's dive into our conversation.\n\n💡 Tips: Each line should start with 'Speaker Name:', the system will automatically identify and assign corresponding voice roles. Supports both English and Chinese scripts."
);

// Loading and error states from respective stores
const isLoadingFromStore = computed(() => unifiedStore.isLoading || processStore.isLoading || processStore.isSynthesizing || processStore.isValidating); // General loading indicator，包含 unifiedStore.isLoading
const scriptError = computed(() => processStore.error || unifiedStore.error); // 使用unifiedStore.error

// UI specific states from uiStore
const aiScriptStep = computed(() => uiStore.aiScriptGenerationStep);
const aiScriptStepText = computed(() => uiStore.aiScriptGenerationStepText);
const selectedPersonaIdForHighlighting = computed(() => uiStore.selectedPersonaIdForHighlighting);

const highlightedScript = computed(() => {
  if (!selectedPersonaIdForHighlighting.value || !unifiedStore.parsedSegments) {
    return unifiedStore.scriptContent; // 使用unifiedStore
  }
  return unifiedStore.parsedSegments.map(segment => {
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

const isScriptGenerating = computed(() => unifiedStore.isLoading); // 使用 unifiedStore 的 AI 脚本生成状态
const isValidating = computed(() => unifiedStore.isValidating || (processStore.isValidating && uiStore.currentStep === 1)); // 包含unifiedStore的验证状态
const isAnalyzingUserScript = computed(() => {
  // 检测是否是用户脚本分析：有脚本内容且不是AI生成的且正在验证
  return unifiedStore.isValidating && 
         unifiedStore.scriptContent.trim() && 
         !unifiedStore.aiScriptGenerationStep;
});

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
  unifiedStore.updateScriptContent(String(newContent)); // 使用unifiedStore而不是scriptStore
};

// 移动端编辑器保存处理
const handleMobileEditorSave = (content: string) => {
  unifiedStore.updateScriptContent(content);
};

// Function to handle retry
const handleClearErrorAndRetry = () => {
  processStore.clearApiError();
  unifiedStore.clearError(); // 使用unifiedStore而不是scriptStore
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

// Watch relevant loading states from both stores
watch(
  () => [unifiedStore.isLoading, processStore.isLoading, processStore.isSynthesizing, processStore.isValidating, processStore.error, unifiedStore.error],
  ([unifiedLoading, loading, synthesizing, validating, error, unifiedError], [wasUnifiedLoading, wasLoading, wasSynthesizing, wasValidating]) => {
    const anyLoading = unifiedLoading || loading || synthesizing || validating;
    const anyWasLoading = wasUnifiedLoading || wasLoading || wasSynthesizing || wasValidating;

    if (!anyWasLoading && anyLoading) {
      startLoadingProgress();
      showSuccessMessage.value = false;
      if (successMessageTimeout) clearTimeout(successMessageTimeout);
    }
    if (anyWasLoading && !anyLoading) {
      completeLoadingProgress();
      if (!error && !unifiedError) { // Only show success if there was no error during the process
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

// 移动端全屏编辑状态
const showMobileEditor = ref(false);

// 移动端设置卡片折叠状态 - 默认折叠
const isSettingsCollapsedOnMobile = ref(true);

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
