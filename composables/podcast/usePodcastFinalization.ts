// composables/podcast/usePodcastFinalization.ts
import { ref, computed, watch, type Ref } from 'vue'
import { toast } from 'vue-sonner'
import { usePlaygroundStore } from '~/stores/playground'

export function usePodcastFinalization(
  podcastId: Ref<string | undefined>,
  isTimelineGenerated: Ref<boolean>,
  synthesizedCount: Ref<number>,
  totalSegments: Ref<number>,
  initialOutputFilename?: string,
  initialFinalAudioUrl?: Ref<string | undefined | null> // Pass as a Ref to be reactive
) {
  const playgroundStore = usePlaygroundStore()
  const finalAudioUrl = ref<string | null>(initialFinalAudioUrl?.value || null)
  // Ensure localOutputFilename is initialized correctly, prioritizing prop, then store, then default
  const localOutputFilename = ref(initialOutputFilename || playgroundStore.outputFilename || 'podcast_output.mp3')
  const isProcessingFinal = ref(false)

  const canMergeFinalAudio = computed(() => {
    // Ensure totalSegments is not zero before calculating percentage
    return isTimelineGenerated.value && totalSegments.value > 0 && synthesizedCount.value >= Math.floor(totalSegments.value * 0.9)
  })

  // Watch for changes in the initialFinalAudioUrl prop
  watch(() => initialFinalAudioUrl?.value, (newUrl) => {
    finalAudioUrl.value = newUrl || null;
  });

  // Watch for changes in the store's outputFilename if not overridden by prop
  watch(() => playgroundStore.outputFilename, (newName) => {
    // Only update from store if `initialOutputFilename` prop was not provided
    // and local value hasn't been changed by user input (if v-model is on localOutputFilename)
    if (!initialOutputFilename && newName && newName !== localOutputFilename.value) {
        localOutputFilename.value = newName;
    }
  });
  
  // Initialize from store if no prop is given
  if (!initialOutputFilename && playgroundStore.outputFilename) {
    localOutputFilename.value = playgroundStore.outputFilename;
  }


  async function handleMergeAudio(
    onSuccess?: (url: string) => void, 
    onFailure?: (errorMsg?: string) => void
  ) {
    if (!podcastId.value || !canMergeFinalAudio.value || isProcessingFinal.value) {
        if (!canMergeFinalAudio.value && !isProcessingFinal.value) { // Avoid double toast if already processing
            if (!isTimelineGenerated.value) {
                toast.info('Please generate the timeline first.');
            } else if (totalSegments.value === 0) {
                toast.info('No segments to merge. Please generate timeline and synthesize segments.');
            } else {
                toast.info('At least 90% of segments must be synthesized.');
            }
        }
        return
    }

    isProcessingFinal.value = true
    const oldFinalAudioUrl = finalAudioUrl.value; // Store old URL in case of failure
    finalAudioUrl.value = null // Clear previous URL optimistically

    try {
      console.log('Starting merge request for podcastId:', podcastId.value, 'with filename:', localOutputFilename.value)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      const response = await fetch('/api/podcast/process/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          podcastId: podcastId.value,
          outputFilename: localOutputFilename.value // Use the reactive localOutputFilename
        }),
        signal: controller.signal,
        // redirect: 'manual' // Fetch API handles redirects by default, 'manual' needs specific handling
      })

      clearTimeout(timeoutId)
      console.log('Merge API response status:', response.status)
      
      const responseText = await response.text(); // Get text first for better error diagnosis
      console.log('Raw response text:', responseText);


      if (!response.ok) {
        let errorData;
        try {
            errorData = JSON.parse(responseText);
        } catch (e) {
            // If response is not JSON, use status text or raw text
        }
        const message = errorData?.message || response.statusText || responseText || `Server returned ${response.status}`;
        throw new Error(message);
      }
      
      const data = JSON.parse(responseText); // Parse text now that we know it's likely JSON
      console.log('Parsed response data:', data)

      if (data.success && data.finalPodcastUrl) {
        console.log('Merge successful, final URL:', data.finalPodcastUrl)
        finalAudioUrl.value = data.finalPodcastUrl
        toast.success('Podcast audio synthesized successfully')
        if (onSuccess) onSuccess(data.finalPodcastUrl)
      } else {
        finalAudioUrl.value = oldFinalAudioUrl; // Revert to old URL on failure
        console.error('Merge API returned success:false or no URL:', data.message)
        const message = data.message || 'Failed to synthesize podcast audio (API error)';
        toast.error(message)
        if (onFailure) onFailure(message)
      }
    } catch (error: any) {
      finalAudioUrl.value = oldFinalAudioUrl; // Revert to old URL on error
      console.error('Error merging audio:', error)
      let errorMessage = 'Failed to synthesize podcast audio';
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout: The merge operation took too long.'
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage)
      if (onFailure) onFailure(errorMessage)
    } finally {
      isProcessingFinal.value = false
    }
  }
  
  // Update store when local filename changes, ensuring it's not an empty string
  watch(localOutputFilename, (newName) => {
    if (typeof newName === 'string') { // Ensure it's a string before setting
        playgroundStore.updateOutputFilename(newName);
    }
  });

  return {
    finalAudioUrl,
    localOutputFilename,
    isProcessingFinal,
    canMergeFinalAudio,
    handleMergeAudio,
  }
}