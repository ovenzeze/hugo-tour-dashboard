<!--
@description Enhanced circular audio synthesis progress indicator with elegant animations and detailed progress info
-->

<template>
  <div class="synthesis-progress-container flex flex-col items-center justify-center space-y-6">
    <!-- Enhanced Circular Progress with Pulse Effect -->
    <div class="relative flex flex-col items-center space-y-4">
      <!-- Main Circular Progress with Glow -->
      <div class="relative">
        <!-- Animated Background Rings -->
        <div class="absolute inset-0 w-24 h-24 -translate-x-2 -translate-y-2">
          <div 
            v-if="isProcessing" 
            class="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping"
            style="animation-duration: 2s;"
          />
          <div 
            v-if="isProcessing" 
            class="absolute inset-2 rounded-full border border-primary/30 animate-ping"
            style="animation-duration: 1.5s; animation-delay: 0.3s;"
          />
        </div>
        
        <!-- Main Progress Circle -->
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-muted/40 to-muted/20 relative overflow-hidden shadow-lg">
          <!-- Animated Progress Arc -->
          <svg class="w-10 h-10 transform -rotate-90" viewBox="0 0 80 80">
            <!-- Background circle -->
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="currentColor"
              stroke-width="4"
              fill="none"
              class="text-muted-foreground/10"
            />
            <!-- Progress circle with enhanced gradient -->
            <circle
              cx="40"
              cy="40"
              r="36"
              stroke="url(#enhancedProgressGradient)"
              stroke-width="4"
              fill="none"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="circumference - (progressPercentage / 100) * circumference"
              class="transition-all duration-1000 ease-out drop-shadow-sm"
              :class="{ 'animate-pulse': isProcessing }"
            />
            
            <!-- Enhanced Gradient definition -->
            <defs>
              <linearGradient id="enhancedProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" :stop-color="getGradientColor(0)" />
                <stop offset="25%" :stop-color="getGradientColor(25)" />
                <stop offset="50%" :stop-color="getGradientColor(50)" />
                <stop offset="75%" :stop-color="getGradientColor(75)" />
                <stop offset="100%" :stop-color="getGradientColor(100)" />
              </linearGradient>
              
              <!-- Glow effect filter -->
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge> 
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
          </svg>
          
          <!-- Center Content with Enhanced Animation -->
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <!-- Processing Animation with Particles -->
            <div v-if="isProcessing" class="relative">
              <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center relative overflow-hidden shadow-lg">
                <Icon name="ph:waveform" class="w-4 h-4 text-white z-10 animate-pulse" />
                
                <!-- Floating Particles -->
                <div class="absolute inset-0">
                  <div 
                    v-for="i in 3" 
                    :key="i"
                    class="absolute w-1 h-1 bg-white/60 rounded-full animate-bounce"
                    :style="{ 
                      left: `${20 + i * 20}%`, 
                      animationDelay: `${i * 0.2}s`,
                      animationDuration: '1s'
                    }"
                  />
                </div>
                
                <!-- Ripple Effects -->
                <div class="absolute inset-0 rounded-full bg-primary/30 animate-ping" style="animation-duration: 1.5s;" />
                <div class="absolute inset-1 rounded-full bg-purple-500/20 animate-ping" style="animation-duration: 2s; animation-delay: 0.5s;" />
              </div>
            </div>
            
            <!-- Completed State with Celebration -->
            <div v-else-if="progressPercentage === 100" class="relative">
              <div class="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg animate-bounce">
                <Icon name="ph:check" class="w-4 h-4 text-white" />
              </div>
              <!-- Success Sparkles -->
              <div class="absolute -inset-2">
                <div 
                  v-for="i in 4" 
                  :key="i"
                  class="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
                  :style="{ 
                    top: `${i % 2 === 0 ? '10%' : '90%'}`,
                    left: `${i < 2 ? '10%' : '90%'}`,
                    animationDelay: `${i * 0.3}s`
                  }"
                />
              </div>
            </div>
            
            <!-- Ready State -->
            <div v-else class="relative">
              <div class="w-8 h-8 rounded-full bg-gradient-to-r from-muted to-muted-foreground/50 flex items-center justify-center">
                <Icon name="ph:speaker-high" class="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            
            <!-- Animated Percentage Text -->
            <div class="mt-1 relative">
              <span class="text-xs font-bold text-foreground transition-all duration-300 transform">
                {{ progressPercentage }}%
              </span>
              <!-- Progress Glow -->
              <div v-if="isProcessing" class="absolute inset-0 text-xs font-bold text-primary/50 animate-pulse blur-sm">
                {{ progressPercentage }}%
              </div>
            </div>
          </div>
          
          <!-- Dynamic Glow Effect -->
          <div 
            v-if="isProcessing" 
            class="absolute inset-0 rounded-full opacity-50 animate-pulse"
            :class="getGlowClass(progressPercentage)"
          />
        </div>
      </div>
      
      <!-- Enhanced Status Section -->
      <div class="text-center max-w-sm space-y-2">
        <h3 class="text-base font-semibold text-foreground transition-all duration-300">
          {{ statusText }}
        </h3>
        
        <!-- Detailed Progress Info -->
        <div class="space-y-1">
          <p class="text-xs text-muted-foreground">
            <span class="font-medium">{{ progressData.completed }}</span>/<span class="font-medium">{{ progressData.total }}</span> segments completed
          </p>
          
          <!-- Processing Speed & Time Info -->
          <div v-if="isProcessing" class="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <div v-if="timeEstimate" class="flex items-center gap-1">
              <Icon name="ph:clock" class="w-3 h-3" />
              <span>{{ timeEstimate }} remaining</span>
            </div>
            <div v-if="processingSpeed" class="flex items-center gap-1">
              <Icon name="ph:gauge" class="w-3 h-3" />
              <span>{{ processingSpeed }}</span>
            </div>
          </div>
          
          <!-- Current Stage Detail -->
          <div v-if="currentStageDetail" class="mt-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
            <div class="flex items-center gap-2 text-xs">
              <Icon name="ph:gear" class="w-3 h-3 text-primary animate-spin" />
              <span class="font-medium text-primary">{{ currentStageDetail }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Enhanced Segments Display with Smooth Animations -->
    <div v-if="progressData.total > 0" class="space-y-3 w-full max-w-md">
      <div class="flex items-center justify-between text-xs text-muted-foreground">
        <span>Segment Progress</span>
        <span>{{ progressData.completed }}/{{ progressData.total }}</span>
      </div>
      
      <!-- Segments Grid with Stagger Animation -->
      <div class="grid grid-cols-6 gap-2">
        <div 
          v-for="(segment, index) in segmentDisplayItems.slice(0, Math.min(12, progressData.total))" 
          :key="index"
          class="relative aspect-square rounded-lg transition-all duration-500 transform"
          :class="getEnhancedSegmentClass(segment, index)"
          :style="{ 
            transitionDelay: `${index * 50}ms`,
            animationDelay: `${index * 100}ms`
          }"
        >
          <!-- Segment Content -->
          <div class="absolute inset-0 flex items-center justify-center">
            <!-- Processing Animation -->
            <div v-if="segment.status === 'processing'" class="relative">
              <div class="w-4 h-4 rounded-full bg-gradient-to-r from-primary to-purple-500 animate-pulse" />
              <div class="absolute inset-0 w-4 h-4 rounded-full bg-primary/30 animate-ping" />
              
              <!-- Audio Waves -->
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="flex gap-px">
                  <div 
                    v-for="i in 3" 
                    :key="i"
                    class="w-px bg-white rounded-full animate-pulse"
                    :style="{ 
                      height: `${8 + (i % 2) * 4}px`,
                      animationDelay: `${i * 0.15}s`,
                      animationDuration: '0.8s'
                    }"
                  />
                </div>
              </div>
            </div>
            
            <!-- Completed with Bounce -->
            <Icon 
              v-else-if="segment.status === 'completed'" 
              name="ph:check" 
              class="w-4 h-4 text-white animate-bounce" 
              style="animation-duration: 1s; animation-iteration-count: 1;"
            />
            
            <!-- Error with Shake -->
            <Icon 
              v-else-if="segment.status === 'error'" 
              name="ph:x" 
              class="w-4 h-4 text-white animate-pulse" 
            />
            
            <!-- Waiting with Subtle Pulse -->
            <div v-else class="w-3 h-3 rounded-full bg-muted-foreground/40 animate-pulse" style="animation-duration: 2s;" />
          </div>
          
          <!-- Progress Bar for Processing Segments -->
          <div v-if="segment.status === 'processing' && segment.progress" class="absolute bottom-0 left-0 right-0 h-1 bg-black/20 rounded-b-lg overflow-hidden">
            <div 
              class="h-full bg-gradient-to-r from-white/80 to-white/60 transition-all duration-300"
              :style="{ width: `${segment.progress}%` }"
            />
          </div>
        </div>
        
        <!-- Show more indicator with Animation -->
        <div 
          v-if="progressData.total > 12"
          class="relative aspect-square rounded-lg bg-muted/50 flex items-center justify-center transition-all duration-300 hover:bg-muted/70"
        >
          <span class="text-xs text-muted-foreground font-medium">+{{ progressData.total - 12 }}</span>
        </div>
      </div>
    </div>

    <!-- Current Processing Segment Info with Enhanced Design -->
    <div 
      v-if="currentSegmentInfo && isProcessing" 
      class="w-full max-w-md bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-4 space-y-3 backdrop-blur-sm"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <span class="text-sm font-medium text-foreground">Currently Processing</span>
        </div>
        <span class="text-xs text-muted-foreground">Segment {{ (currentSegmentInfo.index || 0) + 1 }}</span>
      </div>
      
      <div class="space-y-2">
        <div class="flex items-center space-x-2">
          <Icon name="ph:microphone" class="w-4 h-4 text-primary flex-shrink-0" />
          <span class="text-sm font-medium text-foreground truncate">
            {{ currentSegmentInfo.speaker }}
          </span>
        </div>
        
        <p class="text-xs text-muted-foreground line-clamp-2 italic">
          "{{ currentSegmentInfo.text }}"
        </p>
        
        <!-- Processing Stage -->
        <div v-if="currentProcessingStage" class="flex items-center space-x-2 pt-1">
          <Icon name="ph:gear" class="w-3 h-3 text-primary animate-spin" />
          <span class="text-xs text-primary font-medium">{{ currentProcessingStage }}</span>
        </div>
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

