import { ref, computed } from 'vue'

interface AudioSample {
  audio_url: string
  segment_text: string
  created_at: string
  podcast_title?: string
  duration_ms?: number
}

interface AudioSamplesResponse {
  success: boolean
  persona_id: number
  persona_name: string
  samples: AudioSample[]
  message: string
}

export function usePersonaAudioPreview() {
  const audioSamples = ref<Record<number, AudioSample[]>>({})
  const loadingStates = ref<Record<number, boolean>>({})
  const currentlyPlaying = ref<{
    personaId: number
    sampleIndex: number
    audio: HTMLAudioElement
  } | null>(null)

  // Check if a persona has any audio samples available
  const hasAudioSamples = (personaId: number): boolean => {
    return (audioSamples.value[personaId]?.length || 0) > 0
  }

  // Get the first (most recent) audio sample for a persona
  const getPreviewSample = (personaId: number): AudioSample | null => {
    const samples = audioSamples.value[personaId]
    return samples && samples.length > 0 ? samples[0] : null
  }

  // Check if audio is currently loading for a persona
  const isLoading = (personaId: number): boolean => {
    return loadingStates.value[personaId] || false
  }

  // Check if audio is currently playing for a persona
  const isPlaying = (personaId: number, sampleIndex: number = 0): boolean => {
    return currentlyPlaying.value?.personaId === personaId && 
           currentlyPlaying.value?.sampleIndex === sampleIndex
  }

  // Fetch audio samples for a persona
  const fetchAudioSamples = async (personaId: number): Promise<AudioSample[]> => {
    // Return cached data if available
    if (audioSamples.value[personaId]) {
      return audioSamples.value[personaId]
    }

    loadingStates.value[personaId] = true

    try {
      const response = await $fetch<AudioSamplesResponse>(`/api/personas/${personaId}/audio-samples`)
      
      if (response.success) {
        audioSamples.value[personaId] = response.samples
        return response.samples
      } else {
        throw new Error(response.message || 'Failed to fetch audio samples')
      }
    } catch (error) {
      console.error(`Failed to fetch audio samples for persona ${personaId}:`, error)
      audioSamples.value[personaId] = []
      return []
    } finally {
      loadingStates.value[personaId] = false
    }
  }

  // Play an audio sample
  const playAudioSample = async (personaId: number, sampleIndex: number = 0): Promise<void> => {
    // Stop any currently playing audio
    stopCurrentAudio()

    const samples = audioSamples.value[personaId] || await fetchAudioSamples(personaId)
    
    if (!samples || samples.length === 0) {
      throw new Error('No audio samples available for this persona')
    }

    const sample = samples[sampleIndex]
    if (!sample || !sample.audio_url) {
      throw new Error('Invalid audio sample')
    }

    return new Promise((resolve, reject) => {
      const audio = new Audio(sample.audio_url)
      
      audio.addEventListener('loadstart', () => {
        currentlyPlaying.value = { personaId, sampleIndex, audio }
      })

      audio.addEventListener('ended', () => {
        currentlyPlaying.value = null
        resolve()
      })

      audio.addEventListener('error', (e) => {
        currentlyPlaying.value = null
        reject(new Error('Failed to play audio sample'))
      })

      // Stop after 10 seconds max for preview
      const maxDuration = 10000
      const timeoutId = setTimeout(() => {
        audio.pause()
        audio.currentTime = 0
        currentlyPlaying.value = null
        resolve()
      }, maxDuration)

      audio.addEventListener('ended', () => {
        clearTimeout(timeoutId)
      })

      audio.addEventListener('error', () => {
        clearTimeout(timeoutId)
      })

      try {
        audio.play()
      } catch (error) {
        clearTimeout(timeoutId)
        currentlyPlaying.value = null
        reject(error)
      }
    })
  }

  // Stop currently playing audio
  const stopCurrentAudio = (): void => {
    if (currentlyPlaying.value) {
      currentlyPlaying.value.audio.pause()
      currentlyPlaying.value.audio.currentTime = 0
      currentlyPlaying.value = null
    }
  }

  // Toggle audio playback for a persona
  const toggleAudioPlayback = async (personaId: number, sampleIndex: number = 0): Promise<void> => {
    if (isPlaying(personaId, sampleIndex)) {
      stopCurrentAudio()
    } else {
      await playAudioSample(personaId, sampleIndex)
    }
  }

  // Preload audio samples for multiple personas
  const preloadAudioSamples = async (personaIds: number[]): Promise<void> => {
    const promises = personaIds.map(id => {
      if (!audioSamples.value[id]) {
        return fetchAudioSamples(id)
      }
      return Promise.resolve(audioSamples.value[id])
    })

    await Promise.allSettled(promises)
  }

  // Clear cached data for a persona
  const clearPersonaCache = (personaId: number): void => {
    delete audioSamples.value[personaId]
    delete loadingStates.value[personaId]
    
    if (currentlyPlaying.value?.personaId === personaId) {
      stopCurrentAudio()
    }
  }

  // Clear all cached data
  const clearAllCache = (): void => {
    stopCurrentAudio()
    audioSamples.value = {}
    loadingStates.value = {}
  }

  return {
    // State
    audioSamples: computed(() => audioSamples.value),
    currentlyPlaying: computed(() => currentlyPlaying.value),
    
    // Methods
    hasAudioSamples,
    getPreviewSample,
    isLoading,
    isPlaying,
    fetchAudioSamples,
    playAudioSample,
    stopCurrentAudio,
    toggleAudioPlayback,
    preloadAudioSamples,
    clearPersonaCache,
    clearAllCache
  }
} 