import { ref, computed, type Ref } from 'vue';
import { usePlaygroundStore } from '@/stores/playground'; // Main store for resetAll
import { usePlaygroundSettingsStore } from '@/stores/playgroundSettings';
import { usePlaygroundScriptStore } from '@/stores/playgroundScript';
import { usePlaygroundPersonaStore, type Persona as StorePersona } from '@/stores/playgroundPersona'; // Persona type
import { usePlaygroundAudioStore } from '@/stores/playgroundAudio';
// Removed unused imports: usePlaygroundStepper, usePlaygroundScript
import { toast } from 'vue-sonner';

// Assuming voicePerformanceSettingsRef will expose necessary methods/props
interface VoicePerformanceSettingsComponent {
  getPerformanceConfig: () => any; // Replace 'any' with actual config type if known
  synthesizedSegmentsCount: number | undefined;
  totalSegmentsCount: number | undefined;
  isFormValid: boolean | undefined;
}

export function usePlaygroundWorkflow(
  currentStepIndex: Ref<number>,
  goToStep: (step: number) => void,
  voicePerformanceSettingsRef: Ref<VoicePerformanceSettingsComponent | null>,
  isScriptGeneratingFromScriptComposable: Ref<boolean>, // Renamed to avoid conflict
  parseScriptToSegmentsFromScriptComposable: (content: string) => Array<{ speaker: string, text: string }> // Renamed
) {
  const mainPlaygroundStore = usePlaygroundStore();
  const settingsStore = usePlaygroundSettingsStore();
  const scriptStore = usePlaygroundScriptStore();
  const personaStore = usePlaygroundPersonaStore();
  const audioStore = usePlaygroundAudioStore();
  
  const podcastPerformanceConfig = ref<any>(null); // Consider defining a specific type
  const showStep2ProceedConfirmation = ref(false);
  const pendingSegmentsCount = ref(0);

  // This is a local ref for this composable, distinct from isScriptGenerating in usePlaygroundScript
  const isProcessingWorkflowStep = ref(false); 

  function confirmProceedToStep3() {
    if (!voicePerformanceSettingsRef.value) {
      toast.error("Internal error: Voice settings reference is unavailable.");
      showStep2ProceedConfirmation.value = false;
      return;
    }
    const config = voicePerformanceSettingsRef.value.getPerformanceConfig();
    if (config) {
      podcastPerformanceConfig.value = config;
      goToStep(3);
      toast.success("Voice configuration saved. Proceeding to audio synthesis.");
    } else {
      toast.error("Voice configuration is invalid. Please ensure all characters have assigned voices.");
    }
    showStep2ProceedConfirmation.value = false;
  }

  function handleNextFromStep2() {
    if (!voicePerformanceSettingsRef.value || !voicePerformanceSettingsRef.value.isFormValid) {
      toast.error("Voice configuration is incomplete. Please assign voices to all characters.");
      return;
    }
    const synthesizedCount = voicePerformanceSettingsRef.value.synthesizedSegmentsCount || 0;
    const totalCount = voicePerformanceSettingsRef.value.totalSegmentsCount || 0;

    if (totalCount <= 0 || synthesizedCount >= totalCount) {
      confirmProceedToStep3();
    } else {
      pendingSegmentsCount.value = totalCount - synthesizedCount;
      showStep2ProceedConfirmation.value = true;
    }
  }

  function resetPodcastView() {
    mainPlaygroundStore.resetAllPlaygroundState();
    podcastPerformanceConfig.value = null;
    goToStep(1); // Reset to the first step
    toast.info("Ready to create a new podcast.");
  }

  async function handleProceedWithoutValidation() {
    const localPodcastSettings = settingsStore.podcastSettings;
    if (!localPodcastSettings?.title) {
      toast.error('Please set the podcast title.');
      return;
    }
    const hostId = localPodcastSettings?.hostPersonaId;
    // Ensure hostId is a number for the check, as it can be string | number | undefined
    const numericHostId = typeof hostId === 'string' ? parseInt(hostId, 10) : hostId;
    if (typeof numericHostId !== 'number' || numericHostId <= 0) {
      toast.error('Please select a valid host.');
      return;
    }
    if (!scriptStore.textToSynthesize) {
      toast.error('Script content is empty.');
      return;
    }
    const hostPersona = personaStore.personas.find(
      (p: StorePersona) => p.persona_id === numericHostId
    );
    if (!hostPersona) {
      toast.error('Selected host not found.');
      return;
    }
    const guestPersonas = (localPodcastSettings.guestPersonaIds || [])
        .map(id => personaStore.personas.find(p => p.persona_id === Number(id)))
        .filter(p => p !== undefined) as StorePersona[];

    const scriptSegments = parseScriptToSegmentsFromScriptComposable(scriptStore.textToSynthesize);
    if (scriptSegments.length === 0) {
      toast.error('Unable to parse script. Ensure format is "Role: Text Content".');
      return;
    }

    isProcessingWorkflowStep.value = true; // Use local processing state
    try {
      // Call the refactored validateScript from scriptStore
      const validationResult = await scriptStore.validateScript(localPodcastSettings, hostPersona, guestPersonas);
      
      if (!validationResult || !validationResult.success) {
        const errorMessage = validationResult?.error || validationResult?.message || 'Script validation failed.';
        toast.error(`Validation failed: ${errorMessage}`);
        isProcessingWorkflowStep.value = false;
        return;
      }
      toast.success('Script validated successfully. Saving to database...');

      const personasForApi = {
        hostPersona: {
            id: hostPersona.persona_id,
            name: hostPersona.name,
            voice_model_identifier: hostPersona.voice_model_identifier || "",
        },
        guestPersonas: guestPersonas.map((p: StorePersona) => ({
            id: p.persona_id,
            name: p.name,
            voice_model_identifier: p.voice_model_identifier || "",
        })),
      };
      const apiRequestBody = {
        title: localPodcastSettings.title, // Changed from podcastTitle
        rawScript: scriptStore.textToSynthesize, // Use rawScript for the API
        personas: personasForApi,
        // hostPersonaId: Number(localPodcastSettings.hostPersonaId), // Already have hostPersona
        preferences: { // Match ValidateScriptRequest structure
            style: localPodcastSettings.style || "Conversational",
            language: localPodcastSettings.language || 'en',
            keywords: localPodcastSettings.keywords || "",
            numberOfSegments: localPodcastSettings.numberOfSegments || 3,
            backgroundMusic: localPodcastSettings.backgroundMusic,
        },
        // Add museum context if available
        museumId: localPodcastSettings.museumId ?? undefined,
        galleryId: localPodcastSettings.galleryId ?? undefined,
        objectId: localPodcastSettings.objectId ?? undefined,
      };
      // Endpoint for saving processed script might be different from validation
      // Assuming '/api/podcast/process/script' is for saving a validated and structured script
      // The request body for this endpoint might expect the structuredData from validationResult
      // For now, sending a more detailed request based on current data.
      // This part might need adjustment based on the actual API endpoint requirements for saving.
      // Let's assume the API takes the structured data from validation.
      const saveRequestBody = {
        ...scriptStore.validationResult?.structuredData, // Send the validated structured data
        // Optionally add/override fields like museumId, galleryId, objectId if they are not part of structuredData
        museumId: localPodcastSettings.museumId ?? undefined,
        galleryId: localPodcastSettings.galleryId ?? undefined,
        objectId: localPodcastSettings.objectId ?? undefined,
      };

      const response = await fetch('/api/podcast/process/save-structured-script', { // Example endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveRequestBody),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          const errorText = await response.text();
          throw new Error(`Failed to save script. Server responded with ${response.status}: ${errorText || 'No additional error message.'}`);
        }
        throw new Error(errorData.message || errorData.statusMessage || `Failed to save script to database. Status: ${response.status}`);
      }

      let apiResult;
      try {
        apiResult = await response.json();
      } catch (e) {
        const responseText = await response.text();
        throw new Error(`Failed to parse server response as JSON. Response text: ${responseText}`);
      }

      if (apiResult.success && apiResult.data?.podcastId) {
        audioStore.setPodcastId(apiResult.data.podcastId);
        toast.success('Script saved to database successfully. Proceeding to voice assignment.');
        goToStep(currentStepIndex.value + 1);
      } else {
        throw new Error(apiResult.message || 'Failed to save script to database or podcastId missing.');
      }
    } catch (error) {
      console.error('[usePlaygroundWorkflow] Process script failed:', error);
      toast.error(`Failed to process and save script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      isProcessingWorkflowStep.value = false;
    }
  }
  
  // This function might be more related to script validation than pure workflow.
  // Consider if it should live in usePlaygroundScript or if the store's own validation is sufficient.
  async function handleJustValidateScript() {
    // For now, assuming this uses the store's validation which might be fine.
    // If it needs local state or specific UI feedback tied to this composable, adjust accordingly.
    isProcessingWorkflowStep.value = true;
    const localPodcastSettings = settingsStore.podcastSettings;
    const hostPersona = localPodcastSettings.hostPersonaId ? personaStore.personas.find(p => p.persona_id === Number(localPodcastSettings.hostPersonaId)) : undefined;
    const guestPersonas = (localPodcastSettings.guestPersonaIds || [])
        .map(id => personaStore.personas.find(p => p.persona_id === Number(id)))
        .filter(p => p !== undefined) as StorePersona[];

    if (!hostPersona) {
        toast.error("Host persona not found for validation.");
        isProcessingWorkflowStep.value = false;
        return;
    }

    const result = await scriptStore.validateScript(localPodcastSettings, hostPersona, guestPersonas);
    if (result && result.success) {
      toast.success('Script validated successfully.');
      if (scriptStore.validationResult?.structuredData) {
        console.log('[usePlaygroundWorkflow] Validation successful with structured data');
      }
    } else {
      const errorMessage = result?.error || result?.message ||'Unknown validation error';
      toast.error(`Script validation failed: ${errorMessage}`);
    }
    isProcessingWorkflowStep.value = false;
  }


  return {
    podcastPerformanceConfig,
    showStep2ProceedConfirmation,
    pendingSegmentsCount,
    isProcessingWorkflowStep, // Expose this for UI states if needed
    confirmProceedToStep3,
    handleNextFromStep2,
    resetPodcastView,
    handleProceedWithoutValidation,
    handleJustValidateScript,
  };
}
