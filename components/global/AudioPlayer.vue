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
    <!-- Main Audio element -->
    <audio
      ref="audioElement"
      :src="audioStore.currentTrack.isM3u8 ? undefined : audioStore.currentTrack.url"
      @play="onPlay"
      @pause="onPause"
      @ended="onEnded"
      @timeupdate="onTimeUpdate"
      @loadedmetadata="onLoadedMetadata"
      @loadeddata="onLoadedData"
      @canplaythrough="onCanPlayThrough"
      @waiting="audioStore.setLoading(true)"
      @canplay="onCanPlay"
      @error="onError"
      preload="auto"
    ></audio>

    <!-- Preload Audio element for smooth playback -->
    <audio
      ref="preloadAudioElement"
      @canplay="onPreloadCanPlay"
      @error="onPreloadError"
      preload="metadata"
      style="display: none;"
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
        <!-- Preload Indicator -->
        <div 
          v-if="isPreloadReady && audioStore.currentTrack?.meta?.type === 'podcast'"
          class="absolute top-0 right-0 h-full w-1 bg-green-500/50 transition-all"
          title="Next segment preloaded"
        ></div>
        <div 
          class="absolute top-0 left-0 h-3 w-3 bg-primary rounded-full -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
          :style="{ left: `${audioStore.progress}%`, transform: 'translateX(-50%)' }"
        ></div>
      </div>

      <!-- Podcast Segment Info Area -->
      <div v-if="audioStore.currentTrack?.meta?.type === 'podcast'" class="w-full mb-3 px-2">
        <!-- Minimized Mode: Show only segment progress and speaker -->
        <div v-if="!isExpanded" class="flex items-center justify-between text-xs text-muted-foreground">
          <span v-if="audioStore.currentTrack.meta.speaker" class="font-medium">
            {{ audioStore.currentTrack.meta.speaker }}
          </span>
          <span v-if="audioStore.playlist.length > 1" class="ml-auto">
            Segment {{ audioStore.currentIndex + 1 }} / {{ audioStore.playlist.length }}
          </span>
        </div>
        
        <!-- Expanded Mode: Show full text content -->
        <div v-else-if="audioStore.currentTrack?.meta?.fullText" class="bg-muted/30 rounded-lg p-3 max-h-40 overflow-y-auto">
          <div class="flex items-center justify-between mb-2">
            <p v-if="audioStore.currentTrack.meta.speaker" class="text-sm font-medium">
              {{ audioStore.currentTrack.meta.speaker }}
            </p>
            <span v-if="audioStore.playlist.length > 1" class="text-xs text-muted-foreground">
              Segment {{ audioStore.currentIndex + 1 }} / {{ audioStore.playlist.length }}
            </span>
          </div>
          <p class="text-sm leading-relaxed">{{ audioStore.currentTrack.meta.fullText }}</p>
        </div>
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
            <!-- Display podcast info -->
            <p v-else-if="audioStore.currentTrack?.meta?.type === 'podcast'" class="text-xs text-muted-foreground truncate">
              {{ audioStore.currentTrack.meta.fullText ? audioStore.currentTrack.meta.fullText.substring(0, 60) + (audioStore.currentTrack.meta.fullText.length > 60 ? '...' : '') : '' }}
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
const preloadAudioElement = ref<HTMLAudioElement | null>(null);
const isMinimized = ref(false);
const isExpanded = ref(false);
const isSeeking = ref(false);

// Smooth playback optimization related state
const isPreloadReady = ref(false);
const preloadDistance = ref(3); // Start preloading 3 seconds before end
const crossfadeDuration = ref(0.2); // Crossfade duration
const isCrossfading = ref(false);

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
  console.log('[AudioPlayer] Track ended');
  
  // 🔧 使用store的方法来切换轨道，避免直接操作内部状态
  if (audioStore.hasNext) {
    console.log('[AudioPlayer] Has next track, automatically switching...');
    
    // 使用store的next()方法，但不让它触发播放逻辑
    const wasPlaying = audioStore.isPlaying;
    audioStore.isPlaying = false; // 临时设置为false避免重复播放逻辑
    
    // 调用store的next方法来正确更新索引和轨道
    const success = audioStore.next();
    
    if (success) {
      console.log('[AudioPlayer] ✅ Successfully switched to next track');
      // 恢复播放状态，让音频元素准备好时自动播放
      audioStore.isPlaying = wasPlaying;
    } else {
      console.error('[AudioPlayer] Failed to switch to next track');
      audioStore.isPlaying = false;
    }
  } else {
    console.log('[AudioPlayer] No more tracks, stopping playback');
    audioStore.stop();
  }
}

