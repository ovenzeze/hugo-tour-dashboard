import { ref, computed, type Ref, nextTick } from 'vue';
import { usePlaygroundStore } from '@/stores/playground'; // Main store for resetAll
import { usePlaygroundUnifiedStore } from '@/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { Persona } from '~/types/persona';
import { usePodcastCoverGenerator } from './usePodcastCoverGenerator'; // Import
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
  const unifiedStore = usePlaygroundUnifiedStore();
  const personaCache = usePersonaCache();
  const { generateAndSavePodcastCover } = usePodcastCoverGenerator(); // Instantiate
  
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
    await nextTick(); // Ensure store updates are processed before validation
    const localPodcastSettings = unifiedStore.podcastSettings;
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
    if (!unifiedStore.scriptContent) {
      toast.error('Script content is empty.');
      return;
    }
    const hostPersona = personaCache.getPersonaById(numericHostId);
    if (!hostPersona) {
      toast.error('Selected host not found.');
      return;
    }
    const guestPersonas = (localPodcastSettings.guestPersonaIds || [])
        .map(id => personaCache.getPersonaById(Number(id)))
        .filter((p): p is Persona => p !== undefined);

    const scriptSegments = parseScriptToSegmentsFromScriptComposable(unifiedStore.scriptContent);
    if (scriptSegments.length === 0) {
      toast.error('Unable to parse script. Ensure format is "Role: Text Content".');
      return;
    }

    isProcessingWorkflowStep.value = true; // Use local processing state
    try {
      // Call the refactored validateScript from scriptStore
      const validationResult = await unifiedStore.validateCurrentScript();
      
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
        guestPersonas: guestPersonas.map((p: Persona) => ({
            id: p.persona_id,
            name: p.name,
            voice_model_identifier: p.voice_model_identifier || "",
        })),
      };
      const apiRequestBody = {
        title: localPodcastSettings.title, // Changed from podcastTitle
        rawScript: unifiedStore.scriptContent, // Use rawScript for the API
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

      // Add logs to inspect the data
      // console.log('[usePlaygroundWorkflow] structuredData:', JSON.stringify(scriptStore.validationResult?.structuredData, null, 2));
      // console.log('[usePlaygroundWorkflow] localPodcastSettings:', JSON.stringify(localPodcastSettings, null, 2));
      // console.log('[usePlaygroundWorkflow] scriptStore.textToSynthesize:', scriptStore.textToSynthesize);
      // console.log('[usePlaygroundWorkflow] personasForApi:', JSON.stringify(personasForApi, null, 2));


      // Ensure structuredData exists and has the expected script format
      const structuredScript = unifiedStore.validationResult?.structuredData?.script;
      const processedScriptForApi = Array.isArray(structuredScript)
        ? structuredScript.map(segment => ({
            speaker: segment.name || segment.role || 'Unknown', // Prioritize name, then role
            text: segment.text,
          }))
        : [];

      if (processedScriptForApi.length === 0 && unifiedStore.scriptContent) {
        // Fallback or error if structured script is not available/valid but raw text exists
        // This might indicate an issue in the validation/structuring step
        console.warn('[usePlaygroundWorkflow] Structured script missing or invalid, attempting to use parsed raw script.');
        // Attempt to parse from raw text again as a last resort, though ideally structuredData.script should be correct
        const rawParsedSegments = parseScriptToSegmentsFromScriptComposable(unifiedStore.scriptContent);
        if (rawParsedSegments.length > 0) {
            processedScriptForApi.push(...rawParsedSegments.map(s => ({ speaker: s.speaker, text: s.text })));
        } else {
            toast.error("Critical error: Script data is unavailable for API submission.");
            isProcessingWorkflowStep.value = false;
            return;
        }
      }


      const saveRequestBody = {
        podcastTitle: localPodcastSettings.title || unifiedStore.validationResult?.structuredData?.podcastTitle || "Untitled Podcast",
        script: processedScriptForApi,
        personas: personasForApi, // Use the correctly structured personas object
        language: localPodcastSettings.language || unifiedStore.validationResult?.structuredData?.language || 'en',
        topic: localPodcastSettings.topic,
        host_persona_id: localPodcastSettings.hostPersonaId ? Number(localPodcastSettings.hostPersonaId) : undefined,
        // guest_persona_ids: localPodcastSettings.guestPersonaIds?.map(id => Number(id)), // If API expects array of IDs
        museumId: localPodcastSettings.museumId ?? undefined,
        galleryId: localPodcastSettings.galleryId ?? undefined,
        objectId: localPodcastSettings.objectId ?? undefined,
        // Include other fields from structuredData if they are expected at the top level by the API
        // and are not already covered. For example, if 'voiceMap' itself was needed:
        // voiceMap: scriptStore.validationResult?.structuredData?.voiceMap,
      };

      // console.log('[usePlaygroundWorkflow] saveRequestBody before sending:', JSON.stringify(saveRequestBody, null, 2));

      const response = await fetch('/api/podcast/process/script', { // Corrected endpoint
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
      // Read the response body as text first.
      // This is safe because if !response.ok, an error would have been thrown earlier,
      // and execution wouldn't reach here.
      // If response.ok, this is the first time we are reading the body.
      const responseBodyText = await response.text();
      try {
        // Attempt to parse the text as JSON.
        apiResult = JSON.parse(responseBodyText);
      } catch (e) {
        // If JSON.parse fails, we use the already read text in the error message.
        // This avoids calling response.text() again after a failed .json() attempt.
        throw new Error(`Failed to parse server response as JSON. Response text: ${responseBodyText}`);
      }

      if (apiResult.success && apiResult.podcastId) { // Changed apiResult.data?.podcastId to apiResult.podcastId
        unifiedStore.podcastId = apiResult.podcastId;
        toast.success('Script saved to database successfully. Proceeding to voice assignment.');
        goToStep(currentStepIndex.value + 1);
        
        // ******** TRIGGER COVER GENERATION ********
        if (localPodcastSettings.title) {
          generateAndSavePodcastCover(apiResult.podcastId.toString(), localPodcastSettings.title, localPodcastSettings.topic)
            .then(() => {
              console.log(`[Workflow] Cover generation process initiated for podcast ${apiResult.podcastId}.`);
            })
            .catch(coverError => {
              console.error(`[Workflow] Error initiating cover generation for podcast ${apiResult.podcastId}:`, coverError);
            });
        } else {
            console.warn(`[Workflow] Podcast title is missing, skipping cover generation for podcast ${apiResult.podcastId}.`)
        }
        // *******************************************

      } else {
        // Construct a more informative error message if podcastId is missing but success is true
        let errorMessage = 'Failed to save script to database or podcastId missing.';
        if (apiResult.success && !apiResult.podcastId) {
            errorMessage = 'Script processed successfully, but podcastId was not returned from the server.';
        } else if (apiResult.message) {
            errorMessage = apiResult.message;
        }
        throw new Error(errorMessage);
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
    const localPodcastSettings = unifiedStore.podcastSettings;
    const hostPersona = localPodcastSettings.hostPersonaId ? personaCache.getPersonaById(Number(localPodcastSettings.hostPersonaId)) : undefined;
    const guestPersonas = (localPodcastSettings.guestPersonaIds || [])
        .map(id => personaCache.getPersonaById(Number(id)))
        .filter(p => p !== undefined) as Persona[];

    if (!hostPersona) {
        toast.error("Host persona not found for validation.");
        isProcessingWorkflowStep.value = false;
        return;
    }

    const result = await unifiedStore.validateCurrentScript();
    if (result && result.success) {
      toast.success('Script validated successfully.');
      if (unifiedStore.validationResult?.structuredData) {
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
