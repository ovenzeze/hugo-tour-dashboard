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
          :is-global-preview-loading="isGlobalPreviewLoading"
          @update:script-content="scriptStore.updateTextToSynthesize($event)"
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
        :is-generating-audio-preview="isGlobalPreviewLoading"
        :is-podcast-generation-allowed="canGeneratePodcast"
        :text-to-synthesize="scriptStore.textToSynthesize"
        :audio-url="audioStore.audioUrl"
        @previous-step="handlePreviousStep"
        @reset="resetPodcastView"
        @use-preset-script="handleUsePresetScript"
        @generate-ai-script="handleToolbarGenerateScript"
        @proceed-without-validation="handleProceedWithoutValidation"
        @generate-audio-preview="generateAllSegmentsAudioPreview"
        @download-audio="handleDownloadCurrentAudio"
        @synthesize-podcast="handleShowSynthesisModal"
      />
    </Card>
    <PodcastSynthesisModal
      :visible="showSynthesisModal"
      :status="synthesisStatusForModal"
      :podcast-name="podcastNameForModal"
      :confirm-data="confirmDataForModal"
      :processing-data="processingDataForModal"
      :success-data="successDataForModal"
      :error-data="errorDataForModal"
      @update:visible="showSynthesisModal = $event"
      @close="handleModalClose"
      @confirm-synthesis="handleModalConfirmSynthesis"
      @cancel-confirmation="handleModalCancelConfirmation"
      @cancel-synthesis="handleModalCancelSynthesis"
      @retry-synthesis="handleModalRetrySynthesis"
      @play-podcast="handleModalPlayPodcast"
      @download-podcast="handleModalDownloadPodcast"
      @share-podcast="handleModalSharePodcast"
      @view-help="handleModalViewHelp"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, type Ref } from 'vue';
import PlaygroundStepper from '@/components/playground/PlaygroundStepper.vue';
import PlaygroundStep1Panel from '@/components/playground/PlaygroundStep1Panel.vue';
import PlaygroundStep2Panel from '@/components/playground/PlaygroundStep2Panel.vue';
// import PlaygroundStep3Panel from '@/components/playground/PlaygroundStep3Panel.vue'; // Step 3 panel might not be used directly if modal handles final state
import PlaygroundFooterActions from '@/components/playground/PlaygroundFooterActions.vue';
// import Step2ConfirmationDialog from '@/components/playground/Step2ConfirmationDialog.vue'; // Replaced by new modal for synthesis
import PodcastSynthesisModal from '@/components/podcasts/PodcastSynthesisModal.vue';
import type { ModalStatus, ConfirmData, ProcessingData, SuccessData, ErrorData } from '../components/podcasts/PodcastSynthesisModalTypes';

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
const isGlobalPreviewLoading = ref(false);

// Modal State
const showSynthesisModal = ref(false);
const podcastNameForModal = ref('Untitled Podcast'); // Default or get from settings
const synthesisStatusForModal = ref<ModalStatus>('confirm');
const confirmDataForModal = ref<ConfirmData>({ estimatedCost: 'Calculating...', estimatedTime: 'Calculating...' });
const processingDataForModal = ref<ProcessingData>({ progress: 0, currentStage: 'Initializing...', remainingTime: 'Calculating...' });
const successDataForModal = ref<SuccessData>({ podcastDuration: 'N/A', fileSize: 'N/A' });
const errorDataForModal = ref<ErrorData>({ errorMessage: 'An unknown error occurred' });


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

const canGeneratePodcast = computed(() => {
  if (!voicePerformanceSettingsRef.value) return false;
  // This method will be added to VoicePerformanceSettings.vue
  return !!voicePerformanceSettingsRef.value.areAllSegmentsPreviewed?.();
});

const {
  isGeneratingAudioPreview, // This is the individual segment preview loading state from usePlaygroundAudio
  // generateAudioPreview, // We will wrap this to manage global state
  handleToolbarSynthesizePodcastAudio,
  handleDownloadCurrentAudio,
  updateFinalAudioUrl,
} = usePlaygroundAudio(voicePerformanceSettingsRef, podcastPerformanceConfig, canProceedFromStep2);


