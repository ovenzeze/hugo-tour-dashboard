<template>
  <CardFooter class="border-t bg-background/60 backdrop-blur-sm p-4 flex flex-col justify-between items-stretch flex-shrink-0 gap-3">
    <!-- 移动端：垂直布局，桌面端：水平布局 -->
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-3 w-full">
      <!-- Left Button Group -->
      <div class="flex flex-row items-center gap-2 order-2 md:order-1">
        <!-- Previous Button -->
        <Button
          v-if="unifiedStore.currentStep > 1"
          variant="ghost"
          size="sm"
          @click="handlePreviousStep"
          class="flex-1 md:flex-none bg-background/60 hover:bg-muted/40"
        >
          <Icon name="ph:arrow-left" class="w-4 h-4 mr-2" />
          <span class="text-sm">
            <span class="hidden sm:inline">Previous</span>
            <span class="sm:hidden">Back</span>
          </span>
        </Button>
        
        <!-- Reset Button -->
        <Button
          variant="ghost"
          size="sm"
          @click="handleReset"
          class="flex-1 md:flex-none bg-background/60 hover:bg-muted/40"
        >
          <Icon name="ph:arrow-clockwise" class="w-4 h-4 mr-2" />
          <span class="text-sm">Reset</span>
        </Button>
        
        <!-- Step 1 specific buttons -->
        <template v-if="unifiedStore.currentStep === 1">
          <!-- AI Script Button -->
          <Button
            variant="ghost"
            size="sm"
            @click="handleGenerateAiScript"
            :disabled="unifiedStore.isLoading"
            class="flex-1 md:flex-none bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/60 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 disabled:opacity-50"
          >
            <Icon v-if="unifiedStore.isLoading" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
            <Icon v-else name="ph:magic-wand" class="w-4 h-4 mr-2" />
            <span class="text-sm">
              <span class="hidden sm:inline">{{ unifiedStore.isLoading ? 'Generating...' : 'AI Generate' }}</span>
              <span class="sm:hidden">{{ unifiedStore.isLoading ? 'Gen...' : 'AI' }}</span>
            </span>
          </Button>
          
          <!-- Use Preset Button -->
          <Button
            variant="ghost"
            size="sm"
            @click="handleUsePresetScript"
            class="flex-1 md:flex-none bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-900/30 text-amber-700 dark:text-amber-300"
          >
            <Icon name="ph:file-text" class="w-4 h-4 mr-2" />
            <span class="text-sm">
              <span class="hidden sm:inline">Use Preset</span>
              <span class="sm:hidden">Preset</span>
            </span>
          </Button>
        </template>
      </div>
      
      <!-- Right Main Action Button Group -->
      <div class="flex flex-row items-center gap-2 order-1 md:order-2">
        <!-- Step 1: Next Button -->
        <template v-if="unifiedStore.currentStep === 1">
          <Button
            variant="default"
            size="sm"
            :disabled="!unifiedStore.canProceedToStep2"
            @click="handleGoToNextStep"
            class="flex-1 md:flex-none bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="ph:arrow-right" class="w-4 h-4 mr-2" />
            <span class="text-sm">
              <span class="hidden sm:inline">Next Step</span>
              <span class="sm:hidden">Next</span>
            </span>
          </Button>
        </template>
        
        <!-- Step 2: Next and Synthesize Buttons -->
        <template v-if="unifiedStore.currentStep === 2">
          <Button
            variant="ghost"
            size="sm"
            @click="handleGoToNextStep"
            class="flex-1 md:flex-none bg-background/60 hover:bg-muted/40"
          >
            <Icon name="ph:arrow-right" class="w-4 h-4 mr-2" />
            <span class="text-sm">
              <span class="hidden sm:inline">Skip to Results</span>
              <span class="sm:hidden">Skip</span>
            </span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            :disabled="!unifiedStore.canSynthesize || unifiedStore.isSynthesizing"
            @click="handleSynthesizePodcast"
            class="flex-1 md:flex-none relative overflow-hidden bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div class="flex items-center justify-center relative z-10">
              <Icon v-if="unifiedStore.isSynthesizing" name="ph:rocket-launch" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:rocket-launch" class="w-4 h-4 mr-2" />
              
              <span v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress" class="text-sm">
                <span class="hidden sm:inline">Synthesizing... {{ Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100) }}%</span>
                <span class="sm:hidden">{{ Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100) }}%</span>
              </span>
              <span v-else-if="unifiedStore.isSynthesizing" class="text-sm">
                <span class="hidden sm:inline">Synthesizing... 0%</span>
                <span class="sm:hidden">0%</span>
              </span>
              <span v-else class="text-sm">
                <span class="hidden sm:inline">Synthesize Podcast</span>
                <span class="sm:hidden">Synthesize</span>
              </span>
            </div>
            
            <!-- 简化的进度条 -->
            <div 
              v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
              class="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 rounded-full"
              :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
            />
            
            <!-- 处理状态的背景动画 -->
            <div v-if="unifiedStore.isSynthesizing" class="absolute inset-0 bg-white/5 animate-pulse" />
          </Button>
        </template>
        
        <!-- Step 3: Download and Re-synthesize Buttons -->
        <template v-if="unifiedStore.currentStep === 3">
          <Button
            v-if="unifiedStore.canDownloadAudio"
            variant="ghost"
            size="sm"
            @click="handleDownloadAudio"
            class="flex-1 md:flex-none bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
          >
            <Icon name="ph:download-simple" class="w-4 h-4 mr-2" />
            <span class="text-sm">Download</span>
          </Button>
          
          <Button
            @click="handleSynthesizePodcast"
            :disabled="unifiedStore.isSynthesizing"
            variant="default"
            size="sm"
            class="flex-1 md:flex-none relative overflow-hidden bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
          >
            <div class="flex items-center justify-center relative z-10">
              <Icon v-if="unifiedStore.isSynthesizing" name="ph:spinner-gap" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:arrows-clockwise" class="w-4 h-4 mr-2" />
              
              <span v-if="unifiedStore.isSynthesizing" class="text-sm">Processing...</span>
              <span v-else class="text-sm">Re-Synthesize</span>
            </div>
            
            <!-- 简化的进度指示器 -->
            <div 
              v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
              class="absolute bottom-0 left-0 h-1 bg-white/30 transition-all duration-300 rounded-full"
              :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
            />
            
            <!-- 处理状态的背景动画 -->
            <div v-if="unifiedStore.isSynthesizing" class="absolute inset-0 bg-white/5 animate-pulse" />
          </Button>
        </template>
      </div>
    </div>
  </CardFooter>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';
