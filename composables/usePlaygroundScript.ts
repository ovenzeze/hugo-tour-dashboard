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

  const isScriptGenerating = ref(false); // 总 loading
  const aiScriptStep = ref<0 | 1 | 2>(0); // 0=未开始, 1=生成元信息, 2=生成脚本
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

  // 分步AI脚本生成
  async function handleToolbarGenerateScript() {
    isScriptGenerating.value = true;
    aiScriptStep.value = 1;
    aiScriptStepText.value = 'Step 1: 正在生成播客元信息...';
    try {
      // Step 1: 生成元信息
      const hostPersonaId = settingsStore.podcastSettings.hostPersonaId;
      const hostPersona = hostPersonaId ? personaStore.personas.find(p => p.persona_id === Number(hostPersonaId)) : undefined;
      const guestPersonas = (settingsStore.podcastSettings.guestPersonaIds || [])
        .map(id => personaStore.personas.find(p => p.persona_id === Number(id)))
        .filter(p => p !== undefined) as Persona[];

      // 假设 scriptStore.generatePodcastMetaInfo 返回元信息
      const metaInfo = await scriptStore.generatePodcastMetaInfo?.(settingsStore.podcastSettings, hostPersona, guestPersonas);
      if (!metaInfo || scriptStore.scriptGenerationError) {
        throw new Error(scriptStore.scriptGenerationError || '生成元信息失败');
      }
      // 可选：更新 settingsStore/podcastSettings
      settingsStore.updateFullPodcastSettings({
        title: metaInfo.podcastTitle,
        topic: metaInfo.topic,
        style: metaInfo.style,
        keywords: metaInfo.keywords,
        numberOfSegments: metaInfo.numberOfSegments,
        language: metaInfo.language,
      });

      aiScriptStep.value = 2;
      aiScriptStepText.value = 'Step 2: 正在生成完整播客脚本...';

      // Step 2: 用元信息生成完整脚本
      const generatedScriptResponse = await scriptStore.generateScriptFromMeta?.(metaInfo, hostPersona, guestPersonas);
      if (generatedScriptResponse && !scriptStore.scriptGenerationError) {
        // 更新 settingsStore
        settingsStore.updateFullPodcastSettings({
          title: generatedScriptResponse.podcastTitle,
          topic: generatedScriptResponse.topic,
          style: generatedScriptResponse.style,
          keywords: generatedScriptResponse.keywords,
          numberOfSegments: generatedScriptResponse.numberOfSegments,
          language: generatedScriptResponse.language,
        });
        toast.success("脚本生成成功，设置已更新！");
      } else {
        throw new Error(scriptStore.scriptGenerationError || '生成脚本失败');
      }
    } catch (error) {
      toast.error(`AI脚本生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
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
