"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// @ts-ignore - Nuxt auto-imports
import type { ScriptSegment as ValidatorScriptSegment } from "~/composables/useScriptValidator";
// Import ValidateScriptResponse from its original definition source if it's not meant to be defined here
// For now, assuming it's defined in composables/useScriptValidator and re-exporting or re-defining.
// Let's use the definition from composables/useScriptValidator.ts by importing it.
import type { ValidateScriptResponse } from "~/composables/useScriptValidator";
// Removed re-export of ValidateScriptResponse to avoid duplicate import warnings.
// Modules needing this type should import it directly from '~/composables/useScriptValidator'.

import type { Persona } from "./playgroundPersona"; // Assuming Persona type is needed
import type { FullPodcastSettings } from "./playgroundSettings"; // Assuming settings are needed for context

// Copied from playground.ts
export interface AIScriptSegment {
  name: string;
  role: string;
  text: string;
}

// Copied from playground.ts
export interface GenerateScriptApiResponse {
  podcastTitle: string;
  script: AIScriptSegment[];
  voiceMap: Record<string, {
    personaId: number;
    voice_model_identifier: string;
  }>;
  language: string;
  topic?: string;
  style?: string;
  keywords?: string;
  numberOfSegments?: number;
}

export interface PlaygroundScriptState {
  textToSynthesize: string; // Raw script text
  isGeneratingScript: boolean;
  scriptGenerationError: string | null;
  isValidatingScript: boolean;
  validationError: string | null;
  validationResult: ValidateScriptResponse | null; // Holds structured script data after validation/AI generation
}

