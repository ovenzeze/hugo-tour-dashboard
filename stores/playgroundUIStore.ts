// stores/playgroundUIStore.ts
import { defineStore, storeToRefs } from 'pinia';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundScriptStore } from '~/stores/playgroundScriptStore';
import { usePlaygroundProcessStore } from '~/stores/playgroundProcessStore';
import { usePersonaCache } from '~/composables/usePersonaCache';
import type { Persona } from '~/types/persona';
import type { ScriptSegment } from '~/types/api/podcast'; // Added for segment.personaMatchStatus

// Define the structure for assigned voice performance details
export interface AssignedVoicePerformance {
  voice_id?: string;
  voice_model_identifier?: string | null;
  persona_name?: string;
  persona_id?: number;
  tts_provider?: string | null;
  match_status?: 'exact' | 'fallback' | 'none';
}

export const usePlaygroundUIStore = defineStore('playgroundUI', {
  state: () => ({
    currentStep: 1,
    aiScriptGenerationStep: 0,
    aiScriptGenerationStepText: '', // English text
    audioUrl: null as string | null,
    finalAudioUrl: null as string | null,
    selectedPersonaIdForHighlighting: null as number | string | null,
    currentlyPreviewingSegmentIndex: null as number | null, // Added state for current preview
    isStep2ConfirmationDialogVisible: false, // Added state for this dialog
    createPodcastTrigger: 0,
    // UI-specific loading/error states can be added if needed,
    // distinct from processStore's API-specific states.
    // For example: isPageLoading: false, uiError: null as string | null,
  }),

  getters: {
    availableVoices(state): Persona[] {
      const { personas } = usePersonaCache();
      return personas.value;
    },

    assignedVoicePerformances(state): Record<string, AssignedVoicePerformance> {
      const scriptStore = usePlaygroundScriptStore();
      // Accessing parsedSegments directly from the store instance for reactivity within a getter
      const parsedSegmentsDirect = scriptStore.parsedSegments;
      const { getPersonaById } = usePersonaCache();
      
      const performances: Record<string, AssignedVoicePerformance> = {};

      if (!parsedSegmentsDirect || parsedSegmentsDirect.length === 0) {
        return performances;
      }

      for (const segment of parsedSegmentsDirect) {
        if (segment.speaker && !performances[segment.speaker]) {
          const personaId = segment.speakerPersonaId;
          // Cast segment to include personaMatchStatus if it's not in the base ScriptSegment type
          const matchStatus = (segment as ScriptSegment & { personaMatchStatus?: 'exact' | 'fallback' | 'none' }).personaMatchStatus;
          
          let details: AssignedVoicePerformance = {
            persona_name: segment.speaker, // Default to speaker tag if no persona found
            match_status: matchStatus || 'none',
          };

          if (personaId !== null && personaId !== undefined) {
            const persona = getPersonaById(personaId);
            if (persona) {
              details = {
                voice_id: persona.voice_id,
                voice_model_identifier: persona.voice_model_identifier,
                persona_name: persona.name,
                persona_id: persona.persona_id,
                tts_provider: persona.tts_provider,
                match_status: matchStatus || 'exact', // If personaId exists, assume exact or fallback
              };
            } else {
                 details.match_status = 'none'; // Persona ID existed but not found in cache
            }
          }
          performances[segment.speaker] = details;
        }
      }
      return performances;
    },
  },

  actions: {
    setCurrentStep(step: number) {
      this.currentStep = step;
    },

    setAiScriptGenerationProgress(step: number, text: string) {
      this.aiScriptGenerationStep = step;
      this.aiScriptGenerationStepText = text; // Should be English
    },

    resetAiScriptGenerationProgress() {
      this.aiScriptGenerationStep = 0;
      this.aiScriptGenerationStepText = '';
    },

    setAudioUrl(url: string | null) {
      this.audioUrl = url;
    },

    setFinalAudioUrl(url: string | null) {
      this.finalAudioUrl = url;
      if (url) { // If a final URL is set, make it the current playable URL
        this.audioUrl = url;
      }
    },

    setSelectedPersonaForHighlighting(id: number | string | null) {
      this.selectedPersonaIdForHighlighting = id;
    },

    setCurrentlyPreviewingSegmentIndex(index: number | null) {
      this.currentlyPreviewingSegmentIndex = index;
    },

    setStep2ConfirmationDialogVisible(isVisible: boolean) {
      this.isStep2ConfirmationDialogVisible = isVisible;
    },

    triggerCreatePodcast() {
      this.createPodcastTrigger++;
      // This action primarily increments the trigger.
      // The resetAllPlaygroundStates action should be called by a watcher or component
      // reacting to this trigger, or directly when a "new podcast" button is clicked.
      // For immediate reset upon trigger, call it here:
      // this.resetAllPlaygroundStates(); 
    },

    resetPlaygroundUIState() {
      this.currentStep = 1;
      this.aiScriptGenerationStep = 0;
      this.aiScriptGenerationStepText = '';
      this.audioUrl = null;
      this.finalAudioUrl = null;
      this.selectedPersonaIdForHighlighting = null;
      this.currentlyPreviewingSegmentIndex = null; // Reset on global reset
      this.isStep2ConfirmationDialogVisible = false; // Reset dialog visibility
      // createPodcastTrigger is usually not reset here, but incremented by triggerCreatePodcast
    },

    // Global reset action
    resetAllPlaygroundStates() {
      console.log('[resetAllPlaygroundStates] Resetting all playground stores...');
      usePlaygroundSettingsStore().$reset(); // Pinia's built-in $reset can be used if state is simple
      usePlaygroundScriptStore().resetScriptState();
      usePlaygroundProcessStore().resetProcessState();
      this.resetPlaygroundUIState();
      // Increment trigger AFTER reset to signal completion of reset if watched
      this.createPodcastTrigger++; 
      console.log('[resetAllPlaygroundStates] All playground stores have been reset.');
    },

    loadPresetScript(presetIdentifier: string = 'default') {
      const scriptStore = usePlaygroundScriptStore();
      let presetScript = '';
      
      // Ensure all preset scripts are in English
      switch (presetIdentifier) {
        case 'ai_discussion':
          presetScript = 'Host: Welcome to our AI discussion podcast.\nGuest: Glad to be here for this discussion.\nHost: Today we will talk about the future development of artificial intelligence.';
          break;
        case 'interview':
          presetScript = 'Interviewer: Welcome to today\'s interview show.\nGuest: Thanks for having me, it\'s a pleasure.\nInterviewer: Could you please share your background and experiences?';
          break;
        case 'educational':
          presetScript = 'Teacher: Welcome to today\'s educational podcast.\nStudent: Looking forward to today\'s lesson.\nTeacher: Today we will learn about a brand new topic.';
          break;
        default: // 'default' or any other identifier
          presetScript = 'Host: Welcome to our podcast show.\nGuest: Thanks for the invitation, glad to be here.\nHost: Let\'s start today\'s discussion.';
      }
      
      scriptStore.updateScriptContent(presetScript);
      // Optionally, reset other relevant UI states if loading a preset implies starting fresh
      // For example, reset currentStep to the script editing step
      // this.setCurrentStep(STEP_WHERE_SCRIPT_IS_EDITED);
      return presetScript;
    },
  },
});