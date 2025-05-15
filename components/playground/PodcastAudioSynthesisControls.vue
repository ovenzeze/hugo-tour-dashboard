<template>
  <div class="space-y-6">
    <!-- Podcast Information Summary -->
    <div class="rounded-lg border p-4 space-y-2 bg-muted/10">
      <div class="flex justify-between items-center">
        <h3 class="text-lg font-medium">Podcast Information</h3>
        <Badge variant="outline" class="bg-primary/10">{{ podcastId || 'No ID' }}</Badge>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><span class="font-medium">Title:</span> {{ podcastInfo.title || 'N/A' }}</div>
        <div><span class="font-medium">Host:</span> {{ podcastInfo.hostName || 'N/A' }}</div>
        <div><span class="font-medium">Guests:</span> {{ podcastInfo.guestNames?.join(', ') || 'None' }}</div>
        <div><span class="font-medium">Language:</span> {{ podcastInfo.language || 'English' }}</div>
      </div>
    </div>

    <!-- Status and Preparation Section -->
    <div class="space-y-4">
      <!-- Timeline Status -->
      <div class="rounded-lg border p-4 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-medium">Timeline Status</h3>
          <Badge :variant="isTimelineGenerated ? 'default' : 'outline'" :class="isTimelineGenerated ? 'bg-primary/20' : ''">
            {{ isTimelineGenerated ? 'Generated' : 'Not Generated' }}
          </Badge>
        </div>
        
        <div v-if="isTimelineGenerated" class="text-sm space-y-1">
          <p><span class="font-medium">Segments:</span> {{ timelineData.length }}</p>
          <p><span class="font-medium">Estimated Duration:</span> {{ formatDuration(totalDuration) }}</p>
        </div>
        
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            @click="generateTimeline"
            :disabled="isGeneratingTimeline || !podcastId || segmentsLoading"
          >
            <Icon name="ph:spinner" v-if="isGeneratingTimeline" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:chart-line" v-else class="w-4 h-4 mr-2" />
            {{ isTimelineGenerated ? 'Update Timeline' : 'Generate Timeline' }}
          </Button>
          
          <Button
            v-if="timelineUrl"
            variant="ghost"
            size="sm"
            @click.prevent="handleViewTimelineJSON(timelineUrl)"
          >
            <Icon name="ph:file-json" class="w-4 h-4 mr-2" />
            View JSON
          </Button>
        </div>
      </div>

      <!-- Audio Segments Synthesis Status -->
      <div class="rounded-lg border p-4 space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-medium">Audio Segments Status</h3>
          <Badge variant="default" :class="isAllSegmentsSynthesized ? 'bg-primary/20' : 'bg-muted'">
            {{ synthesizedCount }} / {{ totalSegments }} Synthesized
          </Badge>
        </div>
        
        <div class="flex flex-wrap gap-2 mb-3">
          <Button 
            variant="outline" 
            size="sm"
            @click="handleSynthesizeAllSegments"
            :disabled="isProcessingSegments || segmentsLoading || !isTimelineGenerated"
          >
            <Icon name="ph:spinner" v-if="isProcessingSegments" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:broadcast" v-else class="w-4 h-4 mr-2" />
            Synthesize All
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            @click="handleSynthesizeFailedSegments"
            :disabled="isProcessingSegments || segmentsLoading || !hasFailedSegments || !isTimelineGenerated"
          >
            <Icon name="ph:arrows-clockwise" class="w-4 h-4 mr-2" />
            Retry Failed
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            @click="refreshSegmentsStatus"
            :disabled="segmentsLoading"
          >
            <Icon name="ph:spinner" v-if="segmentsLoading" class="w-4 h-4 mr-2 animate-spin" />
            <Icon name="ph:arrow-counter-clockwise" v-else class="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
        
        <!-- Segments List -->
        <div v-if="segmentsLoading" class="flex justify-center py-8">
          <Icon name="ph:spinner" class="w-8 h-8 animate-spin text-primary" />
        </div>
        
        <div v-else-if="segments.length === 0" class="text-center py-6 text-muted-foreground">
          No segments found. Please generate the timeline first.
        </div>
        
        <ScrollArea v-else class="h-[300px] w-full pr-4">
          <div class="space-y-2">
            <div 
              v-for="(segment, index) in segments" 
              :key="index"
              class="flex items-center gap-2 p-2 rounded-md border hover:bg-muted/30 transition-colors"
            >
              <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                <Icon 
                  v-if="segment.status === 'success'" 
                  name="ph:check-circle" 
                  class="w-6 h-6 text-green-500" 
                />
                <Icon 
                  v-else-if="segment.status === 'processing'" 
                  name="ph:spinner" 
                  class="w-6 h-6 animate-spin text-primary" 
                />
                <Icon 
                  v-else-if="segment.status === 'failed'" 
                  name="ph:x-circle" 
                  class="w-6 h-6 text-destructive" 
                />
                <Icon 
                  v-else 
                  name="ph:clock" 
                  class="w-6 h-6 text-muted-foreground" 
                />
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center">
                  <Badge variant="outline" class="mr-2">{{ index + 1 }}</Badge>
                  <p class="font-medium text-sm truncate">{{ segment.speakerName }}</p>
                </div>
                <p class="text-xs text-muted-foreground truncate">{{ segment.text.substring(0, 100) }}</p>
              </div>
              
              <Button 
                v-if="segment.status !== 'success' && segment.status !== 'processing'"
                variant="ghost" 
                size="icon"
                @click="handleSynthesizeSingleSegment(segment, index)"
                :disabled="isProcessingSegments"
              >
                <Icon name="ph:arrows-clockwise" class="w-4 h-4" />
              </Button>
              <Button 
                v-if="segment.status === 'success' && segment.audioUrl"
                variant="ghost" 
                size="icon"
                @click.prevent="handlePlayFileWithoutRedirect(segment.audioUrl)"
              >
                <Icon name="ph:play" class="w-4 h-4" />
              </Button>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>

    <!-- Final Synthesis Control Section -->
    <div class="space-y-3">
      <div class="space-y-2">
        <Label>Output Filename</Label>
        <Input 
          v-model="localOutputFilename" 
          placeholder="podcast_output.mp3"
          :disabled="isProcessingFinal"
        />
      </div>
      
      <div class="flex flex-col gap-3 mt-4">
        <Button 
          @click="handleMergeAudio" 
          :disabled="!canMergeFinalAudio || isProcessingFinal"
          class="w-full"
        >
          <Icon name="ph:spinner" v-if="isProcessingFinal" class="w-5 h-5 mr-2 animate-spin" />
          <Icon name="ph:broadcast" v-else class="w-5 h-5 mr-2" />
          {{ isProcessingFinal ? 'Merging...' : 'Synthesize Final Podcast' }}
        </Button>
        
        <div v-if="!canMergeFinalAudio && !segmentsLoading" class="text-sm text-muted-foreground text-center">
          <span v-if="!isTimelineGenerated">Please generate the timeline first</span>
          <span v-else-if="synthesizedCount < totalSegments * 0.9">At least 90% of segments must be synthesized</span>
        </div>
      </div>
    </div>

    <!-- Results Display Section -->
    <div v-if="finalAudioUrl" class="space-y-2 pt-3 border-t">
      <div class="flex justify-between items-center">
        <Label>Final Podcast</Label>
        <Button 
          variant="outline" 
          size="sm"
          @click="$emit('download')"
        >
          <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
          Download
        </Button>
      </div>
      <div class="rounded-lg border bg-card p-4">
        <audio :src="finalAudioUrl" controls class="w-full" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { usePlaygroundStore } from '~/stores/playground'

