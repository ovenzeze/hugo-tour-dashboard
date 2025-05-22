<template>
  <CardFooter class="border-t p-3 flex flex-col md:flex-row justify-between items-center flex-shrink-0 bg-background gap-2 md:gap-4">
    <!-- Left Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto">
      <!-- Previous Button -->
      <Button
        v-if="unifiedStore.currentStep > 1"
        variant="outline"
        @click="handlePreviousStep"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
        Previous
      </Button>
      
      <!-- Reset Button -->
      <Button
        variant="ghost"
        @click="handleReset"
        class="w-full md:w-auto"
      >
        <Icon name="ph:arrow-counter-clockwise" class="w-4 h-4 mr-2" />
        Reset
      </Button>
      
      <!-- Step 1 specific buttons -->
      <template v-if="unifiedStore.currentStep === 1">
        <!-- AI Script Button -->
        <Button
          @click="handleGenerateAiScript"
          :disabled="unifiedStore.isLoading || (!unifiedStore.canGenerateAi)"
          :variant="!unifiedStore.isScriptEmpty ? 'outline' : 'default'"
          class="w-full md:w-auto relative overflow-hidden group"
        >
          <div class="flex items-center justify-center">
            <Icon
              v-if="unifiedStore.isLoading"
              name="ph:spinner"
              class="w-4 h-4 mr-2 animate-spin text-primary"
            />
            <Icon
              v-else
              name="ph:brain"
              class="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-300"
            />
            <span v-if="unifiedStore.isLoading">AI Creating...</span>
            <span v-else>AI Script</span>
          </div>
          
          <!-- Pulsing Effect for Loading -->
          <div 
            v-if="unifiedStore.isLoading"
            class="absolute inset-0 bg-primary/10 animate-pulse"
          />
        </Button>
        
        <!-- Use Preset Button -->
        <Button
          variant="outline"
          @click="handleUsePresetScript"
          :disabled="unifiedStore.isLoading"
          class="w-full md:w-auto group"
        >
          <Icon
            name="ph:book-open-text"
            class="w-4 h-4 mr-2 group-hover:scale-110 transition-transform duration-300"
          />
          <span>Use Preset</span>
        </Button>
      </template>
    </div>
    
    <!-- Right Main Action Button Group -->
    <div class="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-2 w-full md:w-auto justify-end">
      <!-- Step 1: Next Button -->
      <template v-if="unifiedStore.currentStep === 1">
        <Button
          variant="default"
          :disabled="!unifiedStore.canProceedToStep2 || unifiedStore.isValidating"
          @click="handleProceedToStep2"
          class="w-full md:w-auto relative overflow-hidden group"
        >
          <div class="flex items-center justify-center">
            <Icon
              v-if="unifiedStore.isValidating"
              name="ph:spinner"
              class="w-4 h-4 mr-2 animate-spin text-primary"
            />
            <span v-if="unifiedStore.isValidating">
              <template v-if="isAnalyzingUserScript">
                Analyzing...
              </template>
              <template v-else>
                Validating...
              </template>
            </span>
            <span v-else>Next</span>
            <Icon v-if="!unifiedStore.isValidating" name="ph:arrow-right" class="w-4 h-4 ml-2" />
          </div>
        </Button>
      </template>
      
      <!-- Step 2: Synthesize Button -->
      <template v-if="unifiedStore.currentStep === 2">
        <Button
          variant="default"
          :disabled="!unifiedStore.canSynthesize || unifiedStore.isSynthesizing"
          @click="handleSynthesizePodcast"
          class="w-full md:w-auto relative overflow-hidden"
        >
          <div class="flex items-center justify-center">
            <Icon v-if="unifiedStore.isSynthesizing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
            <Icon v-else name="ph:rocket-launch" class="w-4 h-4 mr-2" />
            
            <span v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress">
              Synthesizing... {{ Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100) }}%
            </span>
            <span v-else-if="unifiedStore.isSynthesizing">
              Synthesizing... 0%
            </span>
            <span v-else>
              Synthesize Podcast
            </span>
          </div>
          
          <!-- Progress Bar -->
          <div 
            v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
            class="absolute bottom-0 left-0 h-1 bg-primary/20 transition-all duration-300"
            :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
          />
        </Button>
      </template>
      
      <!-- Step 3: Download and Re-synthesize Buttons -->
      <template v-if="unifiedStore.currentStep === 3">
        <Button
          v-if="unifiedStore.finalAudioUrl"
          variant="outline"
          size="sm"
          @click="handleDownloadAudio"
          class="w-full md:w-auto"
        >
          <Icon name="ph:download-simple" class="w-3 h-3 md:w-4 md:h-4 mr-2" />
          <span class="hidden sm:inline">Download Audio</span>
          <span class="sm:hidden">Download</span>
        </Button>
        <Button
          @click="handleSynthesizePodcast"
          :disabled="unifiedStore.isSynthesizing"
          variant="default"
          size="sm"
          class="w-full md:w-auto relative"
        >
          <Icon v-if="unifiedStore.isSynthesizing" name="ph:spinner-gap" class="w-3 h-3 md:w-4 md:h-4 mr-2 animate-spin" />
          <Icon v-else name="ph:arrows-clockwise" class="w-3 h-3 md:w-4 md:h-4 mr-2" />
          
          <!-- 移动端显示简化文本，桌面端显示完整文本 -->
          <span v-if="unifiedStore.isSynthesizing" class="text-sm">
            <span class="hidden sm:inline">Re-synthesizing...</span>
            <span class="sm:hidden">Processing...</span>
          </span>
          <span v-else class="text-sm">
            <span class="hidden sm:inline">Re-Synthesize Podcast</span>
            <span class="sm:hidden">Re-Synthesize</span>
          </span>
          
          <!-- 进度指示器 -->
          <div 
            v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
            class="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/30 transition-all duration-300"
            :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
          />
        </Button>
      </template>
    </div>
  </CardFooter>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { toast } from 'vue-sonner';