function onTimeUpdate() {
  if (audioElement.value && !isSeeking.value) {
    audioStore.updateCurrentTime(audioElement.value.currentTime);
    
    // 🔧 禁用crossfade预加载逻辑，简化音频切换以解决重叠播放问题
    // Note: 预加载和crossfade功能暂时禁用，以解决音频重叠和跳段问题
  }
}

function onLoadedMetadata() {
  if (!audioElement.value) return;
  
  // Update duration when metadata is loaded
  const duration = audioElement.value.duration;
  if (!isNaN(duration) && isFinite(duration)) {
    audioStore.updateDuration(duration);
  }
  console.log('[AudioPlayer] Metadata loaded for:', audioStore.currentTrack?.title);
}

function onLoadedData() {
  if (!audioElement.value) return;
  console.log('[AudioPlayer] Audio data loaded for:', audioStore.currentTrack?.title);
  
  // If audio data is loaded and isPlaying is true, attempt to play
  if (audioStore.isPlaying) {
    tryPlayAudio();
  }
}

function onCanPlay() {
  if (!audioElement.value) return;
  audioStore.setLoading(false);
  console.log('[AudioPlayer] Audio can play now:', audioStore.currentTrack?.title);
  
  // 🔧 简化播放逻辑，如果应该播放就直接播放
  if (audioStore.isPlaying) {
    tryPlayAudio();
  }
}

function onCanPlayThrough() {
  if (!audioElement.value) return;
  console.log('[AudioPlayer] Audio can play through without buffering:', audioStore.currentTrack?.title);
  
  // If isPlaying is true, attempt to play
  if (audioStore.isPlaying) {
    tryPlayAudio();
  }
}

// Helper function to attempt audio playback
function tryPlayAudio() {
  if (!audioElement.value) {
    console.warn('[AudioPlayer] No audio element available');
    return;
  }
  
  console.log('[AudioPlayer] Attempting to play audio:', audioStore.currentTrack?.title);
  console.log('[AudioPlayer] Audio readyState:', audioElement.value.readyState);
  console.log('[AudioPlayer] Audio networkState:', audioElement.value.networkState);
  
  // 确保音频元素处于可播放状态
  if (audioElement.value.readyState >= 2) { // HAVE_CURRENT_DATA or higher
    const playPromise = audioElement.value.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log('[AudioPlayer] ✅ Audio playback started successfully');
        })
        .catch(err => {
          console.error('[AudioPlayer] Failed to play audio:', err);
          
          // 处理不同类型的错误
          if (err.name === 'NotAllowedError') {
            console.warn('[AudioPlayer] Autoplay prevented by browser. User interaction required.');
            audioStore.setError('Autoplay blocked. Please click play button.');
            audioStore.isPlaying = false;
          } else if (err.name === 'AbortError') {
            console.warn('[AudioPlayer] Play request was aborted by a new load request.');
            // 🔧 对于AbortError，使用更智能的重试机制
            // 只有在音频状态仍然是播放且没有新的轨道切换时才重试
            setTimeout(() => {
              if (audioStore.isPlaying && 
                  audioElement.value && 
                  audioElement.value.readyState >= 2 && 
                  audioElement.value.src && 
                  !audioElement.value.ended) {
                console.log('[AudioPlayer] Retrying playback after AbortError...');
                tryPlayAudio();
              } else {
                console.log('[AudioPlayer] Skip retry - conditions not met for playback');
              }
            }, 150); // 稍微增加延迟时间
            return; // 不要设置 isPlaying = false
          } else {
            audioStore.setError(`Playback error: ${err.message}`);
            audioStore.isPlaying = false;
          }
        });
    }
  } else {
    console.log('[AudioPlayer] Audio not ready yet, waiting for readyState >= 2, current readyState:', audioElement.value.readyState);
  }
}

function onError(e: Event) {
  console.error('Audio playback error:', e);
  audioStore.setError('Playback error for current track.');
  audioStore.setLoading(false);
  audioStore.isPlaying = false; // Ensure isPlaying is false

  // Attempt to play the next track if available
  if (audioStore.hasNext) {
    console.log('Error with current track, attempting to play next.');
    smoothNextTrack();
  } else {
    // If no next track, or if the error was on the last track
    console.log('Error with current track, no next track to play or it was the last one.');
    audioStore.stop(); // Stop playback and clear current track if it's the end of the playlist
  }
}

