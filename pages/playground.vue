<template>
  <div class="h-full w-full flex flex-col px-4 py-4 overflow-hidden">
    <!-- Top Section: Stepper -->
    <div class="mb-6">
      <Stepper v-model="currentStepIndex" class="block w-full max-w-3xl mx-auto">
        <div class="flex w-full flex-start gap-2">
          <StepperItem
            v-for="step in podcastSteps"
            :key="step.step"
            v-slot="{ state }"
            class="relative flex w-full flex-col items-center justify-center"
            :step="step.step"
          >
            <StepperSeparator
              v-if="step.step !== podcastSteps[podcastSteps.length - 1].step"
              class="absolute left-[calc(50%+20px)] right-[calc(-50%+10px)] top-5 block h-0.5 shrink-0 rounded-full bg-muted group-data-[state=completed]:bg-primary"
            />

            <StepperTrigger as-child>
              <Button
                :variant="state === 'completed' || state === 'active' ? 'default' : 'outline'"
                size="icon"
                class="z-10 rounded-full shrink-0"
                :class="[state === 'active' && 'ring-2 ring-ring ring-offset-2 ring-offset-background']"
              >
                <Icon v-if="state === 'completed'" name="ph:check" class="size-5" />
                <Icon v-if="state === 'active'" name="ph:circle" class="size-5" />
                <Icon v-if="state === 'inactive'" name="ph:dot" class="size-5" />
              </Button>
            </StepperTrigger>

            <div class="mt-5 flex flex-col items-center text-center">
              <StepperTitle
                :class="[state === 'active' && 'text-primary']"
                class="text-sm font-semibold transition lg:text-base"
              >
                {{ step.title }}
              </StepperTitle>
              <StepperDescription
                :class="[state === 'active' && 'text-primary']"
                class="sr-only text-xs text-muted-foreground transition md:not-sr-only lg:text-sm"
              >
                {{ step.description }}
              </StepperDescription>
            </div>
          </StepperItem>
        </div>
      </Stepper>
    </div>

    <!-- Bottom Section: Settings Panel (Left) and Editor/Output (Right) -->
    <div class="flex flex-col md:flex-row gap-x-8 gap-y-4 flex-1 min-h-0">
      <!-- Left Panel: Settings for Current Step -->
      <div class="flex flex-col space-y-6 min-h-0 overflow-y-auto pr-4 pb-4 border rounded-lg p-4 min-w-[300px]">
        <!-- Podcast Creation Steps Content -->
        <PodcastSettingsForm
          v-if="currentStepIndex === 1"
          v-model="playgroundStore.podcastSettings"
          :personas="playgroundStore.personas"
          :personas-loading="playgroundStore.personasLoading"
        />
        <VoicePerformanceSettings
          v-if="currentStepIndex === 2"
          v-model:scriptContent="playgroundStore.textToSynthesize"
          @next="onPerformanceSettingsNextForPodcast"
        />
        <AudioSynthesis
          v-if="currentStepIndex === 3"
          :performanceConfig="podcastPerformanceConfig === null ? undefined : podcastPerformanceConfig"
          :audio-url="playgroundStore.audioUrl === null ? undefined : playgroundStore.audioUrl"
          :is-synthesizing="playgroundStore.isSynthesizing"
          @synthesize="onSynthesizeAudioForPodcast"
          @download="handleDownloadCurrentAudio"
          :modelValue="playgroundStore.audioUrl || undefined"
          :scriptContent="playgroundStore.textToSynthesize"
          :synthesisParams="playgroundStore.synthesisParams"
          :isLoading="playgroundStore.isSynthesizing"
          @update:outputFilename="playgroundStore.updateOutputFilename"
        />
      </div>

      <!-- Right Panel: Editor & Output -->
        <Card class="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <PlaygroundV2Toolbar
          synthesis-mode="podcast"
          :current-step-index="currentStepIndex"
          :current-audio-url="playgroundStore.audioUrl"
          :is-generating="isGeneratingOverall"
          @generate-script="handleToolbarGenerateScript"
          @skip-script="handleToolbarSkipScript"
          @proceed-to-synthesis="handleToolbarProceedToSynthesis"
          @synthesize-podcast-audio="handleToolbarSynthesizePodcastAudio"
          @download-audio="handleDownloadCurrentAudio"
          @reset-view="resetPodcastView"
          @use-preset-script="handleUsePresetScript"
        />
          </CardHeader>
          <CardContent class="flex-1 p-2 flex flex-col">
            <!-- Textarea for editing when no persona is selected for highlighting -->
            <Textarea
              v-if="!playgroundStore.selectedPersonaIdForHighlighting"
              v-model="mainEditorContent"
              placeholder="Script will appear here after generation..."
              class="flex-1 w-full h-full resize-none min-h-[200px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />

            <!-- Display area for highlighted script when a persona is selected -->
            <div
              v-else
              class="flex-1 w-full h-full overflow-y-auto p-2 text-sm"
              v-html="highlightedScript"
            ></div>
          </CardContent>
        </Card>
        
        <Card v-if="playgroundStore.audioUrl" class="shrink-0">
          <CardHeader>
            <CardTitle>Audio Output</CardTitle>
          </CardHeader>
          <CardContent class="p-4">
            <audio :src="playgroundStore.audioUrl" controls class="w-full"></audio>
            <div class="mt-4 flex flex-wrap gap-2 items-center">
            </div>
            <div v-if="podcastPerformanceConfig && playgroundStore.audioUrl" class="mt-4 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <p class="font-medium text-sm text-foreground mb-1">Podcast Audio Details:</p>
                <p><strong>Task:</strong> {{ (podcastPerformanceConfig as any)?.taskType || 'N/A' }}</p>
                <p><strong>Provider:</strong> {{ (podcastPerformanceConfig as any)?.provider || playgroundStore.selectedProvider || 'N/A' }}</p>
            </div>
          </CardContent>
        </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import PodcastSettingsForm from '@/components/playground/PodcastSettingsForm.vue';
