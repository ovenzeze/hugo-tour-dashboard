// stores/playgroundUIStore.ts
import { defineStore } from 'pinia';
import { usePlaygroundSettingsStore } from './playgroundSettingsStore';
import { usePlaygroundScriptStore } from './playgroundScriptStore';
import { usePlaygroundProcessStore } from './playgroundProcessStore';

export const usePlaygroundUIStore = defineStore('playgroundUI', {
  state: () => ({
    currentStep: 1,
    aiScriptGenerationStep: 0,
    aiScriptGenerationStepText: '', // English text
    audioUrl: null as string | null,
    finalAudioUrl: null as string | null,
    selectedPersonaIdForHighlighting: null as number | string | null,
    createPodcastTrigger: 0,
    // UI-specific loading/error states can be added if needed,
    // distinct from processStore's API-specific states.
    // For example: isPageLoading: false, uiError: null as string | null,
  }),

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