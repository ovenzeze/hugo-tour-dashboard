<template>
  <div class="smooth-podcast-player">
    <!-- Main Audio Element -->
    <audio
      ref="mainAudioRef"
      :src="currentSegment?.url"
      @loadedmetadata="handleMainLoadedMetadata"
      @timeupdate="handleMainTimeUpdate"
      @ended="handleMainEnded"
      @error="handleMainError"
      @canplay="handleMainCanPlay"
      preload="metadata"
    />
    
    <!-- Preload Audio Element -->
    <audio
      ref="nextAudioRef"
      :src="nextSegment?.url"
      @canplay="handleNextCanPlay"
      preload="metadata"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';

interface AudioSegment {
  id: string;
  url: string;
  title: string;
  speaker?: string;
  duration?: number;
}

interface Props {
  segments: AudioSegment[];
  autoPlay?: boolean;
  crossfadeDuration?: number; // Crossfade duration (seconds)
  preloadDistance?: number; // Seconds before end to start preloading next segment
}

const props = withDefaults(defineProps<Props>(), {
  autoPlay: false,
  crossfadeDuration: 0.3,
  preloadDistance: 3
});

const emit = defineEmits<{
  'play': [];
  'pause': [];
  'ended': [];
  'segment-change': [index: number, segment: AudioSegment];
  'time-update': [currentTime: number, totalTime: number];
  'loading': [isLoading: boolean];
  'error': [error: string];
}>();

// Audio element references
const mainAudioRef = ref<HTMLAudioElement | null>(null);
const nextAudioRef = ref<HTMLAudioElement | null>(null);

// Playback state
const isPlaying = ref(false);
const isLoading = ref(false);
const currentSegmentIndex = ref(0);
const currentTime = ref(0);
const totalDuration = ref(0);

// Preload state
const isNextReady = ref(false);
const isCrossfading = ref(false);

// Volume control (for crossfade)
const mainVolume = ref(1);
const nextVolume = ref(0);

// Computed properties
const currentSegment = computed(() => {
  return props.segments[currentSegmentIndex.value] || null;
});

const nextSegment = computed(() => {
  const nextIndex = currentSegmentIndex.value + 1;
  return nextIndex < props.segments.length ? props.segments[nextIndex] : null;
});

const hasNext = computed(() => {
  return currentSegmentIndex.value < props.segments.length - 1;
});

const hasPrevious = computed(() => {
  return currentSegmentIndex.value > 0;
});

// Total duration calculation (sum of all segments)
const totalTime = computed(() => {
  return props.segments.reduce((total, segment) => {
    return total + (segment.duration || 0);
  }, 0);
});

// Current time position in the entire podcast
const globalCurrentTime = computed(() => {
  let time = currentTime.value;
  for (let i = 0; i < currentSegmentIndex.value; i++) {
    time += props.segments[i].duration || 0;
  }
  return time;
});

// Audio event handlers
function handleMainLoadedMetadata() {
  if (mainAudioRef.value) {
    const duration = mainAudioRef.value.duration;
    if (currentSegment.value) {
      // Update current segment duration
      currentSegment.value.duration = duration;
    }
    console.log(`[SmoothPlayer] Main audio loaded: ${currentSegment.value?.title}, duration: ${duration}s`);
  }
}

function handleMainTimeUpdate() {
  if (mainAudioRef.value) {
    currentTime.value = mainAudioRef.value.currentTime;
    const duration = mainAudioRef.value.duration || 0;
    
    emit('time-update', globalCurrentTime.value, totalTime.value);
    
    // Check if it's time to start preloading the next segment
    const timeRemaining = duration - currentTime.value;
    if (timeRemaining <= props.preloadDistance && hasNext.value && !isNextReady.value) {
      console.log(`[SmoothPlayer] Starting preload with ${timeRemaining.toFixed(1)}s remaining`);
      preloadNextSegment();
    }
    
    // Check if it's time to start crossfade
    if (timeRemaining <= props.crossfadeDuration && hasNext.value && isNextReady.value && !isCrossfading.value) {
      console.log(`[SmoothPlayer] Starting crossfade with ${timeRemaining.toFixed(1)}s remaining`);
      startCrossfade();
    }
  }
}

function handleMainEnded() {
  console.log(`[SmoothPlayer] Main audio ended: ${currentSegment.value?.title}`);
  
  if (isCrossfading.value) {
   // If crossfading, complete the transition
   completeCrossfade();
  } else if (hasNext.value) {
    // Otherwise, switch directly to the next segment
    playNext();
  } else {
    // Playback finished
    isPlaying.value = false;
    emit('ended');
  }
}

function handleMainError(event: Event) {
  const error = (event.target as HTMLAudioElement).error;
  const errorMessage = error ? `Audio error: ${error.message}` : 'Unknown audio error';
  console.error(`[SmoothPlayer] Main audio error:`, errorMessage);
  emit('error', errorMessage);
}

function handleMainCanPlay() {
  isLoading.value = false;
  emit('loading', false);
  console.log(`[SmoothPlayer] Main audio can play: ${currentSegment.value?.title}`);
}

function handleNextCanPlay() {
  isNextReady.value = true;
  console.log(`[SmoothPlayer] Next audio ready: ${nextSegment.value?.title}`);
}

// Preload next segment
function preloadNextSegment() {
  if (nextAudioRef.value && nextSegment.value) {
    console.log(`[SmoothPlayer] Preloading next segment: ${nextSegment.value.title}`);
    nextAudioRef.value.load();
  }
}

