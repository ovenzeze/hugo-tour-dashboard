<template>
  <div class="container mx-auto p-4">
    <div v-if="loading" class="text-center">
      Loading podcast...
    </div>
    <div v-else-if="error" class="text-center text-red-500">
      Error loading podcast: {{ error.message }}
    </div>
    <div v-else-if="podcast">
      <h1 class="text-3xl font-bold mb-4">{{ podcast.title }}</h1>
      <!-- podcast.description was removed as it does not exist on the type -->

      <!-- Audio Player -->
      <div v-if="audioQueue.length > 0" class="mt-8">
        <h2 class="text-2xl font-semibold mb-2">Listen</h2>
        <audio ref="audioPlayer" controls @ended="playNextSegment" class="w-full"></audio>
        <div class="mt-2">
          <p>Now playing: {{ currentSegment?.title || 'No segment selected' }}</p>
        </div>
      </div>
      <div v-else class="mt-8 text-gray-500">
        No audio segments available for this podcast.
      </div>
    </div>
    <div v-else class="text-center text-gray-500">
      Podcast not found.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePodcastDatabase, type Podcast, type Segment as PodcastSegment, type SegmentAudio } from '~/composables/usePodcastDatabase';

const route = useRoute();
const { fetchPodcastById, selectedPodcast } = usePodcastDatabase(); // Destructure selectedPodcast

const podcast = ref<Podcast | null>(null); // This will now be populated from selectedPodcast
const loading = ref(true); // loading state can be managed by the composable or locally
const error = ref<Error | null>(null); // error state can be managed by the composable or locally

const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioQueue = ref<{ title: string; url: string }[]>([]);
const currentSegmentIndex = ref(0);

const currentSegment = computed(() => {
  return audioQueue.value[currentSegmentIndex.value] || null;
});

onMounted(async () => {
  const podcastId = route.params.id as string;
  if (podcastId) {
    try {
      loading.value = true;
      error.value = null;
      await fetchPodcastById(podcastId);

      if (selectedPodcast.value) {
        // Attempt to mitigate "Type instantiation is excessively deep" by using 'any' as a last resort if it persists.
        // This is a temporary workaround. The underlying Podcast type or its usage might need a more thorough review.
        const currentPodcast: any = selectedPodcast.value; // Using any here
        podcast.value = currentPodcast; // Keep for displaying title etc.

        // Create a simplified structure for the audio queue
        const simplifiedSegments: { idx: number; audioUrl?: string }[] = [];
        if (currentPodcast && currentPodcast.podcast_segments) { // Use the local const
          currentPodcast.podcast_segments.forEach((segment: PodcastSegment) => {
            let audioUrlToPlay: string | undefined = undefined;
            if (segment.segment_audios && segment.segment_audios.length > 0) {
              const finalAudio = segment.segment_audios.find((audio: SegmentAudio) => audio.version_tag === 'final');
              if (finalAudio && finalAudio.audio_url) {
                audioUrlToPlay = finalAudio.audio_url;
              } else {
                const firstAvailableAudio = segment.segment_audios.find((audio: SegmentAudio) => audio.audio_url);
                if (firstAvailableAudio && firstAvailableAudio.audio_url) {
                  audioUrlToPlay = firstAvailableAudio.audio_url;
                }
              }
            }
            if (audioUrlToPlay) {
              simplifiedSegments.push({ idx: segment.idx, audioUrl: audioUrlToPlay });
            }
          });
        }
        prepareAudioQueue(simplifiedSegments);
      } else {
        console.warn(`Podcast with id ${podcastId} not found or error in fetching.`);
        // Optionally, set local error based on composable's error state if needed
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

// Define audio playback functions before prepareAudioQueue as it calls playSegment
const playSegment = (index: number) => {
  if (audioPlayer.value && audioQueue.value[index]) {
    currentSegmentIndex.value = index;
    audioPlayer.value.src = audioQueue.value[index].url;
    audioPlayer.value.load(); // Important to load the new source
    audioPlayer.value.play().catch(e => console.error('Error playing audio:', e));
  }
};

const playNextSegment = () => {
  const nextIndex = currentSegmentIndex.value + 1;
  if (nextIndex < audioQueue.value.length) {
    playSegment(nextIndex);
  } else {
    // Optional: Handle end of queue (e.g., stop player, show message)
    console.log('End of podcast queue.');
    if (audioPlayer.value) {
      audioPlayer.value.src = ''; // Clear src
    }
  }
};

// Updated prepareAudioQueue to accept the simplified segment structure
const prepareAudioQueue = (simplifiedSegments: { idx: number; audioUrl?: string }[]) => {
const queue: { title: string; url: string }[] = [];
simplifiedSegments.forEach(segment => {
  if (segment.audioUrl) {
    queue.push({
      title: `Segment ${segment.idx}`,
      url: segment.audioUrl,
    });
  }
});
audioQueue.value = queue;
if (audioQueue.value.length > 0) {
  playSegment(0);
}
};
// Ensure route is defined for Nuxt 3 pages
definePageMeta({
  layout: 'default', // Or your preferred layout
});
</script>

<style scoped>
/* Add any page-specific styles here */
.container {
  max-width: 800px;
}
</style>