const playgroundStore = usePlaygroundStore()

interface Segment {
  id: number | string;
  text: string;
  speakerName: string;
  voiceId?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  audioUrl?: string;
  timestampUrl?: string;
}

interface TimelineItem {
  speaker: string;
  audioFile: string;
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

const props = defineProps<{
  podcastId?: string;
  modelValue?: string; // Final audio URL
  disabled?: boolean;
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'update:outputFilename': [value: string];
  'download': [];
  'synthesize': [];
}>()

// State variables
const segments = ref<Segment[]>([])
const timelineData = ref<TimelineItem[]>([])
const timelineUrl = ref<string | null>(null)
const finalAudioUrl = ref<string | null>(null)
const localOutputFilename = ref('')
const isGeneratingTimeline = ref(false)
const isProcessingSegments = ref(false)
const isProcessingFinal = ref(false)
const segmentsLoading = ref(true)
const currentAudio = ref<HTMLAudioElement | null>(null)

// Podcast information
const podcastInfo = ref({
  title: '',
  hostName: '',
  guestNames: [] as string[],
  language: ''
})

// Initialize and watch
onMounted(async () => {
  // Add global event listener to intercept audio and JSON links
  const preventDefaultForAudioLinks = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const link = target.closest('a');
    
    if (link && link.href) {
      const href = link.href;
      console.log('Link clicked:', href);
      
      // Check if link points to audio files or podcast segments
      if (
        (href.includes('/podcasts/') || href.includes('/segments/')) &&
        (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg') || href.endsWith('.json'))
      ) {
        console.log('Intercepting audio/json link click:', href);
        event.preventDefault();
        event.stopPropagation();
        
        // If it's an audio file, play it instead of navigating
        if (href.endsWith('.mp3') || href.endsWith('.wav') || href.endsWith('.ogg')) {
          handlePlayFileWithoutRedirect(href);
        } else if (href.endsWith('.json')) {
          // For JSON files, open in a new tab instead of navigating the main page
          handleViewTimelineJSON(href);
        }
        return false;
      }
    }
    return true;
  };

  // Add global capture phase listener to catch all link clicks
  document.addEventListener('click', preventDefaultForAudioLinks, true);
  
  // Store reference to listener function for cleanup
  (window as any).__audioLinkInterceptor = preventDefaultForAudioLinks;
  
  if (props.podcastId) {
    updatePodcastInfo();
    await refreshSegmentsStatus();
    await checkTimelineStatus();
  }
  
  if (props.modelValue) {
    finalAudioUrl.value = props.modelValue;
  }
  
  localOutputFilename.value = playgroundStore.outputFilename || 'podcast_output.mp3';
})

// Clean up when component is unmounted
onUnmounted(() => {
  // Remove event listener
  if ((window as any).__audioLinkInterceptor) {
    document.removeEventListener('click', (window as any).__audioLinkInterceptor, true);
    delete (window as any).__audioLinkInterceptor;
  }
  
  // Stop any playing audio
  if (currentAudio.value) {
    currentAudio.value.pause();
    currentAudio.value = null;
  }
})

// Play audio without page refresh
function handlePlayFileWithoutRedirect(url?: string) {
  if (!url) return
  
  // Stop any currently playing audio
  if (currentAudio.value) {
    currentAudio.value.pause()
  }
  
  // Create a new audio element
  const audio = new Audio(url)
  currentAudio.value = audio
  
  // Play the audio
  audio.play().catch(error => {
    console.error('Error playing audio:', error)
    toast.error('Error playing audio', { description: error instanceof Error ? error.message : 'Unknown error' })
  })
}

// Handle JSON file view
function handleViewTimelineJSON(url: string) {
  // Open in new tab to avoid page navigation
  window.open(url, '_blank');
}

// Watch for podcastId changes
watch(() => props.podcastId, async (newId) => {
  if (newId) {
    updatePodcastInfo()
    await refreshSegmentsStatus()
    await checkTimelineStatus()
  }
})

watch(() => localOutputFilename.value, (newValue) => {
  emit('update:outputFilename', newValue)
})

watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    finalAudioUrl.value = newValue
  }
})

