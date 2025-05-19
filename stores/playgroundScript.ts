"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// @ts-ignore - Nuxt auto-imports
import type { ScriptSegment as ValidatorScriptSegment } from "~/composables/useScriptValidator";
import type { ValidateScriptResponse } from "~/composables/useScriptValidator";
import type { Persona } from "./playgroundPersona";
import type { FullPodcastSettings } from "./playgroundSettings";
import { usePlaygroundSettingsStore } from './playgroundSettings';

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

// ================= 辅助函数 =================
function filterPersonasByLanguage(personas: (Persona | undefined)[], language: string | undefined, maxCount = 10): Persona[] {
  if (!Array.isArray(personas)) return [];
  if (!language) return personas.filter(Boolean).slice(0, maxCount) as Persona[];
  return personas.filter((p): p is Persona => p !== undefined && Array.isArray((p as any).language_support) && (p as any).language_support.includes(language)).slice(0, maxCount);
}

function applyPersonaFilteringForScriptGeneration(host: Persona | undefined, guests: (Persona | undefined)[], allPersonas: Persona[], language: string | undefined) {
  let filteredHost = host && Array.isArray((host as any).language_support) && language && (host as any).language_support.includes(language) ? host : undefined;
  let filteredGuests = filterPersonasByLanguage(guests, language, 10);
  if (filteredGuests.length === 0 && allPersonas.length > 0) {
    filteredGuests = filterPersonasByLanguage(allPersonas.filter(p => !filteredHost || p.persona_id !== filteredHost.persona_id), language, 10);
  }
  return { filteredHost, filteredGuests };
}

