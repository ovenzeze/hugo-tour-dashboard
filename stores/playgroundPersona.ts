"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// @ts-ignore - Nuxt auto-imports, IDE might show an error but it runs fine
import type { Tables } from "~/types/supabase"; // Assuming this path is correct, adjust if necessary

// Copied from playground.ts - ideally, this would be a globally available type
// If Persona is already globally defined or imported from a central types file, use that.
// For now, deriving from Tables<'personas'>.
export type Persona = Tables<"personas">;

export interface PlaygroundPersonaState {
  personas: Persona[];
  personasLoading: boolean;
  selectedPersonaIdForHighlighting: number | null;
}

export const usePlaygroundPersonaStore = defineStore("playgroundPersona", {
  state: (): PlaygroundPersonaState => ({
    personas: [],
    personasLoading: false,
    selectedPersonaIdForHighlighting: null,
  }),
  actions: {
    async fetchPersonas() {
      if (this.personasLoading) return;
      this.personasLoading = true;
      try {
        // @ts-ignore - Nuxt auto-imported $fetch.
        const data = await $fetch<Persona[]>("/api/personas?active=true", {
          headers: { "Content-Type": "application/json" },
        } as any);
        this.personas = data;

        if (this.personas.length === 0) {
          toast.info("No available personas found.", {
            description: "Please create or activate some personas first.",
          });
        }
        // Note: The original logic in fetchPersonas that updated podcastSettings
        // and validationResult based on fetched personas has been removed from this specialized store.
        // This logic will need to be handled by the calling code or by dispatching actions
        // to other relevant stores (e.g., settings or script stores) after personas are fetched.
      } catch (error: any) {
        console.error("Failed to fetch personas:", error);
        toast.error("Failed to load personas", {
          description: error.data?.message || error.message || "Unknown error",
        });
        this.personas = [];
      }
      this.personasLoading = false;
    },
    setSelectedPersonaForHighlighting(personaId: number | null) {
      this.selectedPersonaIdForHighlighting = personaId;
    },
  },
  getters: {
    getPersonaById(state: PlaygroundPersonaState) {
      return (id: number): Persona | undefined => state.personas.find(p => p.persona_id === id);
    },
    // Getter to provide a list of personas suitable for select/dropdown options
    personaOptions(state: PlaygroundPersonaState) {
      return state.personas.map(p => ({ label: p.name, value: p.persona_id }));
    }
  }
});