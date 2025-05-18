import { ref, type Ref } from 'vue';
import { usePlaygroundAudioStore } from '@/stores/playgroundAudio';
import { usePlaygroundScriptStore } from '@/stores/playgroundScript';
import { usePlaygroundSettingsStore } from '@/stores/playgroundSettings';
import { toast } from 'vue-sonner';
import type { ValidateScriptResponse } from '~/composables/useScriptValidator';

export function usePlaygroundAudio(voicePerformanceSettingsRef: Ref<any>, podcastPerformanceConfig: Ref<any>, canProceedFromStep2: Ref<boolean>) {
  const audioStore = usePlaygroundAudioStore();
  const scriptStore = usePlaygroundScriptStore();
  const settingsStore = usePlaygroundSettingsStore();

  const isGeneratingAudioPreview = ref(false); // For step 2 preview generation

  async function generateAudioPreview() {
    if (!voicePerformanceSettingsRef.value || !canProceedFromStep2.value) {
      toast.error("Voice configuration incomplete. Please assign voices to all roles/speakers.");
      return;
    }
    if (!audioStore.podcastId) {
      toast.error("Podcast ID is missing. Cannot synthesize segments. Please ensure script is validated and saved (Step 1).");
      return;
    }

    const perfConfig = voicePerformanceSettingsRef.value.getPerformanceConfig();
    if (!perfConfig || !perfConfig.segments || perfConfig.segments.length === 0) {
      toast.error("No segments configured for synthesis in Voice Performance Settings.");
      return;
    }

    // Update scriptStore's validationResult based on current performanceConfig
    // This is crucial because synthesizeAllSegmentsConcurrently relies on scriptStore.validationResult
    const newStructuredScript = perfConfig.segments.map((s: any) => ({
      name: s.speakerTag, // In ValidateScriptResponse, script items have 'name', not 'speakerTag'
      role: s.roleType,   // 'host' | 'guest'
      text: s.text,
    }));
    const newVoiceMap: Record<string, { personaId: number; voice_model_identifier: string }> = {};
    perfConfig.segments.forEach((s: any) => {
      if (s.voiceId && s.personaId) {
        newVoiceMap[s.speakerTag] = { // speakerTag is used as key in voiceMap
          personaId: Number(s.personaId),
          voice_model_identifier: s.voiceId,
        };
      }
    });

    // Construct a valid ValidateScriptResponse object to update the scriptStore
    const updatedValidationData: ValidateScriptResponse = {
        success: true, // Assuming this step implies a successful configuration for synthesis
        message: "Performance configuration applied for synthesis.",
        structuredData: {
            // podcastTitle and language should ideally come from settingsStore or be part of perfConfig
            podcastTitle: settingsStore.podcastSettings.title || scriptStore.validationResult?.structuredData?.podcastTitle || "Untitled Podcast",
            script: newStructuredScript,
            voiceMap: newVoiceMap,
            language: settingsStore.podcastSettings.language || scriptStore.validationResult?.structuredData?.language || "en",
        }
    };
    scriptStore.validationResult = updatedValidationData;


    isGeneratingAudioPreview.value = true;
    try {
      console.log("[usePlaygroundAudio] Calling synthesizeAllSegmentsConcurrently for Step 2 'Generate Audio Preview'");
      await audioStore.synthesizeAllSegmentsConcurrently(scriptStore.validationResult, settingsStore.podcastSettings);
      // Toast messages are handled within the action in the store
    } catch (error) {
      console.error("[usePlaygroundAudio] Error in generateAudioPreview calling synthesizeAllSegmentsConcurrently:", error);
      toast.error("Batch segment synthesis failed: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      isGeneratingAudioPreview.value = false;
    }
  }

  function handleToolbarSynthesizePodcastAudio() {
    // This function is for Step 3, directly calling the store action.
    // It assumes that podcastPerformanceConfig (passed as a ref to this composable)
    // has been set correctly when proceeding from Step 2.
    if (!podcastPerformanceConfig.value) {
        toast.error("Performance configuration is missing. Please complete Step 2.");
        return;
    }
    // Additional checks for validationResult might be needed if it's strictly required by synthesizeAllSegmentsConcurrently
    // and not guaranteed to be up-to-date by this point.
    // The above logic now attempts to update scriptStore.validationResult.
    if (!scriptStore.validationResult || !settingsStore.podcastSettings) {
        toast.error("Missing critical data for synthesis (validation or settings).");
        return;
    }
    audioStore.synthesizeAllSegmentsConcurrently(scriptStore.validationResult, settingsStore.podcastSettings);
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
    if (!audioStore.audioUrl) {
      toast.error('No audio available to download');
      return;
    }
    console.log('[usePlaygroundAudio] Starting download for:', audioStore.audioUrl);
    // The iframe method was complex and had fallbacks; simplifying to fetch-based for now.
    // If iframe method is strongly preferred, it can be re-integrated here.
    downloadWithFetch(audioStore.audioUrl, audioStore.outputFilename || 'podcast_output.mp3');
  }
  
  // playAudioFile and handlePlayFileWithoutRedirect are part of useGlobalAudioInterceptor now.
  // If they are needed here specifically, they can be re-added or imported.

  function updateFinalAudioUrl(url: string | null) { // Allow null to clear
    audioStore.setFinalAudioUrl(url);
  }

  return {
    isGeneratingAudioPreview,
    generateAudioPreview,
    handleToolbarSynthesizePodcastAudio,
    handleDownloadCurrentAudio,
    updateFinalAudioUrl,
  };
}