import VoicePerformanceSettings from '../components/playground/VoicePerformanceSettings.vue';
import AudioSynthesis from '../components/playground/AudioSynthesis.vue';

import PlaygroundV2Toolbar from '../components/playground/PlaygroundV2Toolbar.vue';
import { toast } from 'vue-sonner';
import { usePlaygroundStore } from '../stores/playground';
import type { FullPodcastSettings, Persona } from '../types/playground'; // Note: This import might still cause errors if the file doesn't exist, but we'll ignore them as per user instructions.

const playgroundStore = usePlaygroundStore();

// Computed property to generate highlighted script HTML
const highlightedScript = computed(() => {
  const script = playgroundStore.textToSynthesize;
  const selectedPersonaId = playgroundStore.selectedPersonaIdForHighlighting;

  console.log('Highlighting script for persona ID:', selectedPersonaId); // Add log

  if (!script || selectedPersonaId === null) {
    return script; // Return original script if no script or no persona selected
  }

  // Find the name of the selected persona
  const selectedPersona = playgroundStore.personas.find((p: any) => p.persona_id === selectedPersonaId); // Explicitly type 'p' as any
  const selectedPersonaName = selectedPersona?.name;

  console.log('Selected persona for highlighting:', selectedPersonaName); // Add log

  if (!selectedPersonaName) {
    return script; // Return original script if selected persona name not found
  }

  const lines = script.split('\n');
  let highlightedHtml = '';

  lines.forEach(line => {
    // Simple check if the line starts with the persona's name followed by a colon
    if (line.trim().startsWith(`${selectedPersonaName}:`)) {
      highlightedHtml += `<p class="bg-yellow-200 dark:bg-yellow-800 p-1 rounded">${line}</p>`; // Apply highlight style
    } else {
      highlightedHtml += `<p>${line}</p>`; // Render non-highlighted line
    }
  });

  return highlightedHtml;
});

const currentStepIndex = ref(1);
const podcastPerformanceConfig = ref<object | null>(null);

const podcastSteps = [
  { step: 1, title: 'Script Generation', description: 'Select roles and script settings.' },
  { step: 2, title: 'Voice Performance', description: 'Configure voice, roles, and style.' },
  { step: 3, title: 'Audio Synthesis', description: 'Synthesize and download audio.' },
];

watch(() => playgroundStore.createPodcast, () => {
  currentStepIndex.value = 1;
  playgroundStore.resetPlaygroundState();
  podcastPerformanceConfig.value = null;
}, { immediate: true });

const mainEditorContent = computed({
  get: () => playgroundStore.textToSynthesize,
  set: (value) => {
    playgroundStore.textToSynthesize = value;
  }
});

const isGeneratingOverall = computed(() => {
  return playgroundStore.isGeneratingScript || playgroundStore.isSynthesizing;
});

