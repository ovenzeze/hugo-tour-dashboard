<!--
@description Enhanced audio synthesis progress component using shadcn/vue components
-->

<template>
  <div class="synthesis-progress-container space-y-6">
    <!-- Main Progress Card -->
    <Card class="p-6">
      <!-- Header with Icon and Status -->
      <div class="flex flex-col items-center space-y-4 mb-6">
        <div class="relative">
          <!-- Audio Wave Icon -->
          <div class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
            <Icon name="ph:waveform" class="w-6 h-6 text-primary z-10" />
            
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
        
        <div class="text-center max-w-md">
          <h3 class="text-xl font-semibold text-foreground mb-2">
            {{ statusText }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ statusDescription }}
          </p>
        </div>
      </div>

      <!-- Progress Section -->
      <div class="space-y-4">
        <div class="flex justify-between items-center">
          <span class="text-sm font-medium text-foreground">Overall Progress</span>
          <Badge variant="secondary">
            {{ progressData.completed }}/{{ progressData.total }}
          </Badge>
        </div>
        
        <!-- Main Progress Bar -->
        <div class="space-y-2">
          <Progress 
            :model-value="progressPercentage" 
            class="h-3"
          />
          <div class="flex justify-between items-center text-xs text-muted-foreground">
            <span>{{ progressPercentage }}% complete</span>
            <span v-if="timeEstimate && isProcessing">
              <Icon name="ph:clock" class="w-3 h-3 inline mr-1" />
              {{ timeEstimate }} remaining
            </span>
          </div>
        </div>
      </div>
    </Card>

    <!-- Audio Segments Card -->
    <Card class="p-6">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="text-base font-semibold text-foreground">Audio Segments</h4>
          <Badge variant="outline" class="text-xs">
            Processing segments
          </Badge>
        </div>
        
        <!-- Segments Grid -->
        <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
          <div 
            v-for="(segment, index) in segmentDisplayItems.slice(0, maxDisplaySegments)" 
            :key="index"
            class="flex flex-col items-center space-y-2 p-3 rounded-lg border transition-all duration-300"
            :class="getSegmentCardClass(segment)"
          >
            <!-- Status Icon -->
            <div class="w-8 h-8 rounded-full flex items-center justify-center">
              <!-- Processing state -->
              <div v-if="segment.status === 'processing'" class="relative">
                <Icon name="ph:spinner" class="w-4 h-4 text-primary animate-spin" />
              </div>
              
              <!-- Success state -->
              <Icon 
                v-else-if="segment.status === 'completed'" 
                name="ph:check-circle-fill" 
                class="w-4 h-4 text-green-500" 
              />
              
              <!-- Error state -->
              <Icon 
                v-else-if="segment.status === 'error'" 
                name="ph:x-circle-fill" 
                class="w-4 h-4 text-destructive" 
              />
              
              <!-- Waiting state -->
              <Icon 
                v-else 
                name="ph:clock" 
                class="w-4 h-4 text-muted-foreground" 
              />
            </div>
            
            <!-- Segment Info -->
            <div class="text-center space-y-1">
              <div class="text-xs font-medium text-foreground">
                {{ index + 1 }}
              </div>
              <Badge 
                :variant="getSegmentBadgeVariant(segment)" 
                class="text-xs px-2 py-0"
              >
                {{ segment.speaker.split(' ')[0] }}
              </Badge>
            </div>
          </div>
          
          <!-- Show more indicator -->
          <div 
            v-if="segmentDisplayItems.length > maxDisplaySegments"
            class="flex flex-col items-center space-y-2 p-3 rounded-lg border border-dashed border-muted-foreground/30"
          >
            <div class="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
              <Icon name="ph:dots-three" class="w-4 h-4 text-muted-foreground" />
            </div>
            <Badge variant="outline" class="text-xs">
              +{{ segmentDisplayItems.length - maxDisplaySegments }}
            </Badge>
          </div>
        </div>
      </div>
    </Card>

    <!-- Current Processing Status -->
    <Card 
      v-if="currentSegmentInfo" 
      class="p-4 border-primary/20 bg-primary/5"
    >
      <div class="flex items-start space-x-3">
        <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon name="ph:microphone" class="w-5 h-5 text-primary" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center space-x-2 mb-1">
            <span class="font-medium text-sm text-foreground">
              Processing Segment {{ currentSegmentInfo.index + 1 }}
            </span>
            <Badge variant="default" class="text-xs">
              {{ currentSegmentInfo.speaker }}
            </Badge>
          </div>
          <p class="text-xs text-muted-foreground line-clamp-2">
            {{ currentSegmentInfo.text }}
          </p>
        </div>
        <div class="flex-shrink-0">
          <Icon name="ph:spinner" class="w-4 h-4 text-primary animate-spin" />
        </div>
      </div>
    </Card>
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

const maxDisplaySegments = computed(() => {
  // Responsive segment display count
  if (typeof window !== 'undefined') {
    return window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 12 : 16;
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
  
  // Estimate ~15 seconds per segment
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

// Helper functions for styling
function getSegmentCardClass(segment: SegmentProgress) {
  switch (segment.status) {
    case 'processing':
      return 'border-primary/30 bg-primary/5';
    case 'completed':
      return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20';
    case 'error':
      return 'border-destructive/30 bg-destructive/5';
    default:
      return 'border-muted bg-muted/20';
  }
}

function getSegmentBadgeVariant(segment: SegmentProgress) {
  switch (segment.status) {
    case 'processing':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'outline';
  }
}
</script>

<style scoped>
.synthesis-progress-container {
  width: 100%;
  max-width: 4xl;
  margin: 0 auto;
  animation: fadeInUp 0.4s ease-out;
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style> 