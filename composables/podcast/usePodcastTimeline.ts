// composables/podcast/usePodcastTimeline.ts
import { computed, watch, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundProcessStore, type TimelineItem } from '@/stores/playgroundProcessStore'; // Import TimelineItem
import { toast } from 'vue-sonner';


export function usePodcastTimeline(
  podcastId: Ref<string | undefined>, // This ref comes from the component, derived from processStore.podcastId
  onTimelineGenerated?: () => Promise<void> // Callback for after timeline generation
) {
  const processStore = usePlaygroundProcessStore();

  const {
    timelineStatusResponse,
    isProcessingTimeline, // Use this instead of local isGeneratingTimeline
    error: processError
  } = storeToRefs(processStore);

  // Computed properties deriving from store state
  const timelineData = computed(() => timelineStatusResponse.value?.timelineData || []);
  const timelineUrl = computed(() => timelineStatusResponse.value?.timelineUrl || null);
  
  const isTimelineGenerated = computed(() =>
    timelineStatusResponse.value?.success === true &&
    timelineStatusResponse.value?.timelineExists === true &&
    (timelineData.value.length > 0 || !!timelineUrl.value) // Ensure either data or URL exists
  );

  const totalDuration = computed(() => {
    return timelineData.value.reduce((total, segment) => total + (segment.duration || 0), 0);
  });

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async function checkTimelineStatus() {
    if (!podcastId.value) {
      // processStore.timelineStatusResponse = null; // Or an action to clear it
      return;
    }
    await processStore.fetchTimelineStatus();
    // Toasting for errors can be handled globally by watching processStore.error in a UI component,
    // or if specific to this action, check processStore.error after the call.
    if (processStore.error && !timelineStatusResponse.value?.success) {
        toast.error('Failed to check timeline status', { description: processStore.error });
    }
  }

  async function generateTimeline() {
    if (!podcastId.value || isProcessingTimeline.value) return;

    const response = await processStore.generatePodcastTimeline();
    if (response?.success) {
      toast.success('Timeline generation initiated.');
      // The store state (timelineStatusResponse) is updated by the action.
      // Watchers or computed properties will react to this change.
      if (onTimelineGenerated && response.timelineExists) { // Ensure timeline actually generated
        await onTimelineGenerated();
      }
    } else {
      toast.error('Failed to generate timeline', { description: processStore.error || response?.message || 'Unknown error' });
    }
  }
  
  function handleViewTimelineJSON(url: string | null) {
    if (!url) return;
    window.open(url, '_blank');
  }

  watch(podcastId, async (newId) => {
    if (newId) {
      await checkTimelineStatus(); // Fetch status when podcastId changes and is valid
    } else {
      // processStore.timelineStatusResponse = null; // Or an action to clear it
      // This will clear timelineData and timelineUrl via their computed properties
    }
  }, { immediate: true });

  return {
    timelineData, // computed
    timelineUrl,  // computed
    isGeneratingTimeline: isProcessingTimeline, // reactive ref from store
    isTimelineGenerated, // computed
    totalDuration,       // computed
    formatDuration,
    checkTimelineStatus, // async function calling store action
    generateTimeline,    // async function calling store action
    handleViewTimelineJSON,
  };
}