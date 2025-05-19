<template>
  <div class="podcast-page min-h-screen bg-gray-900 text-white flex flex-col items-center p-4 md:p-8">
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <p class="text-xl">Loading podcast...</p>
    </div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-red-400">
      <p class="text-xl">Error loading podcast: {{ error.message }}</p>
    </div>
    <div v-else-if="podcast" class="w-full max-w-4xl">
      <!-- Podcast Info Section -->
      <header class="podcast-header md:flex md:items-end md:space-x-8 mb-8">
        <div class="podcast-cover mb-6 md:mb-0 md:w-1/3 lg:w-1/4 flex-shrink-0">
          <img
            v-if="podcastCoverUrl"
            :src="podcastCoverUrl"
            alt="Podcast Cover"
            class="w-full h-auto object-cover rounded-lg shadow-2xl aspect-square"
          />
          <div
            v-else
            class="w-full h-auto bg-gray-800 rounded-lg shadow-2xl aspect-square flex items-center justify-center text-gray-500"
          >
            No Cover
          </div>
        </div>
        <div class="podcast-details md:w-2/3 lg:w-3/4">
          <h1 class="text-4xl md:text-5xl font-bold mb-3 leading-tight">{{ podcast.title }}</h1>
          <p v-if="podcastArtist" class="text-lg text-gray-400 mb-4">{{ podcastArtist }}</p>
          <p v-if="podcast.topic" class="text-gray-300 text-sm leading-relaxed mb-6 line-clamp-3">
            {{ podcast.topic }}
          </p>
          <button @click="playLatestOrFirstSegment" class="bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-full shadow-md transition duration-300">
            {{ audioQueue.length > 0 ? (isPlaying && currentSegmentIndex === 0 ? 'Pause' : 'Play') : 'No Segments' }}
          </button>
        </div>
      </header>

      <!-- Audio Player & Segments Section -->
      <main class="podcast-main-content">
        <div v-if="audioQueue.length > 0" class="player-section bg-gray-800 p-6 rounded-lg shadow-xl mb-8">
          <h2 class="text-2xl font-semibold mb-4 border-b border-gray-700 pb-3">Now Playing</h2>
          <div class="custom-player mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-lg font-medium truncate pr-2" :title="currentSegment?.title">{{ currentSegment?.title || 'No segment selected' }}</span>
              <span class="text-sm text-gray-400 flex-shrink-0">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
            </div>
            <div class="progress-bar-container bg-gray-700 rounded-full h-2 mb-4 cursor-pointer" @click="seek">
              <div class="progress-bar bg-pink-500 h-2 rounded-full" :style="{ width: progressPercentage + '%' }"></div>
            </div>
            <div class="controls flex items-center justify-center space-x-6">
              <button @click="playPreviousSegment" class="control-button text-gray-300 hover:text-white transition" :disabled="currentSegmentIndex === 0 && audioQueue.length <=1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button @click="togglePlayPause" class="play-pause-button bg-pink-500 hover:bg-pink-600 text-white rounded-full p-3 shadow-lg transition">
                <svg v-if="!isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </button>
              <button @click="playNextSegment" class="control-button text-gray-300 hover:text-white transition" :disabled="currentSegmentIndex === audioQueue.length - 1 && audioQueue.length <=1">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
          <audio ref="audioPlayer" @ended="handleSegmentEnd" @timeupdate="updateProgress" @loadedmetadata="updateDurationAndPlay" @error="handleAudioError" class="w-full hidden"></audio>
        </div>
        <div v-else class="mt-8 text-gray-500 text-center">
          No audio segments available for this podcast.
        </div>

        <div v-if="audioQueue.length > 0" class="segments-list bg-gray-800 p-6 rounded-lg shadow-xl">
          <h3 class="text-xl font-semibold mb-4 border-b border-gray-700 pb-3">Episodes / Segments</h3>
          <ul>
            <li
              v-for="(segment, index) in audioQueue"
              :key="segment.url + '-' + index"
              @click="playSegment(index)"
              :class="['segment-item flex justify-between items-center p-3 hover:bg-gray-700 rounded-md cursor-pointer transition duration-150', { 'bg-gray-700 text-pink-400': currentSegmentIndex === index }]"
            >
              <div class="flex items-center min-w-0">
                <span class="mr-3 text-sm text-gray-400 w-6 text-right flex-shrink-0">{{ index + 1 }}.</span>
                <TooltipProvider :delay-duration="300">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <span class="font-medium truncate h-6 leading-6 overflow-hidden">{{ segment.title }}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top" class="bg-gray-700 text-white border-gray-600 max-w-xs shadow-lg">
                      <p>{{ segment.fullTitle }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <button class="ml-2 flex-shrink-0">
                <svg v-if="currentSegmentIndex === index && isPlaying" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-400 hover:text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              </button>
            </li>
          </ul>
        </div>
      </main>
    </div>
    <div v-else class="flex-grow flex items-center justify-center text-gray-500">
      <p class="text-xl">Podcast not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { usePodcastDatabase, type Podcast, type Segment as PodcastSegment, type SegmentAudio, type Persona } from '~/composables/usePodcastDatabase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const route = useRoute();
const { fetchPodcastById, selectedPodcast } = usePodcastDatabase();

const podcast = ref<Podcast | null>(null);
const loading = ref(true);
const error = ref<Error | null>(null);

const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioQueue = ref<{ title: string; url: string }[]>([]);
const currentSegmentIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isLoadingAudio = ref(false);

const podcastCoverUrl = computed(() => {
  if (!podcast.value) return null;
  return podcast.value.host_persona?.avatar_url || podcast.value.creator_persona?.avatar_url || `https://picsum.photos/seed/${podcast.value.podcast_id}/600/600`;
});

const podcastArtist = computed(() => {
  if (!podcast.value) return 'Unknown Artist';
  return podcast.value.host_persona?.name || podcast.value.creator_persona?.name || 'Unknown Artist';
});

const currentSegment = computed(() => {
  return audioQueue.value[currentSegmentIndex.value] || null;
});

const progressPercentage = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

onMounted(async () => {
  const podcastId = route.params.id as string;
  if (podcastId) {
    try {
      loading.value = true;
      error.value = null;
      await fetchPodcastById(podcastId);

      if (selectedPodcast.value) {
        podcast.value = selectedPodcast.value;
        const rawSegments: { idx: number; fullTitle: string; truncatedTitle: string; audioUrl?: string }[] = [];
        if (podcast.value && podcast.value.podcast_segments) {
          podcast.value.podcast_segments.forEach((segment: any) => { // Use any for segment to avoid deep type instantiation
            let audioUrlToPlay: string | undefined = undefined;
            if (segment.segment_audios && segment.segment_audios.length > 0) {
              const finalAudio = segment.segment_audios.find((audio: any) => audio.version_tag === 'final');
              audioUrlToPlay = (finalAudio?.audio_url ?? undefined) ||
                               (segment.segment_audios.find((audio: any) => audio.audio_url)?.audio_url ?? undefined);
            }
            
            const fullText = (segment.text && String(segment.text).length > 0) ? String(segment.text) : `Segment ${segment.idx}`;
            const truncatedText = fullText.length > 50 ? fullText.substring(0, 50) + '...' : fullText;

            if (audioUrlToPlay) {
              rawSegments.push({
                idx: segment.idx,
                fullTitle: fullText,
                truncatedTitle: truncatedText,
                audioUrl: audioUrlToPlay
              });
            }
          });
        }
        prepareAudioQueue(rawSegments);
      } else {
        error.value = new Error(`Podcast with id ${podcastId} not found.`);
      }
    } catch (err) {
      console.error('Failed to fetch podcast:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
    error.value = new Error('Podcast ID is missing from route parameters.');
  }
});

const prepareAudioQueue = (segments: { idx: number; fullTitle: string; truncatedTitle: string; audioUrl?: string }[]) => {
  audioQueue.value = segments
    .filter(segment => segment.audioUrl)
    .map(segment => ({
      title: segment.truncatedTitle, // This will be displayed in the list
      fullTitle: segment.fullTitle, // This will be used for the tooltip
      url: segment.audioUrl!,
    }));

  if (audioQueue.value.length > 0 && audioPlayer.value) {
    audioPlayer.value.src = audioQueue.value[0].url;
    currentSegmentIndex.value = 0;
  }
};

const loadAndPlayAudio = (playWhenReady: boolean = true) => {
  if (audioPlayer.value && currentSegment.value) {
    isLoadingAudio.value = true;
    audioPlayer.value.src = currentSegment.value.url;
    audioPlayer.value.load();
    if (playWhenReady) {
      // Play will be called in updateDurationAndPlay after metadata is loaded
    } else {
      const canPlayHandler = () => {
        isLoadingAudio.value = false;
        audioPlayer.value?.removeEventListener('canplay', canPlayHandler);
      };
      audioPlayer.value.addEventListener('canplay', canPlayHandler);
    }
  } else {
     console.warn("Audio player or current segment not available for loading.");
     isLoadingAudio.value = false;
  }
};

const playAudio = () => {
  if (audioPlayer.value && audioPlayer.value.src && audioPlayer.value.readyState >= 2) {
    audioPlayer.value.play().then(() => {
      isPlaying.value = true;
      isLoadingAudio.value = false;
    }).catch(e => {
      console.error('Error playing audio:', e);
      isPlaying.value = false;
      isLoadingAudio.value = false;
      error.value = new Error(`Playback failed: ${e.message}`);
    });
  } else if (audioPlayer.value && currentSegment.value) {
    loadAndPlayAudio(true);
  }
};

const pauseAudio = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
  }
};

const togglePlayPause = () => {
  if (isLoadingAudio.value) return;
  if (isPlaying.value) {
    pauseAudio();
  } else {
    playAudio();
  }
};

const playSegment = (index: number) => {
  if (isLoadingAudio.value) return;
  if (index >= 0 && index < audioQueue.value.length) {
    currentSegmentIndex.value = index;
    // isPlaying.value will determine if loadAndPlayAudio auto-plays
  }
};

const playNextSegment = () => {
  if (isLoadingAudio.value) return;
  const nextIndex = currentSegmentIndex.value + 1;
  if (nextIndex < audioQueue.value.length) {
    playSegment(nextIndex);
  }
};

const playPreviousSegment = () => {
  if (isLoadingAudio.value) return;
  const prevIndex = currentSegmentIndex.value - 1;
  if (prevIndex >= 0) {
    playSegment(prevIndex);
  }
};

const playLatestOrFirstSegment = () => {
  if (audioQueue.value.length > 0) {
    if (currentSegmentIndex.value === 0 && isPlaying.value) {
      pauseAudio();
    } else if (currentSegmentIndex.value === 0 && !isPlaying.value) {
      playAudio(); // Play current (first) segment
    } else {
      playSegment(0); // Select and potentially play first segment
    }
  }
};

const updateProgress = () => {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
  }
};