import { toast } from 'vue-sonner';

// === Only use unified store ===
const unifiedStore = usePlaygroundUnifiedStore();

// === Simplified button handler functions - only responsible for calling store and showing toasts ===

// 1. Step navigation
const handlePreviousStep = () => {
  unifiedStore.goToPreviousStep();
};

const handleReset = () => {
  unifiedStore.resetPlaygroundState();
  toast.info('Playground Reset', {
    description: 'All data has been cleared, you can start creating a new podcast.'
  });
};

// 2. AI script generation
const handleGenerateAiScript = async () => {
  try {
    const result = await unifiedStore.generateAiScript();
    if (result.success) {
      toast.success(result.message, {
        description: 'Script content has been updated, please check the editor.'
      });
    } else {
      toast.error(result.message);
    }
  } catch (error: any) {
    toast.error('AI Script Generation Failed', {
      description: error.message || 'Please check your network connection and try again.'
    });
  }
};

// 3. Use preset script
const handleUsePresetScript = () => {
  unifiedStore.loadPresetScript();
  toast.success('Preset Script Loaded', {
    description: 'You can use or modify this example script directly.'
  });
};

// 4. Go to next step
const handleGoToNextStep = async () => {
  try {
    await unifiedStore.goToNextStep();
    toast.success('Proceed to Next Step');
  } catch (error: any) {
    toast.error(error.message || 'Cannot proceed to next step');
  }
};

// 5. Synthesize podcast audio
const handleSynthesizePodcast = async () => {
  // If on step 2, start synthesis and go to step 3
  if (unifiedStore.currentStep === 2) {
    try {
      // Set step to 3 first to show the synthesis progress
      unifiedStore.currentStep = 3;
      
      // Start the actual synthesis process
      const result = await unifiedStore.synthesizeAudio();
      if (result.success) {
        toast.success(result.message || 'Audio Synthesis Successful', {
          description: 'Podcast audio synthesis completed!'
        });
      } else {
        toast.error(result.message || 'Audio Synthesis Failed');
      }
    } catch (error: any) {
      toast.error('Audio Synthesis Failed', {
        description: error.message || 'Please try again or check your network connection.'
      });
    }
    return;
  }
  
  // If on step 3, directly re-synthesize
  try {
    const result = await unifiedStore.synthesizeAudio();
    if (result.success) {
      toast.success(result.message || 'Audio Synthesis Successful', {
        description: 'Podcast audio synthesis completed!'
      });
    } else {
      toast.error(result.message || 'Audio Synthesis Failed');
    }
  } catch (error: any) {
    toast.error('Audio Synthesis Failed', {
      description: error.message || 'Please try again or check your network connection.'
    });
  }
};

// 6. Download audio
const handleDownloadAudio = () => {
  if (unifiedStore.finalAudioUrl) {
    const link = document.createElement('a');
    link.href = unifiedStore.finalAudioUrl;
    const filename = `podcast_${Date.now()}.mp3`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Audio Download Started', {
      description: 'The file will be saved to your downloads folder.'
    });
  } else {
    toast.error('No audio file available for download');
  }
};
</script>

<style scoped>
/* Button hover effects */
.group:hover .group-hover\:rotate-12 {
  transform: rotate(12deg);
}

.group:hover .group-hover\:scale-110 {
  transform: scale(1.1);
}

/* Loading animation */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Mobile adaptation */
@media (max-width: 768px) {
  .w-full.md\:w-auto {
    min-height: 44px; /* Ensure touch-friendly button height */
  }
}
</style>
