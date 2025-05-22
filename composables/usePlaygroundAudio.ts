import { ref, type Ref } from 'vue';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { toast } from 'vue-sonner';
import type { ValidateScriptResponse } from '~/composables/useScriptValidator';

export function usePlaygroundAudio(voicePerformanceSettingsRef: Ref<any>, podcastPerformanceConfig: Ref<any>, canProceedFromStep2: Ref<boolean>) {
  const unifiedStore = usePlaygroundUnifiedStore();

  const isGeneratingAudioPreview = ref(false); // For step 2 preview generation

  async function generateAudioPreview() {
    if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
      toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
      return;
    }
    if (!unifiedStore.podcastId) {
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
            podcastTitle: unifiedStore.podcastSettings.title || unifiedStore.validationResult?.structuredData?.podcastTitle || "Untitled Podcast",
            script: newStructuredScript,
            voiceMap: newVoiceMap,
            language: unifiedStore.podcastSettings.language || unifiedStore.validationResult?.structuredData?.language || "en",
        }
    };
    unifiedStore.validationResult = updatedValidationData;


    isGeneratingAudioPreview.value = true;
    try {
      console.log("[usePlaygroundAudio] Calling synthesizeAudioPreviewForAllSegments from unifiedStore for Step 2 'Generate Audio Preview'");
      await unifiedStore.synthesizeAudioPreviewForAllSegments(
        unifiedStore.validationResult, 
        unifiedStore.podcastSettings, 
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
    if (!unifiedStore.validationResult || !unifiedStore.podcastSettings) {
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
    if (!unifiedStore.audioUrl) {
      toast.error('No audio available to download');
      return;
    }
    console.log('[usePlaygroundAudio] Starting download for:', unifiedStore.audioUrl);
    downloadWithFetch(unifiedStore.audioUrl, unifiedStore.outputFilename || 'podcast_output.mp3');
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
