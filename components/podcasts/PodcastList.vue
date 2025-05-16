<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
    <Card
      v-for="podcast in podcasts"
      :key="podcast.podcast_id"
      :class="[
        'border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-in-out bg-card text-card-foreground flex flex-col',
        currentPreviewingId === podcast.podcast_id ? 'ring-2 ring-primary shadow-xl' : 'cursor-pointer'
      ]"
      @click="currentPreviewingId === podcast.podcast_id ? null : emit('select-podcast', podcast.podcast_id)"
    >
      <CardHeader class="pb-3 relative">
        <div class="flex justify-between items-start gap-2">
          <div class="flex-1 min-w-0">
            <CardTitle class="text-lg font-semibold leading-tight flex items-center min-w-0">
              <Icon
                v-if="currentPreviewingId === podcast.podcast_id && isAudioPlaying"
                name="ph:speaker-high-duotone" class="mr-2 h-5 w-5 text-primary flex-shrink-0 animate-pulse"
              />
              <Icon
                v-else
                name="ph:microphone-stage-duotone" class="mr-2 h-5 w-5 text-primary flex-shrink-0"
              />
              <span class="truncate text-md max-w-[250px]">{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</span>
            </CardTitle>
            <CardDescription class="text-xs text-muted-foreground mt-1 truncate">
              {{ podcast.topic || 'No topic specified' }}
            </CardDescription>
          </div>
          <div class="flex flex-row gap-1 flex-shrink-0">
             <Button
              v-if="!(currentPreviewingId === podcast.podcast_id)"
              variant="ghost"
              size="icon"
              @click.stop="emit('edit-podcast', podcast.podcast_id)"
              class="h-7 w-7"
              title="Edit Podcast"
            >
              <Icon name="ph:pencil-simple" class="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              @click.stop="emit('delete-podcast', podcast.podcast_id)"
              class="text-destructive hover:text-destructive h-7 w-7"
              title="Delete Podcast"
            >
              <Icon name="ph:trash" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent class="py-3 text-sm flex-grow">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Status:</span>
            <span :class="getSynthesisStatusClass(podcast)">{{ getSynthesisStatusText(podcast) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Segments Synced:</span>
            <span>{{ getSyncedSegmentsCount(podcast) }} / {{ podcast.podcast_segments?.length || 0 }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Total Duration:</span>
            <!-- TODO: Calculate or fetch total duration -->
            <span>{{ getPodcastTotalDuration(podcast) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Host:</span>
            <!-- TODO: Fetch host name from podcast data -->
            <span>{{ podcast.host_name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Guest:</span>
            <!-- TODO: Fetch guest name from podcast data -->
            <span>{{ podcast.guest_name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Created:</span>
            <span>{{ podcast.created_at ? new Date(podcast.created_at).toLocaleDateString() : 'N/A' }}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter class="pt-3 pb-4 grid grid-cols-2 gap-2">
        <Button
          v-if="currentPreviewingId === podcast.podcast_id"
          variant="destructive"
          size="sm"
          class="w-full"
          @click.stop="emit('stop-preview')"
        >
          <Icon name="ph:stop-fill" class="mr-2 h-4 w-4" />
          Stop Preview
        </Button>
        <Button
          v-else
          variant="outline"
          size="sm"
          class="w-full"
          @click.stop="emit('preview-podcast', podcast.podcast_id)"
        >
          <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
          Preview
        </Button>
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          @click.stop="emit('download-podcast', podcast.podcast_id)"
          :disabled="currentPreviewingId === podcast.podcast_id"
        >
          <Icon name="ph:download-simple" class="mr-2 h-4 w-4" />
          Download
        </Button>
      </CardFooter>
    </Card>
    <div v-if="!podcasts || podcasts.length === 0" class="col-span-full text-center py-8 text-muted-foreground">
      <Icon name="ph:microphone-slash-duotone" class="mx-auto h-12 w-12" />
      <h3 class="mt-2 text-sm font-medium">No Podcasts Yet</h3>
      <p class="mt-1 text-sm">Get started by creating a new podcast.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '~/types/supabase';
// Icon component is globally available or auto-imported

// Define types with nested relationships based on Supabase types
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'] & {
  duration_ms?: number; // Added for duration calculation
  params?: { duration_ms?: number } & Record<string, any>; // Added for duration_ms potentially in params
};
type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};
type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
  host_name?: string; // Added for Host
  guest_name?: string; // Added for Guest
  // total_duration_ms?: number; // Potentially for total duration
};

const props = defineProps<{
  podcasts: Podcast[];
  currentPreviewingId: string | null;
  isAudioPlaying: boolean;
}>();

const emit = defineEmits(['select-podcast', 'edit-podcast', 'delete-podcast', 'download-podcast', 'preview-podcast', 'stop-preview']);

// Function to get the count of synced segments
function getSyncedSegmentsCount(podcast: Podcast): number {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 0;
  }
  return podcast.podcast_segments.filter(segment =>
    segment.segment_audios && segment.segment_audios.some(audio => audio.audio_url && audio.version_tag === 'final')
  ).length;
}

// Function to determine synthesis status text
function getSynthesisStatusText(podcast: Podcast): string {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'No Segments';
  }
  const syncedCount = getSyncedSegmentsCount(podcast);
  const totalSegments = podcast.podcast_segments.length;

  if (syncedCount === totalSegments) {
    return 'All Synced';
  } else if (syncedCount > 0) {
    return 'Partially Synced';
  } else {
    return 'Not Synced';
  }
}

function getSynthesisStatusClass(podcast: Podcast): string {
  const status = getSynthesisStatusText(podcast);
  if (status === 'All Synced') return 'text-green-600 dark:text-green-400 font-medium';
  if (status === 'Partially Synced') return 'text-yellow-600 dark:text-yellow-400 font-medium';
  if (status === 'Not Synced') return 'text-red-600 dark:text-red-400 font-medium';
  return 'text-muted-foreground'; // For "No Segments"
}

// Function to get podcast total duration (placeholder)
function getPodcastTotalDuration(podcast: Podcast): string {
  // TODO: Implement actual duration calculation
  // This might involve summing durations from podcast.podcast_segments -> segment.segment_audios
  // Assuming each segment_audio has a 'duration_ms' field
  let totalMs = 0;
  if (podcast.podcast_segments) {
    for (const segment of podcast.podcast_segments) {
      if (segment.segment_audios) {
        const finalAudio = segment.segment_audios.find(sa => sa.version_tag === 'final');
        if (finalAudio) {
          // Check direct property first
          if (typeof finalAudio.duration_ms === 'number') {
            totalMs += finalAudio.duration_ms;
          }
          // Then check inside params if it exists and has duration_ms
          else if (finalAudio.params && typeof finalAudio.params.duration_ms === 'number') {
            totalMs += finalAudio.params.duration_ms;
          }
        }
      }
    }
  }

  if (totalMs === 0) {
    return 'N/A';
  }

  const seconds = Math.floor((totalMs / 1000) % 60);
  const minutes = Math.floor((totalMs / (1000 * 60)) % 60);
  const hours = Math.floor((totalMs / (1000 * 60 * 60)) % 24);

  const s = seconds < 10 ? `0${seconds}` : seconds;
  const m = minutes < 10 ? `0${minutes}` : minutes;
  
  if (hours > 0) {
    const h = hours < 10 ? `0${hours}` : hours;
    return `${h}:${m}:${s}`;
  }
  return `${m}:${s}`;
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
