<template>
  <div class="h-[100svh] w-full flex flex-col overflow-hidden">
    <!-- Top Section: Stepper -->
    <div class="px-4 py-4 border-b bg-background">
      <PlaygroundStepper v-model="currentStepIndex" :steps="[...podcastSteps]" />
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
          :is-script-generating="isScriptGenerating" 
          :is-validating="isValidating" 
          :selected-persona-id-for-highlighting="unifiedStore.selectedPersonaIdForHighlighting" 
          :highlighted-script="highlightedScript" 
          :ai-script-step="aiScriptStep" 
          :ai-script-step-text="aiScriptStepText" 
          :script-error="unifiedStore.error" 
          @clear-error-and-retry="handleClearErrorAndRetry"
        />
        <PlaygroundStep2Panel
          v-if="currentStepIndex === 2"
          ref="voicePerformanceSettingsRef"
          :script-content="unifiedStore.scriptContent"
          :synth-progress="{
            synthesized: (voicePerformanceSettingsRef as any)?.synthesizedSegmentsCount || 0,
            total: (voicePerformanceSettingsRef as any)?.totalSegmentsCount || 0
          }"
          :audio-url="unifiedStore.audioUrl"
          :podcast-performance-config="podcastPerformanceConfig"
          :is-global-preview-loading="isGlobalPreviewLoading"
          @update:script-content="unifiedStore.updateScriptContent($event)"
          class="flex-1 min-h-0"
        />
      </CardContent>

      <PlaygroundFooterActions
        :current-step-index="currentStepIndex"
        :is-generating-overall="isGeneratingOverall"
        :is-script-generating="isScriptGenerating"
        :is-synthesizing="unifiedStore.isSynthesizing"
        :is-validating="isValidating"
        :is-processing-next-step="isProcessingWorkflowStep"
        :can-proceed-from-step2="canProceedFromStep2"
        :is-generating-audio-preview="isGlobalPreviewLoading"
        :is-podcast-generation-allowed="canGeneratePodcast"
        :text-to-synthesize="unifiedStore.scriptContent"
        :audio-url="unifiedStore.audioUrl"
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
import PlaygroundStepper from '~/components/playground/PlaygroundStepper.vue';
import PlaygroundStep1Panel from '~/components/playground/PlaygroundStep1Panel.vue';
import PlaygroundStep2Panel from '~/components/playground/PlaygroundStep2Panel.vue';
// import PlaygroundStep3Panel from '~/components/playground/PlaygroundStep3Panel.vue'; // Step 3 panel might not be used directly if modal handles final state
import PlaygroundFooterActions from '~/components/playground/PlaygroundFooterActions.vue';
// import Step2ConfirmationDialog from '~/components/playground/Step2ConfirmationDialog.vue'; // Replaced by new modal for synthesis
import PodcastSynthesisModal from '~/components/podcasts/PodcastSynthesisModal.vue';
import type { ModalStatus, ConfirmData, ProcessingData, SuccessData, ErrorData } from '../components/podcasts/PodcastSynthesisModalTypes';
import type { CombineAudioResponse } from '~/types/podcast';

import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { Persona } from '~/types/persona';

import { usePlaygroundStepper, type PlaygroundStep } from '~/composables/usePlaygroundStepper';
import { usePlaygroundScript } from '~/composables/usePlaygroundScript';
import { usePlaygroundAudio } from '~/composables/usePlaygroundAudio';
import { usePlaygroundWorkflow } from '~/composables/usePlaygroundWorkflow';
import { useGlobalAudioInterceptor } from '~/composables/useGlobalAudioInterceptor';

const unifiedStore = usePlaygroundUnifiedStore();

const personaCache = usePersonaCache();

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


// Script related states - now primarily from unifiedStore
const isScriptGenerating = computed(() => unifiedStore.isCurrentlyLoading && unifiedStore.currentPlaygroundStep === 1); // Use getters
const mainEditorContent = computed(() => unifiedStore.currentScriptContent); // Use getter
const scriptError = computed(() => unifiedStore.currentError); // Use getter

// Placeholder for aiScriptStep and aiScriptStepText - these should come from unifiedStore
const aiScriptStep = computed(() => unifiedStore.currentAiScriptStep || 0); // Use getter
const aiScriptStepText = computed(() => unifiedStore.currentAiScriptStepText || ''); // Use getter


