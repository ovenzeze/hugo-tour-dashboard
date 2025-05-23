<template>
  <div class="flex-1 p-4 md:p-6 flex flex-col items-center justify-center bg-background h-full space-y-6 md:space-y-8 step3-container">
    <!-- Audio synthesis completed and has audio -->
    <template v-if="unifiedStore.finalAudioUrl && !unifiedStore.isSynthesizing">
      <div class="w-full max-w-lg text-center space-y-4">
        <div class="flex flex-col items-center space-y-3">
          <!-- Success Icon -->
          <div class="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <Icon name="ph:check-circle" class="w-8 h-8 text-green-500" />
          </div>
          <h3 class="text-xl font-semibold text-primary">Podcast Ready!</h3>
          <p class="text-muted-foreground">Your podcast audio has been synthesized successfully.</p>
          <p class="text-xs text-muted-foreground">
            Provider: {{ selectedTtsProvider || 'N/A' }} | Segments: {{ unifiedStore.parsedSegments?.length || 0 }}
          </p>
        </div>
        
        <!-- Audio Player Card -->
        <div class="w-full max-w-xl p-4 border rounded-lg shadow-md bg-card">
          <p class="font-medium text-sm mb-3 text-center">Final Audio Preview:</p>
          <audio :src="unifiedStore.finalAudioUrl" controls class="w-full"></audio>
        </div>
        
        <!-- Action Buttons -->
        <div class="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
          <!-- View Podcast Button -->
          <Button
            @click="handleViewPodcast"
            variant="default"
            size="lg"
            class="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
          >
            <Icon name="ph:headphones" class="w-5 h-5" />
            <span>View in Podcasts</span>
            <Icon name="ph:arrow-right" class="w-4 h-4" />
          </Button>
          
          <!-- Create Another Button -->
          <Button
            @click="handleCreateAnother"
            variant="outline"
            size="lg"
            class="w-full sm:w-auto flex items-center gap-2"
          >
            <Icon name="ph:plus-circle" class="w-5 h-5" />
            <span>Create Another</span>
          </Button>
        </div>
      </div>
    </template>
    
    <!-- Audio synthesis in progress -->
    <template v-else-if="unifiedStore.isSynthesizing">
      <div class="w-full max-w-md">
        <AudioSynthesisProgress 
          :is-processing="true"
          :progress-data="synthesisProgressData"
          :show-time-estimate="true"
        />
      </div>
    </template>
    
    <!-- Synthesis failed -->
    <template v-else-if="unifiedStore.error">
      <div class="text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <Icon name="ph:warning-circle" class="w-8 h-8 text-destructive" />
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-medium text-destructive">Synthesis Error</h3>
          <p class="text-sm text-muted-foreground max-w-md">{{ unifiedStore.error }}</p>
        </div>
      </div>
    </template>
    
    <!-- Ready to synthesize -->
    <template v-else>
      <div class="text-center space-y-4">
        <div class="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
          <Icon name="ph:speaker-high" class="w-8 h-8 text-muted-foreground" />
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-medium text-muted-foreground">Ready to Synthesize</h3>
          <p class="text-sm text-muted-foreground max-w-md">
            Your script is validated. Click "Synthesize Podcast" to generate audio.
          </p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import AudioSynthesisProgress from './AudioSynthesisProgress.vue';
import { toast } from 'vue-sonner';

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

// Handle view podcast button click
const handleViewPodcast = () => {
  if (unifiedStore.podcastId) {
    // Navigate to specific podcast detail page
    navigateTo('/podcasts');
    toast.success('Redirecting to Podcasts', {
      description: 'You can find your created podcast in the podcasts list.'
    });
  } else {
    // Fallback to podcasts list
    navigateTo('/podcasts');
    toast.info('Redirecting to Podcasts', {
      description: 'Browse all available podcasts.'
    });
  }
};

// Handle create another podcast button click
const handleCreateAnother = () => {
  // Reset the playground state and stay on the same page
  unifiedStore.resetPlaygroundState();
  toast.success('Ready for New Podcast', {
    description: 'You can now create a new podcast from scratch.'
  });
};
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