// composables/podcast/usePodcastSegments.ts
import { ref, computed, watch, type Ref } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundProcessStore } from '@/stores/playgroundProcessStore';
import type { PreviewSegmentsApiResponse, SegmentPreview } from '@/stores/playgroundProcessStore';
import { usePlaygroundScriptStore } from '@/stores/playgroundScriptStore'; // Import scriptStore

// Define the structure of segments as parsed by playgroundScriptStore
interface ParsedScriptSegment {
  speaker: string;
  speakerPersonaId: number | null;
  text: string;
  personaMatchStatus?: 'exact' | 'fallback' | 'none';
  // Add other fields if present in scriptStore.parsedSegments
}

// Local Segment type for this composable's display purposes
interface ComposableSegment {
  id: string; // Using string for `segment-${index}`
  text: string;
  speakerName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  audioUrl?: string;
  personaMatchStatus?: 'exact' | 'fallback' | 'none';
}


export function usePodcastSegments(
  podcastId: Ref<string | undefined>,
  isTimelineGenerated: Ref<boolean>
) {
  const processStore = usePlaygroundProcessStore();
  const scriptStore = usePlaygroundScriptStore(); // Instantiate scriptStore
  
  const localSegmentsDisplay = ref<ComposableSegment[]>([]);
  const segmentsLoading = ref(false);
  const isProcessingBatch = ref(false);

  watch([() => scriptStore.parsedSegments, () => processStore.previewApiResponse], ([parsedScriptSegments, newApiResponse]) => {
    if (parsedScriptSegments && parsedScriptSegments.length > 0) {
      localSegmentsDisplay.value = parsedScriptSegments.map((scriptSeg: ParsedScriptSegment, index: number) => {
        const preview = newApiResponse?.segmentPreviews?.find((p: SegmentPreview) => p.segmentIndex === index);
        return {
          id: `segment-${index}`,
          text: scriptSeg.text,
          speakerName: scriptSeg.speaker,
          status: preview?.error ? 'failed' : (preview?.audioUrl ? 'success' : 'pending'),
          audioUrl: preview?.audioUrl,
          personaMatchStatus: scriptSeg.personaMatchStatus,
        };
      });
    } else {
      localSegmentsDisplay.value = [];
    }
  }, { deep: true, immediate: true });


  const totalSegments = computed(() => localSegmentsDisplay.value.length);
  const synthesizedCount = computed(() => localSegmentsDisplay.value.filter(s => s.status === 'success').length);
  const isAllSegmentsSynthesized = computed(() => totalSegments.value > 0 && synthesizedCount.value === totalSegments.value);
  const hasFailedSegments = computed(() => localSegmentsDisplay.value.some(s => s.status === 'failed'));

  async function refreshSegmentsStatus() {
    if (!podcastId.value) {
      // processStore.previewApiResponse = null; // Or an action to clear it
      // For now, let localSegmentsDisplay become empty via watcher
      return;
    }
    segmentsLoading.value = true;
    try {
      // This API call might be redundant if generateSegmentPreviews updates the store sufficiently.
      // Or, this could be a lighter way to get just statuses without re-triggering synthesis.
      // For now, let's assume it fetches statuses and updates the processStore.
      const response = await fetch(`/api/podcast/segments-status?podcastId=${podcastId.value}`);
      const data = await response.json();

      if (data.success && data.segments) {
        // Call the new store action to update the statuses
        processStore.updateSegmentPreviewStatuses(data.segments as SegmentPreview[]);
        toast.success('Segments status refreshed.');
      } else {
        toast.error('Failed to refresh segments status', { description: data.message || 'Unknown error from API' });
      }
    } catch (error) {
      console.error('Error refreshing segments status:', error);
      toast.error('Failed to refresh segments status', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      segmentsLoading.value = false;
    }
  }

  async function triggerSegmentGeneration(
    segmentIndices: number[] | 'all',
    successMessage: string
  ) {
    if (!podcastId.value || !isTimelineGenerated.value) {
        if(!isTimelineGenerated.value) toast.info('Please generate the timeline first.');
        return false;
    }
    isProcessingBatch.value = true; // Indicate a batch operation is in progress

    // Optimistically update status for targeted segments
    const indicesToUpdate: number[] = Array.isArray(segmentIndices)
        ? segmentIndices
        : localSegmentsDisplay.value.map((_, idx) => idx);
    
    indicesToUpdate.forEach(index => {
        const segment = localSegmentsDisplay.value.find((s, idx) => idx === index); // Assuming localSegmentsDisplay maps 1:1 with script segment indices
        if (segment && segment.status !== 'success') { // Only update if not already success
            // This is tricky because localSegmentsDisplay is computed from store.
            // Direct mutation here is bad.
            // The store action generateSegmentPreviews should handle optimistic updates if desired,
            // or we rely on polling/refresh for status changes.
            // For now, we'll rely on the store action to set isSynthesizing and then refresh.
        }
    });

    try {
      const response = await processStore.generateSegmentPreviews(segmentIndices);
      if (response?.success) {
        toast.success(successMessage);
        // The watcher on processStore.previewApiResponse should update localSegmentsDisplay.
        // A slight delay before manual refresh might be good if API is async.
        setTimeout(() => refreshSegmentsStatus(), 3000); // Give some time for backend processing
        return true;
      } else {
        toast.error('Segment synthesis request failed', { description: processStore.error || 'Unknown error' });
        return false;
      }
    } catch (error) {
      console.error('Error triggering segment generation:', error);
      toast.error('Segment synthesis request failed', { description: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    } finally {
      isProcessingBatch.value = false;
    }
  }

  async function handleSynthesizeAllSegments() {
    await triggerSegmentGeneration('all', 'All segments synthesis started.');
  }

  async function handleSynthesizeFailedSegments() {
    const failedIndices = localSegmentsDisplay.value
      .map((segment, index) => (segment.status === 'failed' ? index : -1))
      .filter(index => index !== -1);

    if (failedIndices.length === 0) {
      toast.info('No failed segments to retry.');
      return;
    }
    await triggerSegmentGeneration(failedIndices, `Retrying ${failedIndices.length} failed segments.`);
  }

  async function handleSynthesizeSingleSegment(segment: ComposableSegment, index: number) {
     if (!isTimelineGenerated.value || segment.status === 'processing' || segment.status === 'success') {
       if(!isTimelineGenerated.value && segment.status !== 'processing' && segment.status !== 'success') toast.info('Please generate the timeline first.');
       return;
     }
    // For single segment, we don't use isProcessingBatch, but rely on isGlobalSynthesizing from processStore
    // and currentlyPreviewingSegmentIndex from uiStore to show loading on the specific item.
    await triggerSegmentGeneration([index], `Segment ${index + 1} synthesis started.`);
  }

  watch(() => podcastId.value, async (newId) => {
    if (newId && isTimelineGenerated.value) { // Only refresh if timeline is also ready
      await refreshSegmentsStatus();
    } else if (!newId) {
      // processStore.previewApiResponse = null; // Action to clear
      // Watcher on previewApiResponse will clear localSegmentsDisplay
    }
  }, { immediate: true });

  watch(isTimelineGenerated, async (newVal) => {
    if (newVal && podcastId.value) {
      await refreshSegmentsStatus();
    } else if (!newVal) {
      // processStore.previewApiResponse = null; // Action to clear
    }
  }, { immediate: true });


  return {
    segments: localSegmentsDisplay, // Expose the mapped display segments
    segmentsLoading,
    isProcessingSegments: isProcessingBatch, // Renamed for clarity
    totalSegments,
    synthesizedCount,
    isAllSegmentsSynthesized,
    hasFailedSegments,
    refreshSegmentsStatus,
    handleSynthesizeAllSegments,
    handleSynthesizeFailedSegments,
    handleSynthesizeSingleSegment,
  };
}