// highlightedScript logic - can remain in component, using unifiedStore data
const highlightedScript = computed(() => {
  const script = unifiedStore.currentScriptContent; // Use getter
  // Assuming selectedPersonaIdForHighlighting will be part of unifiedStore state or props
  const selectedPersonaId = unifiedStore.currentSelectedPersonaIdForHighlighting; // Use getter

  if (!script || selectedPersonaId === null) {
    return script; // Return raw script if no persona selected or no script
  }
  const persona = personaCache.getPersonaById(selectedPersonaId);
  const selectedPersonaName = persona?.name;

  if (!selectedPersonaName) {
    return script; // Return raw script if persona not found
  }

  const lines = script.split('\n'); // Corrected: script is already a string here
  let html = '';
  lines.forEach((line: string) => {
    // Basic highlighting: wrap lines starting with the persona's name
    // This can be made more robust (e.g., case-insensitive, handle multi-line segments)
    if (line.trim().startsWith(`${selectedPersonaName}:`)) {
      // Example: simple class for highlighting. Ensure this class is defined in your CSS.
      html += `<p class="highlighted-persona-segment">${line}</p>`; 
    } else {
      html += `<p>${line}</p>`;
    }
  });
  return html;
});

// Actions that were from usePlaygroundScript - now will call unifiedStore actions
const handleToolbarGenerateScript = () => {
  unifiedStore.generateScript(); // This action needs to be implemented in unifiedStore
};

const handleUsePresetScript = () => {
  // unifiedStore.loadPresetScript('some_preset_identifier'); // Example: This action needs to be implemented
  // For now, let's assume a simple update to scriptContent
  unifiedStore.updateScriptContent('Host: Welcome to our preset podcast!\nGuest: Thank you for having me.');
  toast.success("Preset script loaded.");
};

// parseScriptToSegments - if it's a pure utility, it can be kept or moved.
// For now, assuming it might be used by logic within this component or passed down.
// If it's only used inside unifiedStore.parseScript, it can be removed from here.
const parseScriptToSegments = (content: string): Array<{ speaker: string, text: string }> => {
  if (!content) return [];
  return content
    .split('\n')
    .map(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex <= 0) return null;
      const speaker = line.substring(0, colonIndex).trim();
      const text = line.substring(colonIndex + 1).trim();
      return { speaker, text };
    })
    .filter(segment => segment && segment.speaker && segment.text) as Array<{ speaker: string, text: string }>;
};

// initializeScript - logic to be part of unifiedStore or onMounted here
const initializeScript = () => {
  // unifiedStore.initializePlayground(); // Example: if there's an init action
  // For now, ensure personas are fetched if not already
  if (personaCache.personas.value.length === 0) {
    personaCache.fetchPersonas();
  }
};

// TODO: isValidating and validateScript need to be addressed.
// For now, define isValidating as a ref, and validateScript as a placeholder.
const isValidating = ref(false); // Placeholder
const validateScript = async () => { // Placeholder action
  toast.info("Script validation logic needs to be connected to unifiedStore.");
  // unifiedStore.validateCurrentScript(); // Example future call
  return null;
};


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
  // Always return true to keep the "Synthesize Podcast" button enabled
  return true;
});

const {
  isGeneratingAudioPreview, // This is the individual segment preview loading state from usePlaygroundAudio
  // generateAudioPreview, // We will wrap this to manage global state
  // isGeneratingAudioPreview, // This was from usePlaygroundAudio, unifiedStore might have its own
  // generateAudioPreview,
  handleToolbarSynthesizePodcastAudio, // This likely needs to call unifiedStore.synthesizeAudio
  handleDownloadCurrentAudio, // This might use unifiedStore.currentAudioUrl
  updateFinalAudioUrl, // This should call unifiedStore.setFinalAudioUrl
} = usePlaygroundAudio(voicePerformanceSettingsRef, podcastPerformanceConfig, canProceedFromStep2);
// TODO: Review usePlaygroundAudio and integrate its functionality with unifiedStore if necessary,
// or ensure unifiedStore provides the reactive properties usePlaygroundAudio needs.


