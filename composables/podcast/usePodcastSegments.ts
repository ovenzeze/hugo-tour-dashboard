// composables/podcast/usePodcastSegments.ts
import { ref, computed, watch, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { usePlaygroundStore } from '~/stores/playground'

interface Segment {
  id: number | string;
  text: string;
  speakerName: string;
  voiceId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  audioUrl?: string;
  timestampUrl?: string;
}

export function usePodcastSegments(
  podcastId: Ref<string | undefined>,
  isTimelineGenerated: Ref<boolean>
) {
  const playgroundStore = usePlaygroundStore()
  const segments = ref<Segment[]>([])
  const segmentsLoading = ref(true)
  const isProcessingSegments = ref(false) // For batch operations like synthesize all/failed

  const totalSegments = computed(() => segments.value.length)
  const synthesizedCount = computed(() => segments.value.filter(s => s.status === 'success').length)
  const isAllSegmentsSynthesized = computed(() => synthesizedCount.value === totalSegments.value && totalSegments.value > 0)
  const hasFailedSegments = computed(() => segments.value.some(s => s.status === 'failed'))

  async function refreshSegmentsStatus() {
    if (!podcastId.value) {
      segments.value = []
      segmentsLoading.value = false
      return
    }

    segmentsLoading.value = true
    try {
      const response = await fetch(`/api/podcast/segments-status?podcastId=${podcastId.value}`)
      const data = await response.json()

      if (data.success) {
        segments.value = data.segments || []
      } else {
        toast.error('Failed to get segments status', { description: data.message })
        segments.value = []
      }
    } catch (error) {
      console.error('Error refreshing segments status:', error)
      toast.error('Failed to get segments status', { description: error instanceof Error ? error.message : 'Unknown error' })
      segments.value = []
    } finally {
      segmentsLoading.value = false
    }
  }

  async function synthesizeSegmentsApiCall(segmentIndices: number[] | 'all') {
    // This is a helper to avoid code duplication for the API call itself
    const response = await fetch('/api/podcast/process/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: podcastId.value,
        segmentIndices: segmentIndices,
        synthesisParams: playgroundStore.synthesisParams
      })
    })
    return response.json()
  }

  async function processSynthesisRequest(
    segmentIndices: number[] | 'all', 
    successMessage: string,
    optimisticUpdateIndices?: number[]
  ) {
    if (!podcastId.value) return false;

    // Optimistic UI update
    if (optimisticUpdateIndices) {
      optimisticUpdateIndices.forEach(index => {
        if (segments.value[index]) {
          segments.value[index].status = 'processing'
        }
      })
    }
    
    try {
      const data = await synthesizeSegmentsApiCall(segmentIndices)
      if (data.success) {
        toast.success(successMessage, { description: 'Please refresh status to check progress' })
        setTimeout(() => refreshSegmentsStatus(), 2000)
        return true;
      } else {
        toast.error('Failed to start synthesis', { description: data.message })
        // Revert optimistic update on failure
        if (optimisticUpdateIndices) {
            // A full refresh is safer here to get actual statuses
            setTimeout(() => refreshSegmentsStatus(), 500); 
        }
        return false;
      }
    } catch (error) {
      console.error('Error synthesizing segments:', error)
      toast.error('Failed to start synthesis', { description: error instanceof Error ? error.message : 'Unknown error' })
      if (optimisticUpdateIndices) {
        setTimeout(() => refreshSegmentsStatus(), 500);
      }
      return false;
    }
  }


  async function handleSynthesizeAllSegments() {
    if (isProcessingSegments.value || !isTimelineGenerated.value) {
      if(!isTimelineGenerated.value) toast.info('Please generate the timeline first.')
      return
    }
    isProcessingSegments.value = true
    await processSynthesisRequest('all', 'All segments synthesis started')
    isProcessingSegments.value = false
  }

  async function handleSynthesizeFailedSegments() {
    if (isProcessingSegments.value || !isTimelineGenerated.value) {
      if(!isTimelineGenerated.value) toast.info('Please generate the timeline first.')
      return
    }
    const failedIndices = segments.value
      .map((segment, index) => segment.status === 'failed' ? index : -1)
      .filter(index => index !== -1)

    if (failedIndices.length === 0) {
      toast.info('No failed segments to retry')
      return
    }
    isProcessingSegments.value = true
    await processSynthesisRequest(failedIndices, `Started retrying ${failedIndices.length} failed segments`, failedIndices)
    isProcessingSegments.value = false
  }

  async function handleSynthesizeSingleSegment(segment: Segment, index: number) {
    if (!isTimelineGenerated.value || segment.status === 'processing' || segment.status === 'success') {
      if(!isTimelineGenerated.value) toast.info('Please generate the timeline first.')
      return
    }
    // No global isProcessingSegments lock for single, but prevent re-clicking on processing one.
    const originalStatus = segment.status;
    await processSynthesisRequest([index], 'Segment synthesis started', [index])
    // If processSynthesisRequest failed, status might be reverted by its refresh.
    // If it succeeded, refresh will update to 'success' or keep 'processing'.
  }
  
  watch(() => podcastId.value, async (newId) => {
    if (newId) {
      // segmentsLoading.value = true; // Set loading before async call
      await refreshSegmentsStatus()
    } else {
      segments.value = []
      segmentsLoading.value = true 
    }
  }, { immediate: true })

  watch(isTimelineGenerated, async (newVal, oldVal) => {
    if (newVal && podcastId.value) { // Refresh if timeline becomes available and we have an ID
        // segmentsLoading.value = true;
        await refreshSegmentsStatus();
    } else if (!newVal) { // If timeline is no longer generated, clear segments
        segments.value = [];
        segmentsLoading.value = false; // No data to load
    }
  });

  return {
    segments,
    segmentsLoading,
    isProcessingSegments, // This is for batch operations
    totalSegments,
    synthesizedCount,
    isAllSegmentsSynthesized,
    hasFailedSegments,
    refreshSegmentsStatus,
    handleSynthesizeAllSegments,
    handleSynthesizeFailedSegments,
    handleSynthesizeSingleSegment,
  }
}