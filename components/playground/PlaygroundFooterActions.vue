<template>
  <CardFooter class="border-t p-2 md:p-3 flex flex-col justify-between items-stretch flex-shrink-0 bg-background gap-2">
    <!-- 移动端：垂直布局，桌面端：水平布局 -->
    <div class="flex flex-col md:flex-row md:justify-between md:items-center gap-2 w-full">
      <!-- Left Button Group -->
      <div class="flex flex-row md:flex-row items-center gap-2 md:gap-2 order-2 md:order-1">
        <!-- Previous Button -->
        <Button
          v-if="unifiedStore.currentStep > 1"
          variant="outline"
          size="sm"
          @click="handlePreviousStep"
          class="flex-1 md:flex-none"
        >
          <Icon name="ph:arrow-left" class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
          <span class="text-xs md:text-sm">Previous</span>
        </Button>
        
        <!-- Reset Button -->
        <Button
          variant="ghost"
          size="sm"
          @click="handleReset"
          class="flex-1 md:flex-none"
        >
          <Icon name="ph:arrow-counter-clockwise" class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
          <span class="text-xs md:text-sm">Reset</span>
        </Button>
        
        <!-- Step 1 specific buttons -->
        <template v-if="unifiedStore.currentStep === 1">
          <!-- AI Script Button -->
          <Button
            @click="handleGenerateAiScript"
            :disabled="unifiedStore.isLoading"
            :variant="!unifiedStore.isScriptEmpty ? 'outline' : 'default'"
            size="sm"
            class="flex-1 md:flex-none relative overflow-hidden group"
          >
            <div class="flex items-center justify-center">
              <Icon
                v-if="unifiedStore.isLoading"
                name="ph:spinner"
                class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 animate-spin text-primary"
              />
              <Icon
                v-else
                name="ph:brain"
                class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 group-hover:rotate-12 transition-transform duration-300"
              />
              <span v-if="unifiedStore.isLoading" class="text-xs md:text-sm">Creating...</span>
              <span v-else class="text-xs md:text-sm">
                <span class="hidden sm:inline">AI Script</span>
                <span class="sm:hidden">AI</span>
              </span>
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
            size="sm"
            @click="handleUsePresetScript"
            :disabled="unifiedStore.isLoading"
            class="flex-1 md:flex-none group"
          >
            <Icon
              name="ph:book-open-text"
              class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 group-hover:scale-110 transition-transform duration-300"
            />
            <span class="text-xs md:text-sm">
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
            :disabled="!unifiedStore.canGoToStep2 || unifiedStore.isValidating"
            @click="handleGoToNextStep"
            class="flex-1 md:flex-none relative overflow-hidden group"
          >
            <div class="flex items-center justify-center">
              <Icon
                v-if="unifiedStore.isValidating"
                name="ph:spinner"
                class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 animate-spin text-primary"
              />
              <span v-if="unifiedStore.isValidating" class="text-xs md:text-sm">Validating...</span>
              <span v-else class="text-xs md:text-sm">Next</span>
              <Icon v-if="!unifiedStore.isValidating" name="ph:arrow-right" class="w-3 md:w-4 h-3 md:h-4 ml-1 md:ml-2" />
            </div>
          </Button>
        </template>
        
        <!-- Step 2: Next and Synthesize Buttons -->
        <template v-if="unifiedStore.currentStep === 2">
          <Button
            variant="outline"
            size="sm"
            @click="handleGoToNextStep"
            class="flex-1 md:flex-none"
          >
            <Icon name="ph:arrow-right" class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
            <span class="text-xs md:text-sm">
              <span class="hidden sm:inline">Skip to Results</span>
              <span class="sm:hidden">Skip</span>
            </span>
          </Button>
          
          <Button
            variant="default"
            size="sm"
            :disabled="!unifiedStore.canSynthesize || unifiedStore.isSynthesizing"
            @click="handleSynthesizePodcast"
            class="flex-1 md:flex-none relative overflow-hidden"
          >
            <div class="flex items-center justify-center">
              <Icon v-if="unifiedStore.isSynthesizing" name="ph:rocket-launch" class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2 animate-spin" />
              <Icon v-else name="ph:rocket-launch" class="w-3 md:w-4 h-3 md:h-4 mr-1 md:mr-2" />
              
              <span v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress" class="text-xs md:text-sm">
                <span class="hidden sm:inline">Synthesizing... {{ Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100) }}%</span>
                <span class="sm:hidden">{{ Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100) }}%</span>
              </span>
              <span v-else-if="unifiedStore.isSynthesizing" class="text-xs md:text-sm">
                <span class="hidden sm:inline">Synthesizing... 0%</span>
                <span class="sm:hidden">0%</span>
              </span>
              <span v-else class="text-xs md:text-sm">
                <span class="hidden sm:inline">Synthesize Podcast</span>
                <span class="sm:hidden">Synthesize</span>
              </span>
            </div>
            
            <!-- Progress Bar -->
            <div 
              v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
              class="absolute bottom-0 left-0 h-0.5 md:h-1 bg-primary/20 transition-all duration-300"
              :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
            />
          </Button>
        </template>
        
        <!-- Step 3: Download and Re-synthesize Buttons -->
        <template v-if="unifiedStore.currentStep === 3">
          <Button
            v-if="unifiedStore.canDownloadAudio"
            variant="outline"
            size="sm"
            @click="handleDownloadAudio"
            class="flex-1 md:flex-none"
          >
            <Icon name="ph:download-simple" class="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            <span class="text-xs md:text-sm">Download</span>
          </Button>
          
          <Button
            @click="handleSynthesizePodcast"
            :disabled="unifiedStore.isSynthesizing"
            variant="default"
            size="sm"
            class="flex-1 md:flex-none relative"
          >
            <Icon v-if="unifiedStore.isSynthesizing" name="ph:spinner-gap" class="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 animate-spin" />
            <Icon v-else name="ph:arrows-clockwise" class="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            
            <span v-if="unifiedStore.isSynthesizing" class="text-xs md:text-sm">Processing...</span>
            <span v-else class="text-xs md:text-sm">Re-Synthesize</span>
            
            <!-- Progress indicator -->
            <div 
              v-if="unifiedStore.isSynthesizing && unifiedStore.synthesisProgress"
              class="absolute bottom-0 left-0 h-0.5 bg-primary-foreground/30 transition-all duration-300"
              :style="{ width: `${Math.round((unifiedStore.synthesisProgress.completed / unifiedStore.synthesisProgress.total) * 100)}%` }"
            />
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
  // If on step 2, show Modal confirmation
  if (unifiedStore.currentStep === 2) {
    unifiedStore.currentStep = 3
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