// Wrapped function to manage global loading state
async function generateAllSegmentsAudioPreview() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
    return;
  }
  // The original generateAudioPreview from usePlaygroundAudio will be called by the Step2Panel or its child.
  // This function is for the global "Generate Audio Preview" button.
  // We need to trigger the preview generation logic within VoicePerformanceSettings,
  // which in turn uses useSegmentPreview.
  // Let's assume VoicePerformanceSettings exposes a method like 'triggerAllPreviews'

  isGlobalPreviewLoading.value = true;
  try {
    // The actual call to generate all previews will be handled by the component method
    // This is more of a conceptual placeholder for triggering the action
    // The `generateAudioPreview` prop on PlaygroundFooterActions will call this.
    // The `PlaygroundStep2Panel` or `VoicePerformanceSettings` should have a method to start all previews.
    // For now, we'll rely on the existing `generateAudioPreview` from `usePlaygroundAudio`
    // but it needs to be adapted or called in a way that `useSegmentPreview` updates all states.

    // The `generateAudioPreview` function in `usePlaygroundAudio` already calls
    // `audioStore.synthesizeAllSegmentsConcurrently`. We need to ensure this
    // function in the composable updates individual segment states through `useSegmentPreview`.
    // This might require `usePlaygroundAudio` to interact more directly with `useSegmentPreview`'s states
    // or for `synthesizeAllSegmentsConcurrently` in the store to emit events that `useSegmentPreview` can listen to.

    // For now, let's assume `voicePerformanceSettingsRef.value.generateAllPreviews()` exists and handles it.
    // This is a simplification. The actual implementation will be in VoicePerformanceSettings.vue
    // which calls `previewAllSegments` from `useSegmentPreview`.
    if (voicePerformanceSettingsRef.value && typeof voicePerformanceSettingsRef.value.generateAudio === 'function') {
        await voicePerformanceSettingsRef.value.generateAudio(); // This calls previewAllSegments from useSegmentPreview
    } else {
        // Fallback or error if the method doesn't exist.
        // This indicates a need to correctly expose and call the preview all functionality.
        // The original `generateAudioPreview` from `usePlaygroundAudio` is what's currently wired up.
        // Let's call the one from usePlaygroundAudio, assuming it's meant for "all segments"
        const audioComposable = usePlaygroundAudio(voicePerformanceSettingsRef, podcastPerformanceConfig, canProceedFromStep2);
        await audioComposable.generateAudioPreview();
    }

  } catch (error) {
    toast.error("Failed to generate all audio previews.");
    console.error("Error in generateAllSegmentsAudioPreview:", error);
  } finally {
    isGlobalPreviewLoading.value = false;
  }
}


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
         isGeneratingAudioPreview.value || // This is from usePlaygroundAudio composable (individual segment)
         isGlobalPreviewLoading.value || // Global preview loading state
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

// --- Modal Event Handlers ---
const handleModalClose = () => {
  showSynthesisModal.value = false;
  // Optionally reset modal state if needed when closed from 'X' or 'hide'
  // For example, if processing, it might just hide, not reset.
  // If it was an error or success, it's fine to reset to 'confirm' for next time.
  if (synthesisStatusForModal.value === 'success' || synthesisStatusForModal.value === 'error') {
    synthesisStatusForModal.value = 'confirm';
  }
};

const handleModalConfirmSynthesis = async () => {
  console.log('Modal confirm synthesis triggered');
  synthesisStatusForModal.value = 'processing';
  processingDataForModal.value = { progress: 10, currentStage: 'Preparing synthesis parameters...' };

  // TODO: Implement actual synthesis call
  // This is where you'd call your backend API to start the synthesis
  // For now, simulate processing and then success/error
  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay

  // Simulate API call
  try {
    // const synthesisParams = { ... }; // Gather necessary params
    // const response = await $fetch('/api/podcast/synthesize', { method: 'POST', body: synthesisParams });
    
    // Simulate progress
    processingDataForModal.value = { progress: 30, currentStage: 'Sending request to synthesis service...' };
    await new Promise(resolve => setTimeout(resolve, 2000));
    processingDataForModal.value = { progress: 60, currentStage: 'Generating audio...' };
    await new Promise(resolve => setTimeout(resolve, 3000));
    processingDataForModal.value = { progress: 90, currentStage: 'Processing audio file...' };
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success
    synthesisStatusForModal.value = 'success';
    // --- MODIFICATION START: Add podcastId to successDataForModal ---
    const newPodcastId = `podcast_${Date.now()}`; // Simulate a new podcast ID
    successDataForModal.value = {
      podcastDuration: '5min 30s',
      fileSize: '12.5 MB',
      podcastId: newPodcastId // Pass the new ID
    };
    // --- MODIFICATION END ---
    toast.success(`Podcast "${podcastNameForModal.value}" synthesized successfully!`);
    // Potentially update audioStore.audioUrl if the synthesis returns a new URL
    // audioStore.updateFinalAudioUrl(newAudioUrl);

  } catch (error) {
    console.error('Synthesis error:', error);
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: (error as Error).message || 'An unknown error occurred during synthesis.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed.`);
  }
};