// 直接调用audioStore的synthesizeAllSegmentsConcurrently方法，确保数据一路透传
async function generateAllSegmentsAudioPreview() {
  if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
    toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
    return;
  }

  if (!unifiedStore.currentPodcastId) { // Use getter
    toast.error("Podcast ID is missing. Cannot synthesize segments. Please ensure script is validated and saved (Step 1).");
    return;
  }

  isGlobalPreviewLoading.value = true;
  try {
    // 获取当前的speakerAssignments
    const currentSpeakerAssignments = voicePerformanceSettingsRef.value.getPerformanceConfig()?.speakerAssignments;
    
    if (!currentSpeakerAssignments) {
      toast.error("Speaker assignments are missing. Cannot generate audio preview.");
      return;
    }

    console.log("[generateAllSegmentsAudioPreview] Current speaker assignments:", JSON.stringify(currentSpeakerAssignments, null, 2));

    // 直接调用 unifiedStore 的方法，传递必要的参数
    // TODO: Implement synthesizeAudioPreviewForAllSegments in unifiedStore with appropriate logic
    const result = await unifiedStore.synthesizeAudioPreviewForAllSegments(
      unifiedStore.currentValidationResult, // Use getter
      unifiedStore.currentPodcastSettingsSnapshot, // Use getter (or a more specific settings object from unifiedStore)
      currentSpeakerAssignments
    );
    // const result = await audioStore.synthesizeAllSegmentsConcurrently(
    //   scriptStore.validationResult,
    //   settingsStore.podcastSettings,
    //   currentSpeakerAssignments
    // );
    
    // 显示详细的成功/失败信息
    if (result) {
      const { successfulSegments, failedSegments, totalSegments } = result;
      if (failedSegments === 0) {
        toast.success(`所有 ${successfulSegments} 个片段都成功生成了音频！`);
      } else {
        toast.info(`音频生成完成：${successfulSegments} 个成功，${failedSegments} 个失败，共 ${totalSegments} 个片段。`);
      }
    }
  } catch (error) {
    toast.error("Failed to generate all audio previews.");
    console.error("Error in generateAllSegmentsAudioPreview:", error);
  } finally {
    isGlobalPreviewLoading.value = false;
  }
}

const handleClearErrorAndRetry = () => {
  unifiedStore.clearError();
  toast.info("Error cleared. You can adjust settings and try again.");
};

onMounted(async () => {
  // await personaStore.fetchPersonas(); // Removed: Handled by initializeScript or personaCache directly
  await initializeScript(); // This composable might need updates too
  // Global audio interceptor is handled by its own onMounted/onUnmounted
});

// Computed property to map personas for the form - no longer needed here as raw personas are passed down
// const personasForForm = computed(() : { id: string; name: string; voice_id?: string; description?: string; }[] => {
//   return personaStore.personas.map((p: Persona) => ({ // Persona type from playgroundPersonaStore
//     id: String(p.persona_id),
//     name: p.name,
//     voice_id: p.voice_model_identifier || undefined,
//     description: p.description === null ? undefined : p.description,
//   }));
// });

const getCurrentStepTitle = computed(() => {
  const step = podcastSteps.find((s: PlaygroundStep) => s.step === currentStepIndex.value);
  return step ? step.title : 'Podcast Creation';
});

// watch(() => unifiedStore.createPodcastTrigger, () => { // createPodcastTrigger removed from unifiedStore for now
//   if (currentStepIndex.value !== 2) {
//     goToStep(1);
//     unifiedStore.resetPlaygroundState();
//     if(podcastPerformanceConfig.value) podcastPerformanceConfig.value = null;
//   }
// }, { immediate: true });

const isGeneratingOverall = computed(() => {
  return unifiedStore.isCurrentlyLoading || // Use getter
         isValidating.value ||       // This is from usePlaygroundScript composable
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
      // unifiedStore.saveSegmentTimestamps(timestamps); // TODO: Implement in unifiedStore if needed
      console.warn("unifiedStore.saveSegmentTimestamps needs to be implemented if segment timestamps are used directly from here.")
    }
  }
  // synthesizeAllSegmentsConcurrently now takes arguments
  // await audioStore.synthesizeAllSegmentsConcurrently(scriptStore.validationResult, settingsStore.podcastSettings);
  // TODO: Replace with unifiedStore action, potentially passing structured data
  await unifiedStore.synthesizeAudio(); // Placeholder for new unified action. May need arguments.
  if (!unifiedStore.error) { // Assuming error state in unifiedStore
    toast.success("Podcast audio synthesized successfully!");
  }
}

