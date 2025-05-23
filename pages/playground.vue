<template>
  <div 
    class="w-full flex flex-col overflow-hidden"
    :style="containerStyle"
  >
    <!-- Top Section: Stepper - 移动端优化 -->
    <div class="px-3 md:px-4 py-3 md:py-4 border-b bg-background">
      <PlaygroundStepper 
        :model-value="unifiedStore.currentStep" 
        @update:model-value="handleStepChange" 
      />
    </div>

    <!-- Main Content: Unified Card Layout - 移动端优化 -->
    <Card class="flex-1 flex flex-col min-h-0 overflow-hidden mx-2 md:mx-4 my-2 md:my-4 border rounded-lg shadow-sm">
      <!-- Card Header with Title - Fixed at the top -->
      <!-- <CardHeader v-if="unifiedStore.currentStep === 3" class="border-b flex-shrink-0 py-2 md:py-3">
        <div class="flex items-center justify-between">
          <CardTitle class="text-base md:text-lg">Audio Synthesis & Preview</CardTitle>
        </div>
      </CardHeader> -->

      <!-- Main Content: Step-based panels with transition - 移动端优化滚动 -->
      <CardContent class="flex-1 p-0 flex flex-col min-h-0 overflow-hidden bg-background relative">
        <Transition 
          name="step-transition" 
          mode="out-in"
        >
          <div :key="unifiedStore.currentStep" class="flex-1 min-h-0 overflow-auto step-content">
            <!-- Step 1: Script Setup -->
            <PlaygroundStep1Panel
              v-if="unifiedStore.currentStep === 1"
              :is-script-generating="unifiedStore.isLoading" 
              :is-validating="unifiedStore.isValidating" 
              :selected-persona-id-for-highlighting="unifiedStore.selectedPersonaIdForHighlighting" 
              :highlighted-script="highlightedScript" 
              :ai-script-step="unifiedStore.aiScriptGenerationStep" 
              :ai-script-step-text="unifiedStore.aiScriptGenerationStepText" 
              :script-error="unifiedStore.error" 
              @clear-error-and-retry="unifiedStore.clearError"
            />
            
            <!-- Step 2: Voice Configuration -->
            <PlaygroundStep2Panel
              v-if="unifiedStore.currentStep === 2"
              :script-content="unifiedStore.scriptContent"
              :synth-progress="{
                synthesized: 0,
                total: unifiedStore.parsedSegments.length
              }"
              :audio-url="unifiedStore.finalAudioUrl"
              :is-global-preview-loading="false"
              @update:script-content="unifiedStore.updateScriptContent($event)"
              class="flex-1 min-h-0"
            />
            
            <!-- Step 3: Synthesis & Preview -->
            <PlaygroundStep3Panel
              v-if="unifiedStore.currentStep === 3"
              class="flex-1 min-h-0"
            />
          </div>
        </Transition>
      </CardContent>

      <!-- Footer Actions - 移动端优化 -->
      <div class="flex-shrink-0">
        <PlaygroundFooterActions />
      </div>
    </Card>

    <!-- Synthesis Modal - 移动端优化 -->
    <PodcastSynthesisModal
      :visible="unifiedStore.showSynthesisModal"
      :status="unifiedStore.synthesisStatusForModal"
      :podcast-name="unifiedStore.podcastNameForModal"
      :confirm-data="unifiedStore.confirmDataForModal"
      :processing-data="unifiedStore.processingDataForModal"
      :success-data="unifiedStore.successDataForModal"
      :error-data="unifiedStore.errorDataForModal"
      @update:visible="unifiedStore.hideSynthesisModal"
      @close="unifiedStore.hideSynthesisModal"
      @confirm-synthesis="handleModalConfirmSynthesis"
      @cancel-confirmation="unifiedStore.hideSynthesisModal"
      @cancel-synthesis="unifiedStore.hideSynthesisModal"
      @retry-synthesis="handleModalConfirmSynthesis"
      @play-podcast="handleModalPlayPodcast"
      @download-podcast="handleModalDownloadPodcast"
      @share-podcast="handleModalSharePodcast"
      @view-help="handleModalViewHelp"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import { useMobileLayout } from '~/composables/useMobileLayout';
import { usePodcastDatabase } from '~/composables/usePodcastDatabase';
import { useRoute } from 'vue-router';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';

