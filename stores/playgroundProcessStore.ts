// stores/playgroundProcessStore.ts
import { defineStore } from 'pinia';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { 
  PodcastCreateRequest, 
  PodcastCreateResponse 
} from '~/types/api/podcast';

// Define specific API response types for clarity
export interface SynthesizeApiResponse { // Export if needed elsewhere
  success: boolean;
  message?: string;
  segmentResults?: Array<{ // Consider making this a named type if reused
    segmentIndex: number;
    audioUrl?: string;
    error?: string;
  }>;
  finalAudioUrl?: string; // If the API returns a single merged audio URL
}

export interface SegmentPreview { // Define and export SegmentPreview
  segmentIndex: number;
  audioUrl?: string;
  error?: string;
  // Add any other fields that come from the API for a segment preview
}

export interface PreviewSegmentsApiResponse { // Export this interface
  success: boolean;
  previewUrl?: string;
  segmentPreviews?: SegmentPreview[]; // Use the new SegmentPreview type
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

// Define types for timeline API responses
export interface TimelineItem { // Make sure this matches the structure from the API
  speaker: string;
  audioFile: string; // Or however the API returns segment identifiers
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
  // Add other fields if your timeline items have more data
}

export interface TimelineStatusResponse {
  success: boolean;
  message?: string;
  timelineExists: boolean;
  timelineUrl?: string | null;
  timelineData?: TimelineItem[] | null;
}


export const usePlaygroundProcessStore = defineStore('playgroundProcess', {
  state: () => ({
    isLoading: false, // For /script processing
    isSynthesizing: false, // For /synthesize, /preview-segments
    isCombining: false, // For /combine-audio
    isProcessingTimeline: false, // Specific loading state for timeline operations
    isValidating: false, // For /validate-script (if used)
    
    error: null as string | null,
    
    scriptApiResponse: null as PodcastCreateResponse | null,
    synthesizeApiResponse: null as SynthesizeApiResponse | null,
    previewApiResponse: null as PreviewSegmentsApiResponse | null,
    combineAudioResponse: null as CombineAudioResponse | null,
    validateScriptApiResponse: null as ValidateScriptApiResponse | null,
    timelineStatusResponse: null as TimelineStatusResponse | null, // New state for timeline
    
    podcastId: null as string | number | null,
  }),

  getters: {
    apiRequest(): PodcastCreateRequest | null {
      const settingsStore = usePlaygroundSettingsStore();
      const scriptStore = usePlaygroundScriptStore();

      const hostId = settingsStore.getHostPersonaIdNumeric;

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
      
      const guestIds = settingsStore.getGuestPersonaIdsNumeric;

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
      this.timelineStatusResponse = null; // Reset timeline state
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
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: requestBody,
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
        const errorMessage = err.data?.message || err.message || 'Failed to process script.';
        this.error = errorMessage;
        console.log(`[generateScript] AI Script generation failed: ${errorMessage}`, err); // Added log
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
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: synthesisRequest,
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
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: previewRequest,
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

    async generateSegmentPreviews(segmentIndices: number[] | 'all' = 'all') {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot generate segment previews.';
        return null;
      }
      if (!this.scriptApiResponse || !this.scriptApiResponse.preparedSegments || this.scriptApiResponse.preparedSegments.length === 0) {
        this.error = 'No prepared script segments available for preview from script API response.';
        return null;
      }

      this.isSynthesizing = true; // Use the general synthesizing flag
      this.error = null;
      // Do not clear previewApiResponse here, allow it to accumulate results or be selectively updated.
      const settingsStore = usePlaygroundSettingsStore();

      let segmentsToPreview = this.scriptApiResponse.preparedSegments;
      if (Array.isArray(segmentIndices)) {
        segmentsToPreview = segmentIndices.map(index => this.scriptApiResponse!.preparedSegments![index]).filter(Boolean);
      }
      
      if (segmentsToPreview.length === 0) {
        this.error = 'No valid segments selected for preview.';
        this.isSynthesizing = false;
        return null;
      }

      try {
        const previewRequest = {
          podcastId: this.podcastId,
          segments: segmentsToPreview,
          ttsProvider: settingsStore.podcastSettings.ttsProvider,
          synthesisParams: settingsStore.synthesisParams,
        };

        const response = await $fetch<PreviewSegmentsApiResponse>('/api/podcast/preview-segments', {
          method: 'POST',
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: previewRequest,
        });

        if (response.success && response.segmentPreviews) {
          // Merge new previews with existing ones if any
          const existingPreviews = this.previewApiResponse?.segmentPreviews || [];
          const updatedPreviewsMap = new Map(existingPreviews.map(p => [p.segmentIndex, p]));
          response.segmentPreviews.forEach(newPreview => {
            updatedPreviewsMap.set(newPreview.segmentIndex, newPreview);
          });
          this.previewApiResponse = {
            success: true,
            segmentPreviews: Array.from(updatedPreviewsMap.values()),
            // Preserve existing previewUrl if this call doesn't provide a new one for combined preview
            previewUrl: response.previewUrl || this.previewApiResponse?.previewUrl
          };
        } else if (!response.success) {
          this.error = response.message || 'Failed to generate segment previews.';
        }
        return response;
      } catch (err: any) {
        console.error('[generateSegmentPreviews] Error:', err);
        this.error = err.data?.message || err.message || 'Failed to generate segment previews.';
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
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: { podcastId: this.podcastId },
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
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: validationRequest,
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

    async fetchTimelineStatus() {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot fetch timeline status.';
        this.timelineStatusResponse = { success: false, timelineExists: false, message: 'Podcast ID missing.' };
        return;
      }
      this.isProcessingTimeline = true;
      this.error = null;
      try {
        const response = await $fetch<TimelineStatusResponse>(`/api/podcast/status?podcastId=${this.podcastId}`);
        this.timelineStatusResponse = response;
        if (!response.success) {
            this.error = response.message || 'Failed to fetch timeline status.';
        }
      } catch (err: any) {
        console.error('[fetchTimelineStatus] Error:', err);
        const errorMessage = err.data?.message || err.message || 'Failed to fetch timeline status.';
        this.error = errorMessage;
        this.timelineStatusResponse = { success: false, timelineExists: false, message: errorMessage ?? undefined };
      } finally {
        this.isProcessingTimeline = false;
      }
    },

    async generatePodcastTimeline() {
      if (!this.podcastId) {
        this.error = 'Podcast ID is missing. Cannot generate timeline.';
        return null;
      }
      this.isProcessingTimeline = true;
      this.error = null;
      try {
        const response = await $fetch<TimelineStatusResponse>('/api/podcast/process/timeline', {
          method: 'POST',
          // @ts-ignore - Reverting to ts-ignore for body type issue
          body: { podcastId: this.podcastId },
        });
        this.timelineStatusResponse = response;
        if (!response.success) {
          this.error = response.message || 'Failed to generate timeline.';
        }
        return response;
      } catch (err: any) {
        console.error('[generatePodcastTimeline] Error:', err);
        const errorMessage = err.data?.message || err.message || 'Failed to generate timeline.';
        this.error = errorMessage;
        this.timelineStatusResponse = { success: false, timelineExists: false, message: errorMessage ?? undefined }; // Update status on error
        throw err; // Re-throw for the caller if needed
      } finally {
        this.isProcessingTimeline = false;
      }
    },

    updateSegmentPreviewStatuses(segmentPreviews: SegmentPreview[]) {
      if (!this.previewApiResponse) {
        this.previewApiResponse = { success: true, segmentPreviews: [] };
      }
      const updatedPreviewsMap = new Map(this.previewApiResponse.segmentPreviews?.map(p => [p.segmentIndex, p]));
      segmentPreviews.forEach(newPreview => {
        updatedPreviewsMap.set(newPreview.segmentIndex, newPreview);
      });
      this.previewApiResponse.segmentPreviews = Array.from(updatedPreviewsMap.values());
      this.previewApiResponse.success = true; // Assume success if we are updating with new statuses
    }
  },
});