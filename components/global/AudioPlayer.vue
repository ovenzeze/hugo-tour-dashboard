<template>
  <div
    v-if="audioStore.currentTrack"
    class="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 shadow-lg transition-all duration-300"
    :class="{
      'translate-y-full': isMinimized && !audioStore.isPlaying,
      'md:left-[var(--sidebar-width)]': !isExpanded,
      'md:left-0': isExpanded
    }"
  >
    <!-- Audio element -->
    <audio
      ref="audioElement"
      :src="audioStore.currentTrack.isM3u8 ? undefined : audioStore.currentTrack.url"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @waiting="audioStore.setLoading(true)"
      @canplay="audioStore.setLoading(false)"
      @error="onError"
      preload="metadata"
    ></audio>

    <!-- Player interface -->
    <!-- Expand/collapse button (desktop only) -->
    <button
      @click="toggleExpanded"
      class="absolute top-0 left-0 -translate-y-full hidden md:flex items-center justify-center bg-background border border-border border-b-0 rounded-t-md px-2 py-1 text-xs hover:bg-muted transition-colors"
    >
      <Icon :name="isExpanded ? 'ph:arrows-in' : 'ph:arrows-out'" class="h-3 w-3 mr-1" />
      {{ isExpanded ? 'Collapse' : 'Expand' }}
    </button>

    <div class="container mx-auto px-4 py-2" :class="{'max-w-full': isExpanded}">
      <!-- Progress bar -->
      <div 
        class="w-full h-1 bg-muted cursor-pointer mb-2 relative group"
        @click="onProgressBarClick"
        @mousedown="startSeeking"
      >
        <div 
          class="absolute top-0 left-0 h-full bg-primary transition-all"
          :style="{ width: `${audioStore.progress}%` }"
        ></div>
        <div 
          class="absolute top-0 left-0 h-3 w-3 bg-primary rounded-full -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          :style="{ left: `${audioStore.progress}%`, transform: 'translateX(-50%)' }"
        ></div>
      </div>

      <div class="flex items-center justify-between">
        <!-- Left: Cover and info -->
        <div class="flex items-center space-x-3 flex-1 min-w-0">
          <div 
            class="w-10 h-10 bg-muted rounded-md flex-shrink-0 overflow-hidden"
            v-if="audioStore.currentTrack.coverImage"
          >
            <img 
              :src="audioStore.currentTrack.coverImage" 
              :alt="audioStore.currentTrack.title"
              class="w-full h-full object-cover"
            />
          </div>
          <div v-else class="w-10 h-10 bg-muted rounded-md flex-shrink-0 flex items-center justify-center">
            <Icon name="ph:music-notes" class="w-6 h-6 text-foreground/70" />
          </div>
          
          <div class="min-w-0 flex-1">
            <h3 class="text-sm font-medium truncate">{{ audioStore.currentTrack.title }}</h3>
            <p v-if="audioStore.currentTrack.artist" class="text-xs text-muted-foreground truncate">
              {{ audioStore.currentTrack.artist }}
            </p>
          </div>
        </div>

        <!-- Middle: Control buttons -->
        <div class="flex items-center space-x-2 md:space-x-4">
          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 hover:bg-primary/10 transition-colors"
            :disabled="!audioStore.hasPrevious"
            @click="audioStore.previous()"
          >
            <Icon name="ph:skip-back-fill" class="h-5 w-5" />
          </Button>

          <Button 
            variant="default" 
            size="icon" 
            class="h-10 w-10 rounded-full hover:scale-105 transition-transform"
            @click="audioStore.togglePlay()"
            :disabled="audioStore.isLoading"
          >
            <Icon 
              v-if="audioStore.isLoading" 
              name="ph:spinner" 
              class="h-5 w-5 animate-spin" 
            />
            <Icon 
              v-else-if="audioStore.isPlaying" 
              name="ph:pause-fill" 
              class="h-5 w-5" 
            />
            <Icon 
              v-else 
              name="ph:play-fill" 
              class="h-5 w-5 ml-0.5" 
            />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 hover:bg-primary/10 transition-colors"
            :disabled="!audioStore.hasNext"
            @click="audioStore.next()"
          >
            <Icon name="ph:skip-forward-fill" class="h-5 w-5" />
          </Button>
        </div>

        <!-- Right: Volume and time -->
        <div class="flex items-center space-x-3 flex-1 justify-end">
          <div class="text-xs text-muted-foreground hidden sm:block">
            {{ formatTime(audioStore.currentTime) }} / {{ formatTime(audioStore.duration) }}
          </div>

          <div class="hidden md:flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="icon" 
              class="h-8 w-8 hover:bg-primary/10 transition-colors"
              @click="audioStore.toggleMute()"
            >
              <Icon 
                v-if="audioStore.isMuted || audioStore.volume === 0" 
                name="ph:speaker-slash" 
                class="h-5 w-5" 
              />
              <Icon 
                v-else-if="audioStore.volume < 0.5" 
                name="ph:speaker-low" 
                class="h-5 w-5" 
              />
              <Icon 
                v-else 
                name="ph:speaker-high" 
                class="h-5 w-5" 
              />
            </Button>

            <div class="w-20 h-1 bg-muted cursor-pointer relative group" @click="onVolumeBarClick">
              <div 
                class="absolute top-0 left-0 h-full bg-primary"
                :style="{ width: `${audioStore.isMuted ? 0 : audioStore.volume * 100}%` }"
              ></div>
              <div 
                class="absolute top-0 left-0 h-3 w-3 bg-primary rounded-full -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                :style="{ left: `${audioStore.isMuted ? 0 : audioStore.volume * 100}%`, transform: 'translateX(-50%)' }"
              ></div>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 hover:bg-primary/10 transition-colors"
            @click="toggleMinimize"
          >
            <Icon 
              v-if="isMinimized" 
              name="ph:arrow-up" 
              class="h-4 w-4" 
            />
            <Icon 
              v-else 
              name="ph:arrow-down" 
              class="h-4 w-4" 
            />
          </Button>

          <Button 
            variant="ghost" 
            size="icon" 
            class="h-8 w-8 hover:bg-destructive/10 transition-colors"
            @click="closePlayer"
          >
            <Icon name="ph:x" class="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useAudioPlayerStore } from '~/stores/audioPlayerStore';