// === MVP版本：只使用统一 store ===
const unifiedStore = usePlaygroundUnifiedStore();

// === 计算属性 ===
const isAnalyzingUserScript = computed(() => {
  return unifiedStore.isValidating && 
         unifiedStore.scriptContent.trim() && 
         !unifiedStore.aiScriptGenerationStep;
});

// === 简化的按钮处理函数 ===

// 1. 步骤导航
const handlePreviousStep = () => {
  if (unifiedStore.currentStep > 1) {
    unifiedStore.setCurrentStep(unifiedStore.currentStep - 1);
  }
};

const handleReset = () => {
  unifiedStore.resetPlaygroundState();
  toast.info('Playground已重置', {
    description: '所有数据已清空，可以开始新的播客制作。'
  });
};

// 2. AI脚本生成（简化版）
const handleGenerateAiScript = async () => {
  try {
    const result = await unifiedStore.generateAiScript();
    if (result.success) {
      toast.success(result.message, {
        description: '脚本内容已更新，请查看编辑器。'
      });
    } else {
      toast.error(result.message);
    }
  } catch (error: any) {
    toast.error('AI脚本生成失败', {
      description: error.message || '请检查网络连接后重试。'
    });
  }
};

// 3. 使用预设脚本
const handleUsePresetScript = () => {
  unifiedStore.loadPresetScript();
  toast.success('预设脚本已加载', {
    description: '您可以直接使用或修改这个示例脚本。'
  });
};

// 4. 进入步骤2（验证和创建Podcast）
const handleProceedToStep2 = async () => {
  try {
    const result = await unifiedStore.validateAndCreatePodcast();
    if (result.success) {
      unifiedStore.setCurrentStep(2);
      toast.success(result.message || '脚本验证成功', {
        description: '现在可以进行音频合成了。'
      });
    } else {
      toast.error(result.message || '脚本验证失败');
    }
  } catch (error: any) {
    toast.error('脚本验证失败', {
      description: error.message || '请检查脚本格式和设置。'
    });
  }
};

// 5. 合成播客音频
const handleSynthesizePodcast = async () => {
  try {
    const result = await unifiedStore.synthesizeAudio();
    if (result.success) {
      if (unifiedStore.currentStep === 2) {
        unifiedStore.setCurrentStep(3);
      }
      toast.success(result.message || '音频合成成功', {
        description: '播客音频合成完成！'
      });
    } else {
      toast.error(result.message || '音频合成失败');
    }
  } catch (error: any) {
    toast.error('音频合成失败', {
      description: error.message || '请重试或检查网络连接。'
    });
  }
};

// 6. 下载音频
const handleDownloadAudio = () => {
  if (unifiedStore.finalAudioUrl) {
    const link = document.createElement('a');
    link.href = unifiedStore.finalAudioUrl;
    const filename = `podcast_${Date.now()}.mp3`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('音频下载开始', {
      description: '文件将保存到您的下载文件夹。'
    });
  } else {
    toast.error('没有可下载的音频文件');
  }
};
</script>
