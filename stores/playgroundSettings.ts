"use strict";

import { defineStore } from "pinia";
import { toast } from "vue-sonner";
// Assuming Persona might be needed for type consistency in some settings,
// though direct persona management is in playgroundPersona.ts
// If not directly needed, this import can be removed.
// import type { Persona } from "./playgroundPersona"; // Or from a global types file

// Define the list of supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh-CN', name: '简体中文 (Chinese Simplified)' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'ru', name: 'Русский (Russian)' },
  { code: 'hi', name: 'हिन्दी (Hindi)' },
  { code: 'ar', name: 'العربية (Arabic)' },
];

// Copied from playground.ts
export interface FullPodcastSettings {
  title: string;
  topic: string;
  numberOfSegments: number;
  style: string;
  keywords: string[]; // Changed to string array
  hostPersonaId: number | string | undefined; // Allow string for initial prop, store as number
  guestPersonaIds: (number | string | undefined)[]; // Allow string for initial prop, store as number
  backgroundMusic: string | undefined;
  elevenLabsProjectId: string | undefined;
  language: string | undefined;
  museumId: number | undefined;
  galleryId: number | undefined;
  objectId: number | undefined;
  ttsProvider?: 'elevenlabs' | 'volcengine'; // Added TTS Provider
}

// Define possible TTS/ASR providers explicitly for stronger typing
export type TTSTechnologyProvider = 'elevenlabs' | 'volcengine';
export type AIGenerateScriptProvider = 'elevenlabs' | 'openrouter' | 'groq'; // Assuming 'elevenlabs' can also generate scripts or it's a general provider key
// 使用字符串字面量类型，确保类型比较正确
export type AIProviderLiteral = 'elevenlabs' | 'openrouter' | 'groq';

// Copied from playground.ts
export const defaultPodcastSettings: FullPodcastSettings = {
  title: "",
  topic: "",
  numberOfSegments: 10,
  style: "",
  keywords: [], // Changed to empty array
  hostPersonaId: undefined,
  guestPersonaIds: [],
  backgroundMusic: undefined,
  elevenLabsProjectId: undefined,
  language: 'en', // Default language set to English
  museumId: undefined,
  galleryId: undefined,
  objectId: undefined,
  ttsProvider: 'elevenlabs', // Default TTS provider
};

export interface PlaygroundSettingsState {
  podcastSettings: FullPodcastSettings;
  createPodcast: boolean; // true for AI script generation, false for manual/validated script
  selectedProvider: AIGenerateScriptProvider | undefined; // Use the defined union type
  aiModel: string | undefined; // e.g., 'mistralai/mistral-7b-instruct' for openrouter
}