// Preload related functions
function onPreloadCanPlay() {
  isPreloadReady.value = true;
  console.log('[AudioPlayer] Next track preloaded and ready');
}

function onPreloadError(e: Event) {
  console.warn('[AudioPlayer] Preload error:', e);
  isPreloadReady.value = false;
}

// Preload the next track
function preloadNextTrack() {
  if (!audioStore.hasNext || !preloadAudioElement.value) return;
  
  const nextIndex = audioStore.currentIndex + 1;
  const nextTrack = audioStore.playlist[nextIndex];
  
  if (nextTrack && !nextTrack.isM3u8) {
    console.log(`[AudioPlayer] Preloading next track: ${nextTrack.title}`);
    preloadAudioElement.value.src = nextTrack.url;
    preloadAudioElement.value.load();
  }
}

// Start crossfade
function startCrossfade() {
  if (!preloadAudioElement.value || !audioElement.value || !isPreloadReady.value) {
    console.warn('[AudioPlayer] Cannot start crossfade - next track not ready');
    return;
  }
  
  isCrossfading.value = true;
  console.log('[AudioPlayer] Starting crossfade transition');
  
  // Start playing the preloaded audio
  preloadAudioElement.value.currentTime = 0;
  preloadAudioElement.value.volume = 0;
  preloadAudioElement.value.play().catch(err => {
    console.error('[AudioPlayer] Failed to start crossfade:', err);
    isCrossfading.value = false;
  });
  
  // Save the current target volume (considering mute state)
  const targetVolume = audioStore.isMuted ? 0 : audioStore.volume;
  const currentVolume = audioElement.value.volume;
  
  // Fade volume
  const fadeSteps = 10;
  const fadeInterval = crossfadeDuration.value * 1000 / fadeSteps;
  let step = 0;
  
  const fadeTimer = setInterval(() => {
    step++;
    const progress = step / fadeSteps;
    
    if (audioElement.value) {
      audioElement.value.volume = currentVolume * (1 - progress);
    }
    if (preloadAudioElement.value) {
      preloadAudioElement.value.volume = targetVolume * progress;
    }
    
    if (step >= fadeSteps) {
      clearInterval(fadeTimer);
      // crossfade will complete in onEnded or completeCrossfade
    }
  }, fadeInterval);
}

// Complete crossfade transition
function completeCrossfade() {
  if (!isCrossfading.value || !preloadAudioElement.value) return;
  
  console.log('[AudioPlayer] Completing crossfade transition');
  
  // Stop the currently playing audio
  if (audioElement.value) {
    audioElement.value.pause();
    audioElement.value.currentTime = 0;
  }
  
  // Swap audio element references
  const temp = audioElement.value;
  audioElement.value = preloadAudioElement.value;
  preloadAudioElement.value = temp;
  
  // Ensure the new main audio element has correct volume
  if (audioElement.value) {
    audioElement.value.volume = audioStore.isMuted ? 0 : audioStore.volume;
  }
  
  // Clean up the old preload audio element
  if (preloadAudioElement.value) {
    preloadAudioElement.value.pause();
    preloadAudioElement.value.src = '';
    preloadAudioElement.value.volume = 1;
  }
  
  // Reset state
  isCrossfading.value = false;
  isPreloadReady.value = false;
  
  // Update store state to the next track
  audioStore.next();
}

