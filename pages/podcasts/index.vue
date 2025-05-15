<template>
  <div class="container mx-auto py-10">
    <!-- 顶部操作栏 -->
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-3xl font-bold">Podcast Management</h1>
      <!-- New Podcast Button -->
      <Button @click="handleCreateNewPodcast">
        <Icon name="ph:plus-circle-duotone" class="mr-2 h-5 w-5" />
        New Podcast
      </Button>
    </div>

    <!-- Podcast List -->
    <div>
      <PodcastList
        :podcasts="podcasts"
        @select-podcast="handleSelectPodcast"
        @edit-podcast="handleEditPodcast"
        @delete-podcast="handleDeletePodcast"
        @download-podcast="handleDownloadAll"
        @preview-podcast="handlePreviewPodcast"
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
import { ref, onMounted, nextTick } from 'vue';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import PodcastDetailDrawer from '~/components/podcasts/PodcastDetailDrawer.vue';
import PodcastList from '~/components/podcasts/PodcastList.vue';
import { usePodcastDatabase, type Podcast, type Segment, type SegmentAudio } from '~/composables/usePodcastDatabase';

const { podcasts, selectedPodcast, fetchPodcasts, fetchPodcastById, deletePodcast, downloadPodcast, resynthesizeAllSegments } = usePodcastDatabase();

const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioQueue = ref<string[]>([]);
const currentSegmentIndex = ref(0);
const isPlayingPreview = ref(false);

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
};

const handlePreviewPodcast = async (podcastId: string) => {
  stopPreview(); // Stop any current playback

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
        audioPlayer.value.play().catch(e => console.error("Error playing audio:", e));
      }
    } else {
      console.warn('No playable segments found for this podcast.');
      // Optionally show a toast or message to the user
    }
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
</script>

<style scoped>
/* 页面样式 */
</style>
