// stores/playgroundScriptStore.ts
import { defineStore } from 'pinia';
import type { ScriptSegment } from '~/types/api/podcast';
import { usePersonaCache } from '~/composables/usePersonaCache';
import { usePlaygroundSettingsStore } from './playgroundSettingsStore'; // Import settings store for fallback IDs

export const usePlaygroundScriptStore = defineStore('playgroundScript', {
  state: () => ({
    scriptContent: '',
    parsedSegments: [] as ScriptSegment[],
    error: null as string | null,
  }),

  actions: {
    updateScriptContent(content: string) {
      this.scriptContent = content;
      this.error = null; // Clear previous parsing errors
      this.parseScript(); 
    },

    async parseScript() {
      if (!this.scriptContent.trim()) {
        this.parsedSegments = [];
        this.error = null;
        return;
      }

      const { getPersonaByName, fetchPersonas, personas } = usePersonaCache();
      const settingsStore = usePlaygroundSettingsStore();

      try {
        if (personas.value.length === 0) {
          console.warn('[parseScript] Personas cache is empty. Attempting to fetch...');
          await fetchPersonas();
          if (personas.value.length === 0) {
            console.warn('[parseScript] Still no personas after fetch. Parsing may result in many fallbacks.');
          }
        }
      } catch (fetchError: any) {
        console.error('[parseScript] Failed to fetch personas during script parsing:', fetchError.message);
        this.error = 'Failed to load persona data for script parsing. Please try again.';
        // Optionally, do not proceed with parsing if personas are critical and fetch failed.
        // For now, we'll proceed and rely on fallbacks.
      }

      const lines = this.scriptContent.split('\n');
      const newSegments: ScriptSegment[] = [];
      let currentSpeakerName = '';
      let currentTextLines: string[] = [];

      const hostId = settingsStore.getHostPersonaIdNumeric();
      const guestIds = settingsStore.getGuestPersonaIdsNumeric();
      let fallbackPersonaId: number | null = null;

      if (hostId !== undefined) {
        fallbackPersonaId = hostId;
      } else if (guestIds.length > 0) {
        fallbackPersonaId = guestIds[0];
      }

      for (const line of lines) {
        const speakerMatch = line.match(/^(.+?):\s*(.*)$/); // Matches "Speaker Name: Text"

        if (speakerMatch) {
          if (currentSpeakerName && currentTextLines.length > 0) {
            const speakerPersona = getPersonaByName(currentSpeakerName);
            let personaIdToUse: number | null = null;
            let matchStatus: 'exact' | 'fallback' | 'none' = 'none';

            if (speakerPersona) {
              personaIdToUse = speakerPersona.persona_id;
              matchStatus = 'exact';
            } else if (fallbackPersonaId !== null) {
              personaIdToUse = fallbackPersonaId;
              matchStatus = 'fallback';
              console.warn(`[parseScript] Persona not found for "${currentSpeakerName}". Using fallback ID: ${fallbackPersonaId}.`);
            } else {
              console.warn(`[parseScript] Persona not found for "${currentSpeakerName}" and no fallback ID available.`);
              matchStatus = 'none';
            }
            
            newSegments.push({
              speaker: currentSpeakerName,
              speakerPersonaId: personaIdToUse,
              text: currentTextLines.join(' ').trim(),
              // @ts-ignore - Allow adding custom property for UI hints
              personaMatchStatus: matchStatus,
            });
          }
          
          currentSpeakerName = speakerMatch[1].trim();
          currentTextLines = speakerMatch[2].trim() ? [speakerMatch[2].trim()] : [];
        } else if (currentSpeakerName) {
          // If a speaker is already active, append non-empty lines to their current text.
          if (line.trim()) {
            currentTextLines.push(line.trim());
          }
        }
        // Lines before the first speaker is defined are implicitly ignored.
      }
      
      // Save the last segment after loop finishes
      if (currentSpeakerName && currentTextLines.length > 0) {
        const speakerPersona = getPersonaByName(currentSpeakerName);
        let personaIdToUse: number | null = null;
        let matchStatus: 'exact' | 'fallback' | 'none' = 'none';

        if (speakerPersona) {
          personaIdToUse = speakerPersona.persona_id;
          matchStatus = 'exact';
        } else if (fallbackPersonaId !== null) {
          personaIdToUse = fallbackPersonaId;
          matchStatus = 'fallback';
          console.warn(`[parseScript] Persona not found for "${currentSpeakerName}". Using fallback ID: ${fallbackPersonaId}.`);
        } else {
          console.warn(`[parseScript] Persona not found for "${currentSpeakerName}" and no fallback ID available.`);
          matchStatus = 'none';
        }
        
        newSegments.push({
          speaker: currentSpeakerName,
          speakerPersonaId: personaIdToUse,
          text: currentTextLines.join(' ').trim(),
          // @ts-ignore
          personaMatchStatus: matchStatus,
        });
      }
      
      this.parsedSegments = newSegments;
      if (newSegments.length === 0 && this.scriptContent.trim()) {
        const parseWarning = 'Script content provided, but no segments were parsed. Please check script format (e.g., "Speaker Name: Text").';
        console.warn(`[parseScript] ${parseWarning}`);
        this.error = parseWarning;
      } else {
        this.error = null; // Clear error if parsing is successful or content is empty
      }
    },

    clearError() {
      this.error = null;
    },

    resetScriptState() {
      this.scriptContent = '';
      this.parsedSegments = [];
      this.error = null;
    },
  },
});