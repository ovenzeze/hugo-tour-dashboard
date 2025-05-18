import { ref, computed } from 'vue';
import { usePlaygroundScriptStore } from '@/stores/playgroundScript';
import { usePlaygroundPersonaStore, type Persona } from '@/stores/playgroundPersona';
import { usePlaygroundSettingsStore } from '@/stores/playgroundSettings';
import { useScriptValidator } from '@/composables/useScriptValidator'; // Assuming path
import { toast } from 'vue-sonner';

export function usePlaygroundScript() {
  const scriptStore = usePlaygroundScriptStore();
  const personaStore = usePlaygroundPersonaStore();
  const settingsStore = usePlaygroundSettingsStore();
  const { isValidating, validateScript: originalValidateScript } = useScriptValidator(); // Renamed to avoid conflict

  const isScriptGenerating = ref(false); // Local script generation/processing state

  const mainEditorContent = computed({
    get: () => scriptStore.textToSynthesize,
    set: (value: string) => {
      scriptStore.updateTextToSynthesize(value);
    }
  });

  const highlightedScript = computed(() => {
    const script = scriptStore.textToSynthesize;
    const selectedPersonaId = personaStore.selectedPersonaIdForHighlighting;

    if (!script || selectedPersonaId === null) {
      return script;
    }

    const selectedPersona = personaStore.personas.find((p: Persona) => p.persona_id === selectedPersonaId);
    const selectedPersonaName = selectedPersona?.name;

    if (!selectedPersonaName) {
      return script;
    }

    const lines = script.split('\n');
    let highlightedHtml = '';

    lines.forEach(line => {
      if (line.trim().startsWith(`${selectedPersonaName}:`)) {
        highlightedHtml += `<p class="bg-yellow-200 dark:bg-yellow-800 p-1 rounded">${line}</p>`;
      } else {
        highlightedHtml += `<p>${line}</p>`;
      }
    });
    return highlightedHtml;
  });

  async function handleToolbarGenerateScript() {
    console.log('[usePlaygroundScript] Setting isScriptGenerating to true');
    isScriptGenerating.value = true;
    try {
      console.log('[usePlaygroundScript] Calling scriptStore.generateScript()');
      // Fetch necessary data for generateScript action
      const hostPersonaId = settingsStore.podcastSettings.hostPersonaId;
      const hostPersona = hostPersonaId ? personaStore.personas.find(p => p.persona_id === Number(hostPersonaId)) : undefined;
      
      const guestPersonas = (settingsStore.podcastSettings.guestPersonaIds || [])
        .map(id => personaStore.personas.find(p => p.persona_id === Number(id)))
        .filter(p => p !== undefined) as Persona[];

      const generatedScriptResponse = await scriptStore.generateScript(settingsStore.podcastSettings, hostPersona, guestPersonas);
      console.log('[usePlaygroundScript] scriptStore.generateScript() finished');
      
      if (generatedScriptResponse && !scriptStore.scriptGenerationError) {
        // Update settingsStore with AI response if successful
        settingsStore.updateFullPodcastSettings({
          title: generatedScriptResponse.podcastTitle,
          topic: generatedScriptResponse.topic,
          style: generatedScriptResponse.style,
          keywords: generatedScriptResponse.keywords,
          numberOfSegments: generatedScriptResponse.numberOfSegments,
          language: generatedScriptResponse.language,
          // hostPersonaId and guestPersonaIds are usually set by user, AI might suggest but user confirms
        });
        toast.success("Script generated and settings updated!");
      } else if (scriptStore.scriptGenerationError) {
        // Error is already toasted by the store action
      }
    } catch (error) {
      console.error("[usePlaygroundScript] Error during handleToolbarGenerateScript:", error);
      toast.error(`Failed to generate script: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      console.log('[usePlaygroundScript] Setting isScriptGenerating to false in finally block');
      isScriptGenerating.value = false;
    }
  }

  function handleUsePresetScript() {
    scriptStore.usePresetScript();
    // toast.success("Preset script loaded. Please review the content."); // Toast is in store action
  }

  function parseScriptToSegments(content: string): Array<{ speaker: string, text: string }> {
    if (!content) return [];
    return content
      .split('\n')
      .map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex <= 0) return null;
        const speaker = line.substring(0, colonIndex).trim();
        const text = line.substring(colonIndex + 1).trim();
        return { speaker, text };
      })
      .filter(segment => segment && segment.speaker && segment.text) as Array<{ speaker: string, text: string }>;
  }

  async function initializeScript() {
    isScriptGenerating.value = true; // Re-using for loading state
    try {
      if (!scriptStore.textToSynthesize) {
        // Consider if a default script is still needed or if preset is preferred
        // scriptStore.updateTextToSynthesize(`Host: Welcome to the preset test environment.`);
        // toast.success("Default script loaded.");
        // For now, let's rely on usePresetScript or AI generation
      }
      // Validate if there's existing script; might be redundant if validation happens on demand
      // if (scriptStore.textToSynthesize) {
      //   // originalValidateScript() from useScriptValidator might need refactoring
      //   // as it internally uses the old playgroundStore.
      //   // For now, this initialization step might not need to auto-validate.
      // }
    } catch (err) {
      console.error('[usePlaygroundScript] Error initializing script:', err);
      toast.error(`Failed to initialize script: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      isScriptGenerating.value = false;
    }
  }
  
  // Exposing isValidating from useScriptValidator for convenience if needed by the component
  // Note: The validateScript function from useScriptValidator likely needs refactoring
  // as it uses the old playgroundStore.
  // The one in scriptStore.validateScript is the refactored version.
  return {
    isScriptGenerating,
    mainEditorContent,
    highlightedScript,
    isValidating, // from useScriptValidator (might be stale if not refactored)
    validateScript: scriptStore.validateScript, // Use the new store's validateScript
    handleToolbarGenerateScript,
    handleUsePresetScript,
    parseScriptToSegments,
    initializeScript,
  };
}