const processingSpeed = computed(() => {
  if (!props.isProcessing || props.progressData.completed === 0) return null;
  
  // 模拟处理速度计算 (segments per minute)
  const avgTimePerSegment = 15; // 假设每个片段平均需要15秒
  const segmentsPerMinute = Math.round(60 / avgTimePerSegment * 10) / 10;
  return `${segmentsPerMinute}/min`;
});

const currentStageDetail = computed(() => {
  if (!props.isProcessing) return null;
  
  const progress = progressPercentage.value;
  
  if (progress < 10) return 'Preparing synthesis requests...';
  if (progress < 30) return 'Sending to TTS service...';
  if (progress < 60) return 'Processing audio segments...';
  if (progress < 80) return 'Optimizing audio quality...';
  if (progress < 95) return 'Finalizing audio files...';
  return 'Completing synthesis...';
});

const currentProcessingStage = computed(() => {
  if (!props.isProcessing || !currentSegmentInfo.value) return null;
  
  const stages = [
    'Text analysis',
    'Voice generation', 
    'Audio processing',
    'Quality check',
    'Finalizing'
  ];
  
  // 根据当前片段进度返回不同阶段
  const currentIndex = currentSegmentInfo.value.index || 0;
  const stageIndex = currentIndex % stages.length;
  return stages[stageIndex];
});

