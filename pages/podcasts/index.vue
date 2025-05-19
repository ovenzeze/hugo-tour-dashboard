<template>
  <div class="container mx-auto py-10">
    <!-- Top Action Bar and Filters -->
    <div class="flex flex-wrap justify-between items-center gap-4 mb-6 px-6">
      <h1 class="text-3xl font-bold">Podcasts</h1>
      <div class="flex items-center gap-4">
        <Input
          v-model="searchTerm"
          placeholder="Search by title or topic..."
          class="max-w-xs h-10"
        />
        <div class="flex items-center space-x-2">
          <Switch id="hide-empty-podcasts" v-model:checked="hideEmptyPodcasts" />
          <Label for="hide-empty-podcasts" class="text-sm">Hide Empty Podcasts</Label>
        </div>
        <Button @click="handleCreateNewPodcast" size="lg">
          <Icon name="ph:plus-circle-duotone" class="mr-2 h-5 w-5" />
          New Podcast
        </Button>
      </div>
    </div>

    <!-- Conditional Rendering for Content Area -->
    <div class="p-4">
      <!-- Loading State -->
      <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        <div v-for="n in 3" :key="`skeleton-${n}`" class="border rounded-xl overflow-hidden shadow-md bg-card"> 
          <div class="p-4 space-y-3">
            <div class="flex justify-between items-start">
              <div class="flex-1 space-y-2">
                <Skeleton class="h-5 w-3/4" />
                <Skeleton class="h-3 w-1/2" />
              </div>
              <div class="flex gap-1">
                <Skeleton class="h-7 w-7 rounded" />
                <Skeleton class="h-7 w-7 rounded" />
              </div>
            </div>
            <div class="space-y-2 pt-2">
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-5/6" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-4/5" />
              <Skeleton class="h-4 w-full" />
              <Skeleton class="h-4 w-2/3" />
            </div>
            <div class="grid grid-cols-2 gap-2 pt-2">
              <Skeleton class="h-9 w-full rounded" />
              <Skeleton class="h-9 w-full rounded" />
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-10">
        <Icon name="ph:warning-circle-duotone" class="mx-auto h-16 w-16 text-destructive mb-4" />
        <p class="text-xl font-medium text-destructive">Failed to load podcasts</p>
        <p class="text-md text-muted-foreground mb-6">{{ error }}</p>
        <Button @click="fetchPodcasts" size="lg">
          <Icon name="ph:arrow-clockwise-duotone" class="mr-2 h-5 w-5" />
          Try Again
        </Button>
      </div>
      
      <!-- Podcast List (includes its own empty state) -->
      <PodcastList
        v-else
        :podcasts="filteredPodcasts"
        :current-previewing-id="currentlyPreviewingId"
        :is-audio-playing="isPlayingPreview"
        :hide-empty-podcasts-toggle="hideEmptyPodcasts"
        @select-podcast="handleSelectPodcast"
        @edit-podcast="handleEditPodcast"
        @delete-podcast="handleDeletePodcast"
        @download-podcast="handleDownloadAll"
        @preview-podcast="handlePreviewPodcast"
        @stop-preview="stopPreview"
        @generate-cover="handleGenerateCover"
      />
    </div>

    <!-- Podcast Detail Drawer/Sheet -->
    <Sheet :open="!!selectedPodcast" @update:open="handleCloseDrawer">
      <SheetContent side="right" class="w-full sm:max-w-2xl"> {/* Changed sm:max-w-lg to sm:max-w-2xl */}
        <SheetHeader>
          <SheetTitle>Podcast Details</SheetTitle>
          <SheetDescription>
            View and manage podcast details and segments.
          </SheetDescription>
        </SheetHeader>
        <PodcastDetailDrawer
          :podcast="selectedPodcast"
          @close="handleCloseDrawer"
          @resynthesize-all="handleResynthesizeAll"
          @download-all="handleDownloadAll"
          @delete-podcast="handleDeletePodcast"
        />
      </SheetContent>
    </Sheet>

    <!-- Hidden Audio Player for Sequential Playback -->
    <audio ref="audioPlayer" @ended="playNextSegment" style="display: none;"></audio>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { computed, nextTick, onMounted, ref } from 'vue';
import PodcastDetailDrawer from '~/components/podcasts/PodcastDetailDrawer.vue';
import PodcastList from '~/components/podcasts/PodcastList.vue';
import { usePodcastDatabase, type Podcast, type Segment, type SegmentAudio } from '~/composables/usePodcastDatabase';

const searchTerm = ref('');
const hideEmptyPodcasts = ref(true); // New filter state, default true

const {
  podcasts,
  selectedPodcast,
  loading, // Destructure loading state
  error,   // Destructure error state
  fetchPodcasts,
  fetchPodcastById,
  deletePodcast,
  downloadPodcast,
  resynthesizeAllSegments
} = usePodcastDatabase();

const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioQueue = ref<string[]>([]);
const currentSegmentIndex = ref(0);
const isPlayingPreview = ref(false);
const currentlyPreviewingId = ref<string | null>(null);

