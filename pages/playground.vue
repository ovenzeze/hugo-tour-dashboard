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
          :performanceConfig="podcastPerformanceConfig"
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
            <Textarea
              v-model="mainEditorContent"
              placeholder="Script will appear here after generation..."
              class="flex-1 w-full h-full resize-none min-h-[200px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
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
import type { FullPodcastSettings, Persona } from '../types/playground';

const playgroundStore = usePlaygroundStore();

const currentStepIndex = ref(1);
const podcastPerformanceConfig = ref<object | null>(null);

const podcastSteps = [
  { step: 1, title: '脚本生成', description: '选择角色和脚本设置。' },
  { step: 2, title: '语音表现', description: '配置声音、角色和风格。' },
  { step: 3, title: '音频合成', description: '合成和下载音频。' },
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
    toast.warning("请完成所有播客设置后再生成脚本。");
    return;
  }
  await playgroundStore.generateScript();
  if (!playgroundStore.scriptGenerationError) {
    toast.success("脚本生成成功！");
  }
}

function handleToolbarSkipScript() {
  if (!mainEditorContent.value.trim()) {
    toast.info("请在编辑器中输入您的脚本。");
    return;
  }
  currentStepIndex.value = 2;
}

function onPerformanceSettingsNextForPodcast(config: object) {
  podcastPerformanceConfig.value = config;
  currentStepIndex.value = 3;
}

async function onSynthesizeAudioForPodcast() {
  if (!podcastPerformanceConfig.value) {
    toast.error("缺少性能配置。");
    return;
  }
  await playgroundStore.synthesizePodcastAudio();

  if (!playgroundStore.synthesisError) {
    toast.success("播客音频合成成功！");
  }
}

function handleToolbarProceedToSynthesis() {
  if (!mainEditorContent.value.trim()) {
    toast.info("脚本内容为空。请生成或编写脚本。");
    return;
  }
  currentStepIndex.value = 3;
}

function handleToolbarSynthesizePodcastAudio() {
  onSynthesizeAudioForPodcast();
}

function handleDownloadCurrentAudio() {
  if (!playgroundStore.audioUrl) {
    toast.error("没有可下载的音频。");
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
  toast.success("音频下载已开始。");
}

function resetPodcastView() {
  playgroundStore.resetPlaygroundState();
  podcastPerformanceConfig.value = null;
  currentStepIndex.value = 1;
  toast.info("准备创建新播客。");
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