// Helper function for gradient color calculation
function getGradientColor(percentage: number) {
  if (!props.isProcessing) {
    // Completed state - green gradient
    if (progressPercentage.value === 100) {
      if (percentage <= 25) return '#10b981'; // emerald-500
      if (percentage <= 50) return '#059669'; // emerald-600
      if (percentage <= 75) return '#047857'; // emerald-700
      return '#065f46'; // emerald-800
    }
    // Default state
    return '#6b7280'; // gray-500
  }
  
  // Processing state - dynamic gradient based on progress
  const progress = progressPercentage.value;
  
  if (progress < 25) {
    // Blue to purple
    if (percentage <= 50) return '#3b82f6'; // blue-500
    return '#8b5cf6'; // purple-500
  } else if (progress < 50) {
    // Purple to pink
    if (percentage <= 50) return '#8b5cf6'; // purple-500
    return '#ec4899'; // pink-500
  } else if (progress < 75) {
    // Pink to orange
    if (percentage <= 50) return '#ec4899'; // pink-500
    return '#f97316'; // orange-500
  } else {
    // Orange to green (near completion)
    if (percentage <= 50) return '#f97316'; // orange-500
    return '#10b981'; // emerald-500
  }
}

// Helper function for glow class calculation
function getGlowClass(percentage: number) {
  const progress = progressPercentage.value;
  
  if (progress < 25) {
    return 'bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-blue-500/20';
  } else if (progress < 50) {
    return 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20';
  } else if (progress < 75) {
    return 'bg-gradient-to-r from-pink-500/20 via-orange-500/20 to-pink-500/20';
  } else {
    return 'bg-gradient-to-r from-orange-500/20 via-emerald-500/20 to-orange-500/20';
  }
}