onMounted(async () => {
  await playgroundStore.fetchPersonas();
  console.log('Fetched personas:', playgroundStore.personas); // Add log
});

const getVoiceNameFromId = (voiceIdParam: string | number | undefined): string => {
  if (!voiceIdParam) return 'N/A';
  const voiceId = Number(voiceIdParam);
  const persona = playgroundStore.personas.find((p: Persona) => p.persona_id === voiceId || p.voice_id === String(voiceIdParam));
  return persona?.name || String(voiceIdParam);
};

async function handleToolbarGenerateScript() {
  console.log('点击生成脚本，详细信息：', {
    hostPersonaId: playgroundStore.podcastSettings.hostPersonaId,
    hostPersonaIdType: typeof playgroundStore.podcastSettings.hostPersonaId,
    guestPersonaIds: playgroundStore.podcastSettings.guestPersonaIds,
    guestPersonaIdsTypes: playgroundStore.podcastSettings.guestPersonaIds.map(id => typeof id),
    title: playgroundStore.podcastSettings.title,
    topic: playgroundStore.podcastSettings.topic,
    createPodcast: playgroundStore.createPodcast,
    canGenerate: playgroundStore.canGeneratePodcastScript
  });
  
  if (!playgroundStore.canGeneratePodcastScript) {
    toast.warning("Please complete all podcast settings before generating the script.");
    return;
  }
  await playgroundStore.generateScript();
  if (!playgroundStore.scriptGenerationError) {
    toast.success("Script generated successfully!");
  }
}

function handleToolbarSkipScript() {
  if (!mainEditorContent.value.trim()) {
    toast.info("Please enter your script in the editor.");
    return;
  }
  currentStepIndex.value = 2;
}

function onPerformanceSettingsNextForPodcast(config: object) {
  podcastPerformanceConfig.value = config;
  currentStepIndex.value = 3;
}

async function onSynthesizeAudioForPodcast(payload: { useTimestamps: boolean, synthesisParams?: any, performanceConfig?: any }) {
  if (!podcastPerformanceConfig.value) {
    toast.error("Missing performance configuration.");
    return;
  }
  
  console.log('Synthesizing audio with payload:', payload);
  
  // 如果有时间戳数据，保存到store中
  if (payload.performanceConfig?.segments) {
    const timestamps = payload.performanceConfig.segments
      .filter((segment: any) => segment.timestamps && segment.timestamps.length > 0)
      .map((segment: any) => segment.timestamps)
      .flat();
    
    if (timestamps.length > 0) {
      playgroundStore.saveSegmentTimestamps(timestamps);
    }
  }
  
  // 调用store中的合成方法，传递useTimestamps参数
  await playgroundStore.synthesizePodcastAudio({
    useTimestamps: payload.useTimestamps
  });

  if (!playgroundStore.synthesisError) {
    toast.success("Podcast audio synthesized successfully!");
  }
}

function handleToolbarProceedToSynthesis() {
  if (!mainEditorContent.value.trim()) {
    toast.info("Script content is empty. Please generate or write a script.");
    return;
  }
  currentStepIndex.value = 3;
}

function handleToolbarSynthesizePodcastAudio() {
  onSynthesizeAudioForPodcast({
    useTimestamps: true,
    synthesisParams: playgroundStore.synthesisParams,
    performanceConfig: podcastPerformanceConfig.value
  });
}

function handleDownloadCurrentAudio() {
  if (!playgroundStore.audioUrl) {
    toast.error("No audio available for download.");
    return;
  }
  const link = document.createElement('a');
  link.href = playgroundStore.audioUrl;
  const filename = playgroundStore.outputFilename || 
                   (playgroundStore.audioUrl.includes('/') ? playgroundStore.audioUrl.substring(playgroundStore.audioUrl.lastIndexOf('/') + 1) : 'podcast_output.mp3') || 
                   'podcast_output.mp3';
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  toast.success("Audio download started.");
}

function resetPodcastView() {
  playgroundStore.resetPlaygroundState();
  podcastPerformanceConfig.value = null;
  currentStepIndex.value = 1;
  toast.info("Ready to create a new podcast.");
}

function handleUsePresetScript() {
  playgroundStore.usePresetScript();
  currentStepIndex.value = 2;  // 明确切换到第二步

}

watch(currentStepIndex, (newStep, oldStep) => {
  // 步骤变化时的逻辑可以在这里添加
});
</script>

<style scoped>
.min-h-0 {
  min-height: 0;
}
</style> 