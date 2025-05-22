import { ref, type Ref } from 'vue';
// import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified'; // Commented out
import { toast } from 'vue-sonner';
import type { ValidateScriptResponse } from '~/composables/useScriptValidator';

export function usePlaygroundAudio(voicePerformanceSettingsRef: Ref<any>, podcastPerformanceConfig: Ref<any>, canProceedFromStep2: Ref<boolean>) {
  // const unifiedStore = usePlaygroundUnifiedStore(); // Commented out
  // Placeholder for unifiedStore
  const unifiedStore = {
    podcastId: ref<string | number | null>(null),
    podcastSettings: ref<{ title?: string; language?: string; /* other needed fields */ }>({}),
    validationResult: ref<ValidateScriptResponse | null>(null),
    audioUrl: ref<string | null>(null),
    outputFilename: ref<string | undefined>(undefined), // Added this property
    synthesizeAudioPreviewForAllSegments: async (validationResult: any, podcastSettings: any, speakerAssignments: any) => {
      toast.info('Audio preview (unifiedStore mock) is temporarily unavailable.');
      return Promise.resolve({ successfulSegments: 0, failedSegments: 0, totalSegments: 0 });
    },
    synthesizeAudio: async () => {
      toast.info('Audio synthesis (unifiedStore mock) is temporarily unavailable.');
      return Promise.resolve({ success: false, finalAudioUrl: null, segmentResults: [] });
    },
    setFinalAudioUrl: (url: string | null) => {
      unifiedStore.audioUrl.value = url;
      console.log('unifiedStore.setFinalAudioUrl called (mock):', url);
    },
    // Add other properties/methods if they are accessed from this composable
  };

  const isGeneratingAudioPreview = ref(false); // For step 2 preview generation

  async function generateAudioPreview() {
    if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
      toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
      return;
    }
    if (!unifiedStore.podcastId.value) {
      toast.error("Podcast ID is missing. Cannot synthesize segments. Please ensure script is validated and saved (Step 1).");
      return;
    }

    const perfConfig = voicePerformanceSettingsRef.value.getPerformanceConfig();
    if (!perfConfig || !perfConfig.segments || perfConfig.segments.length === 0) {
      toast.error("No segments configured for synthesis in Voice Performance Settings.");
      return;
    }

    const newStructuredScript = perfConfig.segments.map((s: any) => ({
      name: s.speakerTag,
      role: s.roleType,
      text: s.text,
    }));
    const newVoiceMap: Record<string, { personaId: number; voice_model_identifier: string }> = {};
    perfConfig.segments.forEach((s: any) => {
      if (s.voiceId && s.personaId) {
        newVoiceMap[s.speakerTag] = {
          personaId: Number(s.personaId),
          voice_model_identifier: s.voiceId,
        };
      }
    });

    const updatedValidationData: ValidateScriptResponse = {
        success: true,
        message: "Performance configuration applied for synthesis.",
        structuredData: {
            podcastTitle: unifiedStore.podcastSettings.value.title || unifiedStore.validationResult.value?.structuredData?.podcastTitle || "Untitled Podcast",
            script: newStructuredScript,
            voiceMap: newVoiceMap,
            language: unifiedStore.podcastSettings.value.language || unifiedStore.validationResult.value?.structuredData?.language || "en",
        }
    };
    unifiedStore.validationResult.value = updatedValidationData;


    isGeneratingAudioPreview.value = true;
    try {
      console.log("[usePlaygroundAudio] Calling synthesizeAudioPreviewForAllSegments from unifiedStore for Step 2 'Generate Audio Preview'");
      await unifiedStore.synthesizeAudioPreviewForAllSegments(
        unifiedStore.validationResult.value,
        unifiedStore.podcastSettings.value,
        perfConfig.speakerAssignments
      );
    } catch (error) {
      console.error("[usePlaygroundAudio] Error in generateAudioPreview calling synthesizeAudioPreviewForAllSegments:", error);
      toast.error("Batch segment synthesis failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      isGeneratingAudioPreview.value = false;
    }
  }

  function handleToolbarSynthesizePodcastAudio() {
    if (!podcastPerformanceConfig.value) {
        toast.error("Performance configuration is missing. Please complete Step 2.");
        return;
    }
    if (!unifiedStore.validationResult.value || !unifiedStore.podcastSettings.value) {
        toast.error("Missing critical data for synthesis (validation or settings).");
        return;
    }
    unifiedStore.synthesizeAudio();
  }

  async function downloadWithFetch(url: string, filename: string) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/octet-stream' },
        redirect: 'follow',
      });
      if (!response.ok) throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      try {
        link.click();
      } catch (clickError) {
        const clickEvent = new MouseEvent('click', { view: window, bubbles: false, cancelable: true });
        link.dispatchEvent(clickEvent);
      }
      setTimeout(() => {
        if (document.body.contains(link)) document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      }, 1000);
      toast.success('Download started', { description: `Downloading ${filename}` });
    } catch (error) {
      console.error('[usePlaygroundAudio] Fetch download error:', error);
      toast.error('Download failed', { description: 'Please try again or right-click the audio player and select "Save audio as..."' });
    }
  }

  function handleDownloadCurrentAudio() {
    if (!unifiedStore.audioUrl.value) {
      toast.error('No audio available to download');
      return;
    }
    console.log('[usePlaygroundAudio] Starting download for:', unifiedStore.audioUrl.value);
    downloadWithFetch(unifiedStore.audioUrl.value, unifiedStore.outputFilename.value || 'podcast_output.mp3');
  }
  
  function updateFinalAudioUrl(url: string | null) {
    unifiedStore.setFinalAudioUrl(url);
  }

  return {
    isGeneratingAudioPreview,
    generateAudioPreview,
    handleToolbarSynthesizePodcastAudio,
    handleDownloadCurrentAudio,
    updateFinalAudioUrl,
  };
}
