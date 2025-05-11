import { defineStore } from 'pinia';
import { toast } from 'vue-sonner';
import type { Database, Tables } from '~/types/supabase'; // Ensure this path is correct

// Define Persona type based on your Supabase types
// If Persona is already globally defined or imported from a central types file, use that.
// For now, deriving from Tables<'personas'>.
export type Persona = Tables<'personas'>;

export interface SynthesisParams {
  temperature: number;
  speed: number;
}

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
}

export interface PlaygroundState {
  personas: Persona[];
  personasLoading: boolean;
  selectedPersonaId: number | null;
  createPodcast: boolean;
  selectedProvider: string | undefined; // e.g., 'elevenlabs'
  outputFilename: string;
  userInstruction: string;
  textToSynthesize: string;

  // Podcast specific settings
  elevenLabsProjectId: string;
  podcastName: string;
  selectedHostPersonaId: number | null;
  hostVoiceId: string;
  selectedGuestPersonaId: number | null;
  guestVoiceId: string;

  podcastSettings: FullPodcastSettings;

  synthesisParams: SynthesisParams;
  isGeneratingScript: boolean;
  scriptGenerationError: string | null;
  isSynthesizing: boolean; // For final audio synthesis
  synthesisError: string | null;
  audioUrl: string | null; // For final synthesized audio
  isPlaying: boolean; // For final audio player
  currentPreviewAbortController: AbortController | null; // For aborting preview stream
  isStreamingPreview: boolean; // Specifically for preview streaming status
  streamingPreviewError: string | null; // Error during preview streaming
}

