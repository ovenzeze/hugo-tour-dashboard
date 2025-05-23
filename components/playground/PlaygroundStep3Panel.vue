<template>
  <div class="flex-1 p-6 flex flex-col items-center justify-center bg-background h-full space-y-8 step3-container">
    <!-- Audio synthesis completed and has audio -->
    <template v-if="unifiedStore.finalAudioUrl && !unifiedStore.isSynthesizing">
      <div class="w-full max-w-2xl">
        <!-- 成功状态的沉浸式设计 -->
        <div class="bg-green-50/50 dark:bg-green-950/20 rounded-3xl p-8 backdrop-blur-sm">
          <div class="flex flex-col items-center space-y-6 text-center">
            <!-- Success Icon with enhanced design -->
            <div class="relative">
              <div class="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center">
                <Icon name="ph:check-circle" class="w-10 h-10 text-green-500" />
              </div>
              <!-- Success sparkle animation -->
              <div class="absolute -inset-2">
                <div v-for="i in 4" :key="i" class="absolute w-1 h-1 bg-green-400 rounded-full animate-ping"
                  :style="{ 
                    top: `${i % 2 === 0 ? '10%' : '90%'}`,
                    left: `${i < 2 ? '10%' : '90%'}`,
                    animationDelay: `${i * 0.3}s`
                  }"
                />
              </div>
            </div>
            
            <div>
              <h3 class="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">Podcast Ready! 🎉</h3>
              <p class="text-green-600 dark:text-green-400 mb-3">Your podcast audio has been synthesized successfully.</p>
              <div class="bg-green-100/50 dark:bg-green-900/30 rounded-lg px-3 py-1 inline-block">
                <p class="text-xs text-green-700 dark:text-green-300">
                  Provider: {{ selectedTtsProvider || 'N/A' }} | Segments: {{ unifiedStore.parsedSegments?.length || 0 }}
                </p>
              </div>
            </div>
            
            <!-- Audio Player - 简化设计 -->
            <div class="w-full bg-muted/30 rounded-2xl p-6">
              <p class="font-medium text-sm mb-3 text-center text-foreground">Final Audio Preview:</p>
              <audio :src="unifiedStore.finalAudioUrl" controls class="w-full rounded-lg"></audio>
            </div>
            
            <!-- Action Buttons with clean gradients -->
            <div class="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2 w-full">
              <!-- View Podcast Button -->
              <Button
                @click="handleViewPodcast"
                variant="default"
                size="lg"
                class="w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all duration-300 shadow-lg hover:shadow-xl"
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
                class="w-full sm:w-auto flex items-center gap-2 bg-background/60 backdrop-blur-sm hover:bg-muted/30"
              >
                <Icon name="ph:plus-circle" class="w-5 h-5" />
                <span>Create Another</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Audio synthesis in progress -->
    <template v-else-if="unifiedStore.isSynthesizing">
      <div class="w-full">
        <EnhancedSynthesisProgress 
          :is-processing="true"
          :progress-data="synthesisProgressData"
          :show-time-estimate="true"
          :personas="availablePersonas"
        />
      </div>
    </template>
    
    <!-- Synthesis failed -->
    <template v-else-if="unifiedStore.error">
      <div class="w-full max-w-md">
        <!-- 简化的错误设计 -->
        <div class="bg-red-50/50 dark:bg-red-950/20 rounded-3xl p-8 backdrop-blur-sm text-center">
          <div class="relative mb-6">
            <div class="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
              <Icon name="ph:warning-circle" class="w-10 h-10 text-destructive" />
            </div>
            <!-- Error pulse animation -->
            <div class="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping mx-auto w-20 h-20" />
          </div>
          <div class="space-y-4">
            <h3 class="text-xl font-bold text-destructive">Synthesis Error</h3>
            <div class="bg-red-100/50 dark:bg-red-900/30 rounded-lg p-4">
              <p class="text-sm text-destructive/80">{{ unifiedStore.error }}</p>
            </div>
            <Button 
              variant="outline" 
              @click="handleCreateAnother"
              class="bg-background/60 backdrop-blur-sm hover:bg-muted/30"
            >
              <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    </template>
    
    <!-- Ready to synthesize -->
    <template v-else>
      <div class="w-full max-w-md">
        <!-- 待处理状态的优雅设计 -->
        <div class="bg-muted/20 rounded-3xl p-8 backdrop-blur-sm text-center">
          <div class="relative mb-6">
            <div class="w-20 h-20 rounded-full bg-muted-foreground/10 flex items-center justify-center mx-auto">
              <Icon name="ph:speaker-high" class="w-10 h-10 text-muted-foreground" />
            </div>
            <!-- Gentle pulse for ready state -->
            <div class="absolute inset-0 rounded-full border-2 border-muted-foreground/10 animate-pulse mx-auto w-20 h-20" />
          </div>
          <div class="space-y-4">
            <h3 class="text-xl font-semibold text-foreground">Ready to Synthesize</h3>
            <div class="bg-muted/20 rounded-lg p-4">
              <p class="text-sm text-muted-foreground">
                Your script is validated. Click "Synthesize Podcast" to generate audio.
              </p>
            </div>
            <!-- Add some visual indicators -->
            <div class="flex justify-center space-x-2">
              <div class="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style="animation-delay: 0s;" />
              <div class="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style="animation-delay: 0.2s;" />
              <div class="w-2 h-2 bg-primary/30 rounded-full animate-pulse" style="animation-delay: 0.4s;" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlaygroundSettingsStore } from '~/stores/playgroundSettingsStore';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { usePersonaCache } from '~/composables/usePersonaCache';
import EnhancedSynthesisProgress from './EnhancedSynthesisProgress.vue';
import { toast } from 'vue-sonner';

const playgroundSettingsStore = usePlaygroundSettingsStore();
const unifiedStore = usePlaygroundUnifiedStore();
const personaCache = usePersonaCache();

// 获取可用的 personas，并映射到正确的类型格式
const availablePersonas = computed(() => 
  personaCache.personas.value.map(persona => ({
    id: persona.persona_id,
    name: persona.name,
    avatar_url: persona.avatar_url
  }))
);

// 获取TTS提供商
const selectedTtsProvider = computed(() => 
  playgroundSettingsStore.podcastSettings.ttsProvider
);

// 构建合成进度数据，包含 persona 信息
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
        text: segment.text,
        persona: findPersonaById(segment.speakerPersonaId)
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
        text: segment.text,
        persona: findPersonaById(segment.speakerPersonaId)
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
      text: segment.text,
      persona: findPersonaById(segment.speakerPersonaId)
    })) || []
  };
});

// 根据 persona ID 查找 persona，处理类型映射
function findPersonaById(personaId?: number | null) {
  if (!personaId) return undefined;
  const persona = availablePersonas.value.find(p => p.id === personaId);
  if (!persona) return undefined;
  
  // 映射到 EnhancedSynthesisProgress 期望的 Persona 类型
  return persona;
}

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