const updateDurationAndPlay = () => {
   if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
    isLoadingAudio.value = false;
    if (isPlaying.value) {
        audioPlayer.value.play().catch(e => {
            console.error('Error auto-playing after metadata load:', e);
            isPlaying.value = false;
        });
    }
  }
};

const handleSegmentEnd = () => {
  isPlaying.value = false;
  const nextIndex = currentSegmentIndex.value + 1;
  if (nextIndex < audioQueue.value.length) {
    currentSegmentIndex.value = nextIndex;
    isPlaying.value = true; // Auto-play next segment
  } else {
    currentSegmentIndex.value = 0;
    if(audioPlayer.value) {
        audioPlayer.value.src = audioQueue.value[0]?.url || '';
    }
    duration.value = 0;
    currentTime.value = 0;
  }
};

const handleAudioError = (e: Event) => {
    console.error('Audio player error:', e);
    const audioEl = e.target as HTMLAudioElement;
    let errorMsg = 'Unknown audio error.';
    if (audioEl.error) {
        switch (audioEl.error.code) {
            case MediaError.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted.'; break;
            case MediaError.MEDIA_ERR_NETWORK: errorMsg = 'Network error.'; break;
            case MediaError.MEDIA_ERR_DECODE: errorMsg = 'Decoding error.'; break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Audio format not supported.'; break;
            default: errorMsg = `Unknown error. Code: ${audioEl.error.code}`;
        }
    }
    error.value = new Error(errorMsg);
    isPlaying.value = false;
    isLoadingAudio.value = false;
};

