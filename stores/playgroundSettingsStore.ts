// stores/playgroundSettingsStore.ts
import { defineStore } from 'pinia';
import { usePersonaCache } from '~/composables/usePersonaCache'; // Added import
import type { FullPodcastSettings, SynthesisParams } from '~/types/playground'; // Assuming types are defined here

// Default empty array for guestPersonaIds
const defaultGuestPersonaIds: (string | number)[] = [];

export const usePlaygroundSettingsStore = defineStore('playgroundSettings', {
  state: () => ({
    podcastSettings: {
      title: 'Untitled Podcast',
      topic: '',
      numberOfSegments: 0, // Added default
      style: 'discussion', // Default style
      keywords: [],
      hostPersonaId: undefined, // Added default, consistent with type
      guestPersonaIds: [], // Added default, consistent with type
      ttsProvider: 'elevenlabs', // Default TTS provider
      // backgroundMusic, elevenLabsProjectId, language, useTimestamps can be undefined initially
    } as FullPodcastSettings,
    hostPersonaId: null as string | number | null, // This is the primary source for hostPersonaId
    guestPersonaIds: [...defaultGuestPersonaIds] as (string | number)[], // Primary source for guest IDs
    synthesisParams: {
      temperature: 1.0, // Added default
      speed: 1.0,       // Added default
    } as SynthesisParams,
    error: null as string | null, // For any settings-related errors
  }),

  getters: {
    getHostPersonaIdNumeric(state): number | undefined {
      if (state.hostPersonaId !== null && state.hostPersonaId !== undefined) {
        const numericId = Number(state.hostPersonaId);
        if (!isNaN(numericId)) {
          return numericId;
        }
        // console.warn(`[getHostPersonaIdNumeric] Host Persona ID "${state.hostPersonaId}" is not a valid number, attempting random selection.`);
        // It's better to handle error setting via an action if this store needs to reflect this error state.
        // For now, this getter's purpose is to return an ID or undefined.
      }

      // Attempt to randomly select a host persona if not set or invalid
      const { personas } = usePersonaCache(); // Ensure personas are loaded, ideally this is done elsewhere proactively
      const availablePersonas = personas.value;

      if (availablePersonas && availablePersonas.length > 0) {
        const randomIndex = Math.floor(Math.random() * availablePersonas.length);
        const randomPersona = availablePersonas[randomIndex];
        if (randomPersona && randomPersona.persona_id !== undefined) {
          // console.log(`[getHostPersonaIdNumeric] No host persona selected or ID invalid, randomly assigning ID: ${randomPersona.persona_id}`);
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
    setTtsProvider(provider: 'elevenlabs' | 'volcengine' | undefined) {
      this.podcastSettings.ttsProvider = provider;
    },
    setHostPersonaId(id: string | number | null) {
      this.hostPersonaId = id;
      this.error = null; // Clear error when ID is set/updated
    },
    addGuestPersonaId(id: string | number) {
      if (!this.guestPersonaIds.includes(id)) {
        this.guestPersonaIds.push(id);
      }
    },
    removeGuestPersonaId(id: string | number) {
      this.guestPersonaIds = this.guestPersonaIds.filter(guestId => guestId !== id);
    },
    setGuestPersonaIds(ids: (string | number)[]) {
      this.guestPersonaIds = [...ids];
    },
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      this.podcastSettings = { ...this.podcastSettings, ...settings };
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
    //   this.hostPersonaId = null;
    //   this.guestPersonaIds = [...defaultGuestPersonaIds];
    //   this.synthesisParams = {};
    //   this.error = null;
    // }
  },
});