// Filtered podcasts based on searchTerm and hideEmptyPodcasts
const filteredPodcasts = computed<Podcast[]>(() => {
  let result = podcasts.value;

  // Apply search term filter
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase();
    result = result.filter(podcast =>
      (podcast.title && podcast.title.toLowerCase().includes(lowerSearchTerm)) ||
      (podcast.topic && podcast.topic.toLowerCase().includes(lowerSearchTerm))
    );
  }

  // Apply hide empty podcasts filter
  if (hideEmptyPodcasts.value) {
    result = result.filter(podcast =>
      podcast.podcast_segments && podcast.podcast_segments.length > 0
    );
  }

  return result;
});

// Fetch podcasts on component mount
onMounted(() => {
  fetchPodcasts();
});

// Handle selecting a podcast from the list
const handleSelectPodcast = (podcastId: string) => {
  stopPreview(); // Stop any ongoing preview
  fetchPodcastById(podcastId);
};

// Handle closing the detail drawer
const handleCloseDrawer = () => {
  selectedPodcast.value = null;
};

// Placeholder handlers for actions
const handleCreateNewPodcast = () => {
  console.log('Create new podcast clicked');
  // Implementation needed
};

const handleEditPodcast = (podcastId: string) => {
  console.log('Edit podcast clicked:', podcastId);
  stopPreview();
  fetchPodcastById(podcastId);
};

const playNextSegment = () => {
  if (isPlayingPreview.value && currentSegmentIndex.value < audioQueue.value.length -1) {
    currentSegmentIndex.value++;
    if (audioPlayer.value) {
      audioPlayer.value.src = audioQueue.value[currentSegmentIndex.value];
      audioPlayer.value.play().catch(e => console.error("Error playing audio:", e));
    }
  } else {
    stopPreview(); // End of queue or stopped manually
  }
};

const stopPreview = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    audioPlayer.value.currentTime = 0;
  }
  audioQueue.value = [];
  currentSegmentIndex.value = 0;
  isPlayingPreview.value = false;
  currentlyPreviewingId.value = null;
};

const handlePreviewPodcast = async (podcastId: string) => {
  if (currentlyPreviewingId.value === podcastId && isPlayingPreview.value) {
    // If clicking the same podcast that's already playing, treat as a stop/pause
    // For simplicity, we'll just stop it. Pause/resume can be added later.
    stopPreview();
    return;
  }
  
  stopPreview(); // Stop any other current playback
  currentlyPreviewingId.value = podcastId; // Set the ID of the podcast being previewed

  let podcastToPreview: Podcast | undefined;
  for (const p of podcasts.value) {
    if (p.podcast_id === podcastId) {
      podcastToPreview = p;
      break;
    }
  }

  if (podcastToPreview && podcastToPreview.podcast_segments) {
    const playableSegments = podcastToPreview.podcast_segments
      .map((segment: Segment) => {
        // Logic to get a playable URL (prioritize final, then any other)
        if (segment.segment_audios && segment.segment_audios.length > 0) {
          const finalAudio = segment.segment_audios.find((sa: SegmentAudio) => sa.version_tag === 'final' && sa.audio_url);
          if (finalAudio) return finalAudio.audio_url;
          const anyAudio = segment.segment_audios.find((sa: SegmentAudio) => sa.audio_url);
          return anyAudio?.audio_url;
        }
        return null;
      })
      .filter(url => url !== null) as string[];

    if (playableSegments.length > 0) {
      audioQueue.value = playableSegments;
      currentSegmentIndex.value = 0;
      isPlayingPreview.value = true;
      await nextTick(); // Ensure audioPlayer ref is available
      if (audioPlayer.value) {
        audioPlayer.value.src = audioQueue.value[0];
        audioPlayer.value.play().catch(e => {
          console.error("Error playing audio:", e);
          stopPreview(); // Stop if playback fails
        });
      }
    } else {
      console.warn('No playable segments found for this podcast.');
      stopPreview(); // Clear preview state if no segments
      // Optionally show a toast or message to the user
    }
  } else {
    stopPreview(); // Clear preview state if podcast not found
  }
};


const handleResynthesizeAll = (podcastId: string) => {
  console.log('Resynthesize all segments for podcast:', podcastId);
  resynthesizeAllSegments(podcastId);
};

const handleDownloadAll = (podcastId: string) => {
  console.log('Download all audio for podcast:', podcastId);
  downloadPodcast(podcastId);
};

const handleDeletePodcast = (podcastId: string) => {
  console.log('Delete podcast:', podcastId);
  deletePodcast(podcastId);
};

const handleGenerateCover = async (podcastId: string) => {
  console.log('Generating cover for podcast:', podcastId);
  try {
    const response = await $fetch(`/api/podcast/${podcastId}/generate-cover`, {
      method: 'POST'
    });
    
    console.log('Cover generated successfully:', response);
    
    // Refresh podcast data to show the new cover
    await fetchPodcasts();
    
  } catch (error) {
    console.error('Error generating cover:', error);
    // Optionally show a notification to the user
  }
};
</script>

<style scoped>
/* Page styles */
</style>