function handlePlayCurrentAudio() {
  if (!unifiedStore.currentAudioUrl) { // Use getter
    toast.error('No audio available to play');
    return;
  }
  const audio = new Audio(unifiedStore.currentAudioUrl); // Use getter
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
  processingDataForModal.value = { progress: 0, currentStage: 'Starting synthesis...' };

  // Log values for pre-checks
  console.log('unifiedStore.currentValidationResult:', JSON.stringify(unifiedStore.currentValidationResult, null, 2)); // Use getter
  console.log('podcastPerformanceConfig.value (before checks):', JSON.stringify(podcastPerformanceConfig.value, null, 2));
  console.log('voicePerformanceSettingsRef.value?.isFormValid (before checks):', voicePerformanceSettingsRef.value?.isFormValid);
  console.log('unifiedStore.currentPodcastId (before checks):', unifiedStore.currentPodcastId); // Use getter

  if (!unifiedStore.currentValidationResult || !unifiedStore.currentValidationResult.success || !unifiedStore.currentValidationResult.structuredData?.script?.length) { // Use getter
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: 'Script validation data is missing or invalid. Please ensure the script is validated and segments are configured.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed: No valid script segments.`);
    return;
  }

  // Check if voicePerformanceSettingsRef and its methods are available
  if (!voicePerformanceSettingsRef.value || 
      typeof voicePerformanceSettingsRef.value.getPerformanceConfig !== 'function' ||
      typeof voicePerformanceSettingsRef.value.isFormValid === 'undefined') {
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: 'Voice performance settings component is not available.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed: Voice settings component error.`);
    return;
  }
  
  // Check if the form in VoicePerformanceSettings is valid
  if (!voicePerformanceSettingsRef.value.isFormValid) {
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: 'Voice performance settings are incomplete. Please ensure all voices are assigned in Step 2.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed: Voice performance settings incomplete.`);
    return;
  }

  // Add check for podcastId
  if (!unifiedStore.currentPodcastId) { // Use getter
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: 'Podcast ID is missing. Cannot synthesize segments. Please ensure the script has been saved.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed: Podcast ID missing.`);
    return;
  }

  try {
    // Log critical data for debugging
    console.log('Validation Result Script (inside try):', JSON.stringify(unifiedStore.currentValidationResult?.structuredData?.script, null, 2)); // Use getter
    
    const currentSpeakerAssignmentsConfig = voicePerformanceSettingsRef.value.getPerformanceConfig();
    console.log('Current Speaker Assignments Config from getPerformanceConfig():', JSON.stringify(currentSpeakerAssignmentsConfig, null, 2));

    // Prepare speakerAssignments in the correct format
    const formattedSpeakerAssignments: Record<string, { voiceId: string, provider?: string }> = {};
    if (currentSpeakerAssignmentsConfig?.speakerAssignments) {
      for (const speaker in currentSpeakerAssignmentsConfig.speakerAssignments) {
        const assignment = currentSpeakerAssignmentsConfig.speakerAssignments[speaker];
        if (typeof assignment === 'object' && assignment !== null && 'voiceId' in assignment) {
          formattedSpeakerAssignments[speaker] = {
            voiceId: assignment.voiceId,
            provider: assignment.provider ? assignment.provider.replace(/^'|'$/g, '').replace(/^"|"$/g, '') : undefined
          };
        } else {
          console.warn(`Speaker assignment for ${speaker} is not in the expected format:`, assignment);
        }
      }
    }
    console.log('Formatted Speaker Assignments for synthesis:', JSON.stringify(formattedSpeakerAssignments, null, 2));

    // Call the actual synthesis function from the audio store
    // TODO: Replace with unifiedStore action and ensure parameters are correct
    const synthesisResult = await unifiedStore.synthesizeAudio({
      validationResult: unifiedStore.currentValidationResult, // Use getter
      podcastSettings: unifiedStore.currentPodcastSettingsSnapshot, // Use getter (or a more specific settings object)
      speakerAssignments: formattedSpeakerAssignments
    });
    // const synthesisResult = await audioStore.synthesizeAllSegmentsConcurrently(
    //   scriptStore.validationResult,
    //   settingsStore.podcastSettings,
    //   formattedSpeakerAssignments // Pass formatted speakerAssignments
    // );

    // 处理合成结果
    if (synthesisResult) {
      const { successfulSegments, failedSegments, totalSegments } = synthesisResult;
      
      // 更新进度信息
      processingDataForModal.value = { 
        progress: Math.round((successfulSegments / totalSegments) * 100), 
        currentStage: `已生成 ${successfulSegments}/${totalSegments} 个片段${failedSegments > 0 ? `，${failedSegments} 个失败` : ''}` 
      };
      
      if (failedSegments > 0) {
        // 有失败的片段，但仍然继续处理
        console.log(`[handleModalConfirmSynthesis] ${failedSegments} segments failed, but continuing with ${successfulSegments} successful segments`);
      }
    }

    if (unifiedStore.currentError) { // Use getter
      synthesisStatusForModal.value = 'error';
      errorDataForModal.value = { errorMessage: unifiedStore.currentError }; // Use getter
      toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed.`);
    } else {
      // After successful segment synthesis, trigger the final audio combination
      // This assumes a backend endpoint to combine the generated segments into a single audio file
      processingDataForModal.value = { progress: 95, currentStage: 'Combining audio segments...' };
      // TODO: This $fetch should likely be part of a unifiedStore action e.g., unifiedStore.combineAudio()
      const combineResponse = await $fetch<CombineAudioResponse>('/api/podcast/combine-audio', {
        method: 'POST',
        body: {
          podcastId: unifiedStore.currentPodcastId, // Use getter
        },
      } as any);

      if (combineResponse && combineResponse.audioUrl) {
        unifiedStore.setFinalAudioUrl(combineResponse.audioUrl);
        synthesisStatusForModal.value = 'success';
        successDataForModal.value = {
          podcastDuration: combineResponse.duration || 'N/A', // Assuming backend returns duration
          fileSize: combineResponse.fileSize || 'N/A', // Assuming backend returns file size
        };
        toast.success(`Podcast "${podcastNameForModal.value}" synthesized successfully!`);
      } else {
        synthesisStatusForModal.value = 'error';
        errorDataForModal.value = { errorMessage: 'Failed to combine audio segments or retrieve final URL.' };
        toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed.`);
      }
    }
  } catch (error: any) {
    console.error('Synthesis error:', error);
    synthesisStatusForModal.value = 'error';
    errorDataForModal.value = { errorMessage: error.data?.message || error.message || 'An unknown error occurred during synthesis.' };
    toast.error(`Podcast "${podcastNameForModal.value}" synthesis failed.`);
  }
};

