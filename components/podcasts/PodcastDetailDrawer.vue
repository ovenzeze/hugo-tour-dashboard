<template>
  <div>
    <div class="p-6 space-y-6">
      <!-- Podcast Details Section -->
      <div v-if="podcast" class="space-y-6">
        <!-- Basic Information -->
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Basic Information</h3>
          <div class="space-y-2 text-sm">
            <div class="flex">
              <span class="w-24 text-muted-foreground">Title:</span>
              <span class="text-foreground">{{ podcast.title }}</span>
            </div>
            <div class="flex">
              <span class="w-24 text-muted-foreground">Topic:</span>
              <span class="text-foreground">{{ podcast.topic || 'N/A' }}</span>
            </div>
            <div class="flex">
              <span class="w-24 text-muted-foreground">Created:</span>
              <span class="text-foreground">{{ podcast.created_at ? new Date(podcast.created_at).toLocaleDateString() : 'N/A' }}</span>
            </div>
          </div>
        </div>

        <!-- Segments List -->
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Segments</h3>
          <PodcastSegmentTable
            :segments="podcast.podcast_segments || []"
            @play-audio="handlePlayAudio"
            @resynthesize-segment="handleResynthesizeSegment"
          />
        </div>

        <!-- Podcast Actions -->
        <div>
          <h3 class="text-lg font-medium text-foreground mb-3">Podcast Actions</h3>
          <div class="space-y-2 sm:space-y-0 sm:space-x-2 flex flex-col sm:flex-row">
            <Button @click="emit('resynthesize-all', podcast.podcast_id)" variant="outline" class="flex-1 sm:flex-none">
              <Icon name="ph:arrows-clockwise-duotone" class="mr-2 h-4 w-4" />
              Synthesize All
            </Button>
            <Button @click="emit('download-all', podcast.podcast_id)" class="flex-1 sm:flex-none">
              <Icon name="ph:download-simple-duotone" class="mr-2 h-4 w-4" />
              Download All Audio
            </Button>
            <Button @click="emit('delete-podcast', podcast.podcast_id)" variant="destructive" class="flex-1 sm:flex-none">
              <Icon name="ph:trash-duotone" class="mr-2 h-4 w-4" />
              Delete Podcast
            </Button>
          </div>
        </div>
      </div>

      <!-- Fallback if no podcast is selected -->
      <div v-else>
        <p class="text-muted-foreground text-center py-4">Select a podcast to see details.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import type { Database } from '~/types/supabase';
import PodcastSegmentTable from './PodcastSegmentTable.vue';
// Icon component is globally available or auto-imported

// Define types with nested relationships based on Supabase types
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'];
type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};
type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
};

const props = defineProps<{
  podcast: Podcast | null;
}>();

const emit = defineEmits(['close', 'resynthesize-all', 'download-all', 'delete-podcast']);

// Placeholder handlers for segment operations (will be passed to SegmentTable)
function handlePlayAudio(segmentId: string, audioUrl: string | null) {
  if (audioUrl) {
    console.log('Play audio for segment:', segmentId, audioUrl);
    // Implement audio playback logic, e.g., using a global audio player or emitting an event
  } else {
    console.warn('No audio URL to play for segment:', segmentId);
  }
}

// Removed handleDownloadAudio as per new requirement (only download entire podcast)

function handleResynthesizeSegment(segmentId: string) {
  console.log('Resynthesize segment:', segmentId);
  // Emit an event or call a composable function to handle individual segment resynthesis
  // emit('resynthesize-segment', segmentId); // Example if parent handles it
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