// Smooth transition to the next track
function smoothNextTrack() {
  if (isPreloadReady.value && preloadAudioElement.value) {
    // If preload is ready, switch directly
    console.log('[AudioPlayer] Using preloaded track for smooth transition');
    
    // Stop current audio
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.currentTime = 0;
    }
    
    // Switch to preloaded audio
    const temp = audioElement.value;
    audioElement.value = preloadAudioElement.value;
    preloadAudioElement.value = temp;
    
    // Ensure new audio volume is correct
    if (audioElement.value) {
      audioElement.value.volume = audioStore.isMuted ? 0 : audioStore.volume;
      audioElement.value.currentTime = 0;
    }
    
    // Clean up old preload audio element
    if (preloadAudioElement.value) {
      preloadAudioElement.value.pause();
      preloadAudioElement.value.src = '';
      preloadAudioElement.value.volume = 1;
    }
    
    // Reset state
    isPreloadReady.value = false;
    
    // Update store state
    audioStore.next();
  } else {
    // Fallback to standard transition
    console.log('[AudioPlayer] Fallback to standard track transition');
    audioStore.next();
  }
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
watch(() => audioStore.isPlaying, (isPlaying, wasPlaying) => {
  if (!audioElement.value) return;
  
  console.log(`[AudioPlayer] Play state changed: ${wasPlaying} -> ${isPlaying}`);
  
  if (isPlaying) {
    // 当设置为播放状态时，尝试播放
    audioElement.value.play().catch(err => {
      console.error('Failed to play:', err);
      
      // 如果播放失败，重置播放状态
      if (err.name !== 'AbortError') { // AbortError 不重置状态，等待重试
        audioStore.isPlaying = false;
      }
    });
  } else {
    // 当设置为暂停状态时，暂停播放
    audioElement.value.pause();
  }
});

// Watch for volume changes
watch(() => [audioStore.volume, audioStore.isMuted], ([volume, isMuted]) => {
  if (!audioElement.value) return;
  // Only update the volume when not in crossfade to avoid interfering with the smooth transition
  if (!isCrossfading.value) {
    audioElement.value.volume = isMuted ? 0 : (volume as number);
  }
});

// Watch for seek operations
watch(() => audioStore.currentTime, (newTime) => {
  if (!audioElement.value || Math.abs(audioElement.value.currentTime - newTime) < 0.5) return;
  audioElement.value.currentTime = newTime;
});

// Watch for current track changes
watch(() => audioStore.currentTrack, async (newTrack, oldTrack) => {
  if (!newTrack) {
    console.log('[AudioPlayer] No track to play, clearing...');
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.src = '';
    }
    return;
  }
  
  // 如果是同一个轨道，不需要重新加载
  if (oldTrack && newTrack.id === oldTrack.id) {
    console.log('[AudioPlayer] Same track, skipping reload');
    return;
  }
  
  console.log('[AudioPlayer] Track changing to:', newTrack.title);
  
  try {
    // 🔧 参考SmoothPodcastPlayer的简单切换逻辑
    // 先停止当前播放
    if (audioElement.value) {
      audioElement.value.pause();
      audioElement.value.currentTime = 0;
    }
    
    // 重置状态
    audioStore.updateCurrentTime(0);
    audioStore.updateDuration(0);
    audioStore.setLoading(true);
    audioStore.setError(null);
    
    // 处理HLS流
    if (newTrack.isM3u8) {
      // HLS逻辑保持不变
      try {
        if (!Hls) {
          const HlsModule = await import('hls.js');
          Hls = HlsModule.default;
        }
        
        if (Hls.isSupported()) {
          if (audioStore.hlsInstance) {
            audioStore.hlsInstance.destroy();
          }
          
          const hls = new Hls();
          audioStore.setHlsInstance(hls);
          hls.loadSource(newTrack.url);
          
          if (audioElement.value) {
            hls.attachMedia(audioElement.value);
          }
          
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
              console.error('Fatal HLS error:', data);
              audioStore.setError('HLS playback error');
            }
          });
        } else if (audioElement.value && audioElement.value.canPlayType('application/vnd.apple.mpegurl')) {
          audioElement.value.src = newTrack.url;
          if (audioStore.isPlaying) {
            audioElement.value.play().catch(err => {
              console.error('Failed to play HLS stream natively:', err);
              audioStore.isPlaying = false;
            });
          }
        } else {
          audioStore.setError('Browser does not support HLS playback');
        }
      } catch (error) {
        console.error('Error loading HLS:', error);
        audioStore.setError('Failed to load HLS');
      }
    } else if (audioElement.value) {
      // 🔧 简化常规音频文件处理
      console.log('[AudioPlayer] Loading regular audio:', newTrack.title);
      
      // 设置新音频源
      audioElement.value.src = newTrack.url;
      audioElement.value.preload = 'auto';
      audioElement.value.load();
      
      console.log('[AudioPlayer] Audio element setup complete for:', newTrack.title);
    }
  } catch (error) {
    console.error('[AudioPlayer] Error during track change:', error);
    audioStore.setError('Failed to load track');
    audioStore.setLoading(false);
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
  
  // Clean up preload audio element
  if (preloadAudioElement.value) {
    preloadAudioElement.value.pause();
    preloadAudioElement.value.src = '';
  }
});
</script>
