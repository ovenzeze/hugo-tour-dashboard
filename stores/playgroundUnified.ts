// stores/playgroundUnified.ts
import { defineStore } from 'pinia';
import type { PodcastCreateRequest, PodcastCreateResponse, ScriptSegment, SynthesisParams as ApiSynthesisParams } from '~/types/api/podcast';
import type { FullPodcastSettings } from '~/types/playground';
import { usePersonaCache } from '~/composables/usePersonaCache';

// Default values for synthesis parameters, can be adjusted
const DEFAULT_SYNTHESIS_PARAMS: ApiSynthesisParams = {
  temperature: 0.7,
  speed: 1.0,
  // ElevenLabs specific (provide sensible defaults or leave undefined)
  stability: 0.5,
  similarity_boost: 0.75,
  // Volcengine specific (provide sensible defaults or leave undefined)
  pitch: 0, // Assuming 0 is a neutral default for Volcengine pitch
  volume: 1.0, // Assuming 1.0 is a neutral default for Volcengine volume
};

export const usePlaygroundUnifiedStore = defineStore('playgroundUnified', {
  state: () => ({
    // UI form data, initialized with some defaults
    podcastSettings: {
      title: '',
      topic: '',
      numberOfSegments: 3, // Default, can be adjusted by UI
      style: '',
      keywords: [],
      hostPersonaId: undefined as number | undefined,
      guestPersonaIds: [] as number[],
      backgroundMusic: undefined as string | undefined,
      ttsProvider: 'elevenlabs' as 'elevenlabs' | 'volcengine',
    } as FullPodcastSettings,
    
    scriptContent: '', // Raw script text from the textarea
    
    synthesisParams: { ...DEFAULT_SYNTHESIS_PARAMS } as ApiSynthesisParams,
    
    parsedSegments: [] as ScriptSegment[], // Script parsed into segments with Persona IDs
    
    apiResponse: null as PodcastCreateResponse | null, // To store response from backend script processing
    synthesisApiResponse: null as any | null, // To store response from backend audio synthesis

    isLoading: false,
    currentStep: 1, // Or your default starting step
    error: null as string | null,
  }),
  
  getters: {
    // Builds the request object for the backend API
    apiRequest(): PodcastCreateRequest | null {
      if (!this.podcastSettings.hostPersonaId) {
        console.warn('Host Persona ID is not set. Cannot build API request.');
        // Optionally set an error state here or handle it in the calling action
        return null; 
      }
      return {
        podcastTitle: this.podcastSettings.title || 'Untitled Podcast',
        script: this.parsedSegments,
        hostPersonaId: this.podcastSettings.hostPersonaId as number, // Assumed to be valid number by this point
        guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => typeof id === 'number') as number[],
        language: this.determineLanguage(), // Needs implementation
        ttsProvider: this.podcastSettings.ttsProvider || 'elevenlabs',
        synthesisParams: this.synthesisParams,
        topic: this.podcastSettings.topic,
        keywords: this.podcastSettings.keywords,
        style: this.podcastSettings.style,
        // museumId, galleryId, objectId can be added if available in podcastSettings
      };
    },

    totalSelectedPersonas(): number[] {
      const ids = new Set<number>();
      if (this.podcastSettings.hostPersonaId) {
        ids.add(this.podcastSettings.hostPersonaId as number);
      }
      this.podcastSettings.guestPersonaIds.forEach(id => {
        if (typeof id === 'number') ids.add(id);
      });
      return Array.from(ids);
    }
  },
  
  actions: {
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      this.podcastSettings = {
        ...this.podcastSettings,
        ...settings,
        // Ensure guestPersonaIds remains an array of numbers if updated
        guestPersonaIds: settings.guestPersonaIds 
          ? settings.guestPersonaIds.map(id => typeof id === 'string' ? parseInt(id, 10) : id).filter(id => typeof id === 'number') as number[] 
          : this.podcastSettings.guestPersonaIds,
        hostPersonaId: typeof settings.hostPersonaId === 'string' 
          ? parseInt(settings.hostPersonaId, 10) 
          : settings.hostPersonaId === undefined ? this.podcastSettings.hostPersonaId : settings.hostPersonaId
      };
    },
    
    updateScriptContent(content: string) {
      this.scriptContent = content;
      this.parseScript(); // Automatically parse when script content changes
    },
    
    updateSynthesisParams(params: Partial<ApiSynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params,
      };
    },
    
    // Parses the raw scriptContent into ScriptSegment objects
    parseScript() {
      if (!this.scriptContent.trim()) {
        this.parsedSegments = [];
        return;
      }
      
      const { getPersonaByName, fetchPersonas, personas } = usePersonaCache();
      // Ensure personas are loaded, if not, try to fetch them.
      // This is a simplified approach; a more robust solution might involve awaiting fetchPersonas if personas.value is empty.
      if (personas.value.length === 0) {
        console.warn('Personas not yet loaded. Attempting to fetch for script parsing...');
        fetchPersonas(); // Fire and forget, or await if critical for immediate parsing
        // If awaiting, this action would need to be async and UI should handle loading state
      }

      const lines = this.scriptContent.split('\n');
      const segments: ScriptSegment[] = [];
      let currentSpeakerName = '';
      let currentTextLines: string[] = [];

      const defaultPersonaId = this.podcastSettings.hostPersonaId || 
                               (this.podcastSettings.guestPersonaIds.length > 0 ? this.podcastSettings.guestPersonaIds[0] : undefined);

      for (const line of lines) {
        const speakerMatch = line.match(/^([^:]+):\s*(.*)$/); // Matches "Speaker Name: Text"
        
        if (speakerMatch) {
          // If there was a previous speaker, save their segment
          if (currentSpeakerName && currentTextLines.length > 0) {
            const speakerPersona = getPersonaByName(currentSpeakerName);
            segments.push({
              speaker: currentSpeakerName,
              // Use found persona ID, or fallback to host/first guest, or a placeholder if none
              speakerPersonaId: speakerPersona?.persona_id || defaultPersonaId || 0, // Fallback to 0 if no persona found/selected
              text: currentTextLines.join(' ').trim(),
            });
          }
          
          // Start new segment
          currentSpeakerName = speakerMatch[1].trim();
          currentTextLines = speakerMatch[2].trim() ? [speakerMatch[2].trim()] : [];
        } else if (currentSpeakerName) {
          // Continue current speaker's segment
          if (line.trim()) {
            currentTextLines.push(line.trim());
          }
        }
        // Ignore lines before the first speaker is defined
      }
      
      // Save the last segment after loop finishes
      if (currentSpeakerName && currentTextLines.length > 0) {
        const speakerPersona = getPersonaByName(currentSpeakerName);
        segments.push({
          speaker: currentSpeakerName,
          speakerPersonaId: speakerPersona?.persona_id || defaultPersonaId || 0, // Fallback
          text: currentTextLines.join(' ').trim(),
        });
      }
      
      this.parsedSegments = segments;
      if (segments.length === 0 && this.scriptContent.trim()) {
        console.warn('Script content provided, but no segments were parsed. Check script format.');
      }
    },
    
    // Placeholder for language determination logic
    determineLanguage(): string {
      // TODO: Implement robust language detection based on content or settings
      // For now, try to infer from host persona if available, else default to 'zh-CN' or 'en-US'
      const { getPersonaById, personas } = usePersonaCache();
      if (this.podcastSettings.hostPersonaId) {
         if (personas.value.length === 0) fetchPersonas(); // Ensure personas are available
        const hostPersona = getPersonaById(this.podcastSettings.hostPersonaId);
        if (hostPersona && hostPersona.language_support && hostPersona.language_support.length > 0) {
          return hostPersona.language_support[0]; // Take the first supported language of the host
        }
      }
      return 'zh-CN'; // Default language
    },
    
    // Action to process the script via backend API
    async generateScript() {
      this.isLoading = true;
      this.error = null;
      this.apiResponse = null;
      
      const requestBody = this.apiRequest;
      if (!requestBody) {
        this.error = 'Failed to build API request. Host persona might be missing.';
        this.isLoading = false;
        return;
      }
      
      try {
        const response = await $fetch<PodcastCreateResponse>('/api/podcast/process/script', {
          method: 'POST',
          body: requestBody,
        });
        this.apiResponse = response;
        if (!response.success) {
            this.error = response.message || 'Script processing failed.';
        }
        // Optionally, update parsedSegments if backend modified them: this.parsedSegments = response.preparedSegments;
      } catch (e: any) {
        console.error('Error generating script:', e);
        this.error = e.data?.message || e.message || 'An unknown error occurred during script generation.';
      } finally {
        this.isLoading = false;
      }
    },
    
    // Action to synthesize audio via backend API
    async synthesizeAudio() {
      if (!this.apiResponse?.success || !this.apiResponse.podcastId || !this.apiResponse.preparedSegments) {
        this.error = 'Cannot synthesize audio. Previous script processing step failed or returned invalid data.';
        return;
      }
      
      this.isLoading = true;
      this.error = null;
      this.synthesisApiResponse = null;
      
      try {
        // This request structure depends on your /api/podcast/process/synthesize endpoint
        const synthesisRequest = {
          podcastId: this.apiResponse.podcastId,
          segments: this.apiResponse.preparedSegments.map(s => ({ // Ensure segments match expected structure
            segmentIndex: s.segmentIndex,
            text: s.text,
            speakerPersonaId: s.speakerPersonaId,
            // speakerName might not be needed by synthesize endpoint if it only uses speakerPersonaId
          })),
          ttsProvider: this.podcastSettings.ttsProvider,
          synthesisParams: this.synthesisParams, 
        };
        
        const response = await $fetch<any>('/api/podcast/process/synthesize', { // Replace 'any' with actual response type
          method: 'POST',
          body: synthesisRequest,
        });
        this.synthesisApiResponse = response;
        // Handle success/failure of synthesis based on response structure
      } catch (e: any) {
        console.error('Error synthesizing audio:', e);
        this.error = e.data?.message || e.message || 'An unknown error occurred during audio synthesis.';
      } finally {
        this.isLoading = false;
      }
    },

    // Utility to select a Persona and update settings
    selectHostPersona(personaId: number) {
        this.updatePodcastSettings({ hostPersonaId: personaId });
        // Optional: if guest list contains new host, remove them from guests
        if (this.podcastSettings.guestPersonaIds.includes(personaId)) {
            this.updatePodcastSettings({
                guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => id !== personaId)
            });
        }
    },

    addGuestPersona(personaId: number) {
        if (personaId === this.podcastSettings.hostPersonaId) return; // Cannot add host as guest
        if (!this.podcastSettings.guestPersonaIds.includes(personaId)) {
            this.updatePodcastSettings({ 
                guestPersonaIds: [...this.podcastSettings.guestPersonaIds, personaId]
            });
        }
    },

    removeGuestPersona(personaId: number) {
        this.updatePodcastSettings({
            guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => id !== personaId)
        });
    },

    resetPlaygroundState() {
      this.podcastSettings = {
        title: '',
        topic: '',
        numberOfSegments: 3,
        style: '',
        keywords: [],
        hostPersonaId: undefined as number | undefined,
        guestPersonaIds: [] as number[],
        backgroundMusic: undefined as string | undefined,
        ttsProvider: 'elevenlabs' as 'elevenlabs' | 'volcengine',
      };
      this.scriptContent = '';
      this.synthesisParams = { ...DEFAULT_SYNTHESIS_PARAMS };
      this.parsedSegments = [];
      this.apiResponse = null;
      this.synthesisApiResponse = null;
      this.isLoading = false;
      this.currentStep = 1;
      this.error = null;
    }
  }
}); 