const handleModalCancelConfirmation = () => {
  showSynthesisModal.value = false;
  toast.info('Synthesis cancelled');
};

const handleModalCancelSynthesis = () => {
  // TODO: Implement actual cancellation logic if possible (e.g., API call to stop processing)
  console.log('Modal cancel synthesis triggered');
  showSynthesisModal.value = false;
  synthesisStatusForModal.value = 'confirm'; // Reset to confirm or show an error/cancellation message
  toast.warning('Podcast synthesis has been cancelled.');
  // Potentially set status to 'error' with a "Cancelled by user" message
  // errorDataForModal.value = { errorMessage: 'Synthesis cancelled by user.' };
  // synthesisStatusForModal.value = 'error';
};

const handleModalRetrySynthesis = () => {
  console.log('Modal retry synthesis triggered');
  synthesisStatusForModal.value = 'confirm'; // Reset to confirm
  // Optionally, re-populate confirmData or re-trigger the confirm phase logic
  // For now, just reset to confirm and let user click "Confirm Synthesis" again
  // which will re-trigger handleModalConfirmSynthesis
  toast.info('Please reconfirm synthesis parameters.');
  // Or directly call handleModalConfirmSynthesis if no re-confirmation is needed
  // handleModalConfirmSynthesis();
};

const handleModalPlayPodcast = () => {
  // Assuming successData might contain a URL or identifier to play
  toast.info('Play Podcast feature is pending implementation.');
  // if (audioStore.audioUrl) {
  //   handlePlayCurrentAudio(); // Use existing play function if applicable
  // } else if (successDataForModal.value.audioUrl) { // Or if modal has its own URL
  //   const audio = new Audio(successDataForModal.value.audioUrl);
  //   audio.play();
  // }
};

const handleModalDownloadPodcast = () => {
  toast.info('Download Podcast feature is pending implementation.');
  // if (audioStore.audioUrl) {
  //   handleDownloadCurrentAudio(); // Use existing download function
  // } else if (successDataForModal.value.downloadUrl) {
  //   window.open(successDataForModal.value.downloadUrl, '_blank');
  // }
};

const handleModalSharePodcast = () => {
  toast.info('Share Podcast feature is pending implementation.');
};

const handleModalViewHelp = () => {
  toast.info('View Help feature is pending implementation.');
};


// --- Update PlaygroundFooterActions synthesize-podcast handler ---
const handleShowSynthesisModal = () => {
  // Prepare data for the modal
  // podcastNameForModal.value = settingsStore.podcastSettings.title || '未命名 Podcast'; // Get from actual settings
  // For now, let's use a placeholder or the current value
  if (!settingsStore.podcastSettings.title && mainEditorContent.value) {
      // Try to extract a title from the script if no explicit title is set
      const firstLine = mainEditorContent.value.split('\n')[0];
      podcastNameForModal.value = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine || 'New Podcast';
  } else {
      podcastNameForModal.value = settingsStore.podcastSettings.title || 'New Podcast';
  }

  confirmDataForModal.value = {
    // These should be calculated or fetched based on script length, voice models, etc.
    estimatedCost: 'Approx. 0.5 Credits', // Placeholder
    estimatedTime: 'Approx. 2-5 minutes', // Placeholder
  };
  processingDataForModal.value = { progress: 0, currentStage: 'Initializing...', remainingTime: 'Calculating...' }; // Reset processing
  successDataForModal.value = { podcastDuration: 'N/A', fileSize: 'N/A' }; // Reset success
  errorDataForModal.value = { errorMessage: 'An unknown error occurred' }; // Reset error
  synthesisStatusForModal.value = 'confirm'; // Start with the confirm step
  showSynthesisModal.value = true;
};

</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style>