// Helper function for enhanced segment class calculation
function getEnhancedSegmentClass(segment: SegmentProgress, index: number) {
  const baseClass = 'border-2 transition-all duration-500 transform hover:scale-105';
  
  switch (segment.status) {
    case 'processing':
      return `${baseClass} bg-gradient-to-br from-primary to-purple-500 border-primary/50 scale-110 shadow-lg shadow-primary/30 animate-pulse`;
    case 'completed':
      return `${baseClass} bg-gradient-to-br from-green-400 to-emerald-500 border-green-400/50 shadow-md shadow-green-400/20`;
    case 'error':
      return `${baseClass} bg-gradient-to-br from-red-400 to-red-500 border-red-400/50 shadow-md shadow-red-400/20`;
    default:
      return `${baseClass} bg-gradient-to-br from-muted to-muted-foreground/20 border-muted-foreground/30 hover:border-muted-foreground/50`;
  }
}
</script>

<style scoped>
.synthesis-progress-container {
  animation: fadeInUp 0.6s ease-out;
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

/* Enhanced wave animation for audio processing */
@keyframes audioWave {
  0%, 100% { 
    height: 8px; 
    opacity: 0.6; 
  }
  50% { 
    height: 16px; 
    opacity: 1; 
  }
}

/* Smooth progress glow animation */
@keyframes progressGlow {
  0%, 100% {
    filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.4));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 16px rgba(139, 92, 246, 0.6));
    transform: scale(1.02);
  }
}

/* Particle floating animation */
@keyframes floatParticle {
  0%, 100% {
    transform: translateY(0px) translateX(0px);
    opacity: 0.6;
  }
  25% {
    transform: translateY(-3px) translateX(1px);
    opacity: 1;
  }
  50% {
    transform: translateY(-1px) translateX(-1px);
    opacity: 0.8;
  }
  75% {
    transform: translateY(-2px) translateX(1px);
    opacity: 1;
  }
}

/* Success celebration sparkle */
@keyframes sparkle {
  0% {
    transform: scale(0) rotate(0deg);
    opacity: 0;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
    opacity: 1;
  }
  100% {
    transform: scale(0) rotate(360deg);
    opacity: 0;
  }
}

/* Staggered segment reveal animation */
@keyframes segmentReveal {
  0% {
    opacity: 0;
    transform: scale(0.8) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* Processing pulse animation */
@keyframes processingPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

/* Smooth color transition for progress states */
.animate-pulse {
  animation: progressGlow 2s ease-in-out infinite;
}

/* Custom animations for enhanced experience */
.floating-particle {
  animation: floatParticle 2s ease-in-out infinite;
}

.success-sparkle {
  animation: sparkle 1.5s ease-out forwards;
}

.segment-reveal {
  animation: segmentReveal 0.5s ease-out forwards;
}

.processing-pulse {
  animation: processingPulse 1.5s ease-in-out infinite;
}

/* Responsive design improvements */
@media (max-width: 640px) {
  .synthesis-progress-container {
    padding: 1rem 0.5rem;
    space-y: 1rem;
  }
  
  .grid-cols-6 {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Dark mode optimizations */
@media (prefers-color-scheme: dark) {
  .animate-pulse {
    filter: brightness(1.1);
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .synthesis-progress-container,
  .animate-pulse,
  .floating-particle,
  .success-sparkle,
  .segment-reveal,
  .processing-pulse {
    animation: none;
  }
  
  .transition-all {
    transition: none;
  }
}

/* Hover effects for better interactivity */
.segment-reveal:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

/* Enhanced backdrop blur for current segment info */
.backdrop-blur-sm {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style> 