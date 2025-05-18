<template>
  <div class="h-[100vh] w-full flex flex-col overflow-hidden">
    <!-- Top Section: Stepper -->
    <div class="px-4 py-4 border-b bg-background">
      <PlaygroundStepper v-model="currentStepIndex" :steps="podcastSteps" />
    </div>

    <!-- Main Content: Unified Card Layout -->
    <Card class="flex-1 flex flex-col min-h-0 overflow-hidden mx-4 my-4 border rounded-lg shadow-sm">
      <!-- Card Header with Title - Fixed at the top -->
      <CardHeader v-if="currentStepIndex !== 1 && currentStepIndex !== 2" class="border-b flex-shrink-0 py-3">
        <div class="flex items-center justify-between">
          <div class="flex-1"></div>
        </div>
      </CardHeader>

      <!-- Main Content: Unified Card Layout -->
      <CardContent class="flex-1 p-0 flex flex-col md:flex-row min-h-0 overflow-auto gap-4 bg-background">
        <PlaygroundStep1Panel
          v-if="currentStepIndex === 1"
          :podcast-settings="settingsStore.podcastSettings"
          :personas-for-form="personasForForm"
          :personas-loading="personaStore.personasLoading"
          :is-script-generating="isScriptGenerating"
          :is-validating="isValidating"
          :main-editor-content="mainEditorContent"
          :selected-persona-id-for-highlighting="personaStore.selectedPersonaIdForHighlighting"
          :highlighted-script="highlightedScript"
          @update:podcast-settings="settingsStore.updateFullPodcastSettings($event)"
          @update:main-editor-content="mainEditorContent = $event"
        />
        <PlaygroundStep2Panel
          v-if="currentStepIndex === 2"
          ref="voicePerformanceSettingsRef"
          :script-content="scriptStore.textToSynthesize"
          :synth-progress="{
            synthesized: (voicePerformanceSettingsRef as any)?.synthesizedSegmentsCount || 0,
            total: (voicePerformanceSettingsRef as any)?.totalSegmentsCount || 0
          }"
          :audio-url="audioStore.audioUrl"
          :podcast-performance-config="podcastPerformanceConfig"
          @update:script-content="scriptStore.updateTextToSynthesize($event)"
          class="flex-1 min-h-0"
        />
        <PlaygroundStep3Panel
          v-if="currentStepIndex === 3"
          :audio-url="audioStore.audioUrl"
          :podcast-performance-config="podcastPerformanceConfig"
          :is-generating-overall="isGeneratingOverall"
          class="flex-1 min-h-0"
        />
      </CardContent>

      <PlaygroundFooterActions
        :current-step-index="currentStepIndex"
        :is-generating-overall="isGeneratingOverall"
        :is-script-generating="isScriptGenerating"
        :is-synthesizing="audioStore.isSynthesizing"
        :is-validating="isValidating"
        :can-proceed-from-step2="canProceedFromStep2"
        :is-generating-audio-preview="isGeneratingAudioPreview"
        :text-to-synthesize="scriptStore.textToSynthesize"
        :audio-url="audioStore.audioUrl"
        @previous-step="handlePreviousStep"
        @reset="resetPodcastView"
        @use-preset-script="handleUsePresetScript"
        @generate-ai-script="handleToolbarGenerateScript"
        @proceed-without-validation="handleProceedWithoutValidation"
        @generate-audio-preview="generateAudioPreview"
        @next-from-step2="handleNextFromStep2"
        @download-audio="handleDownloadCurrentAudio"
        @synthesize-podcast="handleToolbarSynthesizePodcastAudio"
      />
    </Card>

    <Step2ConfirmationDialog
      :open="showStep2ProceedConfirmation"
      :pending-segments-count="pendingSegmentsCount"
      @update:open="showStep2ProceedConfirmation = $event"
      @confirm="confirmProceedToStep3"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from 'vue'; // Removed onUnmounted for now
import PlaygroundStepper from '@/components/playground/PlaygroundStepper.vue';
import PlaygroundStep1Panel from '@/components/playground/PlaygroundStep1Panel.vue';
import PlaygroundStep2Panel from '@/components/playground/PlaygroundStep2Panel.vue';
import PlaygroundStep3Panel from '@/components/playground/PlaygroundStep3Panel.vue';
import PlaygroundFooterActions from '@/components/playground/PlaygroundFooterActions.vue';
import Step2ConfirmationDialog from '@/components/playground/Step2ConfirmationDialog.vue';

import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { usePlaygroundStore } from '../stores/playground'; // This is now the main coordinator store
import { usePlaygroundPersonaStore, type Persona } from '../stores/playgroundPersona';
import { usePlaygroundSettingsStore } from '../stores/playgroundSettings';
import { usePlaygroundScriptStore } from '../stores/playgroundScript';
import { usePlaygroundAudioStore } from '../stores/playgroundAudio';
import { usePlaygroundStepper, type PlaygroundStep } from '@/composables/usePlaygroundStepper';
import { usePlaygroundScript } from '@/composables/usePlaygroundScript';
import { usePlaygroundAudio } from '@/composables/usePlaygroundAudio';
import { usePlaygroundWorkflow } from '@/composables/usePlaygroundWorkflow';
import { useGlobalAudioInterceptor } from '@/composables/useGlobalAudioInterceptor';
// import type { Persona } from '~/types/playground'; // Using Persona from playgroundPersonaStore