const seek = (event: MouseEvent) => {
  if (audioPlayer.value && duration.value > 0 && !isLoadingAudio.value) {
    const progressBar = (event.currentTarget as HTMLElement);
    const clickPosition = (event.offsetX / progressBar.offsetWidth) * duration.value;
    audioPlayer.value.currentTime = clickPosition;
    if (!isPlaying.value) {
        currentTime.value = clickPosition;
    }
  }
};

const formatTime = (time: number) => {
  if (isNaN(time) || time === Infinity) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
};

watch(currentSegmentIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && audioQueue.value[newIndex]) {
    loadAndPlayAudio(isPlaying.value); // Play if it was already playing or intended to play
  } else if (!audioQueue.value[newIndex] && audioPlayer.value) {
    audioPlayer.value.src = '';
    isPlaying.value = false;
    duration.value = 0;
    currentTime.value = 0;
  }
});

definePageMeta({
  layout: 'fullscreen',
});
</script>

<style scoped>
.podcast-page {
  /* Tailwind handles bg and text */
}
.podcast-cover img, .podcast-cover div {
  border: 1px solid rgba(255,255,255,0.1);
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.custom-player .progress-bar-container {
  transition: height 0.2s ease-in-out;
}
.custom-player .progress-bar-container:hover {
  height: 0.75rem; /* h-3 */
}
.custom-player .progress-bar-container:hover .progress-bar {
  height: 0.75rem; /* h-3 */
}
.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.segment-item:hover .text-gray-400:not(.w-6) {
  color: #ec4899; /* pink-500 */
}
</style>