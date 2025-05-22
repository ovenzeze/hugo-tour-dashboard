// stores/playgroundSettingsStore.ts
import { defineStore } from 'pinia';
import type { FullPodcastSettings } from '~/types/playground';
import type { SynthesisParams as ApiSynthesisParams } from '~/types/api/podcast';

const DEFAULT_SYNTHESIS_PARAMS: ApiSynthesisParams = {
  temperature: 0.7,
  speed: 1.0,
  stability: 0.5,
  similarity_boost: 0.75,
  pitch: 0,
  volume: 1.0,
};

export const usePlaygroundSettingsStore = defineStore('playgroundSettings', {
  state: () => ({
    podcastSettings: {
      title: '',
      topic: '',
      numberOfSegments: 3,
      style: '',
      keywords: [],
      hostPersonaId: undefined as number | string | undefined, // Allow string for initial input flexibility
      guestPersonaIds: [] as (number | string)[], // Allow string for initial input flexibility
      backgroundMusic: undefined as string | undefined,
      ttsProvider: 'elevenlabs' as 'elevenlabs' | 'volcengine',
    } as FullPodcastSettings,
    
    synthesisParams: { ...DEFAULT_SYNTHESIS_PARAMS } as ApiSynthesisParams,
    error: null as string | null,
  }),
  
  actions: {
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      // Ensure IDs are correctly parsed if they come as strings from UI components
      const parsedSettings = { ...settings };

      if (typeof settings.hostPersonaId === 'string') {
        const parsedId = parseInt(settings.hostPersonaId, 10);
        parsedSettings.hostPersonaId = isNaN(parsedId) ? undefined : parsedId;
      } else if (settings.hostPersonaId === null) { // Handle explicit null to undefined
         parsedSettings.hostPersonaId = undefined;
      }


      if (settings.guestPersonaIds) {
        parsedSettings.guestPersonaIds = settings.guestPersonaIds
          .map(id => {
            if (typeof id === 'string') {
              const parsedId = parseInt(id, 10);
              return isNaN(parsedId) ? undefined : parsedId;
            }
            return id;
          })
          .filter(id => typeof id === 'number') as number[];
      }

      this.podcastSettings = {
        ...this.podcastSettings,
        ...parsedSettings,
      };
      // Clear error if settings are updated
      this.error = null; 
    },

    updateSynthesisParams(params: Partial<ApiSynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params,
      };
    },

    selectHostPersona(personaId: number | string | undefined) {
      let finalId: number | undefined = undefined;
      if (typeof personaId === 'string') {
        const parsed = parseInt(personaId, 10);
        if (!isNaN(parsed)) finalId = parsed;
      } else if (typeof personaId === 'number') {
        finalId = personaId;
      }
      this.updatePodcastSettings({ hostPersonaId: finalId });
    },

    addGuestPersona(personaId: number | string) {
      let finalId: number | undefined = undefined;
      if (typeof personaId === 'string') {
        const parsed = parseInt(personaId, 10);
        if (!isNaN(parsed)) finalId = parsed;
      } else {
        finalId = personaId;
      }

      if (finalId !== undefined) {
        const currentGuests = Array.isArray(this.podcastSettings.guestPersonaIds) ? [...this.podcastSettings.guestPersonaIds] : [];
        if (!currentGuests.includes(finalId)) {
          this.updatePodcastSettings({ guestPersonaIds: [...currentGuests, finalId] });
        }
      }
    },

    removeGuestPersona(personaIdToRemove: number | string) {
      let idToRemoveNumeric: number | undefined = undefined;
      if (typeof personaIdToRemove === 'string') {
        const parsed = parseInt(personaIdToRemove, 10);
        if (!isNaN(parsed)) idToRemoveNumeric = parsed;
      } else {
        idToRemoveNumeric = personaIdToRemove;
      }

      if (idToRemoveNumeric !== undefined && Array.isArray(this.podcastSettings.guestPersonaIds)) {
        this.updatePodcastSettings({
          guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => id !== idToRemoveNumeric),
        });
      }
    },
    
    // Getter-like function to get hostPersonaId as number or undefined
    getHostPersonaIdNumeric(): number | undefined {
        const hostIdRaw = this.podcastSettings.hostPersonaId;
        if (typeof hostIdRaw === 'string') {
            const parsed = parseInt(hostIdRaw, 10);
            return isNaN(parsed) ? undefined : parsed;
        }
        return hostIdRaw; // Already number or undefined
    },

    // Getter-like function to get guestPersonaIds as number[]
    getGuestPersonaIdsNumeric(): number[] {
        return (this.podcastSettings.guestPersonaIds || [])
            .map(id => {
                if (typeof id === 'string') {
                    const parsed = parseInt(id, 10);
                    return isNaN(parsed) ? undefined : parsed;
                }
                return id;
            })
            .filter(id => typeof id === 'number') as number[];
    }
  },
});