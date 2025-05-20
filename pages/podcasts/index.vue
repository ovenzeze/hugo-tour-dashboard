<template>
  <div class="container mx-auto py-10">
    <!-- Top Action Bar and Filters -->
    <div class="w-full flex flex-wrap justify-between items-center gap-4 mb-6 px-6">
      <!-- <h1 class="text-3xl font-bold">Podcasts</h1> -->
      <div class="flex items-center gap-4">
        <Input
          v-model="searchTerm"
          placeholder="Search by title or topic..."
          class="max-w-xs h-10 min-w-96 opacity-50"
        />
        <div class="flex items-center space-x-2 min-w-44">
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
        :current-previewing-id="podcastPlayer.currentPlayingPodcastId.value?.toString() || ''"
        :is-audio-playing="!!podcastPlayer.isPlaying.value"
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
      <SheetContent side="right" class="w-full sm:max-w-2xl"> 
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

    <!-- No longer need hidden audio player, now using global audio player -->
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
import { usePodcastDatabase } from '~/composables/usePodcastDatabase';
import { type Podcast, type Segment, type SegmentAudio } from '~/types/podcast';
import { usePodcastPlayer } from '~/composables/usePodcastPlayer';

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

// Initialize podcast player
const podcastPlayer = usePodcastPlayer();

// Filtered podcasts based on searchTerm and hideEmptyPodcasts
const filteredPodcasts = computed<Podcast[]>(() => {
  let result = podcasts.value;
  console.log('[PodcastsPage] Original podcasts:', JSON.parse(JSON.stringify(podcasts.value)));
  console.log('[PodcastsPage] Current searchTerm:', searchTerm.value);
  console.log('[PodcastsPage] Current hideEmptyPodcasts:', hideEmptyPodcasts.value);

  // Apply search term filter
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase();
    result = result.filter(podcast =>
      (podcast.title && podcast.title.toLowerCase().includes(lowerSearchTerm)) ||
      (podcast.topic && podcast.topic.toLowerCase().includes(lowerSearchTerm))
    );
    console.log('[PodcastsPage] Podcasts after searchTerm filter:', JSON.parse(JSON.stringify(result)));
  }

  // Apply hide empty podcasts filter
  if (hideEmptyPodcasts.value) {
    result = result.filter(podcast =>
      podcast.podcast_segments && podcast.podcast_segments.length > 0
    );
    console.log('[PodcastsPage] Podcasts after hideEmptyPodcasts filter:', JSON.parse(JSON.stringify(result)));
  }

  console.log('[PodcastsPage] Final filteredPodcasts:', JSON.parse(JSON.stringify(result)));
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

// No longer needed since we're using the global audio player

// Stop any current podcast playback
const stopPreview = () => {
  podcastPlayer.stopPodcast();
};

// Handle preview podcast click
const handlePreviewPodcast = async (podcastId: string) => {
  // If same podcast is playing, stop it
  if (podcastPlayer.currentPlayingPodcastId.value === podcastId) {
    stopPreview();
    return;
  }
  
  // Find the podcast by ID
  const podcastToPreview = podcasts.value.find(p => String(p.podcast_id) === String(podcastId));
  
  // If found, play it using the podcast player
  if (podcastToPreview) {
    podcastPlayer.playPodcast(podcastToPreview);
  } else {
    console.warn(`Podcast with ID ${podcastId} not found`);
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
