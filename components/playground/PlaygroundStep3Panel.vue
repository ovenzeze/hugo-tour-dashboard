<template>
  <div class="flex-1 p-2 md:p-4 flex flex-col items-center justify-center bg-background h-full space-y-4 md:space-y-6 step3-container">
    <!-- 合成完成且有音频 -->
    <template v-if="unifiedStore.finalAudioUrl && !unifiedStore.isSynthesizing">
      <div class="w-full max-w-md text-center">
        <h3 class="text-xl font-semibold mb-4 text-primary">Podcast Ready!</h3>
        <p class="text-muted-foreground mb-1">Your podcast audio has been synthesized.</p>
        <p class="text-xs text-muted-foreground">
          Provider: {{ selectedTtsProvider || 'N/A' }} | Segments: {{ unifiedStore.parsedSegments?.length || 0 }}
        </p>
      </div>
      <div class="w-full max-w-xl p-4 border rounded-lg shadow-md bg-muted/30">
        <p class="font-medium text-sm mb-2 text-center">Final Audio Preview:</p>
        <audio :src="unifiedStore.finalAudioUrl" controls class="w-full"></audio>
      </div>
    </template>
    
    <!-- 正在合成音频 -->
    <template v-else-if="unifiedStore.isSynthesizing">
      <AudioSynthesisProgress 
        :is-processing="true"
        :progress-data="synthesisProgressData"
        :show-time-estimate="true"
      />
    </template>
    
    <!-- 合成失败 -->
    <template v-else-if="unifiedStore.error">
      <div class="text-center text-destructive">
        <Icon name="ph:warning-circle" class="h-12 w-12 mx-auto mb-4" />
        <p class="text-lg font-medium">Error Synthesizing Podcast</p>
        <p class="text-sm">{{ unifiedStore.error }}</p>
      </div>
    </template>
    
    <!-- 还没有开始合成 -->
    <template v-else>
      <div class="text-center">
        <Icon name="ph:speaker-high" class="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <p class="text-lg font-medium text-muted-foreground">Ready to Synthesize</p>
        <p class="text-sm text-muted-foreground">
          Your script is validated. Click "Synthesize Podcast" to generate audio.
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import AudioSynthesisProgress from './AudioSynthesisProgress.vue';

const playgroundSettingsStore = usePlaygroundSettingsStore();
const unifiedStore = usePlaygroundUnifiedStore();

// 获取TTS提供商
const selectedTtsProvider = computed(() => 
  playgroundSettingsStore.podcastSettings.ttsProvider
);

// 构建合成进度数据
const synthesisProgressData = computed(() => {
  const totalSegments = unifiedStore.parsedSegments?.length || 0;
  
  // 如果正在合成但还没有进度数据，初始化
  if (unifiedStore.isSynthesizing && !unifiedStore.synthesisProgress && totalSegments > 0) {
    return {
      completed: 0,
      total: totalSegments,
      currentSegment: 0,
      segments: unifiedStore.parsedSegments?.map((segment, index) => ({
        status: index === 0 ? 'processing' as const : 'waiting' as const,
        speaker: segment.speaker,
        text: segment.text
      })) || []
    };
  }
  
  // 从unified store获取进度
  if (unifiedStore.synthesisProgress) {
    return {
      completed: unifiedStore.synthesisProgress.completed,
      total: unifiedStore.synthesisProgress.total,
      currentSegment: unifiedStore.synthesisProgress.currentSegment,
      segments: unifiedStore.parsedSegments?.map((segment, index) => ({
        status: index < unifiedStore.synthesisProgress!.completed ? 'completed' as const :
                index === unifiedStore.synthesisProgress!.currentSegment ? 'processing' as const :
                'waiting' as const,
        speaker: segment.speaker,
        text: segment.text
      }))
    };
  }
  
  // 后备数据，当没有合成时
  return {
    completed: 0,
    total: totalSegments,
    currentSegment: undefined,
    segments: unifiedStore.parsedSegments?.map((segment, index) => ({
      status: 'waiting' as const,
      speaker: segment.speaker,
      text: segment.text
    })) || []
  };
});
</script>

<style scoped>
.step3-container {
  animation: fadeInUp 0.5s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .step3-container {
    padding: 1rem 0.5rem;
  }
}
</style>