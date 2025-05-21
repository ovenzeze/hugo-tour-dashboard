import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface AudioTrack {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  coverImage?: string;
  isM3u8?: boolean;
  meta?: {
    type?: string;
    podcastId?: string;
    segmentId?: string;
    speaker?: string;
    fullText?: string;
    [key: string]: any;
  };
}

export const useAudioPlayerStore = defineStore('audioPlayer', () => {
  // 状态
  const currentTrack = ref<AudioTrack | null>(null);
  const playlist = ref<AudioTrack[]>([]);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(0.8);
  const isMuted = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const hlsInstance = ref<any | null>(null);
  const autoplay = ref(true); // 默认开启自动播放功能

  // 计算属性
  const progress = computed(() => {
    if (duration.value <= 0) return 0;
    return (currentTime.value / duration.value) * 100;
  });

  const currentIndex = computed(() => {
    if (!currentTrack.value) return -1;
    return playlist.value.findIndex(track => track.id === currentTrack.value?.id);
  });

  const hasNext = computed(() => {
    return currentIndex.value < playlist.value.length - 1;
  });

  const hasPrevious = computed(() => {
    return currentIndex.value > 0;
  });

  // 方法
  function play(track?: AudioTrack) {
    if (track) {
      // 播放新的曲目
      currentTrack.value = track;
      isLoading.value = true;
      error.value = null;
      // 设置播放状态为 true，确保自动开始播放
      isPlaying.value = true;
      console.log(`[AudioPlayerStore] Playing track: ${track.title}`);
    } else if (currentTrack.value) {
      // 继续播放当前曲目
      isPlaying.value = true;
      console.log('[AudioPlayerStore] Resuming playback');
    }
  }

  function pause() {
    isPlaying.value = false;
  }

  function togglePlay() {
    isPlaying.value = !isPlaying.value;
  }

  function stop() {
    isPlaying.value = false;
    currentTime.value = 0;
  }

  function next() {
    if (!hasNext.value) {
      console.log('[AudioPlayerStore] No next track available');
      return;
    }
    
    // 获取当前索引和下一个索引
    const currentIdx = currentIndex.value;
    const nextIdx = currentIdx + 1;
    
    // 确保下一个索引有效
    if (nextIdx >= 0 && nextIdx < playlist.value.length) {
      const nextTrack = playlist.value[nextIdx];
      console.log(`[AudioPlayerStore] Playing next track: ${nextTrack.title} (index: ${nextIdx})`);
      
      // 记录当前播放的索引，便于调试
      const previousTrackId = currentTrack.value?.id;
      
      // 播放下一个曲目
      play(nextTrack);
      
      // 检查是否成功切换到下一曲
      if (currentTrack.value?.id === previousTrackId) {
        console.error(`[AudioPlayerStore] Failed to advance to next track. Still on track ID: ${previousTrackId}`);
      } else {
        console.log(`[AudioPlayerStore] Successfully advanced to track index ${nextIdx}`);
      }
    } else {
      console.error(`[AudioPlayerStore] Invalid next index: ${nextIdx} (playlist length: ${playlist.value.length})`);
    }
  }

  function previous() {
    if (!hasPrevious.value) return;
    const prevTrack = playlist.value[currentIndex.value - 1];
    play(prevTrack);
  }

  function seek(time: number) {
    currentTime.value = time;
  }

  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(1, value));
  }

  function toggleMute() {
    isMuted.value = !isMuted.value;
  }

  function addToPlaylist(track: AudioTrack) {
    // 检查是否已存在
    const exists = playlist.value.some(t => t.id === track.id);
    if (!exists) {
      playlist.value.push(track);
    }
  }

  function addMultipleToPlaylist(tracks: AudioTrack[]) {
    console.log(`[AudioPlayerStore] Adding ${tracks.length} tracks to playlist`);
    // 先打印所有要添加的曲目，便于调试
    tracks.forEach((track, index) => {
      console.log(`[AudioPlayerStore] Track ${index + 1}/${tracks.length} to add: ${track.title}`);
    });
    
    // 直接将所有曲目添加到播放列表中，而不是使用 addToPlaylist
    // 这样可以避免可能的重复检查问题
    const uniqueTracks = tracks.filter(newTrack => 
      !playlist.value.some(existingTrack => existingTrack.id === newTrack.id)
    );
    
    console.log(`[AudioPlayerStore] Adding ${uniqueTracks.length} unique tracks to playlist`);
    playlist.value = [...playlist.value, ...uniqueTracks];
    
    // 打印播放列表的当前状态
    console.log(`[AudioPlayerStore] Playlist now has ${playlist.value.length} tracks`);
  }

  function removeFromPlaylist(trackId: string) {
    const index = playlist.value.findIndex(t => t.id === trackId);
    if (index !== -1) {
      playlist.value.splice(index, 1);
      
      // 如果删除的是当前播放的曲目，停止播放或切换到下一首
      if (currentTrack.value?.id === trackId) {
        if (playlist.value.length > index) {
          play(playlist.value[index]);
        } else if (playlist.value.length > 0) {
          play(playlist.value[0]);
        } else {
          currentTrack.value = null;
          isPlaying.value = false;
        }
      }
    }
  }

  function clearPlaylist() {
    playlist.value = [];
    currentTrack.value = null;
    isPlaying.value = false;
  }

  function updateCurrentTime(time: number) {
    currentTime.value = time;
    
    // 检测是否播放完成，如果播放完成并启用了自动播放，则播放下一首
    if (duration.value > 0 && time >= duration.value - 0.1 && autoplay.value && hasNext.value) {
      console.log('[AudioPlayerStore] Track ended, auto-playing next track');
      // 使用 setTimeout 确保当前曲目完全结束后再播放下一首
      setTimeout(() => {
        next();
      }, 100);
    }
  }

  function updateDuration(newDuration: number) {
    duration.value = newDuration;
  }

  function setHlsInstance(instance: any) {
    hlsInstance.value = instance;
  }

  function setLoading(loading: boolean) {
    isLoading.value = loading;
  }

  function setError(errorMessage: string | null) {
    error.value = errorMessage;
  }
  
  function setAutoplay(value: boolean) {
    autoplay.value = value;
    console.log(`[AudioPlayerStore] Autoplay ${value ? 'enabled' : 'disabled'}`);
  }

  return {
    // 状态
    currentTrack,
    playlist,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    error,
    hlsInstance,
    autoplay,
    
    // 计算属性
    progress,
    currentIndex,
    hasNext,
    hasPrevious,
    
    // 方法
    play,
    pause,
    togglePlay,
    stop,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    addToPlaylist,
    addMultipleToPlaylist,
    removeFromPlaylist,
    clearPlaylist,
    updateCurrentTime,
    updateDuration,
    setHlsInstance,
    setLoading,
    setError,
    setAutoplay
  };
});