import { Button } from '~/components/ui/button';

const audioStore = useAudioPlayerStore();
const audioElement = ref<HTMLAudioElement | null>(null);
const isMinimized = ref(false);
const isExpanded = ref(false);
const isSeeking = ref(false);

// HLS related
let Hls: any = null;

// Format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Event handlers
function onPlay() {
  audioStore.isPlaying = true;
}

function onPause() {
  audioStore.isPlaying = false;
}

function onEnded() {
  audioStore.isPlaying = false;
  
  // Auto play next track
  if (audioStore.hasNext) {
    audioStore.next();
  } else {
    audioStore.stop();
  }
}

function onTimeUpdate() {
  if (audioElement.value && !isSeeking.value) {
    audioStore.updateCurrentTime(audioElement.value.currentTime);
  }
}

function onLoadedMetadata() {
  if (audioElement.value) {
    audioStore.updateDuration(audioElement.value.duration);
    audioStore.setLoading(false);
  }
}

function onError(e: Event) {
  console.error('Audio playback error:', e);
  audioStore.setError('Playback error. Please try again later.');
  audioStore.setLoading(false);
}

function onProgressBarClick(e: MouseEvent) {
  if (!audioElement.value) return;
  
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const seekTime = percent * audioStore.duration;
  
  audioStore.seek(seekTime);
  if (audioElement.value) {
    audioElement.value.currentTime = seekTime;
  }
}

function onVolumeBarClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  audioStore.setVolume(percent);
  
  if (audioElement.value) {
    audioElement.value.volume = audioStore.isMuted ? 0 : audioStore.volume;
  }
}

