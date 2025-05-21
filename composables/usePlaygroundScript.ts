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

  const isScriptGenerating = ref(false); // Overall loading state
  const aiScriptStep = ref<0 | 1 | 2>(0); // 0=not started, 1=generating metadata, 2=generating script
  const aiScriptStepText = ref('');

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

  // Step-by-step AI script generation
  async function handleToolbarGenerateScript() {
    isScriptGenerating.value = true;
    aiScriptStep.value = 1;
    
    // Status text arrays - Step 1 (Metadata Generation)
    const step1StatusTexts = [
      'Selecting appropriate museum based on time period...',
      'Researching historical artifacts and exhibits...',
      'Identifying notable architectural features...',
      'Exploring cultural significance of the location...',
      'Discovering hidden stories behind the museum...',
      'Determining optimal podcast title for this museum...',
      'Mapping geographical and historical context...',
      'Analyzing cultural impact of selected artifacts...'
    ];
    
    // Status text arrays - Step 2 (Script Generation)
    const step2StatusTexts = [
      'Crafting engaging dialogue about museum exhibits...',
      'Weaving historical context into conversations...',
      'Developing character perspectives on artifacts...',
      'Incorporating lesser-known historical facts...',
      'Balancing educational content with entertainment...',
      'Creating narrative flow through museum spaces...',
      'Refining historical accuracy in dialogue...',
      'Polishing transitions between museum sections...'
    ];
    
    // Set initial status text
    aiScriptStepText.value = step1StatusTexts[0];
    
    // Create status text rotation function
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % (aiScriptStep.value === 1 ? step1StatusTexts.length : step2StatusTexts.length);
      aiScriptStepText.value = aiScriptStep.value === 1 
        ? step1StatusTexts[statusIndex] 
        : step2StatusTexts[statusIndex];
    }, 3000);
    
    try {
      // 保存用户设置的numberOfSegments值
      const userSetNumberOfSegments = settingsStore.podcastSettings.numberOfSegments;
      console.log('[handleToolbarGenerateScript] 保存用户设置的numberOfSegments:', userSetNumberOfSegments);
      
      // Step 1: Generate metadata
      const hostPersonaId = settingsStore.podcastSettings.hostPersonaId;
      const hostPersona = hostPersonaId ? personaStore.personas.find(p => p.persona_id === Number(hostPersonaId)) : undefined;
      const guestPersonas = (settingsStore.podcastSettings.guestPersonaIds || [])
        .map(id => personaStore.personas.find(p => p.persona_id === Number(id)))
        .filter(p => p !== undefined) as Persona[];

      // 创建一个新的设置对象，确保numberOfSegments值被正确传递
      const settingsWithUserSegments = {
        ...settingsStore.podcastSettings,
        numberOfSegments: userSetNumberOfSegments
      };
      console.log('[handleToolbarGenerateScript] 传递给API的设置:', settingsWithUserSegments);

      // 使用修改后的设置对象调用API
      const metaInfo = await scriptStore.generatePodcastMetaInfo?.(settingsWithUserSegments, hostPersona, guestPersonas);
      if (!metaInfo || scriptStore.scriptGenerationError) {
        throw new Error(scriptStore.scriptGenerationError || 'Failed to generate metadata');
      }
      
      // Optional: Update settingsStore/podcastSettings
      // 保留用户设置的numberOfSegments，不被AI返回的值覆盖
      settingsStore.updateFullPodcastSettings({
        title: metaInfo.podcastTitle,
        topic: metaInfo.topic,
        style: metaInfo.style,
        // 确保keywords是字符串数组
        keywords: typeof metaInfo.keywords === 'string' ? metaInfo.keywords.split(',').map(k => k.trim()) : metaInfo.keywords,
        // 如果用户已经设置了numberOfSegments，则使用用户设置的值
        numberOfSegments: userSetNumberOfSegments || metaInfo.numberOfSegments,
        language: metaInfo.language,
      });

      aiScriptStep.value = 2;
      aiScriptStepText.value = step2StatusTexts[0];

      // Step 2: Generate complete script using metadata
      // 再次确保使用用户设置的numberOfSegments
      const metaInfoWithUserSegments = {
        ...metaInfo,
        numberOfSegments: userSetNumberOfSegments
      };
      console.log('[handleToolbarGenerateScript] 传递给第二步API的设置:', metaInfoWithUserSegments);
      
      const generatedScriptResponse = await scriptStore.generateScriptFromMeta?.(metaInfoWithUserSegments, hostPersona, guestPersonas);
      if (generatedScriptResponse && !scriptStore.scriptGenerationError) {
        // Update settingsStore
        // 保留用户设置的numberOfSegments，不被AI返回的值覆盖
        settingsStore.updateFullPodcastSettings({
          title: generatedScriptResponse.podcastTitle,
          topic: generatedScriptResponse.topic,
          style: generatedScriptResponse.style,
          // 确保keywords是字符串数组
          keywords: typeof generatedScriptResponse.keywords === 'string' ? generatedScriptResponse.keywords.split(',').map(k => k.trim()) : generatedScriptResponse.keywords,
          // 如果用户已经设置了numberOfSegments，则使用用户设置的值
          numberOfSegments: userSetNumberOfSegments || generatedScriptResponse.numberOfSegments,
          language: generatedScriptResponse.language,
        });
        toast.success("Script generated successfully!", {
          description: "Podcast settings and script content have been updated."
        });
      } else {
        throw new Error(scriptStore.scriptGenerationError || 'Failed to generate script');
      }
      
      // 最后，再次强制设置用户的numberOfSegments值
      console.log('[handleToolbarGenerateScript] 最终强制设置numberOfSegments:', userSetNumberOfSegments);
      settingsStore.updateFullPodcastSettings({
        numberOfSegments: userSetNumberOfSegments
      });
    } catch (error) {
      toast.error(`AI script generation failed`, {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      clearInterval(statusInterval);
      isScriptGenerating.value = false;
      aiScriptStep.value = 0;
      aiScriptStepText.value = '';
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
    aiScriptStep,
    aiScriptStepText,
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
