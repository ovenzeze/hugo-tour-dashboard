import { ref, computed, onUnmounted, watch } from "vue";

/**
 * useAudioPlayer - a simple composable for audio playback control
 * Provides play, pause, seek, and state tracking for a single audio element.
 */
export function useAudioPlayer(src?: string) {
  const audio = ref<HTMLAudioElement | null>(null);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const error = ref<string | null>(null);

  // Create audio element if src is provided
  if (src) {
    audio.value = new Audio(src);
  }

  // Event listeners
  function setupListeners() {
    if (!audio.value) return;
    audio.value.addEventListener("play", () => (isPlaying.value = true));
    audio.value.addEventListener("pause", () => (isPlaying.value = false));
    audio.value.addEventListener("timeupdate", () => (currentTime.value = audio.value!.currentTime));
    audio.value.addEventListener("durationchange", () => (duration.value = audio.value!.duration));
    audio.value.addEventListener("ended", () => (isPlaying.value = false));
    audio.value.addEventListener("error", () => (error.value = "Audio playback error"));
  }

  function cleanupListeners() {
    if (!audio.value) return;
    audio.value.removeEventListener("play", () => (isPlaying.value = true));
    audio.value.removeEventListener("pause", () => (isPlaying.value = false));
    audio.value.removeEventListener("timeupdate", () => (currentTime.value = audio.value!.currentTime));
    audio.value.removeEventListener("durationchange", () => (duration.value = audio.value!.duration));
    audio.value.removeEventListener("ended", () => (isPlaying.value = false));
    audio.value.removeEventListener("error", () => (error.value = "Audio playback error"));
  }

  // Control methods
  function play() {
    if (audio.value) audio.value.play();
  }

  function pause() {
    if (audio.value) audio.value.pause();
  }

  function seek(time: number) {
    if (audio.value) audio.value.currentTime = time;
  }

  // Watch for src changes
  watch(
    () => src,
    (newSrc) => {
      if (audio.value) {
        cleanupListeners();
        audio.value.pause();
      }
      audio.value = newSrc ? new Audio(newSrc) : null;
      setupListeners();
    },
    { immediate: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    if (audio.value) {
      cleanupListeners();
      audio.value.pause();
      audio.value = null;
    }
  });

  // Setup listeners on creation
  if (audio.value) setupListeners();

  return {
    audio,
    isPlaying: computed(() => isPlaying.value),
    currentTime: computed(() => currentTime.value),
    duration: computed(() => duration.value),
    error,
    play,
    pause,
    seek,
  };
}
