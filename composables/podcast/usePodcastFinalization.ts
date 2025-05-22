// composables/podcast/usePodcastFinalization.ts
import { ref, computed, watch, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { storeToRefs } from 'pinia';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore'; // For initial filename from title

export function usePodcastFinalization(
  podcastId: Ref<string | undefined>, // From processStore
  isTimelineGenerated: Ref<boolean>, // From usePodcastTimeline (which should use processStore)
  synthesizedCount: Ref<number>,     // From usePodcastSegments (which should use processStore)
  totalSegments: Ref<number>,        // From usePodcastSegments (which should use processStore)
  // initialOutputFilename is now derived internally or via settingsStore
  // initialFinalAudioUrl is now directly from uiStore.finalAudioUrl
) {
  const processStore = usePlaygroundProcessStore();
  const uiStore = usePlaygroundUIStore();
  const settingsStore = usePlaygroundSettingsStore();

  const { finalAudioUrl } = storeToRefs(uiStore); // This is the source of truth
  const { isCombining: isProcessingFinal, error: processError, combineAudioResponse } = storeToRefs(processStore);
  const { podcastSettings } = storeToRefs(settingsStore);

  // localOutputFilename can be initialized from podcast title or a default
  const localOutputFilename = ref(
    podcastSettings.value.title?.replace(/\s+/g, '_') + '.mp3' || 'podcast_final.mp3'
  );
  
  // Watch for title changes to suggest new filename, but don't override if user changed it
  watch(() => podcastSettings.value.title, (newTitle) => {
      const suggestedFilename = newTitle?.replace(/\s+/g, '_') + '.mp3' || 'podcast_final.mp3';
      // A more sophisticated check might be needed if we allow user to freely edit localOutputFilename
      // and want to avoid overriding their explicit changes.
      // For now, if title changes, suggest a new filename.
      if (localOutputFilename.value !== suggestedFilename &&
          (localOutputFilename.value === 'podcast_final.mp3' ||
           !localOutputFilename.value.startsWith(newTitle?.replace(/\s+/g, '_') || ''))) {
        localOutputFilename.value = suggestedFilename;
      }
  });


  const canMergeFinalAudio = computed(() => {
    return isTimelineGenerated.value && totalSegments.value > 0 && synthesizedCount.value >= Math.floor(totalSegments.value * 0.9);
  });

  async function handleMergeAudio(
    onSuccess?: (url: string) => void, // Kept for flexibility, though store update is primary
    onFailure?: (errorMsg?: string) => void
  ) {
    if (!podcastId.value || !canMergeFinalAudio.value || isProcessingFinal.value) {
      if (!canMergeFinalAudio.value && !isProcessingFinal.value) {
        if (!isTimelineGenerated.value) toast.info('Please generate the timeline first.');
        else if (totalSegments.value === 0) toast.info('No segments to merge.');
        else toast.info('At least 90% of segments must be synthesized.');
      }
      return;
    }

    // isProcessingFinal (isCombining) is already true via store reaction if action started
    // uiStore.setFinalAudioUrl(null); // Optimistically clear, or let store action handle it

    try {
      const response = await processStore.combineAudio(); // This action now handles API call & state updates

      if (response?.success && response.audioUrl) {
        uiStore.setFinalAudioUrl(response.audioUrl); // Update UI store with the final URL
        toast.success('Podcast audio merged successfully!');
        if (onSuccess) onSuccess(response.audioUrl);
      } else {
        const errorMsg = processStore.error || response?.message || 'Failed to merge podcast audio.';
        toast.error(errorMsg);
        if (onFailure) onFailure(errorMsg);
        // finalAudioUrl in uiStore remains as it was or null if cleared optimistically by store action
      }
    } catch (error: any) {
      // Error should already be set in processStore.error by the action
      const errorMessage = processStore.error || (error.message || 'Error merging audio.');
      toast.error(errorMessage);
      if (onFailure) onFailure(errorMessage);
    }
    // isProcessingFinal (isCombining) will be set to false by the store action
  }

  return {
    finalAudioUrl, // From uiStore
    localOutputFilename, // Local ref for the filename input
    isProcessingFinal, // From processStore (isCombining)
    canMergeFinalAudio, // Computed
    handleMergeAudio,   // Calls processStore.combineAudio()
  };
}