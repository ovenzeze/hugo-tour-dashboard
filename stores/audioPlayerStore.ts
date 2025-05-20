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
    } else if (currentTrack.value) {
      // 继续播放当前曲目
      isPlaying.value = true;
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
    if (!hasNext.value) return;
    const nextTrack = playlist.value[currentIndex.value + 1];
    play(nextTrack);
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
    tracks.forEach(track => addToPlaylist(track));
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
    setError
  };
});