// Component imports
import PlaygroundStepper from '~/components/playground/PlaygroundStepper.vue';
import PlaygroundStep1Panel from '~/components/playground/PlaygroundStep1Panel.vue';
import PlaygroundStep2Panel from '~/components/playground/PlaygroundStep2Panel.vue';
import PlaygroundStep3Panel from '~/components/playground/PlaygroundStep3Panel.vue';
import PlaygroundFooterActions from '~/components/playground/PlaygroundFooterActions.vue';
import PodcastSynthesisModal from '~/components/podcasts/PodcastSynthesisModal.vue';

// State management
const unifiedStore = usePlaygroundUnifiedStore();
const personaCache = usePersonaCache();
const { fetchPodcastById } = usePodcastDatabase();
const settingsStore = usePlaygroundSettingsStore();

// Mobile layout handling
const { mobileContentHeight, isMobile } = useMobileLayout();

// Container style for responsive height
const containerStyle = computed(() => ({
  height: isMobile.value ? mobileContentHeight.value : 'calc(100vh - 2rem)'
}));

// Ensure personas are loaded
if (personaCache.personas.value.length === 0) {
  personaCache.fetchPersonas();
}

// 处理URL参数，加载指定的播客
onMounted(async () => {
  const route = useRoute();
  const podcastId = route.query.podcast as string;
  
  if (podcastId) {
    try {
      console.log(`[Playground] Loading podcast ${podcastId} from URL parameter`);
      
      // 获取播客数据
      await fetchPodcastById(podcastId);
      
      // TODO: 加载播客数据到store中
      // 这里需要实现从数据库加载播客脚本、设置等信息
      await loadPodcastIntoPlayground(podcastId);
      
      toast.success('播客数据加载成功', {
        description: `已加载播客 ${podcastId} 的数据到Playground`
      });
      
    } catch (error: any) {
      console.error('[Playground] Failed to load podcast:', error);
      toast.error('加载播客数据失败', {
        description: error.message || '请检查播客ID是否正确'
      });
    }
  }
});

// 加载播客数据到playground
async function loadPodcastIntoPlayground(podcastId: string) {
  try {
    console.log(`[Playground] Loading podcast ${podcastId} data into playground stores`);
    
    // 定义API响应类型
    interface PodcastDetailsResponse {
      success: boolean;
      message?: string;
      script: {
        content: string;
        segments: Array<{
          idx: number;
          speaker: string;
          text: string;
          speakerPersonaId?: number;
          hasAudio: boolean;
        }>;
      };
      settings: {
        title: string;
        topic?: string;
        language?: string;
        hostPersonaId?: number;
        guestPersonaIds?: number[];
        ttsProvider?: string;
      };
    }
    
    // 1. 调用API获取播客详细信息
    const podcastDetails = await $fetch<PodcastDetailsResponse>(`/api/podcast/${podcastId}/details`);
    
    if (!podcastDetails.success) {
      throw new Error(podcastDetails.message || '获取播客数据失败');
    }
    
    // 2. 设置podcast ID到unified store
    unifiedStore.podcastId = podcastId;
    
    // 3. 加载脚本内容
    if (podcastDetails.script.content) {
      unifiedStore.updateScriptContent(podcastDetails.script.content);
    }
    
    // 4. 加载播客设置到settings store
    settingsStore.updatePodcastSettings({
      title: podcastDetails.settings.title,
      topic: podcastDetails.settings.topic,
      language: podcastDetails.settings.language || 'en-US',
      hostPersonaId: podcastDetails.settings.hostPersonaId,
      guestPersonaIds: podcastDetails.settings.guestPersonaIds || [],
      ttsProvider: podcastDetails.settings.ttsProvider || 'volcengine'
    });
    
    // 5. 检查是否有未完成的合成任务
    const uncompletedSegments = podcastDetails.script.segments.filter(s => !s.hasAudio);
    if (uncompletedSegments.length > 0) {
      console.log(`[Playground] Found ${uncompletedSegments.length} uncompleted segments`);
      // 这里可以显示进度信息或启动监控
    }
    
    console.log(`[Playground] Successfully loaded podcast data:`, {
      title: podcastDetails.settings.title,
      segments: podcastDetails.script.segments.length,
      uncompletedSegments: uncompletedSegments.length
    });
    
  } catch (error: any) {
    console.error(`[Playground] Failed to load podcast data:`, error);
    throw error;
  }
}

