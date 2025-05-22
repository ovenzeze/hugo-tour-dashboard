// composables/podcast/usePodcastInfo.ts
import { ref, watch, computed, type Ref } from 'vue';
import { storeToRefs } from 'pinia';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUIStore } from '~/stores/playgroundUIStore'; // To get available personas
import type { Persona } from '~/types/persona';

interface PodcastInfo {
  title: string;
  hostName: string;
  guestNames: string[];
  language: string;
}

export function usePodcastInfo(podcastId: Ref<string | undefined>) { // podcastId is passed from the component, derived from processStore
  const settingsStore = usePlaygroundSettingsStore();
  const uiStore = usePlaygroundUIStore();

  const { podcastSettings } = storeToRefs(settingsStore);
  // Use availableVoices from uiStore, which should be populated by usePersonaCache
  const { availableVoices } = storeToRefs(uiStore);

  const podcastInfo = ref<PodcastInfo>({
    title: '',
    hostName: '',
    guestNames: [],
    language: '',
  });

  const updatePodcastInfo = () => {
    // podcastId.value is the reactive reference passed in
    if (!podcastSettings.value || !podcastId.value) {
      podcastInfo.value = { title: '', hostName: '', guestNames: [], language: '' };
      return;
    }

    const numericHostId = Number(podcastSettings.value.hostPersonaId);
    const hostPersona = availableVoices.value.find(p => p.persona_id === numericHostId);
    
    const guestPersonas = (podcastSettings.value.guestPersonaIds || [])
      .map(id => {
        const numericId = Number(id);
        return availableVoices.value.find(p => p.persona_id === numericId);
      })
      .filter(p => !!p) as Persona[]; // Ensure only valid personas are processed

    podcastInfo.value = {
      title: podcastSettings.value.title || '',
      hostName: hostPersona?.name || 'N/A',
      guestNames: guestPersonas.map(p => p.name).filter(name => !!name),
      language: podcastSettings.value.language || 'English',
    };
  };

  // Watch relevant store states
  watch(podcastId, updatePodcastInfo, { immediate: true });
  watch(podcastSettings, updatePodcastInfo, { deep: true, immediate: true });
  watch(availableVoices, updatePodcastInfo, { deep: true, immediate: true });

  return {
    podcastInfo,
    // updatePodcastInfo // Not typically needed to be called externally as it's reactive
  };
}