// Computed properties
const totalSegments = computed(() => segments.value.length)
const synthesizedCount = computed(() => segments.value.filter(s => s.status === 'success').length)
const isAllSegmentsSynthesized = computed(() => synthesizedCount.value === totalSegments.value && totalSegments.value > 0)
const hasFailedSegments = computed(() => segments.value.some(s => s.status === 'failed'))
const isTimelineGenerated = computed(() => timelineData.value.length > 0 && timelineUrl.value !== null)
const totalDuration = computed(() => {
  return timelineData.value.reduce((total, segment) => total + (segment.duration || 0), 0)
})

const canMergeFinalAudio = computed(() => {
  return isTimelineGenerated.value && synthesizedCount.value >= Math.floor(totalSegments.value * 0.9)
})

// Methods
function updatePodcastInfo() {
  if (!playgroundStore.podcastSettings) return
  
  podcastInfo.value = {
    title: playgroundStore.podcastSettings.title || '',
    hostName: playgroundStore.personas.find(p => p.persona_id === Number(playgroundStore.podcastSettings.hostPersonaId))?.name || '',
    guestNames: (playgroundStore.podcastSettings.guestPersonaIds || [])
      .map(id => playgroundStore.personas.find(p => p.persona_id === Number(id))?.name || '')
      .filter(name => name),
    language: playgroundStore.podcastSettings.language || 'English'
  }
}

