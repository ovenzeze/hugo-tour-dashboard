// composables/podcast/usePodcastInfo.ts
import { ref, watch, type Ref } from 'vue'
import { usePlaygroundStore } from '~/stores/playground'

interface PodcastInfo {
  title: string;
  hostName: string;
  guestNames: string[];
  language: string;
}

export function usePodcastInfo(podcastId: Ref<string | undefined>) {
  const playgroundStore = usePlaygroundStore()
  const podcastInfo = ref<PodcastInfo>({
    title: '',
    hostName: '',
    guestNames: [],
    language: ''
  })

  const updatePodcastInfo = () => {
    if (!playgroundStore.podcastSettings || !podcastId.value) {
      podcastInfo.value = { title: '', hostName: '', guestNames: [], language: '' }
      return
    }

    const hostPersona = playgroundStore.personas.find(p => p.persona_id === Number(playgroundStore.podcastSettings.hostPersonaId))
    const guestPersonas = (playgroundStore.podcastSettings.guestPersonaIds || [])
      .map(id => playgroundStore.personas.find(p => p.persona_id === Number(id)))
      .filter(p => p) as { name: string }[] // Type assertion after filter

    podcastInfo.value = {
      title: playgroundStore.podcastSettings.title || '',
      hostName: hostPersona?.name || '',
      guestNames: guestPersonas.map(p => p.name).filter(name => name),
      language: playgroundStore.podcastSettings.language || 'English'
    }
  }

  watch(() => podcastId.value, () => {
    updatePodcastInfo()
  }, { immediate: true })

  watch(() => playgroundStore.podcastSettings, () => {
    updatePodcastInfo()
  }, { deep: true })
  
  watch(() => playgroundStore.personas, () => {
    updatePodcastInfo()
  }, { deep: true })

  return {
    podcastInfo,
    updatePodcastInfo // Exposing this though it's mainly called internally by watches
  }
}