function startSeeking() {
  isSeeking.value = true;
  
  const onMouseMove = (e: MouseEvent) => {
    onProgressBarClick(e);
  };
  
  const onMouseUp = () => {
    isSeeking.value = false;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function toggleMinimize() {
  isMinimized.value = !isMinimized.value;
}

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function closePlayer() {
  audioStore.stop();
  audioStore.currentTrack = null;
  
  // Clean up HLS instance
  if (audioStore.hlsInstance) {
    audioStore.hlsInstance.destroy();
    audioStore.setHlsInstance(null);
  }
}

// Watch for play state changes
watch(() => audioStore.isPlaying, (isPlaying) => {
  if (!audioElement.value) return;
  
  if (isPlaying) {
    audioElement.value.play().catch(err => {
      console.error('Failed to play:', err);
      audioStore.isPlaying = false;
    });
  } else {
    audioElement.value.pause();
  }
});

// Watch for volume changes
watch(() => [audioStore.volume, audioStore.isMuted], ([volume, isMuted]) => {
  if (!audioElement.value) return;
  audioElement.value.volume = isMuted ? 0 : (volume as number);
});

// Watch for seek operations
watch(() => audioStore.currentTime, (newTime) => {
  if (!audioElement.value || Math.abs(audioElement.value.currentTime - newTime) < 0.5) return;
  audioElement.value.currentTime = newTime;
});

// Watch for current track changes
watch(() => audioStore.currentTrack, async (newTrack) => {
  if (!newTrack) return;
  
  // Reset state
  audioStore.updateCurrentTime(0);
  audioStore.updateDuration(0);
  audioStore.setLoading(true);
  audioStore.setError(null);
  
  // Handle HLS streaming
  if (newTrack.isM3u8) {
    try {
      // Dynamically import hls.js
      if (!Hls) {
        const HlsModule = await import('hls.js');
        Hls = HlsModule.default;
      }
      
      // Check if browser natively supports HLS
      if (Hls.isSupported()) {
        // Clean up old HLS instance
        if (audioStore.hlsInstance) {
          audioStore.hlsInstance.destroy();
        }
        
        // Create new HLS instance
        const hls = new Hls();
        audioStore.setHlsInstance(hls);
        
        // Load m3u8 file
        hls.loadSource(newTrack.url);
        
        // Bind HLS to audio element
        if (audioElement.value) {
          hls.attachMedia(audioElement.value);
        }
        
        // Listen for HLS events
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (audioStore.isPlaying && audioElement.value) {
            audioElement.value.play().catch(err => {
              console.error('Failed to play HLS stream:', err);
              audioStore.isPlaying = false;
            });
          }
        });
        
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // Try to recover from network error
                console.log('Fatal network error encountered, trying to recover');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                // Try to recover from media error
                console.log('Fatal media error encountered, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                // Unrecoverable error
                console.error('Fatal error, cannot recover:', data);
                audioStore.setError('Playback error. Please try again later.');
                hls.destroy();
                break;
            }
          }
        });
      } else if (audioElement.value && audioElement.value.canPlayType('application/vnd.apple.mpegurl')) {
        // Browser natively supports HLS (like Safari)
        audioElement.value.src = newTrack.url;
        if (audioStore.isPlaying) {
          audioElement.value.play().catch(err => {
            console.error('Failed to play HLS stream natively:', err);
            audioStore.isPlaying = false;
          });
        }
      } else {
        audioStore.setError('Your browser does not support HLS streaming playback');
      }
    } catch (error) {
      console.error('Error loading HLS:', error);
      audioStore.setError('Failed to load HLS library');
    }
  } else if (audioElement.value) {
    // Regular audio file
    if (audioStore.isPlaying) {
      audioElement.value.play().catch(err => {
        console.error('Failed to play audio:', err);
        audioStore.isPlaying = false;
      });
    }
  }
}, { immediate: true });

// On component mount
onMounted(() => {
  // Set initial volume
  if (audioElement.value) {
    audioElement.value.volume = audioStore.isMuted ? 0 : audioStore.volume;
  }
});

// Clean up before component unmount
onBeforeUnmount(() => {
  if (audioStore.hlsInstance) {
    audioStore.hlsInstance.destroy();
    audioStore.setHlsInstance(null);
  }
});
</script>