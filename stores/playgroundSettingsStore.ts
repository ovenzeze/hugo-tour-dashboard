// stores/playgroundSettingsStore.ts
import { defineStore } from 'pinia';
import { usePersonaCache } from '~/composables/usePersonaCache'; // Added import
import type { FullPodcastSettings, SynthesisParams } from '~/types/playground'; // Assuming types are defined here
import type { Persona } from '~/types/persona'; // Import Persona type

// Default empty array for guestPersonaIds
const defaultGuestPersonaIds: number[] = [];

export const usePlaygroundSettingsStore = defineStore('playgroundSettings', {
  state: () => ({
    podcastSettings: {
      title: '',
      topic: '',
      numberOfSegments: 10, // 默认段落数量为10
      style: 'discussion', // Default style
      keywords: [],
      hostPersonaId: undefined as number | undefined, // Changed type to number | undefined
      guestPersonaIds: [] as number[], // Changed type to number[]
      ttsProvider: 'elevenlabs', // Default TTS provider
      language: 'en-US', // 默认语言为English
      // backgroundMusic, elevenLabsProjectId, useTimestamps can be undefined initially
    } as FullPodcastSettings,
    hostPersonaId: undefined as number | undefined, // Changed type to number | undefined
    guestPersonaIds: [...defaultGuestPersonaIds] as number[], // Changed type to number[]
    synthesisParams: {
      temperature: 1.0, // Added default
      speed: 1.0,       // Added default
    } as SynthesisParams,
    error: null as string | null, // For any settings-related errors
  }),

  getters: {
    getHostPersonaIdNumeric(state): number | undefined {
      // If hostPersonaId is already set, return it
      if (state.hostPersonaId !== undefined) {
        return state.hostPersonaId;
      }

      // 🔧 改进：使用语言过滤的随机选择
      const { getRandomPersonaByLanguage, personas } = usePersonaCache();
      const language = state.podcastSettings.language;

      // 1. 优先根据语言过滤
      if (language) {
        const randomPersona = getRandomPersonaByLanguage(language);
        if (randomPersona) {
          console.log(`[getHostPersonaIdNumeric] Randomly selected persona for language ${language}:`, randomPersona.name);
          const numericRandomId = Number(randomPersona.persona_id);
          if (!isNaN(numericRandomId)) {
            return numericRandomId;
          }
        }
      }

      // 2. 如果没有指定语言或没有匹配的personas，回退到所有personas
      const availablePersonas = personas.value;
      if (availablePersonas && availablePersonas.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePersonas.length);
        const randomPersona = availablePersonas[randomIndex];
        if (randomPersona && randomPersona.persona_id !== undefined) {
          console.log(`[getHostPersonaIdNumeric] No language match, randomly assigning any persona:`, randomPersona.name);
          const numericRandomId = Number(randomPersona.persona_id);
          if (!isNaN(numericRandomId)) {
            return numericRandomId;
          }
        }
      }
      
      // console.warn('[getHostPersonaIdNumeric] Host Persona ID is not set and no personas available for random assignment or random selection failed.');
      // this.setError('Host Persona ID is not set and no fallback available.'); // Use action
      return undefined; // Fallback if no ID is set and random assignment isn't possible
    },
    getGuestPersonaIdsNumeric(state): number[] {
      return state.guestPersonaIds
        .map(id => Number(id))
        .filter(id => !isNaN(id));
    },
    // Getter to provide the whole podcastSettings object, useful for components
    // that need multiple settings.
    currentPodcastSettings(state): FullPodcastSettings {
      return state.podcastSettings;
    },
    currentSynthesisParams(state): SynthesisParams {
      return state.synthesisParams;
    }
  },

  actions: {
    setPodcastTitle(title: string) {
      this.podcastSettings.title = title;
    },
    setPodcastTopic(topic: string) {
      this.podcastSettings.topic = topic;
    },
    setPodcastDescription(description: string) {
      // 暂时存储在topic字段中，或者需要扩展PodcastSettings类型
      this.podcastSettings.topic = description;
    },
    setPodcastLanguage(language: string) {
      this.podcastSettings.language = language;
    },
    setTtsProvider(provider: 'elevenlabs' | 'volcengine' | undefined) {
      this.podcastSettings.ttsProvider = provider;
    },
    setHostPersonaId(id: number | undefined) {
      this.hostPersonaId = id;
      this.podcastSettings.hostPersonaId = id;
      this.error = null; // Clear error when ID is set/updated
    },
    setHostPersona(id: number | undefined) {
      this.setHostPersonaId(id);
    },
    addGuestPersonaId(id: number) {
      if (!this.guestPersonaIds.includes(id)) {
        this.guestPersonaIds.push(id);
        this.podcastSettings.guestPersonaIds = [...this.guestPersonaIds];
      }
    },
    removeGuestPersonaId(id: number) {
      this.guestPersonaIds = this.guestPersonaIds.filter(guestId => guestId !== id);
      this.podcastSettings.guestPersonaIds = [...this.guestPersonaIds];
    },
    setGuestPersonaIds(ids: number[]) {
      this.guestPersonaIds = [...ids];
      this.podcastSettings.guestPersonaIds = [...ids];
    },
    setGuestPersonas(ids: number[]) {
      this.setGuestPersonaIds(ids);
    },
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      console.log(`[playgroundSettingsStore] updatePodcastSettings called with:`, settings);
      console.log(`[playgroundSettingsStore] Before update - hostPersonaId:`, this.podcastSettings.hostPersonaId, 'guestPersonaIds:', this.podcastSettings.guestPersonaIds);
      
      this.podcastSettings = { ...this.podcastSettings, ...settings };
      
      // 🔧 修复：同步更新独立状态
      if (settings.hostPersonaId !== undefined) {
        this.hostPersonaId = settings.hostPersonaId;
        console.log(`[playgroundSettingsStore] Updated hostPersonaId to:`, this.hostPersonaId);
      }
      if (settings.guestPersonaIds !== undefined) {
        this.guestPersonaIds = [...settings.guestPersonaIds];
        console.log(`[playgroundSettingsStore] Updated guestPersonaIds to:`, this.guestPersonaIds);
      }
      
      console.log(`[playgroundSettingsStore] After update - hostPersonaId:`, this.podcastSettings.hostPersonaId, 'guestPersonaIds:', this.podcastSettings.guestPersonaIds);
    },
    updateSynthesisParams(params: Partial<SynthesisParams>) {
      this.synthesisParams = { ...this.synthesisParams, ...params };
    },
    setError(errorMessage: string | null) {
      this.error = errorMessage;
    },
    // Pinia's $reset will use the initial state function.
    // If more complex reset logic is needed, define a specific reset action.
    // For example:
    // resetSettingsState() {
    //   this.podcastSettings = { title: 'Untitled Podcast', ttsProvider: 'elevenlabs', topic: '', keywords: [], style: 'discussion' };
    //   this.hostPersonaId = undefined;
    //   this.guestPersonaIds = [...defaultGuestPersonaIds];
    //   this.synthesisParams = {};
    //   this.error = null;
    // }
  },
});