const handleModalCancelConfirmation = () => {
  showSynthesisModal.value = false;
  toast.info('Synthesis cancelled.');
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


// --- 简化的合成Podcast按钮处理函数 ---
const handleShowSynthesisModal = async () => {
  // 检查是否有音频片段已经生成
  try {
    // 直接从API获取当前播客的片段状态，确保数据是最新的
    if (!unifiedStore.currentPodcastId) { // Use getter
      toast.error("播客ID缺失，请先保存脚本。");
      return;
    }
    
    const response = await $fetch(`/api/podcast/${unifiedStore.currentPodcastId}/segments-status`, { // Use getter
      method: 'GET'
    });
    
    console.log("[handleShowSynthesisModal] 片段状态:", response);
    
    // @ts-ignore - 假设响应包含totalSegments和synthesizedSegments
    const { totalSegments, synthesizedSegments } = response;
    
    if (!synthesizedSegments || synthesizedSegments === 0) {
      toast.error("请先生成片段的音频预览，再合成完整播客。");
      return;
    }
    
    if (synthesizedSegments < totalSegments) {
      toast.warning(`已生成 ${synthesizedSegments}/${totalSegments} 个片段的音频。建议先生成所有片段的音频预览。`);
      // 显示确认对话框，询问是否继续
      if (!confirm(`已生成 ${synthesizedSegments}/${totalSegments} 个片段的音频。是否继续合成播客？`)) {
        return;
      }
    }
    
    // 更新UI统计信息
    if (voicePerformanceSettingsRef.value) {
      voicePerformanceSettingsRef.value.updateSegmentStats(synthesizedSegments, totalSegments);
    }
  } catch (error) {
    console.error("[handleShowSynthesisModal] 获取片段状态失败:", error);
    // 如果API调用失败，回退到原来的检查逻辑
    const hasPreviewedSegments = voicePerformanceSettingsRef.value?.areAllSegmentsPreviewed;
    
    if (!hasPreviewedSegments) {
      toast.error("无法确认片段状态，请确保已生成所有片段的音频预览。");
      return;
    }
  }
  
  // 获取播客名称
  // Accessing unifiedStore.podcastSettings.value directly is not ideal if it's meant to be a snapshot or from settingsStore
  // For now, assuming unifiedStore.currentPodcastSettingsSnapshot or a dedicated getter for title
  const currentSettings = unifiedStore.currentPodcastSettingsSnapshot; // Or a more direct getter if available
  if (!currentSettings.title && mainEditorContent.value) {
    const firstLine = mainEditorContent.value.split('\n')[0];
    podcastNameForModal.value = firstLine.length > 50 ? firstLine.substring(0, 47) + '...' : firstLine || 'New Podcast';
  } else {
    podcastNameForModal.value = currentSettings.title || 'New Podcast';
  }

  // 直接提交任务，不显示确认对话框
  handleSubmitPodcastSynthesis();
};

// 导入封面生成相关的composable
import { usePodcastCoverGenerator } from '~/composables/usePodcastCoverGenerator';
const { generateAndSavePodcastCover } = usePodcastCoverGenerator();

// 直接提交播客合成任务
const handleSubmitPodcastSynthesis = async () => {
  try {
    const currentSpeakerAssignments = voicePerformanceSettingsRef.value.getPerformanceConfig()?.speakerAssignments;
    
    if (!currentSpeakerAssignments) {
      toast.error("语音分配信息缺失，无法合成播客。");
      return;
    }
    
    // 检查所有说话者是否都有有效的语音分配
    const missingVoices: string[] = [];
    for (const speaker in currentSpeakerAssignments) {
      const assignment = currentSpeakerAssignments[speaker];
      if (!assignment || !assignment.voiceId || assignment.voiceId === '') {
        missingVoices.push(speaker);
      }
    }
    
    if (missingVoices.length > 0) {
      toast.error(`以下说话者没有分配语音，无法合成播客：${missingVoices.join(', ')}`);
      return;
    }
    
    toast.success(`播客"${podcastNameForModal.value}"合成任务已提交，正在后台处理...`);
    
    // 格式化speakerAssignments
    const formattedSpeakerAssignments: Record<string, { voiceId: string, provider?: string }> = {};
    for (const speaker in currentSpeakerAssignments) {
      const assignment = currentSpeakerAssignments[speaker];
      if (typeof assignment === 'object' && assignment !== null && 'voiceId' in assignment) {
        formattedSpeakerAssignments[speaker] = {
          voiceId: assignment.voiceId,
          provider: assignment.provider ? assignment.provider.replace(/^'|'$/g, '').replace(/^"|"$/g, '') : undefined
        };
      }
    }
    
    // 生成封面图片
    const currentPId = unifiedStore.currentPodcastId; // Use getter
    const currentSettingsForCover = unifiedStore.currentPodcastSettingsSnapshot; // Use getter

    if (currentPId && currentSettingsForCover.title) {
      // 调用封面生成API，但不触发刷新
      generateAndSavePodcastCover(
        String(currentPId),
        currentSettingsForCover.title,
        currentSettingsForCover.topic
      )
        .then(() => {
          console.log(`[handleSubmitPodcastSynthesis] Cover generation process initiated for podcast ${currentPId}.`);
        })
        .catch(coverError => {
          console.error(`[handleSubmitPodcastSynthesis] Error initiating cover generation for podcast ${currentPId}:`, coverError);
        });
    }
    
    // 调用合成API
    // TODO: This $fetch should likely be part of a unifiedStore action e.g., unifiedStore.combineAudio()
    const combineResponse = await $fetch<CombineAudioResponse>('/api/podcast/combine-audio', {
      method: 'POST',
      body: {
        podcastId: unifiedStore.currentPodcastId, // Use getter
      },
    } as any);

    if (combineResponse && combineResponse.audioUrl) {
      unifiedStore.setFinalAudioUrl(combineResponse.audioUrl);
      toast.success(`播客"${podcastNameForModal.value}"合成完成！`);
    } else {
      toast.error(`播客"${podcastNameForModal.value}"合成失败：无法获取最终音频URL。`);
    }
  } catch (error: any) {
    console.error('合成错误:', error);
    toast.error(`播客"${podcastNameForModal.value}"合成失败：${error.data?.message || error.message || '未知错误'}`);
  }
};

</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style>