export const usePlaygroundStore = defineStore('playground', {
  state: (): PlaygroundState => ({
    personas: [],
    personasLoading: false,
    selectedPersonaId: null,
    createPodcast: false,
    selectedProvider: 'elevenlabs', // Default provider
    outputFilename: '',
    userInstruction: "Create a script about Notre Dame Cathedral in Paris during the Renaissance. The discussion should involve three scholars:\n- Professor Armand: An established architectural historian, detailing the structural changes and Gothic-to-Renaissance transitions of the cathedral.\n- Dr. Vivienne: A passionate art historian, focusing on the new artworks, stained glass, and decorative elements introduced or influenced by the Renaissance.\n- Leo: A young, enthusiastic social historian, bringing to life the human stories, events, and daily activities around Notre Dame during this period.\nEnsure their dialogue reflects their respective expertise and perspectives, creating an engaging historical narrative.",
    textToSynthesize: '',
    elevenLabsProjectId: '',
    podcastName: '',
    selectedHostPersonaId: null,
    hostVoiceId: '',
    selectedGuestPersonaId: null,
    guestVoiceId: '',

    podcastSettings: {
      title: '',
      topic: "The Ethics of AI", // Default topic
      numberOfSegments: 3,
      style: 'casual',
      keywords: '',
      hostPersonaId: undefined,
      guestPersonaIds: [],
      backgroundMusic: 'none',
      elevenLabsProjectId: undefined,
    } as FullPodcastSettings,

    synthesisParams: {
      temperature: 0.5,
      speed: 1.0,
    },
    isGeneratingScript: false,
    scriptGenerationError: null,
    isSynthesizing: false,
    synthesisError: null,
    audioUrl: null,
    isPlaying: false,
    currentPreviewAbortController: null,
    isStreamingPreview: false,
    streamingPreviewError: null,
  }),
  getters: {
    getSelectedPersonaObject(state): Persona | null {
      if (!state.selectedPersonaId) return null;
      return state.personas.find(p => p.persona_id === state.selectedPersonaId) || null;
    },
    getSelectedHostPersonaObject(state): Persona | null {
      if (!state.selectedHostPersonaId) return null;
      return state.personas.find(p => p.persona_id === state.selectedHostPersonaId) || null;
    },
    getSelectedGuestPersonaObject(state): Persona | null {
      if (!state.selectedGuestPersonaId) return null;
      return state.personas.find(p => p.persona_id === state.selectedGuestPersonaId) || null;
    },
    // Example: can we preview or synthesize (standard mode)
    canPreviewOrSynthesize(state): boolean {
      return !!(state.textToSynthesize.trim() && state.selectedPersonaId !== null && !state.createPodcast);
    },
    // Example: can we generate a podcast script
    canGeneratePodcastScript(state): boolean {
      return !!(
        state.createPodcast &&
        state.podcastSettings.topic.trim() &&
        state.podcastSettings.elevenLabsProjectId?.trim() && // Optional chaining for safety
        state.podcastSettings.title.trim() &&
        state.podcastSettings.hostPersonaId !== null && state.podcastSettings.hostPersonaId !== undefined &&
        // state.hostVoiceId.trim() && // Voice ID is derived, so persona selection is key
        state.podcastSettings.guestPersonaIds.length > 0 // Example: require at least one guest for this getter logic
        // state.guestVoiceId.trim() // Voice ID is derived
      );
    }
  },
  actions: {
    async fetchPersonas() {
      if (this.personasLoading) return;
      this.personasLoading = true;
      try {
        // Assuming your API returns an array of Persona objects
        // The actual type from $fetch might be more complex, adjust if needed
        const data = await $fetch<Persona[]>('/api/personas?active=true', {
          headers: { 'Content-Type': 'application/json' },
        });
        this.personas = data;

        if (this.personas.length === 0) {
          toast.info('No active personas found.', {
            description: 'Please create or activate a persona first.',
          });
        } else {
          // Set default for general persona (if not already set and first persona exists)
          if (!this.selectedPersonaId && this.personas[0]?.persona_id) {
            this.selectedPersonaId = this.personas[0].persona_id;
          }
          // Set default for host persona (if not already set and first persona exists)
          if (!this.selectedHostPersonaId && this.personas[0]?.persona_id) {
            this.selectedHostPersonaId = this.personas[0].persona_id;
            // Also attempt to set hostVoiceId if persona has one
            const defaultHost = this.personas.find(p => p.persona_id === this.selectedHostPersonaId);
            if (defaultHost?.voice_model_identifier) {
              this.hostVoiceId = defaultHost.voice_model_identifier;
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch personas:', error);
        toast.error('Failed to load personas', {
          description: error.data?.message || error.message || 'Unknown error',
        });
        this.personas = []; // Reset or handle error state appropriately
      }
      this.personasLoading = false;
    },

    // Action to update userInstruction state
    updateUserInstruction(instruction: string) {
      this.userInstruction = instruction;
    },

    updateSelectedProvider(providerId: string | undefined) {
      this.selectedProvider = providerId;
    },

    updateSelectedHostPersonaId(personaId: number | null) {
      this.selectedHostPersonaId = personaId;
      // Optionally, also update hostVoiceId if the new persona has a voice_model_identifier
      const hostPersona = this.personas.find(p => p.persona_id === personaId);
      if (hostPersona?.voice_model_identifier) {
        this.hostVoiceId = hostPersona.voice_model_identifier;
      } else if (!personaId) { // If personaId is null, clear hostVoiceId
        this.hostVoiceId = '';
      }
    },

    updateSelectedGuestPersonaId(personaId: number | null) {
      this.selectedGuestPersonaId = personaId;
      // Optionally, also update guestVoiceId if the new persona has a voice_model_identifier
      const guestPersona = this.personas.find(p => p.persona_id === personaId);
      if (guestPersona?.voice_model_identifier) {
        this.guestVoiceId = guestPersona.voice_model_identifier;
      } else if (!personaId) { // If personaId is null, clear guestVoiceId
        this.guestVoiceId = '';
      }
    },

    updatePodcastName(name: string) {
      this.podcastName = name;
    },
    
    updateElevenLabsProjectId(projectId: string) {
      this.elevenLabsProjectId = projectId;
      this.podcastSettings.elevenLabsProjectId = projectId; // Sync with new structure
    },

    // Action to update the full podcast settings object
    updateFullPodcastSettings(settings: Partial<FullPodcastSettings>) {
      // Convert persona IDs from string to number where necessary before merging
      const parsePersonaId = (id: string | number | undefined): number | undefined => {
        if (id === undefined || id === null) return undefined;
        const numId = Number(id);
        return isNaN(numId) ? undefined : numId;
      };

      const processedSettings = { ...settings };
      if (settings.hostPersonaId !== undefined) {
        processedSettings.hostPersonaId = parsePersonaId(settings.hostPersonaId);
      }
      if (settings.guestPersonaIds !== undefined) {
        processedSettings.guestPersonaIds = settings.guestPersonaIds.map(parsePersonaId).filter(id => id !== undefined) as number[];
      }

      this.podcastSettings = { ...this.podcastSettings, ...processedSettings };
      
      // Update legacy individual fields for compatibility or if still used elsewhere directly
      if (processedSettings.title !== undefined) this.podcastName = processedSettings.title;
      if (processedSettings.topic !== undefined) this.userInstruction = processedSettings.topic; // Or a dedicated podcastTopic field
      if (processedSettings.elevenLabsProjectId !== undefined) this.elevenLabsProjectId = processedSettings.elevenLabsProjectId;
      if (processedSettings.hostPersonaId !== undefined && typeof processedSettings.hostPersonaId === 'number') {
         this.selectedHostPersonaId = processedSettings.hostPersonaId;
      }
      // For guestPersonaIds, the legacy selectedGuestPersonaId might represent the first guest or be deprecated.
      // For now, let's assume selectedGuestPersonaId and guestVoiceId will be managed based on the first guest in the new array.
      if (processedSettings.guestPersonaIds && processedSettings.guestPersonaIds.length > 0 && typeof processedSettings.guestPersonaIds[0] === 'number') {
        this.selectedGuestPersonaId = processedSettings.guestPersonaIds[0] as number;
      } else {
        this.selectedGuestPersonaId = null;
      }
    },

    // Action to update createPodcast state
    setCreatePodcast(value: boolean) {
      this.createPodcast = value;
      // Potentially reset parts of the state when switching modes
      if (value) { // Switched to podcast mode
        // this.selectedPersonaId = null; // Or keep it if useful
      } else { // Switched to standard mode
        // this.elevenLabsProjectId = '';
        // this.podcastName = '';
        // ... etc.
      }
    },

    async generateScript() {
      if (this.isGeneratingScript) return;
      this.isGeneratingScript = true;
      this.scriptGenerationError = null;
      try {
        const response = await $fetch<{ script: string }>('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { user_instruction: this.userInstruction },
        });
        this.textToSynthesize = response.script;
        toast.success('Script Generated', {
          description: 'The script has been successfully generated and populated.',
        });
      } catch (error: any) {
        console.error('Failed to generate script:', error);
        const errorMessage = error.data?.message || error.data?.statusMessage || error.message || 'An unknown error occurred.';
        this.scriptGenerationError = errorMessage;
        toast.error('Script Generation Failed', {
          description: errorMessage,
        });
      }
      this.isGeneratingScript = false;
    },

    async startStreamingPreview(): Promise<Response | undefined> {
      if (!this.textToSynthesize.trim()) {
        toast.error('Script content is empty. Please generate a script first or write one.');
        return;
      }

      let voiceIdToUse: string | null = null;
      const selectedPersona = this.getSelectedPersonaObject;

      if (this.createPodcast) {
        if (!this.hostVoiceId) { // Assuming preview uses host voice for now
            toast.error('Host voice ID is required for podcast preview.');
            return;
        }
        voiceIdToUse = this.hostVoiceId;
      } else {
        if (!selectedPersona?.voice_model_identifier) {
            toast.error('Selected persona does not have a valid voice model for standard synthesis preview.');
            return;
        }
        voiceIdToUse = selectedPersona.voice_model_identifier;
      }

      if (!voiceIdToUse) {
        toast.error('A voice ID is required to start the preview.');
        return;
      }

      this.isStreamingPreview = true;
      this.streamingPreviewError = null;

      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
      }
      this.currentPreviewAbortController = new AbortController();

      try {
        const response = await $fetch.raw('/api/tts/stream-preview', {
          method: 'POST',
          body: {
            text: this.textToSynthesize,
            voice_id: voiceIdToUse,
            // model_id: 'eleven_monolingual_v1', // Example, if needed
          },
          signal: this.currentPreviewAbortController.signal,
        });
        // Do not set isStreamingPreview to false here, stream is ongoing
        return response;
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Preview streaming aborted by user.');
          toast.info('Preview Aborted');
        } else {
          console.error('Failed to stream preview:', error);
          const errorMessage = error.data?.message || error.message || 'Unknown error during preview.';
          this.streamingPreviewError = errorMessage;
          toast.error('Preview Streaming Failed', { description: errorMessage });
        }
        this.isStreamingPreview = false;
        this.currentPreviewAbortController = null;
        return undefined;
      }
    },

    stopStreamingPreview() {
      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      this.isStreamingPreview = false;
      // Note: isPlaying for the main player should be handled separately if it's also used for preview.
      // For now, assuming preview has its own player or uses a temporary state.
    },

    async synthesizeFinalAudio() {
      if (!this.textToSynthesize.trim()) {
        toast.error('No script content available to synthesize.');
        return;
      }
      if (this.selectedPersonaId === null && !this.createPodcast) {
        toast.error('Please select a Persona before synthesizing in standard mode.');
        return;
      }
      if (this.createPodcast) {
        toast.info('Podcast generation flow not fully implemented here yet. Use standard synthesis for now or implement podcast synthesis.');
        // TODO: Implement podcast synthesis logic if different from standard
        // For now, preventing standard synthesis in podcast mode if it's not intended.
        return;
      }

      const currentPersonaId: number = this.selectedPersonaId!;
      const currentPersona = this.personas.find(p => p.persona_id === currentPersonaId);

      this.isSynthesizing = true;
      this.audioUrl = null;
      this.synthesisError = null;
      let createdGuideTextId: number | null = null;

      try {
        let languageToSave = 'en';
        if (currentPersona?.language_support && Array.isArray(currentPersona.language_support) && currentPersona.language_support.length > 0) {
          languageToSave = currentPersona.language_support[0];
        }

        const transcriptPayload = {
          transcript: this.textToSynthesize,
          persona_id: currentPersonaId,
          language: languageToSave,
          museum_id: 4, // Replace with actual museum_id if dynamic
          gallery_id: null, // Replace if applicable
          object_id: null,  // Replace if applicable
        };

        const createdTranscript = await $fetch<Tables<'guide_texts'>>('/api/transcripts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: transcriptPayload,
        });

        if (!createdTranscript || !createdTranscript.guide_text_id) {
          console.error('Error: guide_text_id is missing from savedTranscript!', createdTranscript);
          toast.error('Failed to save transcript or retrieve its ID.');
          this.isSynthesizing = false;
          return;
        }
        createdGuideTextId = createdTranscript.guide_text_id;
        toast.success('Transcript Saved', {
          description: `Transcript saved with ID: ${createdGuideTextId}`,
        });

        const ttsRequestBody: any = {
          text: this.textToSynthesize,
          personaId: currentPersonaId.toString(),
          guide_text_id: createdGuideTextId,
          providerId: this.selectedProvider || undefined,
          temperature: this.synthesisParams.temperature,
          speed: this.synthesisParams.speed,
        };

        if (this.outputFilename) {
          ttsRequestBody.outputFilename = this.outputFilename;
        }

        const ttsResponse = await $fetch<{ 
          guide_audio_id: number,
          public_audio_url: string,
          audio_duration: number,
          audio_file_name: string
        }>('/api/generate-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ttsRequestBody,
        });

        this.audioUrl = ttsResponse.public_audio_url;
        toast.success('Audio synthesized & saved!', {
          description: `Duration: ${ttsResponse.audio_duration.toFixed(2)}s. Audio ID: ${ttsResponse.guide_audio_id}. File: ${ttsResponse.audio_file_name}`,
        });
        this.isPlaying = false; // Reset play state for new audio
      } catch (e: any) {
        console.error('Synthesis process failed:', e);
        const errorMessage = e.data?.message || e.data?.statusMessage || e.message || 'An unknown error occurred during synthesis.';
        this.synthesisError = errorMessage;
        toast.error('Synthesis Error', { description: errorMessage });
      } finally {
        this.isSynthesizing = false;
      }
    },

    resetPlaygroundState() {
      // Revoke existing blob URL if it's for the main audio player
      // Preview player URL revocation should be handled by stopStreamingPreview or when a new preview starts.
      if (this.audioUrl && this.audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(this.audioUrl);
      }

      this.textToSynthesize = '';
      this.audioUrl = null;
      // this.userInstruction = ''; // Decided by user if this should be reset
      this.outputFilename = '';
      this.isGeneratingScript = false;
      this.scriptGenerationError = null;
      this.isSynthesizing = false;
      this.synthesisError = null;
      this.isStreamingPreview = false;
      this.streamingPreviewError = null;
      this.isPlaying = false;

      if (this.currentPreviewAbortController) {
        this.currentPreviewAbortController.abort();
        this.currentPreviewAbortController = null;
      }
      toast.info('Playground Reset', { description: 'Inputs and outputs have been cleared.' });
    },
  },
});