const mainPlaygroundStore = usePlaygroundStore();
const personaStore = usePlaygroundPersonaStore();
const settingsStore = usePlaygroundSettingsStore();
const scriptStore = usePlaygroundScriptStore();
const audioStore = usePlaygroundAudioStore();

const router = useRouter();
const route = useRoute();

// Initialize Global Audio Interceptor
useGlobalAudioInterceptor();

// Stepper Composable
const { currentStepIndex, podcastSteps, handlePreviousStep, goToStep } = usePlaygroundStepper(1);

// Script Composable
const {
  isScriptGenerating,
  mainEditorContent,
  highlightedScript,
  isValidating,
  validateScript,
  handleToolbarGenerateScript,
  handleUsePresetScript,
  parseScriptToSegments,
  initializeScript,
} = usePlaygroundScript();

// Refs for components and shared state
const voicePerformanceSettingsRef = ref<any>(null);

// Workflow Composable
const {
  podcastPerformanceConfig,
  showStep2ProceedConfirmation,
  pendingSegmentsCount,
  isProcessingWorkflowStep,
  confirmProceedToStep3,
  handleNextFromStep2,
  resetPodcastView,
  handleProceedWithoutValidation,
  handleJustValidateScript,
} = usePlaygroundWorkflow(
  currentStepIndex as Ref<number>,
  goToStep,
  voicePerformanceSettingsRef,
  isScriptGenerating,
  parseScriptToSegments
);

// Audio Composable
const canProceedFromStep2 = computed(() => {
  if (!voicePerformanceSettingsRef.value) return false;
  return !!voicePerformanceSettingsRef.value.isFormValid;
});

const {
  isGeneratingAudioPreview,
  generateAudioPreview,
  handleToolbarSynthesizePodcastAudio,
  handleDownloadCurrentAudio,
  updateFinalAudioUrl,
} = usePlaygroundAudio(voicePerformanceSettingsRef, podcastPerformanceConfig, canProceedFromStep2);


onMounted(async () => {
  await personaStore.fetchPersonas();
  await initializeScript(); // This composable might need updates too
  // Global audio interceptor is handled by its own onMounted/onUnmounted
});

// Computed property to map personas for the form
const personasForForm = computed(() : { id: string; name: string; voice_id?: string; description?: string; }[] => {
  return personaStore.personas.map((p: Persona) => ({ // Persona type from playgroundPersonaStore
    id: String(p.persona_id),
    name: p.name,
    voice_id: p.voice_model_identifier || undefined,
    description: p.description === null ? undefined : p.description,
  }));
});

const getCurrentStepTitle = computed(() => {
  const step = podcastSteps.find((s: PlaygroundStep) => s.step === currentStepIndex.value);
  return step ? step.title : 'Podcast Creation';
});

watch(() => settingsStore.createPodcast, () => {
  if (currentStepIndex.value !== 2) {
    goToStep(1);
    mainPlaygroundStore.resetAllPlaygroundState(); // Use the new reset action
    if(podcastPerformanceConfig.value) podcastPerformanceConfig.value = null;
  }
}, { immediate: true });

const isGeneratingOverall = computed(() => {
  return scriptStore.isGeneratingScript ||
         audioStore.isSynthesizing ||
         isScriptGenerating.value || // This is from usePlaygroundScript composable
         isValidating.value ||       // This is from usePlaygroundScript composable
         isGeneratingAudioPreview.value || // This is from usePlaygroundAudio composable
         isProcessingWorkflowStep.value;
});

function getAssignedVoicesString() {
  if (!podcastPerformanceConfig.value) return 'N/A';
  const config = podcastPerformanceConfig.value as any;
  if (!config.segments || !Array.isArray(config.segments)) return 'N/A';
  const voiceMap = new Map<string, string>();
  config.segments.forEach((segment: any) => {
    if (segment.speakerTag && segment.voiceId) {
      const voiceName = config.availableVoices?.find((v: any) => v.id === segment.voiceId)?.name || segment.voiceId;
      voiceMap.set(segment.speakerTag, voiceName);
    }
  });
  if (voiceMap.size === 0) return 'N/A';
  return Array.from(voiceMap.entries())
    .map(([speaker, voice]) => `${speaker}: ${voice}`)
    .join(', ');
}

async function onSynthesizeAudioForPodcast(payload: { useTimestamps: boolean, synthesisParams?: any, performanceConfig?: any }) {
  if (!podcastPerformanceConfig.value && !payload.performanceConfig) {
    toast.error("Missing performance configuration.");
    return;
  }
  if (payload.performanceConfig?.segments) {
    const timestamps = payload.performanceConfig.segments
      .filter((segment: any) => segment.timestamps && segment.timestamps.length > 0)
      .map((segment: any) => segment.timestamps)
      .flat();
    if (timestamps.length > 0) {
      audioStore.saveSegmentTimestamps(timestamps);
    }
  }
  // synthesizeAllSegmentsConcurrently now takes arguments
  await audioStore.synthesizeAllSegmentsConcurrently(scriptStore.validationResult, settingsStore.podcastSettings);
  if (!audioStore.synthesisError) {
    toast.success("Podcast audio synthesized successfully!");
  }
}

function handlePlayCurrentAudio() {
  if (!audioStore.audioUrl) {
    toast.error('No audio available to play');
    return;
  }
  const audio = new Audio(audioStore.audioUrl);
  audio.play().catch(error => {
    toast.error('Playback failed: ' + (error as Error).message);
  });
}
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style>