// ================= Pinia Store =================
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
      this.validationResult = null;
    },
    usePresetScript() {
      // Example preset, can be replaced by actual preset logic
      this.textToSynthesize = "Host: Welcome to our podcast!\nGuest: Thank you for having me.";
      this.validationResult = null;
    },
    parseScriptToSegments(content: string): ValidatorScriptSegment[] {
      if (!content) return [];
      return content
        .split("\n")
        .map((line) => {
          const colonIndex = line.indexOf(":");
          if (colonIndex <= 0) return null;
          const speaker = line.substring(0, colonIndex).trim();
          const text = line.substring(colonIndex + 1).trim();
          return { speaker: speaker, text: text };
        })
        .filter((segment): segment is ValidatorScriptSegment => segment !== null && !!segment.speaker && !!segment.text);
    },
    // Step 1: Generate Podcast Meta Information
    async generatePodcastMetaInfo(
      podcastSettings: FullPodcastSettings,
      hostPersona: Persona | undefined,
      guestPersonas: (Persona | undefined)[]
    ): Promise<GenerateScriptApiResponse | null> {
      if (this.isGeneratingScript) return null;
      this.isGeneratingScript = true;
      this.scriptGenerationError = null;
      const settingsStore = usePlaygroundSettingsStore();
      try {
        // 获取全部personas（从playgroundPersona store）
        const personaStore = usePlaygroundPersonaStore();
        const allPersonas = personaStore.personas || [];
        const language = settingsStore.podcastSettings.language;
        // 应用过滤逻辑
        const { filteredHost, filteredGuests } = applyPersonaFilteringForScriptGeneration(hostPersona, guestPersonas, allPersonas, language);
        const requestBody: any = {
          podcastSettings: {
            ...podcastSettings,
            language: language, // ALWAYS explicitly include latest language
            hostPersonaId: filteredHost ? Number(filteredHost.persona_id) : undefined,
            guestPersonaIds: filteredGuests.map(p => Number(p.persona_id)),
          },
          hostPersona: filteredHost ? { persona_id: filteredHost.persona_id, name: filteredHost.name, voice_model_identifier: filteredHost.voice_model_identifier || '' } : undefined,
          guestPersonas: filteredGuests.map(p => ({ persona_id: p.persona_id, name: p.name, voice_model_identifier: p.voice_model_identifier || '' })),
          generationStep: 'meta_info_only',
        };
        // Add provider and model if they are set in settingsStore
        if (settingsStore.selectedProvider) {
          requestBody.provider = settingsStore.selectedProvider;
          if ((settingsStore.selectedProvider === 'openrouter' || settingsStore.selectedProvider === 'groq') && !settingsStore.aiModel) {
            toast.error(`${settingsStore.selectedProvider} model is not selected. Please select a model or check default configuration.`);
            throw new Error(`${settingsStore.selectedProvider} model is required but not selected/configured.`);
          }
          if (settingsStore.aiModel) {
            requestBody.model = settingsStore.aiModel;
          }
        }
        // @ts-ignore - Nuxt auto-imported $fetch.
        const response = await $fetch<GenerateScriptApiResponse>("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        } as any);
        if (response && response.podcastTitle) {
          toast.success("AI meta info generated successfully!", {
            description: "Podcast meta info and settings have been updated based on AI response.",
          });
          return response;
        } else {
          throw new Error("AI did not return the expected structured data format for meta info.");
        }
      } catch (error: any) {
        const errorMessage = error.data?.message || error.data?.statusMessage || error.message || "An unknown error occurred during meta info generation.";
        this.scriptGenerationError = errorMessage;
        toast.error("Meta info generation failed", { description: errorMessage });
        return null;
      } finally {
        this.isGeneratingScript = false;
      }
    },
    // Step 2: Generate Full Script from Meta Information
    async generateScriptFromMeta(
      metaInfo: GenerateScriptApiResponse,
      hostPersona: Persona | undefined,
      guestPersonas: (Persona | undefined)[]
    ): Promise<GenerateScriptApiResponse | null> {
      if (this.isGeneratingScript) return null;
      this.isGeneratingScript = true;
      this.scriptGenerationError = null;
      const settingsStore = usePlaygroundSettingsStore();
      try {
        // 获取全部personas（从playgroundPersona store）
        const personaStore = usePlaygroundPersonaStore();
        const allPersonas = personaStore.personas || [];
        const language = settingsStore.podcastSettings.language;
        // 应用过滤逻辑
        const { filteredHost, filteredGuests } = applyPersonaFilteringForScriptGeneration(hostPersona, guestPersonas, allPersonas, language);
        const requestBody: any = {
          podcastSettings: {
            ...metaInfo,
            language: language, // ALWAYS explicitly include latest language
            hostPersonaId: filteredHost ? Number(filteredHost.persona_id) : undefined,
            guestPersonaIds: filteredGuests.map(p => Number(p.persona_id)),
          },
          hostPersona: filteredHost ? { persona_id: filteredHost.persona_id, name: filteredHost.name, voice_model_identifier: filteredHost.voice_model_identifier || '' } : undefined,
          guestPersonas: filteredGuests.map(p => ({ persona_id: p.persona_id, name: p.name, voice_model_identifier: p.voice_model_identifier || '' })),
          generationStep: 'full_script',
          metaInfo, 
        };
        // Add provider and model if they are set in settingsStore
        if (settingsStore.selectedProvider) {
          requestBody.provider = settingsStore.selectedProvider;
          if ((settingsStore.selectedProvider === 'openrouter' || settingsStore.selectedProvider === 'groq') && !settingsStore.aiModel) {
            toast.error(`${settingsStore.selectedProvider} model is not selected. Please select a model or check default configuration.`);
            throw new Error(`${settingsStore.selectedProvider} model is required but not selected/configured.`);
          }
          if (settingsStore.aiModel) {
            requestBody.model = settingsStore.aiModel;
          }
        }
        // @ts-ignore - Nuxt auto-imported $fetch.
        const response = await $fetch<GenerateScriptApiResponse>("/api/generate-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        } as any);
        if (response && response.script && Array.isArray(response.script)) {
          this.textToSynthesize = response.script.map(segment => `${segment.name}: ${segment.text}`).join('\n');
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
          toast.success("AI script generated successfully!", {
            description: "Script and podcast settings have been updated based on AI response.",
          });
          return response;
        } else {
          throw new Error("AI did not return the expected structured data format for the full script.");
        }
      } catch (error: any) {
        const errorMessage = error.data?.message || error.data?.statusMessage || error.message || "An unknown error occurred during full script generation.";
        this.scriptGenerationError = errorMessage;
        toast.error("Full script generation failed", { description: errorMessage });
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
      const settingsStore = usePlaygroundSettingsStore();
      try {
        if (!podcastSettings?.title) throw new Error("Please set the podcast title");
        if (!hostPersona) throw new Error("Please select a host");
        if (guestPersonas.length === 0 || guestPersonas.every(p => !p)) throw new Error("Please select at least one guest");
        if (!this.textToSynthesize) throw new Error("Script content is empty");
        // 获取全部personas（从playgroundPersona store）
        const personaStore = usePlaygroundPersonaStore();
        const allPersonas = personaStore.personas || [];
        const language = podcastSettings.language || "en";
        // 应用过滤逻辑
        const { filteredHost, filteredGuests } = applyPersonaFilteringForScriptGeneration(hostPersona, guestPersonas, allPersonas, language);
        const requestBody: any = {
          title: podcastSettings.title,
          rawScript: this.textToSynthesize,
          personas: {
            hostPersona: filteredHost ? {
              id: filteredHost.persona_id,
              name: filteredHost.name,
              voice_model_identifier: filteredHost.voice_model_identifier || "",
            } : undefined,
            guestPersonas: filteredGuests.map((persona) => ({
              id: persona.persona_id,
              name: persona.name,
              voice_model_identifier: persona.voice_model_identifier || "",
            })),
          },
          language: language,
        };
        // Add provider and model if they are set in settingsStore
        if (settingsStore.selectedProvider) {
          requestBody.provider = settingsStore.selectedProvider;
          if (settingsStore.selectedProvider === 'openrouter') {
            if (!settingsStore.aiModel) {
              toast.error('OpenRouter model is not selected. Please select a model in settings.');
              throw new Error('OpenRouter model is required but not selected.');
            }
            requestBody.model = settingsStore.aiModel;
          }
        }
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
    structuredScriptSegments(state: PlaygroundScriptState): ValidatorScriptSegment[] {
      if (state.validationResult?.structuredData?.script) {
        return state.validationResult.structuredData.script.map(s => ({
          speaker: s.name,
          text: s.text,
        }));
      }
      return [];
    },
    voiceMap(state: PlaygroundScriptState): Record<string, { personaId: number; voice_model_identifier: string; }> | undefined {
        return state.validationResult?.structuredData?.voiceMap;
    },
    isScriptValid(state: PlaygroundScriptState): boolean {
        return !!state.validationResult?.success;
    }
  }
});
