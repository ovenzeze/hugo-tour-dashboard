<!--
@description Enhanced audio synthesis progress component with beautiful segment-based loading animation
-->

<template>
  <div class="synthesis-progress-container">
    <!-- Header with Title and Overall Progress -->
    <div class="flex flex-col items-center space-y-3 mb-6">
      <div class="relative">
        <!-- Animated Audio Wave Icon - 减小尺寸 -->
        <div class="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
          <Icon name="ph:waveform" class="w-5 h-5 md:w-6 md:h-6 text-primary z-10" />
          
          <!-- Pulsing Animation -->
          <div 
            v-if="isProcessing" 
            class="absolute inset-0 rounded-full bg-primary/20 animate-ping"
          />
          <div 
            v-if="isProcessing" 
            class="absolute inset-2 rounded-full bg-primary/30 animate-pulse"
          />
        </div>
      </div>
      
      <div class="text-center max-w-sm">
        <h3 class="text-lg md:text-xl font-semibold text-foreground mb-1">
          {{ statusText }}
        </h3>
        <p class="text-xs md:text-sm text-muted-foreground">
          {{ statusDescription }}
        </p>
      </div>
    </div>

    <!-- Compact Progress Bar -->
    <div class="w-full max-w-lg mx-auto mb-6">
      <div class="flex justify-between items-center mb-2">
        <span class="text-xs md:text-sm font-medium text-foreground">Progress</span>
        <span class="text-xs text-muted-foreground">
          {{ progressData.completed }}/{{ progressData.total }}
        </span>
      </div>
      
      <div class="relative w-full h-2 bg-muted rounded-full overflow-hidden">
        <!-- Progress fill with gradient -->
        <div 
          class="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
          :class="progressBarClass"
          :style="{ width: `${progressPercentage}%` }"
        >
          <!-- Shimmer effect -->
          <div 
            v-if="isProcessing"
            class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-pulse"
          />
        </div>
        
        <!-- Percentage text overlay -->
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-xs font-medium text-foreground/80">
            {{ progressPercentage }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Compact Segment Progress Grid -->
    <div class="w-full max-w-2xl mx-auto">
      <div class="mb-3">
        <h4 class="text-sm md:text-base font-medium text-foreground mb-1">Audio Segments</h4>
        <p class="text-xs text-muted-foreground">
          Synthesizing your podcast segments
        </p>
      </div>
      
      <!-- 移动端使用更紧凑的布局 -->
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
        <div 
          v-for="(segment, index) in segmentDisplayItems.slice(0, maxDisplaySegments)" 
          :key="index"
          class="segment-item"
          :class="getSegmentItemClass(segment)"
        >
          <!-- Segment Icon/Status - 减小尺寸 -->
          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center mb-1 transition-all duration-300">
            <!-- Processing state -->
            <div v-if="segment.status === 'processing'" class="relative">
              <Icon name="ph:spinner" class="w-3 h-3 md:w-4 md:h-4 text-primary animate-spin" />
              <div class="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
            
            <!-- Success state -->
            <Icon 
              v-else-if="segment.status === 'completed'" 
              name="ph:check-circle-fill" 
              class="w-3 h-3 md:w-4 md:h-4 text-green-500" 
            />
            
            <!-- Error state -->
            <Icon 
              v-else-if="segment.status === 'error'" 
              name="ph:x-circle-fill" 
              class="w-3 h-3 md:w-4 md:h-4 text-destructive" 
            />
            
            <!-- Waiting state -->
            <Icon 
              v-else 
              name="ph:clock" 
              class="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" 
            />
          </div>
          
          <!-- Compact Segment Info -->
          <div class="text-center">
            <div class="text-xs font-medium text-foreground leading-tight">
              {{ index + 1 }}
            </div>
            <div class="text-xs text-muted-foreground truncate leading-tight">
              {{ segment.speaker.split(' ')[0] }}
            </div>
          </div>
          
          <!-- Mini waveform for processing -->
          <div 
            v-if="segment.status === 'processing'" 
            class="mt-1 flex items-center justify-center space-x-0.5"
          >
            <div 
              v-for="i in 3" 
              :key="i"
              class="w-0.5 rounded-full bg-primary/60 animate-pulse"
              :style="{
                height: `${4 + Math.sin((i / 1.5) * Math.PI + Date.now() / 300) * 2}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '1.2s'
              }"
            />
          </div>
        </div>
        
        <!-- Show more indicator if there are more segments -->
        <div 
          v-if="segmentDisplayItems.length > maxDisplaySegments"
          class="segment-item bg-muted/30 border-muted rounded-lg p-2 md:p-3 transition-all duration-300"
        >
          <div class="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center mb-1 bg-muted-foreground/20">
            <Icon name="ph:dots-three" class="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
          </div>
          <div class="text-center">
            <div class="text-xs font-medium text-muted-foreground">
              +{{ segmentDisplayItems.length - maxDisplaySegments }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact Current Status -->
    <div 
      v-if="currentSegmentInfo" 
      class="mt-6 w-full max-w-lg mx-auto p-3 rounded-lg border bg-card/50 text-card-foreground"
    >
      <div class="flex items-center space-x-2">
        <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon name="ph:microphone" class="w-4 h-4 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm text-foreground">
            Processing Segment {{ currentSegmentInfo.index + 1 }}
          </div>
          <div class="text-xs text-muted-foreground truncate">
            {{ currentSegmentInfo.speaker }}: {{ currentSegmentInfo.text.substring(0, 50) }}...
          </div>
        </div>
        <div class="flex items-center space-x-1 flex-shrink-0">
          <Icon name="ph:spinner" class="w-3 h-3 text-primary animate-spin" />
        </div>
      </div>
    </div>

    <!-- Compact Time Estimation -->
    <div 
      v-if="timeEstimate && isProcessing" 
      class="mt-4 text-center text-xs text-muted-foreground"
    >
      <Icon name="ph:clock" class="w-3 h-3 inline mr-1" />
      {{ timeEstimate }} remaining
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface SegmentProgress {
  status: 'waiting' | 'processing' | 'completed' | 'error';
  speaker: string;
  text: string;
  error?: string;
}

interface ProgressData {
  completed: number;
  total: number;
  currentSegment?: number;
  segments?: SegmentProgress[];
}

interface Props {
  isProcessing: boolean;
  progressData: ProgressData;
  statusOverride?: string;
  showTimeEstimate?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showTimeEstimate: true
});

// Computed properties
const progressPercentage = computed(() => {
  if (props.progressData.total === 0) return 0;
  return Math.round((props.progressData.completed / props.progressData.total) * 100);
});

const statusText = computed(() => {
  if (props.statusOverride) return props.statusOverride;
  
  if (!props.isProcessing) {
    if (progressPercentage.value === 100) {
      return 'Synthesis Complete!';
    }
    return 'Ready to Synthesize';
  }
  
  if (progressPercentage.value === 0) {
    return 'Initializing Synthesis...';
  } else if (progressPercentage.value < 50) {
    return 'Synthesizing Audio...';
  } else if (progressPercentage.value < 90) {
    return 'Processing Segments...';
  } else {
    return 'Finalizing Podcast...';
  }
});

const statusDescription = computed(() => {
  if (props.statusOverride) {
    return 'Audio synthesis is in progress. Please wait while we process your podcast segments.';
  }
  
  if (!props.isProcessing) {
    if (progressPercentage.value === 100) {
      return 'Your podcast audio has been successfully generated and is ready to play.';
    }
    return 'Click the synthesize button to start generating your podcast audio.';
  }
  
  return 'Converting your script into high-quality audio using advanced text-to-speech technology.';
});

const progressBarClass = computed(() => {
  if (progressPercentage.value === 100) {
    return 'bg-gradient-to-r from-green-500 to-green-600';
  } else if (props.isProcessing) {
    return 'bg-gradient-to-r from-primary via-primary/80 to-primary';
  } else {
    return 'bg-gradient-to-r from-muted-foreground/50 to-muted-foreground/30';
  }
});

const segmentDisplayItems = computed(() => {
  const segments: SegmentProgress[] = [];
  const total = props.progressData.total;
  const completed = props.progressData.completed;
  const currentSegment = props.progressData.currentSegment;
  
  // Create segment items based on available data
  if (props.progressData.segments && props.progressData.segments.length > 0) {
    return props.progressData.segments;
  }
  
  // Fallback: create placeholder segments
  for (let i = 0; i < total; i++) {
    let status: SegmentProgress['status'] = 'waiting';
    
    if (i < completed) {
      status = 'completed';
    } else if (i === currentSegment && props.isProcessing) {
      status = 'processing';
    }
    
    segments.push({
      status,
      speaker: `Speaker ${i + 1}`,
      text: `Segment ${i + 1} content`
    });
  }
  
  return segments;
});

// 控制显示的segments数量，移动端更少
const maxDisplaySegments = computed(() => {
  // 根据屏幕尺寸动态调整
  if (typeof window !== 'undefined') {
    return window.innerWidth < 640 ? 9 : 12;
  }
  return 12;
});

const currentSegmentInfo = computed(() => {
  if (!props.isProcessing || props.progressData.currentSegment === undefined) {
    return null;
  }
  
  const currentIndex = props.progressData.currentSegment;
  const segments = segmentDisplayItems.value;
  
  if (currentIndex >= 0 && currentIndex < segments.length) {
    return {
      index: currentIndex,
      speaker: segments[currentIndex].speaker,
      text: segments[currentIndex].text
    };
  }
  
  return null;
});

const timeEstimate = computed(() => {
  if (!props.showTimeEstimate || !props.isProcessing) return null;
  
  const remaining = props.progressData.total - props.progressData.completed;
  if (remaining <= 0) return null;
  
  // Estimate ~15 seconds per segment (conservative estimate)
  const estimatedSeconds = remaining * 15;
  
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds}s`;
  } else if (estimatedSeconds < 3600) {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}m`;
  } else {
    const hours = Math.floor(estimatedSeconds / 3600);
    const minutes = Math.ceil((estimatedSeconds % 3600) / 60);
    return `~${hours}h ${minutes}m`;
  }
});

// Helper function to get segment item styling
function getSegmentItemClass(segment: SegmentProgress) {
  const baseClass = 'p-3 rounded-lg border transition-all duration-300 hover:shadow-sm';
  
  switch (segment.status) {
    case 'processing':
      return `${baseClass} bg-primary/5 border-primary/20 shadow-md`;
    case 'completed':
      return `${baseClass} bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800`;
    case 'error':
      return `${baseClass} bg-destructive/5 border-destructive/20`;
    default:
      return `${baseClass} bg-muted/30 border-muted`;
  }
}
</script>

<style scoped>
.synthesis-progress-container {
  width: 100%;
  padding: 1rem 0.75rem;
  max-height: 80vh;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.synthesis-progress-container::-webkit-scrollbar {
  width: 4px;
}

.synthesis-progress-container::-webkit-scrollbar-track {
  background: transparent;
}

.synthesis-progress-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.segment-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.segment-item:hover {
  transform: translateY(-1px);
}

/* Enhanced animations */
@keyframes wave {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(1.5); }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.segment-item {
  animation: fadeInUp 0.3s ease-out;
}

.segment-item .w-0\.5 {
  animation: wave 1.2s ease-in-out infinite;
}

/* Step transition animations */
.synthesis-progress-container {
  animation: slideInFromBottom 0.4s ease-out;
}

@keyframes slideInFromBottom {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Mobile optimizations */
@media (max-width: 640px) {
  .synthesis-progress-container {
    padding: 0.75rem 0.5rem;
  }
  
  .segment-item {
    min-height: auto;
    padding: 0.5rem;
  }
}

/* Touch device optimizations */
@media (hover: none) and (pointer: coarse) {
  .segment-item:hover {
    transform: none;
  }
  
  .segment-item:active {
    transform: scale(0.98);
  }
}
</style> 