<!--
@description Compact circular audio synthesis progress indicator with gradient effects
-->

<template>
  <div class="synthesis-progress-container flex flex-col items-center justify-center space-y-6">
    <!-- Compact Circular Progress -->
    <div class="relative flex flex-col items-center space-y-4">
      <!-- Main Circular Progress -->
      <div class="relative">
        <!-- Background Circle -->
        <div class="w-20 h-20 rounded-full bg-muted/30 relative overflow-hidden">
          <!-- Progress Arc -->
          <svg class="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
            <!-- Background circle -->
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              stroke-width="6"
              fill="none"
              class="text-muted-foreground/20"
            />
            <!-- Progress circle with gradient -->
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="url(#progressGradient)"
              stroke-width="6"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="circumference - (progressPercentage / 100) * circumference"
              class="transition-all duration-700 ease-out"
              :class="{ 'animate-pulse': isProcessing }"
            />
            
            <!-- Gradient definition -->
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" :stop-color="isProcessing ? '#3b82f6' : '#10b981'" />
                <stop offset="50%" :stop-color="isProcessing ? '#8b5cf6' : '#059669'" />
                <stop offset="100%" :stop-color="isProcessing ? '#ec4899' : '#047857'" />
              </linearGradient>
            </defs>
          </svg>
          
          <!-- Center Icon and Percentage -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <!-- Processing Animation -->
            <div v-if="isProcessing" class="relative">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center relative overflow-hidden">
                <Icon name="ph:waveform" class="w-4 h-4 text-primary z-10" />
                <!-- Ripple Effect -->
                <div class="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              </div>
            </div>
            
            <!-- Completed State -->
            <div v-else-if="progressPercentage === 100" class="relative">
              <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                <Icon name="ph:check" class="w-4 h-4 text-green-500" />
              </div>
            </div>
            
            <!-- Ready State -->
            <div v-else class="relative">
              <div class="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Icon name="ph:speaker-high" class="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            
            <!-- Percentage Text -->
            <span class="text-xs font-medium text-foreground mt-1">
              {{ progressPercentage }}%
            </span>
          </div>
          
          <!-- Glow Effect -->
          <div 
            v-if="isProcessing" 
            class="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 animate-pulse"
          />
        </div>
      </div>
      
      <!-- Status Text -->
      <div class="text-center max-w-sm">
        <h3 class="text-base font-semibold text-foreground mb-1">
          {{ statusText }}
        </h3>
        <p class="text-xs text-muted-foreground">
          {{ progressData.completed }}/{{ progressData.total }} segments
          <span v-if="timeEstimate && isProcessing" class="ml-2">
            • {{ timeEstimate }} remaining
          </span>
        </p>
      </div>
    </div>

    <!-- Compact Segments Display -->
    <div v-if="progressData.total > 0" class="flex flex-wrap justify-center gap-1.5 max-w-md">
      <div 
        v-for="(segment, index) in segmentDisplayItems.slice(0, Math.min(12, progressData.total))" 
        :key="index"
        class="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500"
        :class="getCompactSegmentClass(segment, index)"
      >
        <!-- Processing Animation -->
        <div v-if="segment.status === 'processing'" class="relative">
          <div class="w-3 h-3 rounded-full bg-primary animate-pulse" />
          <div class="absolute inset-0 w-3 h-3 rounded-full bg-primary/30 animate-ping" />
        </div>
        
        <!-- Completed -->
        <Icon 
          v-else-if="segment.status === 'completed'" 
          name="ph:check" 
          class="w-3 h-3 text-white" 
        />
        
        <!-- Error -->
        <Icon 
          v-else-if="segment.status === 'error'" 
          name="ph:x" 
          class="w-3 h-3 text-white" 
        />
        
        <!-- Waiting -->
        <div v-else class="w-2 h-2 rounded-full bg-muted-foreground/40" />
      </div>
      
      <!-- Show more indicator -->
      <div 
        v-if="progressData.total > 12"
        class="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center"
      >
        <span class="text-xs text-muted-foreground">+{{ progressData.total - 12 }}</span>
      </div>
    </div>

    <!-- Current Processing Info (Minimal) -->
    <div 
      v-if="currentSegmentInfo && isProcessing" 
      class="bg-primary/5 border border-primary/20 rounded-full px-4 py-2 max-w-sm"
    >
      <div class="flex items-center space-x-2">
        <Icon name="ph:microphone" class="w-3 h-3 text-primary flex-shrink-0" />
        <span class="text-xs font-medium text-foreground truncate">
          {{ currentSegmentInfo.speaker }}
        </span>
        <Icon name="ph:spinner" class="w-3 h-3 text-primary animate-spin flex-shrink-0" />
      </div>
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

// Circle circumference for SVG progress
const circumference = computed(() => 2 * Math.PI * 36); // radius = 36

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
    return 'Initializing...';
  } else if (progressPercentage.value < 50) {
    return 'Synthesizing Audio...';
  } else if (progressPercentage.value < 90) {
    return 'Processing...';
  } else {
    return 'Finalizing...';
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
  
  // Estimate ~10 seconds per segment for compact display
  const estimatedSeconds = remaining * 10;
  
  if (estimatedSeconds < 60) {
    return `~${estimatedSeconds}s`;
  } else {
    const minutes = Math.ceil(estimatedSeconds / 60);
    return `~${minutes}m`;
  }
});

// Helper function for compact segment styling
function getCompactSegmentClass(segment: SegmentProgress, index: number) {
  const baseClass = 'border-2 transition-all duration-500 transform';
  
  switch (segment.status) {
    case 'processing':
      return `${baseClass} bg-primary border-primary scale-110 shadow-lg shadow-primary/50`;
    case 'completed':
      return `${baseClass} bg-green-500 border-green-500 shadow-sm`;
    case 'error':
      return `${baseClass} bg-destructive border-destructive shadow-sm`;
    default:
      return `${baseClass} bg-muted border-muted-foreground/20`;
  }
}
</script>

<style scoped>
.synthesis-progress-container {
  animation: fadeInUp 0.4s ease-out;
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

/* Custom glow animation for processing state */
@keyframes progressGlow {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.5));
  }
}

.animate-pulse {
  animation: progressGlow 2s ease-in-out infinite;
}
</style> 