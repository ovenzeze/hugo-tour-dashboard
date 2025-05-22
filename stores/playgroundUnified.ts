// stores/playgroundUnified.ts
import { defineStore } from 'pinia';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { ScriptSegment, PodcastCreateRequest, PodcastCreateResponse } from '~/types/api/podcast';
import type { FullPodcastSettings } from '~/types/playground'; // Assuming this type exists

export const usePlaygroundUnifiedStore = defineStore('playgroundUnified', {
  state: () => ({
    scriptContent: '',
    parsedSegments: [] as ScriptSegment[],
    podcastId: null as string | number | null,
    isLoading: false, // For script generation and other primary async ops
    isSynthesizing: false, // Specifically for audio synthesis processes
    error: null as string | null,
    
    // States mirrored from the mock in playground.vue for compatibility
    currentStep: 1, // Example: if managing steps within this store
    aiScriptGenerationStep: 0,
    aiScriptGenerationStepText: '',
    validationResult: null as any, // Or a more specific type if available
    audioUrl: null as string | null, // For final or preview audio

    // Podcast settings might be managed here or referenced from playgroundSettingsStore
    // For now, let's assume some local settings might be needed or a snapshot
    podcastSettingsSnapshot: {} as Partial<FullPodcastSettings>, 
    selectedPersonaIdForHighlighting: null as string | number | null, // from mock
  }),

  actions: {
    // --- Script and Parsing Actions ---
    updateScriptContent(content: string) {
      console.log('[playgroundUnified] updateScriptContent called with:', content);
      this.scriptContent = content;
      this.error = null; // Clear previous errors
      this.parseScript();
    },

    async parseScript() {
      console.log('[playgroundUnified] parseScript started. Current scriptContent length:', this.scriptContent.length);
      if (!this.scriptContent.trim()) {
        this.parsedSegments = [];
        this.error = null;
        console.log('[playgroundUnified] scriptContent is empty, parsedSegments cleared.');
        return;
      }

      const { getPersonaByName, fetchPersonas, personas } = usePersonaCache();
      const settingsStore = usePlaygroundSettingsStore();

      try {
        if (personas.value.length === 0) {
          console.log('[playgroundUnified] Personas cache is empty. Attempting to fetch...');
          await fetchPersonas();
          if (personas.value.length === 0) {
            console.warn('[playgroundUnified] Still no personas after fetch. Parsing may result in many fallbacks.');
          }
        }
      } catch (fetchError: any) {
        console.error('[playgroundUnified] Failed to fetch personas during script parsing:', fetchError.message);
        this.error = 'Failed to load persona data for script parsing. Please try again.';
        return; // Stop parsing if personas are critical and fetch failed
      }

      const lines = this.scriptContent.replace(/\r\n/g, '\n').split('\n'); // More robust line splitting
      const newSegments: ScriptSegment[] = [];
      let currentSpeakerName = '';
      let currentTextLines: string[] = [];
      
      const hostId = settingsStore.getHostPersonaIdNumeric; // Relies on getter from settings store
      const guestIds = settingsStore.getGuestPersonaIdsNumeric; // Relies on getter
      let fallbackPersonaId: number | undefined = hostId;
      if (fallbackPersonaId === undefined && guestIds.length > 0) {
        fallbackPersonaId = guestIds[0];
      }

      console.log(`[playgroundUnified] Parsing with fallbackPersonaId: ${fallbackPersonaId}`);

      for (const [index, line] of lines.entries()) {
        console.log(`[playgroundUnified] Parsing line ${index + 1}/${lines.length}: "${line}"`);
        const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);

        if (speakerMatch) {
          const newSpeaker = speakerMatch[1].trim();
          const newText = speakerMatch[2].trim();
          console.log(`[playgroundUnified] Line ${index + 1} matched. Speaker: "${newSpeaker}", Text: "${newText}"`);

          if (currentSpeakerName && currentTextLines.length > 0) {
            const speakerPersona = getPersonaByName(currentSpeakerName);
            console.log(`[playgroundUnified] Persona lookup for previous speaker "${currentSpeakerName}":`, speakerPersona ? `ID ${speakerPersona.persona_id}` : 'Not found');
            let personaIdToUse: number | undefined = speakerPersona?.persona_id;
            let matchStatus: 'exact' | 'fallback' | 'none' = 'none';

            if (speakerPersona) {
              matchStatus = 'exact';
            } else if (fallbackPersonaId !== undefined) {
              personaIdToUse = fallbackPersonaId;
              matchStatus = 'fallback';
              console.warn(`[playgroundUnified] No exact persona for "${currentSpeakerName}". Using fallback ID: ${fallbackPersonaId}.`);
            } else {
              console.warn(`[playgroundUnified] No exact persona for "${currentSpeakerName}" and no fallback ID available.`);
            }
            
            const segmentToPush = {
              speaker: currentSpeakerName,
              speakerPersonaId: personaIdToUse === undefined ? null : personaIdToUse,
              text: currentTextLines.join(' ').trim(),
              personaMatchStatus: matchStatus,
            };
            console.log('[playgroundUnified] Pushing segment (from previous speaker):', JSON.parse(JSON.stringify(segmentToPush)));
            // @ts-ignore
            newSegments.push(segmentToPush);
          }
          
          currentSpeakerName = newSpeaker;
          currentTextLines = newText ? [newText] : [];
          console.log(`[playgroundUnified] Updated currentSpeakerName: "${currentSpeakerName}", currentTextLines:`, JSON.parse(JSON.stringify(currentTextLines)));
        } else if (currentSpeakerName && line.trim()) {
          console.log(`[playgroundUnified] Line ${index + 1} is continuation for "${currentSpeakerName}". Adding text: "${line.trim()}"`);
          currentTextLines.push(line.trim());
        } else {
          console.log(`[playgroundUnified] Line ${index + 1} skipped (no speaker match or not a continuation): "${line}"`);
        }
      }
      
      if (currentSpeakerName && currentTextLines.length > 0) {
        console.log(`[playgroundUnified] Processing last segment for speaker "${currentSpeakerName}"`);
        const speakerPersona = getPersonaByName(currentSpeakerName);
        console.log(`[playgroundUnified] Persona lookup for last speaker "${currentSpeakerName}":`, speakerPersona ? `ID ${speakerPersona.persona_id}` : 'Not found');
        let personaIdToUse: number | undefined = speakerPersona?.persona_id;
        let matchStatus: 'exact' | 'fallback' | 'none' = 'none';

        if (speakerPersona) {
          matchStatus = 'exact';
        } else if (fallbackPersonaId !== undefined) {
          personaIdToUse = fallbackPersonaId;
          matchStatus = 'fallback';
          console.warn(`[playgroundUnified] No exact persona for last speaker "${currentSpeakerName}". Using fallback ID: ${fallbackPersonaId}.`);
        } else {
           console.warn(`[playgroundUnified] No exact persona for last speaker "${currentSpeakerName}" and no fallback ID available.`);
        }
        const lastSegmentToPush = {
          speaker: currentSpeakerName,
          speakerPersonaId: personaIdToUse === undefined ? null : personaIdToUse,
          text: currentTextLines.join(' ').trim(),
          personaMatchStatus: matchStatus,
        };
        console.log('[playgroundUnified] Pushing last segment:', JSON.parse(JSON.stringify(lastSegmentToPush)));
        // @ts-ignore
        newSegments.push(lastSegmentToPush);
      }
      
      this.parsedSegments = newSegments;
      console.log('[playgroundUnified] parseScript finished. Parsed segments:', JSON.parse(JSON.stringify(newSegments)));
      if (newSegments.length === 0 && this.scriptContent.trim()) {
        const parseWarning = 'Script content provided, but no segments were parsed. Please check script format (e.g., "Speaker Name: Text").';
        console.warn(`[playgroundUnified] ${parseWarning}`);
        this.error = parseWarning;
      } else {
        this.error = null;
      }
    },

    async generateScript() {
      console.log('[playgroundUnified] generateScript action started.');
      this.isLoading = true;
      this.error = null;
      this.podcastId = null;
      console.log(`[playgroundUnified] Initial state: isLoading=${this.isLoading}, error=${this.error}, scriptContentEmpty=${!this.scriptContent.trim()}`);

      const settingsStore = usePlaygroundSettingsStore();
      const personaCache = usePersonaCache();
      console.log(`[playgroundUnified] SettingsStore hostPersonaId (state): ${settingsStore.hostPersonaId}`);
      console.log(`[playgroundUnified] PersonaCache available personas count: ${personaCache.personas.value.length}`);

      // 1. Auto-select content if empty
      if (!this.scriptContent.trim()) {
        const defaultScript = 'Host: Welcome to the podcast! Today we discuss the future of AI.\nGuest: Thanks for having me! AI is a fascinating topic.';
        console.log('[playgroundUnified] Script content is empty. Setting default content:', defaultScript);
        this.scriptContent = defaultScript;
        // No need to call updateScriptContent, parseScript will be called below.
      }
      
      // Ensure personas are loaded before attempting to use them for fallback or selection
      if (personaCache.personas.value.length === 0) {
        console.log('[playgroundUnified] Personas cache empty in generateScript, attempting to fetch...');
        try {
          await personaCache.fetchPersonas();
          if (personaCache.personas.value.length === 0) {
            this.error = "No personas available to assign for script generation. Please add personas or check persona service.";
            this.isLoading = false;
            console.error('[playgroundUnified] No personas available after fetch. Cannot proceed.');
            return;
          }
          console.log(`[playgroundUnified] Personas fetched. Count: ${personaCache.personas.value.length}`);
        } catch (e: any) {
          this.error = `Failed to fetch personas for script generation: ${e.message}`;
          this.isLoading = false;
          console.error('[playgroundUnified] Error fetching personas:', e);
          return;
        }
      }
      
      // Call parseScript AFTER potentially setting default content
      // and ensuring personas are available for fallback logic within parseScript
      console.log('[playgroundUnified] Calling parseScript...');
      await this.parseScript(); // Ensure segments are up-to-date
      console.log('[playgroundUnified] parseScript finished. Parsed segments count:', this.parsedSegments.length, 'Error after parse:', this.error);


      // 2. Auto-select host persona if not set
      let hostPersonaId = settingsStore.getHostPersonaIdNumeric; // This getter already has random fallback
      console.log(`[playgroundUnified] Host persona ID from getter: ${hostPersonaId}`);
      
      if (hostPersonaId === undefined) {
        // This case implies the getter's random selection also failed (e.g., no personas in cache even after fetch attempt)
        console.error('[playgroundUnified] Host persona ID is undefined. This usually means no personas are available in the cache for the getter to select from.');
        this.error = "A host persona could not be automatically assigned. Please ensure personas are available and loaded.";
        this.isLoading = false;
        return;
      }
      
      // Optional: Persist the automatically selected hostPersonaId back to the settingsStore
      // This makes the UI reflect the auto-selection if the original state was null/undefined.
      if (settingsStore.hostPersonaId !== hostPersonaId) {
          console.log(`[playgroundUnified] Automatically selected host persona ID ${hostPersonaId} differs from settings store state (${settingsStore.hostPersonaId}). Updating settings store.`);
          settingsStore.setHostPersonaId(hostPersonaId);
      }

      // 3. Build API Request
      const apiRequest: PodcastCreateRequest = {
        podcastTitle: settingsStore.podcastSettings.title || `Podcast about ${this.scriptContent.substring(0,30)}...` || 'Untitled Podcast from AI',
        script: this.parsedSegments,
        hostPersonaId: hostPersonaId, // Already numeric from getter
        guestPersonaIds: settingsStore.getGuestPersonaIdsNumeric, // Already numeric from getter
        language: settingsStore.podcastSettings.language || personaCache.getPersonaById(hostPersonaId)?.language_support?.[0] || 'en-US',
        ttsProvider: settingsStore.podcastSettings.ttsProvider || 'elevenlabs',
        synthesisParams: settingsStore.synthesisParams,
        topic: settingsStore.podcastSettings.topic || this.scriptContent.substring(0, 100), // Simple topic from script
        keywords: settingsStore.podcastSettings.keywords || [],
        style: settingsStore.podcastSettings.style || 'discussion',
      };

      console.log('[playgroundUnified] API Request for /script:', JSON.parse(JSON.stringify(apiRequest)));

      if (apiRequest.script.length === 0) {
          this.error = "Cannot generate script: No valid script segments were parsed from the content.";
          this.isLoading = false;
          console.error('[playgroundUnified] Attempted to generate script with no parsed segments.');
          return;
      }
      if (apiRequest.hostPersonaId === undefined) {
          this.error = "Cannot generate script: Host Persona ID is missing.";
          this.isLoading = false;
          console.error('[playgroundUnified] Attempted to generate script with no host persona ID.');
          return;
      }


      try {
        const fetchOptions = {
          method: 'POST' as const,
          body: apiRequest,
          headers: { // Adding headers as a good practice, though not directly for the TS error
            'Content-Type': 'application/json',
          }
        };
        const response = await $fetch<PodcastCreateResponse>('/api/podcast/process/script', fetchOptions);
        console.log('[playgroundUnified] /script API Response:', response);
        if (response.success && response.podcastId) {
          this.podcastId = response.podcastId;
          // Potentially update other stores or states based on response
        } else {
          this.error = response.message || 'Script processing API returned an error.';
        }
      } catch (err: any) {
        console.error('[playgroundUnified] Error calling /script API:', err.data || err.message || err);
        this.error = err.data?.message || err.message || 'Failed to process script via API. Check console for more details.';
      } finally {
        this.isLoading = false;
        console.log(`[playgroundUnified] generateScript finished. isLoading: ${this.isLoading}, Error: ${this.error}, PodcastId: ${this.podcastId}`);
      }
    },

    // --- Other Actions (mirrored from mock or common needs) ---
    clearError() {
      this.error = null;
    },

    resetPlaygroundState() {
      console.log('[playgroundUnified] resetPlaygroundState called.');
      this.scriptContent = '';
      this.parsedSegments = [];
      this.podcastId = null;
      this.isLoading = false;
      this.isSynthesizing = false;
      this.error = null;
      this.currentStep = 1;
      this.aiScriptGenerationStep = 0;
      this.aiScriptGenerationStepText = '';
      this.validationResult = null;
      this.audioUrl = null;
      this.podcastSettingsSnapshot = {};
      this.selectedPersonaIdForHighlighting = null;
      // Also reset settings store if appropriate
      // usePlaygroundSettingsStore().$reset(); // Or a specific reset action
    },

    setFinalAudioUrl(url: string | null) {
      this.audioUrl = url;
    },

    // Mocked/Placeholder synthesize actions from playground.vue - to be implemented fully later
    async synthesizeAudio(options?: any) {
      console.warn('[playgroundUnified] synthesizeAudio (mock) called', options);
      this.isSynthesizing = true;
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      this.isSynthesizing = false;
      // this.audioUrl = '/audio_example/placeholder_full_audio.mp3'; // Example
      // this.error = "Full synthesis not yet implemented in unified store.";
      return {
        success: false,
        finalAudioUrl: null,
        message: "Full synthesis not yet implemented.",
        successfulSegments: 0, // Added for type consistency
        failedSegments: 0,     // Added for type consistency
        totalSegments: 0       // Added for type consistency
      };
    },

    async synthesizeAudioPreviewForAllSegments(validationResult: any, podcastSettings: any, speakerAssignments: any) {
      console.warn('[playgroundUnified] synthesizeAudioPreviewForAllSegments (mock) called', { validationResult, podcastSettings, speakerAssignments });
      this.isSynthesizing = true; // Use general synthesizing flag
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      this.isSynthesizing = false;
      // this.error = "Segment preview not yet implemented in unified store.";
      return { successfulSegments: 0, failedSegments: 0, totalSegments: 0, message: "Segment preview not yet implemented." };
    },

    // Action to update selectedPersonaIdForHighlighting (from mock)
    setSelectedPersonaIdForHighlighting(id: string | number | null) {
        this.selectedPersonaIdForHighlighting = id;
    }
  },

  getters: {
    // Basic getters, can be expanded
    isScriptEmpty: (state): boolean => !state.scriptContent.trim(),
    hasParsingError: (state): boolean => state.error !== null && state.error.includes('parse'), // Example
    // Getter for scriptContent (from mock)
    currentScriptContent: (state) => state.scriptContent,
    // Getter for audioUrl (from mock)
    currentAudioUrl: (state) => state.audioUrl,
    // Getter for isLoading (from mock)
    isCurrentlyLoading: (state) => state.isLoading,
    // Getter for currentStep (from mock)
    currentPlaygroundStep: (state) => state.currentStep,
    // Getter for aiScriptGenerationStep (from mock)
    currentAiScriptStep: (state) => state.aiScriptGenerationStep,
    // Getter for aiScriptGenerationStepText (from mock)
    currentAiScriptStepText: (state) => state.aiScriptGenerationStepText,
    // Getter for isSynthesizing (from mock)
    isCurrentlySynthesizing: (state) => state.isSynthesizing,
    // Getter for podcastId (from mock)
    currentPodcastId: (state) => state.podcastId,
    // Getter for validationResult (from mock)
    currentValidationResult: (state) => state.validationResult,
    // Getter for podcastSettingsSnapshot (from mock) - might need to be more specific
    currentPodcastSettingsSnapshot: (state) => state.podcastSettingsSnapshot,
    // Getter for error (from mock)
    currentError: (state) => state.error,
    // Getter for selectedPersonaIdForHighlighting (from mock)
    currentSelectedPersonaIdForHighlighting: (state) => state.selectedPersonaIdForHighlighting,
  },
});