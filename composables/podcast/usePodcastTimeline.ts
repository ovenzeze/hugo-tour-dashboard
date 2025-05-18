// composables/podcast/usePodcastTimeline.ts
import { ref, computed, watch, type Ref } from 'vue'
import { toast } from 'vue-sonner'

interface TimelineItem {
  speaker: string;
  audioFile: string;
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export function usePodcastTimeline(
  podcastId: Ref<string | undefined>,
  onTimelineGenerated?: () => Promise<void> // Callback for after timeline generation
) {
  const timelineData = ref<TimelineItem[]>([])
  const timelineUrl = ref<string | null>(null)
  const isGeneratingTimeline = ref(false)

  const isTimelineGenerated = computed(() => timelineData.value.length > 0 && timelineUrl.value !== null)
  const totalDuration = computed(() => {
    return timelineData.value.reduce((total, segment) => total + (segment.duration || 0), 0)
  })

  function formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  async function checkTimelineStatus() {
    if (!podcastId.value) {
      timelineUrl.value = null
      timelineData.value = []
      return
    }
    try {
      const response = await fetch(`/api/podcast/status?podcastId=${podcastId.value}`)
      const data = await response.json()

      if (data.timelineExists) {
        timelineUrl.value = data.timelineUrl
        timelineData.value = data.timelineData || []
      } else {
        timelineUrl.value = null
        timelineData.value = []
      }
    } catch (error) {
      console.error('Error checking timeline status:', error)
      toast.error('Failed to check timeline status', { description: error instanceof Error ? error.message : 'Unknown error' })
      timelineUrl.value = null
      timelineData.value = []
    }
  }

  async function generateTimeline() {
    if (!podcastId.value || isGeneratingTimeline.value) return

    isGeneratingTimeline.value = true
    try {
      const response = await fetch('/api/podcast/process/timeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ podcastId: podcastId.value })
      })

      const data = await response.json()

      if (data.success) {
        timelineUrl.value = data.timelineUrl
        timelineData.value = data.timelineData || []
        toast.success('Timeline generated successfully')
        if (onTimelineGenerated) {
          await onTimelineGenerated()
        }
      } else {
        toast.error('Failed to generate timeline', { description: data.message })
      }
    } catch (error) {
      console.error('Error generating timeline:', error)
      toast.error('Failed to generate timeline', { description: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      isGeneratingTimeline.value = false
    }
  }
  
  function handleViewTimelineJSON(url: string | null) {
    if (!url) return;
    window.open(url, '_blank');
  }

  watch(() => podcastId.value, async (newId) => {
    if (newId) {
      await checkTimelineStatus()
    } else {
      timelineData.value = []
      timelineUrl.value = null
    }
  }, { immediate: true })

  return {
    timelineData,
    timelineUrl,
    isGeneratingTimeline,
    isTimelineGenerated,
    totalDuration,
    formatDuration,
    checkTimelineStatus,
    generateTimeline,
    handleViewTimelineJSON,
  }
}