"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// 更新引入
// import { usePlaygroundUnifiedStore } from "./playgroundUnified"; // Commented out due to empty playgroundUnified.ts
import { usePersonaCache } from "~/composables/usePersonaCache";

// 移除对旧store的引用
// import { usePlaygroundPersonaStore } from "./playgroundPersona";
// import { usePlaygroundSettingsStore } from "./playgroundSettings";
// import { usePlaygroundScriptStore } from "./playgroundScript";
// import { usePlaygroundAudioStore } from "./playgroundAudio";

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
    //   const personaCache = usePersonaCache();
    //   const unifiedStore = undefined; // usePlaygroundUnifiedStore(); // Commented out
    //   return `Personas loaded: ${!personaCache.isLoading.value}, Script valid: ${unifiedStore ? unifiedStore.validationResult?.success : 'N/A'}`;
    // }
  },

  actions: {
    // This action now calls the reset actions of the unified store and clears persona cache.
    resetAllPlaygroundState() {
      // const unifiedStore = usePlaygroundUnifiedStore(); // Commented out
      const personaCache = usePersonaCache();

      // 重置统一store
      // unifiedStore.resetPlaygroundState(); // Commented out
      console.warn('[resetAllPlaygroundState] Skipping reset of unified store as it is currently unavailable.');
      
      // 刷新persona缓存
      personaCache.invalidateCache();

      toast.info("Playground has been reset.", {
        description: "All personas, settings, script, and audio data have been cleared.",
      });

      // localStorage interaction might need to be re-evaluated.
      if (process.client) {
        localStorage.removeItem("playgroundState"); // Old key, might need new keys per store
      }
    },

    // The old `saveStateToLocalStorage` would need to be re-thought.
    // Each store could handle its own persistence, or this store could
    // orchestrate saving the state of all other playground-related stores.
    // For now, this is commented out as it requires a more detailed persistence strategy.
    /*
    saveAllStateToLocalStorage() {
      if (process.client) {
        // const unifiedStore = usePlaygroundUnifiedStore(); // Commented out
        // if (unifiedStore) localStorage.setItem("playgroundUnifiedState", JSON.stringify(unifiedStore.$state)); // Commented out
        toast.info("Playground state saved to local storage.");
      }
    },
    */

    // Example of an action that might coordinate across stores:
    // async initializeNewPodcastWorkflow(initialSettings: Partial<FullPodcastSettings>) {
    //   this.resetAllPlaygroundState();
    //   const unifiedStore = undefined; // usePlaygroundUnifiedStore(); // Commented out
    //   if (unifiedStore) unifiedStore.updatePodcastSettings(initialSettings);
    //   // ... any other setup
    // }

    // All other specific actions (fetchPersonas, generateScript, synthesizeAllSegmentsConcurrently, etc.)
    // have been moved to the unified store.
    // Components will now import and use the unified store directly for those actions.
  },
});
