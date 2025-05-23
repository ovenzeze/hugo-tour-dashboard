<template>
  <div class=" py-2.5 px-3 flex items-center justify-between border-t ">
    <!-- Guide Avatar -->
    <div 
      class="w-10 h-10 rounded-full bg-black/75 flex items-center justify-center overflow-hidden relative flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80" 
      @click="handleAvatarClick" 
      role="button"
      aria-label="Toggle audio playback"
    >
      <div class="flex items-center justify-center text-white/75">
        <icon 
          :name="isPlaying ? 'ph:speaker-high' : (isPaused ? 'ph:pause' : 'ph:user')" 
          size="20" 
        />
      </div>
      <!-- Voice Wave Animation (only when playing) -->
      <div v-if="isPlaying" class="absolute inset-0 flex items-center justify-center">
        <div class="voice-wave bg-white/30"></div>
      </div>
    </div>

    <!-- Ask Guide Button -->
    <button 
      class="flex-grow mx-3 bg-black/75 hover:bg-primary-950 text-white py-2.5 px-4 rounded-full flex items-center justify-center gap-1.5 shadow-md flex-shrink-0"
      @click="$emit('ask-guide')"
    >
      <icon name="ph:headset" size="18" />
      <span>Ask Guide</span>
    </button>
      
    <!-- Voice Button -->
    <button 
      class="w-11 h-11 rounded-full bg-black/75 hover:bg-neutral-800 text-white/75 bg-primary-900  flex items-center justify-center hover:bg-primary-950 transition-colors duration-200 shadow-md mr-2 flex-shrink-0"
      @touchstart="$emit('start-listening')"
      @touchend="$emit('stop-listening')"
      @mousedown="$emit('start-listening')"
      @mouseup="$emit('stop-listening')"
      @mouseleave="$emit('stop-listening')"
    >
      <icon :name="isListening ? 'ph:microphone' : 'ph:microphone-slash'" size="20" />
    </button>
      
    <!-- Camera Button -->
    <button class="w-11 h-10 bg-black/75 hover:bg-neutral-800 text-white/75 p-2.5 rounded-full shadow-sm flex-shrink-0">
      <icon name="ph:camera" size="20" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Props definition
const props = defineProps<{
  isPlaying: boolean;
  isPaused: boolean;
  isListening: boolean;
}>();

// Emits definition
const emit = defineEmits([
  'ask-guide',
  'start-listening',
  'stop-listening',
  'start-tour',
  'pause-audio',
  'resume-audio'
]);

// Handle avatar click
function handleAvatarClick() {
  if (props.isPlaying) {
    emit('pause-audio');
  } else if (props.isPaused) {
    emit('resume-audio');
  } else {
    console.log('Avatar clicked while idle.');
  }
}
</script>

<style scoped>
/* Voice wave animation */
.voice-wave {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  animation: voice-wave 1.5s infinite ease-in-out;
}

@keyframes voice-wave {
  0% {
    transform: scale(0.5);
    opacity: 1;
  }
  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

/* Basic styles for Phosphor icons */
</style> 