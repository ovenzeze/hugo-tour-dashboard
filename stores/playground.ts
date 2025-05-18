"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// Import the new stores
import { usePlaygroundPersonaStore } from "./playgroundPersona";
import { usePlaygroundSettingsStore } from "./playgroundSettings";
import { usePlaygroundScriptStore } from "./playgroundScript";
import { usePlaygroundAudioStore } from "./playgroundAudio";

// The main playground store is now significantly leaner.
// It might act as a coordinator or hold truly global state
// not fitting into the more specific stores.
// For this refactoring, we'll aim to make it minimal.

export interface PlaygroundState {
  // Example: a global loading flag if needed for combined operations
  // isLoadingGlobally: boolean;
  // Most state has been moved to specialized stores.
  // This can be empty if no global state remains.
}

export const usePlaygroundStore = defineStore("playground", {
  state: (): PlaygroundState => {
    return {
      // isLoadingGlobally: false,
    };
  },

  getters: {
    // Getters that combine data from multiple stores can live here,
    // or in components/composables that use multiple stores.
    // For example:
    // combinedStatus(state) {
    //   const personaStore = usePlaygroundPersonaStore();
    //   const scriptStore = usePlaygroundScriptStore();
    //   return `Personas loaded: ${!personaStore.personasLoading}, Script valid: ${scriptStore.isScriptValid}`;
    // }
  },

  actions: {
    // This action now calls the reset actions of the individual stores.
    resetAllPlaygroundState() {
      const personaStore = usePlaygroundPersonaStore();
      const settingsStore = usePlaygroundSettingsStore();
      const scriptStore = usePlaygroundScriptStore();
      const audioStore = usePlaygroundAudioStore();

      personaStore.personas = []; // Explicitly reset, or call a resetPersonaState action if created
      personaStore.personasLoading = false;
      personaStore.selectedPersonaIdForHighlighting = null;
      
      settingsStore.resetPodcastSettings();
      scriptStore.resetScriptState();
      audioStore.resetAudioState();
      audioStore.setPodcastId(null); // Explicitly reset podcastId

      toast.info("Playground has been reset.", {
        description: "All personas, settings, script, and audio data have been cleared.",
      });

      // localStorage interaction might need to be re-evaluated.
      // If each store handles its own persistence, this global one might not be needed.
      // Or, it could orchestrate saving/loading for all.
      if (process.client) {
        localStorage.removeItem("playgroundState"); // Old key, might need new keys per store
        // localStorage.removeItem("playgroundPersonaState");
        // localStorage.removeItem("playgroundSettingsState");
        // localStorage.removeItem("playgroundScriptState");
        // localStorage.removeItem("playgroundAudioState");
      }
    },

    // The old `saveStateToLocalStorage` would need to be re-thought.
    // Each store could handle its own persistence, or this store could
    // orchestrate saving the state of all other playground-related stores.
    // For now, this is commented out as it requires a more detailed persistence strategy.
    /*
    saveAllStateToLocalStorage() {
      if (process.client) {
        const personaStore = usePlaygroundPersonaStore();
        const settingsStore = usePlaygroundSettingsStore();
        const scriptStore = usePlaygroundScriptStore();
        const audioStore = usePlaygroundAudioStore();

        localStorage.setItem("playgroundPersonaState", JSON.stringify(personaStore.$state));
        localStorage.setItem("playgroundSettingsState", JSON.stringify(settingsStore.$state));
        localStorage.setItem("playgroundScriptState", JSON.stringify(scriptStore.$state));
        localStorage.setItem("playgroundAudioState", JSON.stringify(audioStore.$state));
        toast.info("Playground state saved to local storage.");
      }
    },
    */

    // Example of an action that might coordinate across stores:
    // async initializeNewPodcastWorkflow(initialSettings: Partial<FullPodcastSettings>) {
    //   this.resetAllPlaygroundState();
    //   const settingsStore = usePlaygroundSettingsStore();
    //   settingsStore.updateFullPodcastSettings(initialSettings);
    //   // ... any other setup
    // }

    // All other specific actions (fetchPersonas, generateScript, synthesizeAllSegmentsConcurrently, etc.)
    // have been moved to their respective stores.
    // Components will now import and use those stores directly for those actions.
  },
});