// Start crossfade
function startCrossfade() {
  if (!nextAudioRef.value || !mainAudioRef.value || !isNextReady.value) {
    console.warn('[SmoothPlayer] Cannot start crossfade - next audio not ready');
    return;
  }
  
  isCrossfading.value = true;
  console.log(`[SmoothPlayer] Starting crossfade transition`);
  
  // Start playing the next audio segment
  nextAudioRef.value.currentTime = 0;
  nextAudioRef.value.volume = 0;
  nextAudioRef.value.play();
  
  // Calculate crossfade steps
  const steps = 30; // 30 steps for crossfade
  const stepDuration = (props.crossfadeDuration * 1000) / steps;
  const volumeStep = 1 / steps;
  
  let currentStep = 0;
  
  const fadeInterval = setInterval(() => {
    currentStep++;
    const progress = currentStep / steps;
    
    // Main audio volume gradually decreases
    mainVolume.value = 1 - progress;
    if (mainAudioRef.value) {
      mainAudioRef.value.volume = mainVolume.value;
    }
    
    // Next audio volume gradually increases
    nextVolume.value = progress;
    if (nextAudioRef.value) {
      nextAudioRef.value.volume = nextVolume.value;
    }
    
    // Complete fade
    if (currentStep >= steps) {
      clearInterval(fadeInterval);
      completeCrossfade();
    }
  }, stepDuration);
}

// Complete crossfade transition
function completeCrossfade() {
  console.log('[SmoothPlayer] Completing crossfade transition');
  
  // Stop main audio
  if (mainAudioRef.value) {
    mainAudioRef.value.pause();
    mainAudioRef.value.volume = 1;
  }
  
  // Swap audio element references
  const tempRef = mainAudioRef.value;
  mainAudioRef.value = nextAudioRef.value;
  nextAudioRef.value = tempRef;
  
  // Reset volume
  if (mainAudioRef.value) {
    mainAudioRef.value.volume = 1;
  }
  if (nextAudioRef.value) {
    nextAudioRef.value.volume = 0;
  }
  
  // Update state
  currentSegmentIndex.value++;
  currentTime.value = 0;
  isCrossfading.value = false;
  isNextReady.value = false;
  
  emit('segment-change', currentSegmentIndex.value, currentSegment.value!);
  
  console.log(`[SmoothPlayer] Switched to segment ${currentSegmentIndex.value}: ${currentSegment.value?.title}`);
}

// Playback control methods
function play() {
  if (mainAudioRef.value) {
    const playPromise = mainAudioRef.value.play();
    if (playPromise) {
      playPromise.then(() => {
        isPlaying.value = true;
        emit('play');
      }).catch(error => {
        console.error('[SmoothPlayer] Play error:', error);
        emit('error', `Play error: ${error.message}`);
      });
    }
  }
}

function pause() {
  if (mainAudioRef.value) {
    mainAudioRef.value.pause();
  }
  if (nextAudioRef.value) {
    nextAudioRef.value.pause();
  }
  isPlaying.value = false;
  emit('pause');
}

function stop() {
  pause();
  currentTime.value = 0;
  currentSegmentIndex.value = 0;
  if (mainAudioRef.value) {
    mainAudioRef.value.currentTime = 0;
  }
}

function playNext() {
  if (hasNext.value) {
    currentSegmentIndex.value++;
    currentTime.value = 0;
    isNextReady.value = false;
    emit('segment-change', currentSegmentIndex.value, currentSegment.value!);
    
    if (isPlaying.value) {
      // If currently playing, continue playing the next segment
      setTimeout(() => play(), 50);
    }
  }
}

function playPrevious() {
  if (hasPrevious.value) {
    currentSegmentIndex.value--;
    currentTime.value = 0;
    isNextReady.value = false;
    emit('segment-change', currentSegmentIndex.value, currentSegment.value!);
    
    if (isPlaying.value) {
      setTimeout(() => play(), 50);
    }
  }
}

function seekTo(time: number) {
  if (mainAudioRef.value) {
    mainAudioRef.value.currentTime = time;
    currentTime.value = time;
  }
}

function playSegment(index: number) {
  if (index >= 0 && index < props.segments.length) {
    const wasPlaying = isPlaying.value;
    pause();
    
    currentSegmentIndex.value = index;
    currentTime.value = 0;
    isNextReady.value = false;
    
    emit('segment-change', index, currentSegment.value!);
    
    if (wasPlaying) {
      setTimeout(() => play(), 100);
    }
  }
}

// Watchers
watch(currentSegment, (newSegment) => {
  if (newSegment && mainAudioRef.value) {
    isLoading.value = true;
    emit('loading', true);
    
    // Reset preload state
    isNextReady.value = false;
    isCrossfading.value = false;
  }
});

// Autoplay
watch(() => props.autoPlay, (autoPlay) => {
  if (autoPlay && currentSegment.value) {
    play();
  }
});

// Expose methods
defineExpose({
  play,
  pause,
  stop,
  playNext,
  playPrevious,
  seekTo,
  playSegment,
  isPlaying,
  currentTime,
  totalTime: totalTime,
  currentSegmentIndex,
  globalCurrentTime,
  hasNext,
  hasPrevious
});
</script>

<style scoped>
.smooth-podcast-player {
  /* Hide audio elements */
}

.smooth-podcast-player audio {
  display: none;
}
</style> 