// Format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Check timeline status
async function checkTimelineStatus() {
  try {
    const response = await fetch(`/api/podcast/status?podcastId=${props.podcastId}`)
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
    timelineUrl.value = null
    timelineData.value = []
  }
}

// Refresh segments status
async function refreshSegmentsStatus() {
  if (!props.podcastId) return
  
  segmentsLoading.value = true
  try {
    const response = await fetch(`/api/podcast/segments-status?podcastId=${props.podcastId}`)
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

// Generate timeline
async function generateTimeline() {
  if (!props.podcastId || isGeneratingTimeline.value) return
  
  isGeneratingTimeline.value = true
  try {
    const response = await fetch('/api/podcast/process/timeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ podcastId: props.podcastId })
    })
    
    const data = await response.json()
    
    if (data.success) {
      timelineUrl.value = data.timelineUrl
      timelineData.value = data.timelineData || []
      toast.success('Timeline generated successfully')
      await refreshSegmentsStatus() // Refresh segments status
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

// Synthesize all segments
async function handleSynthesizeAllSegments() {
  if (isProcessingSegments.value || !props.podcastId) return
  
  isProcessingSegments.value = true
  try {
    const response = await fetch('/api/podcast/process/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: props.podcastId,
        segmentIndices: 'all',
        synthesisParams: playgroundStore.synthesisParams
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      toast.success('Segment synthesis started', { description: 'Please refresh status to check progress' })
      // Wait a moment then refresh status
      setTimeout(() => refreshSegmentsStatus(), 2000)
    } else {
      toast.error('Failed to start synthesis', { description: data.message })
    }
  } catch (error) {
    console.error('Error synthesizing segments:', error)
    toast.error('Failed to start synthesis', { description: error instanceof Error ? error.message : 'Unknown error' })
  } finally {
    isProcessingSegments.value = false
  }
}

// Synthesize failed segments
async function handleSynthesizeFailedSegments() {
  if (isProcessingSegments.value || !props.podcastId) return
  
  const failedIndices = segments.value
    .map((segment, index) => segment.status === 'failed' ? index : -1)
    .filter(index => index !== -1)
  
  if (failedIndices.length === 0) {
    toast.info('No failed segments to retry')
    return
  }
  
  isProcessingSegments.value = true
  try {
    const response = await fetch('/api/podcast/process/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: props.podcastId,
        segmentIndices: failedIndices,
        synthesisParams: playgroundStore.synthesisParams
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      toast.success(`Started retrying ${failedIndices.length} failed segments`, { description: 'Please refresh status to check progress' })
      // Update local state
      failedIndices.forEach(index => {
        if (segments.value[index]) {
          segments.value[index].status = 'processing'
        }
      })
      // Wait a moment then refresh status
      setTimeout(() => refreshSegmentsStatus(), 2000)
    } else {
      toast.error('Failed to retry segments', { description: data.message })
    }
  } catch (error) {
    console.error('Error retrying failed segments:', error)
    toast.error('Failed to retry segments', { description: error instanceof Error ? error.message : 'Unknown error' })
  } finally {
    isProcessingSegments.value = false
  }
}

// Synthesize a single segment
async function handleSynthesizeSingleSegment(segment: Segment, index: number) {
  if (isProcessingSegments.value || !props.podcastId) return
  
  segments.value[index].status = 'processing'
  
  try {
    const response = await fetch('/api/podcast/process/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: props.podcastId,
        segmentIndices: [index],
        synthesisParams: playgroundStore.synthesisParams
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      toast.success('Segment synthesis started', { description: 'Please refresh status to check progress' })
      // Wait a moment then refresh status
      setTimeout(() => refreshSegmentsStatus(), 2000)
    } else {
      segments.value[index].status = 'failed'
      toast.error('Failed to synthesize segment', { description: data.message })
    }
  } catch (error) {
    console.error('Error synthesizing segment:', error)
    segments.value[index].status = 'failed'
    toast.error('Failed to synthesize segment', { description: error instanceof Error ? error.message : 'Unknown error' })
  }
}

// Merge final audio
async function handleMergeAudio() {
  if (!props.podcastId || !canMergeFinalAudio.value || isProcessingFinal.value) return
  
  isProcessingFinal.value = true
  finalAudioUrl.value = null
  
  try {
    console.log('Starting merge request for podcastId:', props.podcastId)
    
    // Create AbortController to handle timeouts
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout
    
    const response = await fetch('/api/podcast/process/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        podcastId: props.podcastId,
        outputFilename: localOutputFilename.value
      }),
      signal: controller.signal,
      // Ensure fetch doesn't follow redirects
      redirect: 'manual'
    })
    
    // Clear timeout
    clearTimeout(timeoutId)
    
    console.log('Merge API response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`)
    }
    
    // Safely parse JSON response
    let data
    try {
      const text = await response.text()
      console.log('Raw response text length:', text.length)
      data = JSON.parse(text)
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError)
      throw new Error('Invalid response format from server')
    }
    
    console.log('Parsed response data:', data)
    
    if (data.success) {
      console.log('Merge successful, final URL:', data.finalPodcastUrl)
      finalAudioUrl.value = data.finalPodcastUrl
      emit('update:modelValue', data.finalPodcastUrl)
      toast.success('Podcast audio synthesized successfully')
    } else {
      console.error('Merge API returned success:false:', data.message)
      toast.error('Failed to synthesize podcast audio', { description: data.message })
    }
  } catch (error) {
    console.error('Error merging audio:', error)
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      toast.error('Request timeout', { description: 'The merge operation took too long and was aborted' })
    } else {
      toast.error('Failed to synthesize podcast audio', { description: error instanceof Error ? error.message : 'Unknown error' })
    }
  } finally {
    isProcessingFinal.value = false
  }
}

// Preload and test if the APIs are available
onMounted(async () => {
  try {
    const statusEndpoint = '/api/podcast/status?check=true'
    const response = await fetch(statusEndpoint)
    if (!response.ok) {
      console.warn('Podcast status API may not be available:', response.status)
    }
  } catch (error) {
    console.warn('Failed to precheck podcast API:', error)
  }
})
</script>

<style scoped>
.audio-link {
  text-decoration: none;
}
</style> 