export const usePlaygroundScriptStore = defineStore("playgroundScript", {
  state: (): PlaygroundScriptState => ({
    textToSynthesize: "",
    isGeneratingScript: false,
    scriptGenerationError: null,
    isValidatingScript: false,
    validationError: null,
    validationResult: null,
  }),
  actions: {
    updateTextToSynthesize(text: string) {
      this.textToSynthesize = text;
      // Potentially clear validationResult if script changes manually
      // this.validationResult = null;
    },

    usePresetScript() {
      const presetScript = `Host: Welcome to 'AI: The Next Frontier,' the podcast where we explore the cutting-edge advancements in artificial intelligence and their transformative potential. I'm your host, Cybo, and joining me today is Elliot, a contemplative artist with a keen interest in the intersection of AI and creativity. Elliot, great to have you here!
Guest: Thanks for having me, Cybo. It's always exciting to discuss how AI is reshaping not just technology, but also art, culture, and even the way we think about human expression.
Host: Absolutely! Let's dive right in. AI, machine learning, and deep learning are no longer just buzzwords—they're driving real change across industries. From healthcare to finance, and even entertainment, the applications seem endless. Elliot, as someone who works in the arts, how do you see AI influencing creative fields?
Guest: It's fascinating, really. AI tools like generative adversarial networks (GANs) and language models are enabling artists to explore new forms of creativity. For instance, AI can generate music, paintings, or even poetry. But it also raises questions: Is AI truly creative, or is it just mimicking human patterns? And how do we define authorship in such collaborations?
Host: Those are profound questions. It seems like AI is blurring the lines between tool and creator. Beyond the arts, industries like healthcare are leveraging AI for diagnostics and personalized treatment plans. Do you think AI's role in such critical fields will be more readily accepted compared to its role in creative domains?
Guest: I think so. In healthcare, AI's ability to analyze vast amounts of data quickly can save lives, so the benefits are more tangible. But in creative fields, the emotional and subjective aspects make the adoption more nuanced. People might resist AI-generated art because it challenges traditional notions of human uniqueness and emotion.
Host: That makes sense. Speaking of adoption, what do you think are the biggest challenges AI faces as it becomes more integrated into our daily lives? Ethical concerns, bias in algorithms, or something else?
Guest: All of those are critical, but I'd add transparency to the list. If people don't understand how AI makes decisions—whether it's approving a loan or recommending a song—they won't trust it. And without trust, widespread adoption will be difficult. Ethical frameworks and explainable AI are going to be key.
Host: Well said. As we wrap up, Elliot, what's one thing you hope listeners take away from our discussion today?
Guest: I hope they see AI not as a replacement for human ingenuity, but as a collaborator that can amplify our potential—whether in art, science, or everyday life. The future of AI is what we make of it, and that's both exciting and responsibility-laden.
Host: Couldn't agree more. Thanks for joining us, Elliot, and thank you to our listeners for tuning in to 'AI: The Next Frontier.' Stay curious, and we'll see you next time!`;
      this.textToSynthesize = presetScript;
      this.validationResult = null; // Clear previous validation
      toast.success("Preset script loaded", {
        description: "The preset script has been loaded into the editor.",
      });
    },

    parseScriptToSegments(content: string): ValidatorScriptSegment[] { // Return type updated
      if (!content) return [];
      return content
        .split("\n")
        .map((line) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex <= 0) return null;
          const speaker = line.substring(0, colonIndex).trim();
          const text = line.substring(colonIndex + 1).trim();
          // The role needs to be determined, for now, it's not directly parsed here.
          // The validator API or AI generation will assign roles.
          // For basic parsing, we return the speaker and text.
          // The role is determined later by the validation/AI process.
          return { speaker: speaker, text: text };
        })
        .filter((segment): segment is ValidatorScriptSegment => segment !== null && !!segment.speaker && !!segment.text);
    },

    async generateScript(
        podcastSettings: FullPodcastSettings, // Pass necessary settings
        hostPersona: Persona | undefined,
        guestPersonas: (Persona | undefined)[]
      ) {
      if (this.isGeneratingScript) return;
      this.isGeneratingScript = true;
      this.scriptGenerationError = null;

      try {
        const requestBody = {
          podcastSettings: {
            ...podcastSettings,
            hostPersonaId: podcastSettings.hostPersonaId ? Number(podcastSettings.hostPersonaId) : undefined,
            guestPersonaIds: (podcastSettings.guestPersonaIds || []).map(id => id ? Number(id) : undefined).filter(id => id !== undefined),
          },
          hostPersona: hostPersona ? { persona_id: hostPersona.persona_id, name: hostPersona.name, voice_model_identifier: hostPersona.voice_model_identifier || '' } : undefined,
          guestPersonas: guestPersonas.map(p => p ? { persona_id: p.persona_id, name: p.name, voice_model_identifier: p.voice_model_identifier || '' } : null).filter(p => p !== null) as any[],
        };

        // @ts-ignore - Nuxt auto-imported $fetch.
        const response = await $fetch<GenerateScriptApiResponse>("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        } as any);

        if (response && response.script && Array.isArray(response.script)) {
          this.textToSynthesize = response.script.map(segment => `${segment.name}: ${segment.text}`).join('\n');
          
          // Update related settings in the settings store - this requires an event or direct call
          // For now, we'll store the AI response directly in validationResult
          const structuredScriptForValidation = response.script.map(s => ({
            name: s.name,
            role: (s.role.toLowerCase() === 'host' || s.role.toLowerCase() === 'guest' ? s.role.toLowerCase() : (s.name.toLowerCase().includes('host') ? 'host' : 'guest')) as 'host' | 'guest',
            text: s.text,
          }));

          this.validationResult = {
            success: true,
            structuredData: {
                podcastTitle: response.podcastTitle,
                script: structuredScriptForValidation,
                voiceMap: response.voiceMap,
                language: response.language,
            },
            message: "Script and settings generated by AI.",
          };
          
          // The calling component/page should also update the settingsStore with response.podcastTitle, etc.
          // Emitting an event or returning the full response might be better.
          // For now, the component will need to read this.validationResult and update settings store.

          toast.success("AI script generated successfully!", {
            description: "Script and podcast settings have been updated based on AI response.",
          });
          return response; // Return the full response for the caller to update other stores
        } else {
          throw new Error("AI did not return the expected structured data format.");
        }
      } catch (error: any) {
        const errorMessage = error.data?.message || error.data?.statusMessage || error.message || "An unknown error occurred during script generation.";
        this.scriptGenerationError = errorMessage;
        toast.error("Script generation failed", { description: errorMessage });
        return null;
      } finally {
        this.isGeneratingScript = false;
      }
    },

    async validateScript(
        podcastSettings: FullPodcastSettings, // Pass necessary settings
        hostPersona: Persona | undefined,
        guestPersonas: (Persona | undefined)[]
      ): Promise<ValidateScriptResponse | null> {
      if (this.isValidatingScript) {
        toast.info("Validation is already in progress");
        return null;
      }
      this.isValidatingScript = true;
      this.validationError = null;
      this.validationResult = null;

      try {
        if (!podcastSettings?.title) throw new Error("Please set the podcast title");
        if (!hostPersona) throw new Error("Please select a host");
        if (guestPersonas.length === 0 || guestPersonas.every(p => !p)) throw new Error("Please select at least one guest");
        if (!this.textToSynthesize) throw new Error("Script content is empty");

        const requestBody = {
          title: podcastSettings.title,
          rawScript: this.textToSynthesize,
          personas: {
            hostPersona: {
              id: hostPersona.persona_id,
              name: hostPersona.name,
              voice_model_identifier: hostPersona.voice_model_identifier || "",
            },
            guestPersonas: guestPersonas.filter(p => p).map((persona) => ({
              id: persona!.persona_id,
              name: persona!.name,
              voice_model_identifier: persona!.voice_model_identifier || "",
            })),
          },
          preferences: { // These should come from podcastSettings
            style: podcastSettings.style || "Conversational",
            language: podcastSettings.language || "en-US", // Default if not set
            keywords: podcastSettings.keywords || "",
            numberOfSegments: podcastSettings.numberOfSegments || 3,
            backgroundMusic: podcastSettings.backgroundMusic,
          },
        };

        // @ts-ignore - Nuxt auto-imported $fetch
        const response = await $fetch<ValidateScriptResponse>("/api/podcast/process/validate", {
          method: "POST",
          body: requestBody,
        } as any);

        this.validationResult = response;
        if (response.success) {
          toast.success("Script validation passed");
        } else {
          const errorMsg = response.error || response.message || "Validation failed";
          toast.error(`Validation failed: ${errorMsg}`);
          this.validationError = errorMsg;
        }
        return response;
      } catch (err: any) {
        const errorMessage = err.data?.message || err.message || "Server error during validation";
        toast.error(`Validation request error: ${errorMessage}`);
        this.validationError = errorMessage;
        this.validationResult = { success: false, message: errorMessage, error: errorMessage };
        return this.validationResult;
      } finally {
        this.isValidatingScript = false;
      }
    },
    
    resetScriptState() {
        this.textToSynthesize = "";
        this.isGeneratingScript = false;
        this.scriptGenerationError = null;
        this.isValidatingScript = false;
        this.validationError = null;
        this.validationResult = null;
        // toast.info("Script editor and validation state have been reset.");
    }
  },
  getters: {
    // Getter to provide the parsed script segments from validationResult
    // This is useful for iterating over structured script data in components
    structuredScriptSegments(state: PlaygroundScriptState): ValidatorScriptSegment[] {
      // Transform the structuredData.script (which has name, role, text)
      // to ValidatorScriptSegment (which expects speaker, text)
      if (state.validationResult?.structuredData?.script) {
        return state.validationResult.structuredData.script.map(s => ({
          speaker: s.name, // Map 'name' to 'speaker'
          text: s.text,
        }));
      }
      return [];
    },
    // Getter to provide the voice map from validationResult
    voiceMap(state: PlaygroundScriptState): Record<string, { personaId: number; voice_model_identifier: string; }> | undefined {
        return state.validationResult?.structuredData?.voiceMap;
    },
    // Getter to indicate if the script is considered valid (based on validationResult)
    isScriptValid(state: PlaygroundScriptState): boolean {
        return !!state.validationResult?.success;
    }
  }
});
