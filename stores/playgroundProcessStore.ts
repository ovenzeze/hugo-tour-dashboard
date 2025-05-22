// stores/playgroundProcessStore.ts
import { defineStore } from 'pinia';
import { usePlaygroundSettingsStore } from './playgroundSettingsStore';
import { usePlaygroundScriptStore } from './playgroundScriptStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { 
  PodcastCreateRequest, 
  PodcastCreateResponse 
} from '~/types/api/podcast';

// Define specific API response types for clarity
interface SynthesizeApiResponse {
  success: boolean;
  message?: string;
  segmentResults?: Array<{
    segmentIndex: number;
    audioUrl?: string;
    error?: string;
  }>;
  finalAudioUrl?: string; // If the API returns a single merged audio URL
}

interface PreviewSegmentsApiResponse {
  success: boolean;
  previewUrl?: string; 
  segmentPreviews?: Array<{ segmentIndex: number; audioUrl?: string; error?: string }>;
  message?: string;
}

interface CombineAudioResponse {
  success: boolean;
  audioUrl?: string;
  message?: string;
  duration?: number;
}

interface ValidateScriptApiResponse {
  success: boolean;
  message?: string;
  podcastId?: string | number;
  // Potentially other validation feedback fields
}


export const usePlaygroundProcessStore = defineStore('playgroundProcess', {
  state: () => ({
    isLoading: false, // For /script processing
    isSynthesizing: false, // For /synthesize, /preview-segments
    isCombining: false, // For /combine-audio
    isValidating: false, // For /validate-script (if used)
    
    error: null as string | null,
    
    scriptApiResponse: null as PodcastCreateResponse | null,
    synthesizeApiResponse: null as SynthesizeApiResponse | null,
    previewApiResponse: null as PreviewSegmentsApiResponse | null,
    combineAudioResponse: null as CombineAudioResponse | null,
    validateScriptApiResponse: null as ValidateScriptApiResponse | null,
    
    podcastId: null as string | number | null,
  }),

  getters: {
    apiRequest(): PodcastCreateRequest | null {
      const settingsStore = usePlaygroundSettingsStore();
      const scriptStore = usePlaygroundScriptStore();

      const hostId = settingsStore.getHostPersonaIdNumeric();

      if (hostId === undefined) {
        // Error should be set by getHostPersonaIdNumeric or handled by UI based on settingsStore.error
        console.warn('[apiRequest] Host Persona ID is not set or invalid. Cannot build API request.');
        // this.error = 'Please select a valid host persona.'; // Avoid direct state mutation in getter
        return null;
      }

      let determinedLanguage = 'en-US'; // Default language
      const { getPersonaById, personas: personaCacheValue } = usePersonaCache();
      
      // This check is informational; actual fetching should be an action if needed before getter use.
      if (personaCacheValue.value.length === 0) {
         // console.warn('[apiRequest] Persona cache is empty. Language determination might default.');
      }

      const hostPersona = getPersonaById(hostId);
      if (hostPersona && hostPersona.language_support && hostPersona.language_support.length > 0) {
        determinedLanguage = hostPersona.language_support[0];
      }
      
      const guestIds = settingsStore.getGuestPersonaIdsNumeric();

      if (scriptStore.parsedSegments.length === 0 && scriptStore.scriptContent.trim() !== '') {
        // This indicates script content exists but parsing failed or yielded no segments.
        // console.warn('[apiRequest] Parsed segments are empty, but script content exists. API request might be invalid.');
        // this.error = 'Script could not be parsed into segments. Please check script format.';
        // Returning null or an empty script array depends on how backend handles it.
        // For now, let it proceed, backend should validate.
      }

      return {
        podcastTitle: settingsStore.podcastSettings.title || 'Untitled Podcast',
        script: scriptStore.parsedSegments,
        hostPersonaId: hostId,
        guestPersonaIds: guestIds,
        language: determinedLanguage,
        ttsProvider: settingsStore.podcastSettings.ttsProvider || 'elevenlabs',
        synthesisParams: settingsStore.synthesisParams,
        topic: settingsStore.podcastSettings.topic,
        keywords: settingsStore.podcastSettings.keywords || [],
        style: settingsStore.podcastSettings.style,
      };
    },
  },

  actions: {
    setPodcastId(id: string | number | null) {
      this.podcastId = id;
    },

    clearApiError() {
      this.error = null;
    },

    resetProcessState() {
      this.isLoading = false;
      this.isSynthesizing = false;
      this.isCombining = false;
      this.isValidating = false;
      this.error = null;
      this.scriptApiResponse = null;
      this.synthesizeApiResponse = null;
      this.previewApiResponse = null;
      this.combineAudioResponse = null;
      this.validateScriptApiResponse = null;
      this.podcastId = null;
    },

    async generateScript() {
      this.isLoading = true;
      this.error = null;
      this.scriptApiResponse = null;
      // podcastId is set from response

      const requestBody = this.apiRequest; // Calls the getter
      if (!requestBody) {
        const settingsStore = usePlaygroundSettingsStore(); // Get store instance here
        this.error = settingsStore.error || 'Failed to build API request for script generation. Host persona might be missing or invalid.';
        this.isLoading = false;
        return null;
      }
      // Ensure script is not empty if content was provided
      if (requestBody.script.length === 0 && usePlaygroundScriptStore().scriptContent.trim() !== '') {
          this.error = 'Script content exists but was not parsed into any segments. Please check script format.';
          this.isLoading = false;
          return null;
      }


      try {
        const response = await $fetch<PodcastCreateResponse>('/api/podcast/process/script', {
          method: 'POST',
          // @ts-ignore - Attempting to ignore persistent NitroFetchOptions type issue
          body: requestBody as Record<string, any>,
        });
        
        this.scriptApiResponse = response;
        if (response.success && response.podcastId) {
          this.setPodcastId(response.podcastId);
        } else if (!response.success) {
          this.error = response.message || 'Script processing API returned an error.';
        }
        return response;
      } catch (err: any) {
        console.error('[generateScript] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to process script.';
        throw err; 
      } finally {
        this.isLoading = false;
      }
    },
    
    async synthesizeAudio() {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot synthesize audio.';
        return null;
      }
      if (!this.scriptApiResponse || !this.scriptApiResponse.preparedSegments || this.scriptApiResponse.preparedSegments.length === 0) {
        this.error = 'No prepared script segments available for synthesis from script API response.';
        return null;
      }
      
      this.isSynthesizing = true;
      this.error = null;
      this.synthesizeApiResponse = null;
      const settingsStore = usePlaygroundSettingsStore();

      try {
        const synthesisRequest = {
          podcastId: this.podcastId,
          segments: this.scriptApiResponse.preparedSegments, 
          ttsProvider: settingsStore.podcastSettings.ttsProvider,
          synthesisParams: settingsStore.synthesisParams,
        };
        
        const response = await $fetch<SynthesizeApiResponse>('/api/podcast/process/synthesize', {
          method: 'POST',
          // @ts-ignore - Attempting to ignore persistent NitroFetchOptions type issue
          body: synthesisRequest as Record<string, any>,
        });
        
        this.synthesizeApiResponse = response;
        if (!response.success) {
          this.error = response.message || 'Audio synthesis API returned an error.';
        }
        // The actual audio URL (finalAudioUrl) should be set by a UI store or another action
        // after this response, potentially after a combine step.
        return response;
      } catch (err: any) {
        console.error('[synthesizeAudio] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to synthesize audio.';
        throw err;
      } finally {
        this.isSynthesizing = false;
      }
    },
    
    async synthesizeAudioPreviewForAllSegments() {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot preview audio.';
        return null;
      }
      if (!this.scriptApiResponse || !this.scriptApiResponse.preparedSegments || this.scriptApiResponse.preparedSegments.length === 0) {
        this.error = 'No prepared script segments available for preview from script API response.';
        return null;
      }
      
      this.isSynthesizing = true; // Use same flag as full synthesis for now
      this.error = null;
      this.previewApiResponse = null;
      const settingsStore = usePlaygroundSettingsStore();

      try {
        const previewRequest = {
          podcastId: this.podcastId,
          segments: this.scriptApiResponse.preparedSegments,
          ttsProvider: settingsStore.podcastSettings.ttsProvider,
          synthesisParams: settingsStore.synthesisParams,
        };
        
        const response = await $fetch<PreviewSegmentsApiResponse>('/api/podcast/preview-segments', {
          method: 'POST',
          // @ts-ignore - Attempting to ignore persistent NitroFetchOptions type issue
          body: previewRequest as Record<string, any>,
        });
        
        this.previewApiResponse = response;
        if (!response.success) {
            this.error = response.message || 'Failed to generate segment previews.';
        }
        // UI store would handle response.previewUrl or response.segmentPreviews
        return response;
      } catch (err: any) {
        console.error('[synthesizeAudioPreviewForAllSegments] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to preview audio segments.';
        throw err;
      } finally {
        this.isSynthesizing = false;
      }
    },
    
    async combineAudio() {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot combine audio.';
        return null;
      }
      
      this.isCombining = true;
      this.error = null;
      this.combineAudioResponse = null;

      try {
        const response = await $fetch<CombineAudioResponse>('/api/podcast/combine-audio', {
          method: 'POST',
          // @ts-ignore - Attempting to ignore persistent NitroFetchOptions type issue
          body: { podcastId: this.podcastId } as Record<string, any>,
        });
        
        this.combineAudioResponse = response;
        if (!response.success) {
            this.error = response.message || 'Failed to combine audio.';
        }
        // UI store would handle response.audioUrl by calling setFinalAudioUrl
        return response;
      } catch (err: any) {
        console.error('[combineAudio] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to combine audio.';
        throw err;
      } finally {
        this.isCombining = false;
      }
    },
    
    // If /api/podcast/validate-script endpoint is kept and used:
    async validateCurrentScript() {
      const scriptStore = usePlaygroundScriptStore();
      const settingsStore = usePlaygroundSettingsStore();

      if (!scriptStore.scriptContent.trim()) {
        this.error = 'Script content is empty, cannot validate.';
        return null;
      }
      
      this.isValidating = true;
      this.error = null;
      this.validateScriptApiResponse = null;
      
      // Ensure script is parsed before validation
      await scriptStore.parseScript(); 
      if (scriptStore.parsedSegments.length === 0 && scriptStore.scriptContent.trim()) {
        this.error = 'Could not parse script content for validation. Please check the format.';
        this.isValidating = false;
        return null;
      }

      try {
        const validationRequest = {
          script: scriptStore.parsedSegments, 
          podcastSettings: settingsStore.podcastSettings 
        };
        
        const response = await $fetch<ValidateScriptApiResponse>('/api/podcast/validate-script', {
          method: 'POST',
          // @ts-ignore - Attempting to ignore persistent NitroFetchOptions type issue
          body: validationRequest as Record<string, any>,
        });
        
        this.validateScriptApiResponse = response;
        if (response.success && response.podcastId) {
          this.setPodcastId(response.podcastId);
        } else if (!response.success) {
            this.error = response.message || 'Script validation via API failed.';
        }
        return response;
      } catch (err: any) {
        console.error('[validateCurrentScript] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to validate script via API.';
        throw err;
      } finally {
        this.isValidating = false;
      }
    },
  },
});