// Step switching handler - simplified version
const handleStepChange = async (step: number) => {
  try {
    await unifiedStore.goToStep(step);
  } catch (error: any) {
    toast.error(error.message || 'Step switching failed');
  }
};

// Highlighted script computation
const highlightedScript = computed(() => {
  const script = unifiedStore.scriptContent;
  const selectedPersonaId = unifiedStore.selectedPersonaIdForHighlighting;

  if (!script || selectedPersonaId === null) {
    return script;
  }
  
  const persona = personaCache.getPersonaById(selectedPersonaId);
  const selectedPersonaName = persona?.name;

  if (!selectedPersonaName) {
    return script;
  }

  const lines = script.split('\n');
  let html = '';
  lines.forEach((line: string) => {
    if (line.trim().startsWith(`${selectedPersonaName}:`)) {
      html += `<p class="highlighted-persona-segment">${line}</p>`; 
    } else {
      html += `<p>${line}</p>`;
    }
  });
  return html;
});

// Modal event handling
const handleModalConfirmSynthesis = async () => {
  console.log('Modal confirm synthesis triggered');
  unifiedStore.setSynthesisModalStatus('processing');
  unifiedStore.updateModalProcessingData({ 
    progress: 0, 
    currentStage: 'Starting synthesis...' 
  });

  try {
    const result = await unifiedStore.synthesizeAudio();
    if (result.success) {
      unifiedStore.setSynthesisModalStatus('success');
      unifiedStore.$patch({
        successDataForModal: {
          podcastDuration: 'Estimating...'
        }
      });
      toast.success('Podcast synthesis successful!');
    } else {
      throw new Error(result.message || 'Synthesis failed');
    }
  } catch (error: any) {
    unifiedStore.setSynthesisModalStatus('error');
    unifiedStore.$patch({
      errorDataForModal: {
        errorMessage: error.message || 'Unknown error occurred during synthesis'
      }
    });
    toast.error('Podcast synthesis failed: ' + error.message);
  }
};

const handleModalPlayPodcast = () => {
  if (unifiedStore.finalAudioUrl) {
    const audio = new Audio(unifiedStore.finalAudioUrl);
    audio.play().catch(error => {
      toast.error('Playback failed: ' + error.message);
    });
  }
};

const handleModalDownloadPodcast = () => {
  if (unifiedStore.finalAudioUrl) {
    const link = document.createElement('a');
    link.href = unifiedStore.finalAudioUrl;
    link.download = `podcast_${Date.now()}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Download started');
  }
};

const handleModalSharePodcast = () => {
  // TODO: Implement sharing functionality
  toast.info('Sharing functionality under development...');
};

const handleModalViewHelp = () => {
  // TODO: Open help documentation
  toast.info('Help documentation under development...');
};
</script>

<style scoped>
/* Step transition animation */
.step-transition-enter-active,
.step-transition-leave-active {
  transition: all 0.3s ease-out;
}

.step-transition-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.step-transition-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Highlighted style */
:deep(.highlighted-persona-segment) {
  background-color: rgba(59, 130, 246, 0.1);
  border-left: 3px solid rgb(59, 130, 246);
  padding-left: 0.5rem;
  margin: 0.25rem 0;
}

/* Mobile adaptation */
@media (max-width: 768px) {
  .step-transition-enter-from {
    transform: translateY(15px);
  }
  
  .step-transition-leave-to {
    transform: translateY(-15px);
  }
  
  /* 移动端内容区域滚动优化 */
  .step-content {
    -webkit-overflow-scrolling: touch;
  }
  
  /* 移动端文本输入优化 - 防止 iOS Safari 缩放 */
  .step-content :deep(textarea) {
    font-size: 16px !important;
  }
  
  /* 移动端按钮间距优化 */
  .step-content :deep(.flex-col.gap-3) {
    gap: 0.5rem;
  }
}

/* 移动端模态框优化 */
@media (max-width: 768px) {
  :deep(.dialog-content) {
    margin: 1rem;
    max-height: calc(100vh - 2rem);
  }
}
</style>
