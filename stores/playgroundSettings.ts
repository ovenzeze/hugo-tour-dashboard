"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// Assuming Persona might be needed for type consistency in some settings,
// though direct persona management is in playgroundPersona.ts
// If not directly needed, this import can be removed.
// import type { Persona } from "./playgroundPersona"; // Or from a global types file

// Copied from playground.ts
export interface FullPodcastSettings {
  title: string;
  topic: string;
  numberOfSegments: number;
  style: string;
  keywords: string;
  hostPersonaId: number | string | undefined; // Allow string for initial prop, store as number
  guestPersonaIds: (number | string | undefined)[]; // Allow string for initial prop, store as number
  backgroundMusic: string | undefined;
  elevenLabsProjectId: string | undefined;
  language: string | undefined;
  museumId: number | undefined;
  galleryId: number | undefined;
  objectId: number | undefined;
}

// Copied from playground.ts
export const defaultPodcastSettings: FullPodcastSettings = {
  title: "",
  topic: "",
  numberOfSegments: 3,
  style: "",
  keywords: "",
  hostPersonaId: undefined,
  guestPersonaIds: [],
  backgroundMusic: undefined,
  elevenLabsProjectId: undefined,
  language: undefined,
  museumId: undefined,
  galleryId: undefined,
  objectId: undefined,
};

export interface PlaygroundSettingsState {
  podcastSettings: FullPodcastSettings;
  createPodcast: boolean; // true for AI script generation, false for manual/validated script
  selectedProvider: string | undefined; // e.g., 'elevenlabs', 'openrouter'
  aiModel: string | undefined; // e.g., 'mistralai/mistral-7b-instruct' for openrouter
}

export const usePlaygroundSettingsStore = defineStore("playgroundSettings", {
  state: (): PlaygroundSettingsState => {
    const config = useRuntimeConfig();
    const initialProvider = "elevenlabs"; // Keeping default as elevenlabs as per original state
    let initialAiModel: string | undefined = undefined;

    if (initialProvider === 'openrouter') {
      initialAiModel = config.public.openrouterDefaultModel as string | undefined;
    } else if (initialProvider === 'groq') {
      initialAiModel = config.public.groqDefaultModel as string | undefined;
    }
    // else if (initialProvider === 'elevenlabs') { /* set default elevenlabs model if any */ }

    return {
      podcastSettings: { ...defaultPodcastSettings },
      createPodcast: true, 
      selectedProvider: initialProvider,
      aiModel: initialAiModel,
    };
  },
  actions: {
    updateSelectedProvider(providerId: string | undefined) {
      const config = useRuntimeConfig();
      this.selectedProvider = providerId;
      if (providerId === 'openrouter') {
        this.aiModel = config.public.openrouterDefaultModel as string | undefined;
      } else if (providerId === 'groq') {
        this.aiModel = config.public.groqDefaultModel as string | undefined;
      } else {
        this.aiModel = undefined;
      }
    },

    updateAiModel(modelId: string | undefined) { // New action to update AI model
      this.aiModel = modelId;
    },

    updateElevenLabsProjectId(projectId: string | undefined) {
      this.podcastSettings.elevenLabsProjectId = projectId;
    },

    // Helper function from original store, slightly adapted
    _parsePersonaId(id: string | number | undefined): number | undefined {
      if (id === undefined || id === null || id === "") return undefined;
      const numId = Number(id);
      return isNaN(numId) ? undefined : numId;
    },

    updateFullPodcastSettings(settings: Partial<FullPodcastSettings>) {
      const processedSettings = { ...settings };

      if (settings.hostPersonaId !== undefined) {
        processedSettings.hostPersonaId = this._parsePersonaId(settings.hostPersonaId);
      }

      if (settings.guestPersonaIds !== undefined) {
        const guestIds = Array.isArray(settings.guestPersonaIds)
          ? settings.guestPersonaIds
          : [];
        const parsedIds = guestIds
          .map(id => this._parsePersonaId(id))
          .filter(id => id !== undefined) as number[];
        processedSettings.guestPersonaIds = parsedIds;
      }

      this.podcastSettings = { ...this.podcastSettings, ...processedSettings };

      // Ensure guestPersonaIds is an array after update
      if (!Array.isArray(this.podcastSettings.guestPersonaIds)) {
        this.podcastSettings.guestPersonaIds = [];
      }
    },

    setCreatePodcastMode(isCreatingWithAI: boolean) {
      this.createPodcast = isCreatingWithAI;
      // Optionally, reset parts of podcastSettings if mode changes significantly
      // For now, just toggling the mode. Consider if title/topic etc. should clear.
      if (isCreatingWithAI) {
        // Reset fields that are typically AI-generated or less relevant for manual
        this.podcastSettings.topic = defaultPodcastSettings.topic;
        this.podcastSettings.keywords = defaultPodcastSettings.keywords;
        this.podcastSettings.style = defaultPodcastSettings.style;
        // Keep title, host/guest, language as they might be pre-filled
      }
      toast.info(`Switched to ${isCreatingWithAI ? 'AI Script Generation' : 'Manual Script Mode'}.`);
    },

    resetPodcastSettings() {
      this.podcastSettings = { ...defaultPodcastSettings };
      this.createPodcast = true; // Default back to AI mode
      this.selectedProvider = "elevenlabs";
      this.aiModel = undefined; // Reset AI model
      // toast.info("Podcast settings have been reset."); // Consider if toast is needed here or in a more global reset
    },

    // New action to specifically update museum context
    updateMuseumContext(context: { museumId?: number; galleryId?: number; objectId?: number }) {
        this.podcastSettings.museumId = context.museumId ?? this.podcastSettings.museumId;
        this.podcastSettings.galleryId = context.galleryId ?? this.podcastSettings.galleryId;
        this.podcastSettings.objectId = context.objectId ?? this.podcastSettings.objectId;
    }
  },
  getters: {
    // Getter to check if essential settings for AI script generation are present
    // This is a simplified check, actual prompt might handle missing fields.
    canGenerateAIScript(state: PlaygroundSettingsState): boolean {
      return !!(
        state.podcastSettings.title &&
        state.podcastSettings.hostPersonaId &&
        state.podcastSettings.guestPersonaIds.length > 0 &&
        state.podcastSettings.language // Added language check
      );
    },
    // Getter for current host persona ID (as number)
    currentHostPersonaId(state: PlaygroundSettingsState): number | undefined {
        return typeof state.podcastSettings.hostPersonaId === 'string'
            ? parseInt(state.podcastSettings.hostPersonaId, 10)
            : state.podcastSettings.hostPersonaId;
    },
    // Getter for current guest persona IDs (as numbers)
    currentGuestPersonaIds(state: PlaygroundSettingsState): number[] {
        return state.podcastSettings.guestPersonaIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => id !== undefined) as number[];
    }
  }
});