export const usePlaygroundSettingsStore = defineStore("playgroundSettings", {
  state: (): PlaygroundSettingsState => {
    const config = useRuntimeConfig();
    // 使用字符串字面量初始化，避免类型问题
    const initialProvider = "elevenlabs" as AIGenerateScriptProvider; 
    let initialAiModel: string | undefined = undefined;

    // 使用类型断言来避免TypeScript的类型检查错误
    if (initialProvider === ('openrouter' as AIGenerateScriptProvider)) {
      initialAiModel = config.public.openrouterDefaultModel as string | undefined;
    } else if (initialProvider === ('groq' as AIGenerateScriptProvider)) {
      initialAiModel = config.public.groqDefaultModel as string | undefined;
    }
    // else if (initialProvider === 'elevenlabs') { /* set default elevenlabs model if any */ }

    return {
      podcastSettings: { ...defaultPodcastSettings },
      createPodcast: true, 
      selectedProvider: initialProvider, // Correctly typed initialProvider is assigned
      aiModel: initialAiModel,
    };
  },
  actions: {
    updateSelectedProvider(providerId: AIGenerateScriptProvider | undefined) {
      const config = useRuntimeConfig();
      this.selectedProvider = providerId;
      // 使用类型断言来避免TypeScript的类型检查错误
      if (providerId === ('openrouter' as AIGenerateScriptProvider)) {
        this.aiModel = config.public.openrouterDefaultModel as string | undefined;
      } else if (providerId === ('groq' as AIGenerateScriptProvider)) {
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
      console.log('[updateFullPodcastSettings] 接收到的设置:', JSON.stringify(settings, null, 2));
      console.log('[updateFullPodcastSettings] 当前设置:', JSON.stringify(this.podcastSettings, null, 2));
      
      // Create a new object to avoid direct state mutation issues if any part is deeply reactive
      const newSettings = { ...this.podcastSettings }; 

      // Iterate over the keys of the incoming settings object
      (Object.keys(settings) as Array<keyof FullPodcastSettings>).forEach(key => {
        if (settings[key] !== undefined) {
          if (key === 'hostPersonaId') {
            newSettings.hostPersonaId = this._parsePersonaId(settings.hostPersonaId as string | number | undefined);
          } else if (key === 'guestPersonaIds' && Array.isArray(settings.guestPersonaIds)) {
            newSettings.guestPersonaIds = (settings.guestPersonaIds as (string | number | undefined)[]).map(id => this._parsePersonaId(id));
          } else if (key === 'keywords') {
            // Ensure keywords are handled as an array of strings
            // If it's a string, split it. If it's an array, process it.
            // 使用类型断言来处理keywords
            const rawKeywordsValue = settings.keywords as string | string[] | undefined; 
            
            if (typeof rawKeywordsValue === 'string') {
              // 如果是字符串，按逗号分割
              newSettings.keywords = rawKeywordsValue.split(',').map(k => k.trim()).filter(k => k !== '');
            } else if (Array.isArray(rawKeywordsValue)) {
              // 如果是数组，确保所有元素都是字符串
              newSettings.keywords = rawKeywordsValue
                .map(k => String(k).trim())
                .filter(k => k !== '');
            } else {
              // 如果是undefined或其他类型，使用空数组
              console.warn(`Unexpected type for keywords: ${typeof rawKeywordsValue}. Defaulting to empty array.`);
              newSettings.keywords = []; 
            }
          } else if (key === 'numberOfSegments'){
            // 强制转换为数字，并确保是有效值
            const numSegments = Number(settings.numberOfSegments);
            console.log(`[updateFullPodcastSettings] 处理numberOfSegments: ${settings.numberOfSegments} -> ${numSegments} (类型: ${typeof settings.numberOfSegments})`);
            
            if (isNaN(numSegments) || numSegments <= 0) {
              console.warn(`[updateFullPodcastSettings] numberOfSegments转换为数字失败或无效，使用默认值: ${defaultPodcastSettings.numberOfSegments}`);
              newSettings.numberOfSegments = defaultPodcastSettings.numberOfSegments;
            } else {
              // 确保是整数
              const finalSegmentCount = Math.floor(numSegments);
              console.log(`[updateFullPodcastSettings] 设置numberOfSegments为: ${finalSegmentCount} (原始值: ${numSegments})`);
              newSettings.numberOfSegments = finalSegmentCount;
              
              // 直接修改state，确保更新生效
              this.$patch((state) => {
                state.podcastSettings.numberOfSegments = finalSegmentCount;
              });
            }
          } else {
            // Directly assign other properties
            // Need to handle type assertion carefully if settings[key] could be of a different type than newSettings[key]
            (newSettings as any)[key] = settings[key];
          }
        }
      });

      console.log('[updateFullPodcastSettings] 更新后的设置:', JSON.stringify(newSettings, null, 2));
      this.podcastSettings = newSettings;
      console.log('[updateFullPodcastSettings] 更新后的store.podcastSettings:', JSON.stringify(this.podcastSettings, null, 2));
    },

    updateTtsProvider(provider: TTSTechnologyProvider) { // Use the defined union type
      this.podcastSettings.ttsProvider = provider;
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
