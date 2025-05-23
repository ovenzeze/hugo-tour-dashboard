d<template>
  <div class="podcast-player-controls bg-card text-card-foreground rounded-xl shadow-md border overflow-hidden">
    <!-- Hidden Smooth Podcast Player -->
    <SmoothPodcastPlayer
      ref="smoothPlayerRef"
      :segments="audioSegments"
      :auto-play="false"
      :crossfade-duration="0.2"
      :preload-distance="2"
      @play="handlePlay"
      @pause="handlePause"
      @ended="handleEnded"
      @segment-change="handleSegmentChange"
      @time-update="handleTimeUpdate"
      @loading="handleLoading"
      @error="handleError"
    />
    
    <!-- Player UI -->
    <div class="p-4 sm:p-6">
      <div class="player-controls">
        <!-- Control Buttons Area -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <Button 
              variant="ghost" 
              :disabled="!smoothPlayerRef?.hasPrevious || isLoading" 
              @click="playPrevious" 
              aria-label="Previous segment" 
              class="control-button"
            >
              <Icon name="ph:skip-back-fill" class="control-icon" />
            </Button>
            
            <Button 
              variant="default" 
              @click="togglePlayPause" 
              aria-label="Play/Pause" 
              :disabled="isLoading" 
              class="play-button"
            >
              <Icon v-if="isLoading" name="ph:spinner-gap" class="play-icon animate-spin" />
              <Icon v-else :name="isPlaying ? 'ph:pause-fill' : 'ph:play-fill'" class="play-icon" />
            </Button>
            
            <Button 
              variant="ghost" 
              :disabled="!smoothPlayerRef?.hasNext || isLoading" 
              @click="playNext" 
              aria-label="Next segment" 
              class="control-button"
            >
              <Icon name="ph:skip-forward-fill" class="control-icon" />
            </Button>
          </div>
          
          <!-- Time Display -->
          <div class="flex flex-col items-end">
            <span class="text-sm text-muted-foreground time-display">
              {{ formatTime(currentTime) }} / {{ formatTime(totalTime) }}
            </span>
            <span v-if="currentSegment" class="text-xs text-muted-foreground mt-1">
              Segment {{ currentSegmentIndex + 1 }} / {{ audioSegments.length }}
            </span>
          </div>
        </div>
        
        <!-- Progress Bar -->
        <div class="progress-container">
          <div 
            class="w-full bg-muted rounded-full h-2 mb-4 cursor-pointer player-progress-bar-container" 
            @click="seek" 
            @touchstart="handleTouchStart" 
            @touchmove="handleTouchMove" 
            @touchend="handleTouchEnd"
          >
            <div class="bg-primary h-full rounded-full transition-all" :style="{ width: progressPercentage + '%' }">
              <div class="progress-handle" :style="{ left: progressPercentage + '%' }"></div>
            </div>
          </div>
        </div>
        
        <!-- Current Playback Info -->
        <div v-if="currentSegment" class="current-segment-info mb-4 p-3 bg-muted/50 rounded-lg">
          <div class="flex items-center gap-2 mb-1">
            <Icon name="ph:waveform-fill" class="w-4 h-4 text-primary animate-pulse" />
            <span class="text-sm font-medium">Now Playing</span>
          </div>
          <p class="text-sm text-muted-foreground line-clamp-2">{{ currentSegment.title }}</p>
        </div>
      </div>
    </div>

    <!-- Segments List -->
    <div v-if="audioSegments.length > 0" class="p-4 sm:p-6 pt-0">
      <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Podcast Segments</h3>
      <ul class="space-y-1">
        <li 
          v-for="(segment, index) in audioSegments" 
          :key="segment.id"
          @click="playSegment(index)"
          :class="[
            'flex justify-between items-center p-2 sm:p-3 rounded-md cursor-pointer transition group',
            { 
              'bg-primary/10 border border-primary/20': currentSegmentIndex === index,
              'hover:bg-accent': currentSegmentIndex !== index 
            }
          ]"
        >
          <div class="flex items-center min-w-0 gap-3">
            <span class="text-xs text-muted-foreground w-6 text-right flex-shrink-0">
              {{ index + 1 }}.
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-medium truncate text-sm sm:text-base leading-5">
                {{ segment.title }}
              </p>
              <p v-if="segment.speaker" class="text-xs text-muted-foreground">
                {{ segment.speaker }}
              </p>
            </div>
          </div>
          
          <div class="flex items-center gap-2 flex-shrink-0">
            <span v-if="segment.duration" class="text-xs text-muted-foreground">
              {{ formatTime(segment.duration) }}
            </span>
            <Icon 
              v-if="currentSegmentIndex === index && isPlaying" 
              name="ph:waveform-fill" 
              class="segment-icon text-primary animate-pulse" 
            />
            <Icon 
              v-else 
              name="ph:play-fill" 
              class="segment-icon text-muted-foreground group-hover:text-primary" 
            />
          </div>
        </li>
      </ul>
    </div>
    
    <!-- Error Message -->
    <div v-if="error" class="p-4 bg-destructive/10 border-t border-destructive/20">
      <div class="flex items-center gap-2 text-destructive">
        <Icon name="ph:warning-circle" class="w-4 h-4" />
        <span class="text-sm">{{ error }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import SmoothPodcastPlayer from './SmoothPodcastPlayer.vue';

interface AudioSegment {
  id: string;
  url: string;
  title: string;
  speaker?: string;
  duration?: number;
}

interface Props {
  segments: AudioSegment[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'play-state-change': [isPlaying: boolean];
  'segment-change': [index: number];
  'time-update': [currentTime: number, totalTime: number];
}>();

// Component reference
const smoothPlayerRef = ref<InstanceType<typeof SmoothPodcastPlayer> | null>(null);

// Playback state
const isPlaying = ref(false);
const isLoading = ref(false);
const currentTime = ref(0);
const totalTime = ref(0);
const currentSegmentIndex = ref(0);
const error = ref<string | null>(null);

// Touch related
const isTouching = ref(false);

// Computed properties
const audioSegments = computed(() => props.segments);

const currentSegment = computed(() => {
  return audioSegments.value[currentSegmentIndex.value] || null;
});

const progressPercentage = computed(() => {
  return totalTime.value > 0 ? (currentTime.value / totalTime.value) * 100 : 0;
});

// Event handlers
function handlePlay() {
  isPlaying.value = true;
  emit('play-state-change', true);
}

function handlePause() {
  isPlaying.value = false;
  emit('play-state-change', false);
}

function handleEnded() {
  isPlaying.value = false;
  emit('play-state-change', false);
}

function handleSegmentChange(index: number, segment: AudioSegment) {
  currentSegmentIndex.value = index;
  emit('segment-change', index);
}

function handleTimeUpdate(current: number, total: number) {
  currentTime.value = current;
  totalTime.value = total;
  emit('time-update', current, total);
}

function handleLoading(loading: boolean) {
  isLoading.value = loading;
}

function handleError(errorMessage: string) {
  error.value = errorMessage;
  isLoading.value = false;
  isPlaying.value = false;
}

// Playback controls
function togglePlayPause() {
  if (isLoading.value) return;
  
  if (isPlaying.value) {
    smoothPlayerRef.value?.pause();
  } else {
    smoothPlayerRef.value?.play();
  }
}

function playNext() {
  smoothPlayerRef.value?.playNext();
}

function playPrevious() {
  smoothPlayerRef.value?.playPrevious();
}

function playSegment(index: number) {
  if (isLoading.value) return;
  smoothPlayerRef.value?.playSegment(index);
}

// Seek control
function seek(event: MouseEvent) {
  if (totalTime.value > 0 && !isLoading.value) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPosition = (clickX / progressBar.offsetWidth) * totalTime.value;
    smoothPlayerRef.value?.seekTo(clickPosition);
  }
}

function handleTouchStart(event: TouchEvent) {
  isTouching.value = true;
  handleTouchMove(event);
}

function handleTouchMove(event: TouchEvent) {
  if (!isTouching.value) return;
  
  event.preventDefault();
  
  if (totalTime.value > 0 && !isLoading.value) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const touchX = event.touches[0].clientX - rect.left;
    const boundedX = Math.max(0, Math.min(touchX, progressBar.offsetWidth));
    const touchPosition = (boundedX / progressBar.offsetWidth) * totalTime.value;
    
    // Update displayed time in real-time
    currentTime.value = touchPosition;
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (!isTouching.value) return;
  
  if (totalTime.value > 0 && !isLoading.value) {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const touchX = event.changedTouches[0].clientX - rect.left;
    const boundedX = Math.max(0, Math.min(touchX, progressBar.offsetWidth));
    const touchPosition = (boundedX / progressBar.offsetWidth) * totalTime.value;
    
    smoothPlayerRef.value?.seekTo(touchPosition);
  }
  
  isTouching.value = false;
}

// Time formatting
function formatTime(time: number): string {
  if (isNaN(time) || time === Infinity) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Expose methods for parent component
defineExpose({
  play: () => smoothPlayerRef.value?.play(),
  pause: () => smoothPlayerRef.value?.pause(),
  stop: () => smoothPlayerRef.value?.stop(),
  isPlaying,
  currentSegmentIndex,
  currentTime,
  totalTime
});
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Progress bar styles */
.progress-container {
  position: relative;
  touch-action: none;
}

.player-progress-bar-container {
  transition: height 0.2s ease-in-out;
  height: 0.5rem;
  position: relative;
}

.player-progress-bar-container:hover {
  height: 0.75rem;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.player-progress-bar-container:hover .progress-handle,
.player-progress-bar-container:active .progress-handle {
  opacity: 1;
}

/* Control button styles */
.control-button {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-button {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-icon {
  height: 1.5rem;
  width: 1.5rem;
}

.play-icon {
  height: 2rem;
  width: 2rem;
}

.time-display {
  font-variant-numeric: tabular-nums;
}

.segment-icon {
  height: 1.25rem;
  width: 1.25rem;
}

/* Mobile responsiveness */
@media (max-width: 640px) {
  .control-button {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .play-button {
    width: 3rem;
    height: 3rem;
  }
  
  .control-icon {
    height: 1.25rem;
    width: 1.25rem;
  }
  
  .play-icon {
    height: 1.75rem;
    width: 1.75rem;
  }
  
  .time-display {
    font-size: 0.75rem;
  }
}

/* Touch device optimization */
@media (hover: none) {
  .progress-handle {
    opacity: 1;
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .player-progress-bar-container {
    height: 0.75rem;
  }
}
</style> 