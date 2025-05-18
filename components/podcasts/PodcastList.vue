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
<CardHeader class="pb-3 relative group">
  <div class="flex justify-between items-start gap-2">
    <div class="flex-1 min-w-0">
      <CardTitle class="text-xl font-bold leading-tight flex items-center min-w-0">
        <Icon
          v-if="currentPreviewingId === podcast.podcast_id && isAudioPlaying"
          name="ph:speaker-high-duotone" class="mr-2 h-5 w-5 text-primary flex-shrink-0 animate-pulse"
        />
        <Icon
          v-else
          name="ph:microphone-stage-duotone" class="mr-2 h-5 w-5 text-primary flex-shrink-0"
        />
        <span
          class="line-clamp-2 max-w-[220px] break-words text-left"
          :title="podcast.title"
        >{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</span>
        <span v-if="podcast.topic" class="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">{{ podcast.topic }}</span>
      </CardTitle>
      <CardDescription class="text-xs text-muted-foreground mt-1 truncate">
        <span v-if="podcast.host_name" class="font-medium text-foreground mr-2">Host: {{ podcast.host_name }}</span>
        <span v-if="podcast.guest_name" class="font-medium text-foreground">Guest: {{ podcast.guest_name }}</span>
      </CardDescription>
    </div>
    <div class="flex flex-row gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
        <!-- 主信息区 -->
        <div class="flex flex-col gap-2 mb-2">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Status:</span>
            <span :class="getSynthesisStatusClass(podcast)">{{ getSynthesisStatusText(podcast) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Duration:</span>
            <span>{{ getPodcastTotalDuration(podcast) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Host:</span>
            <span>{{ podcast.host_name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Guest:</span>
            <span>{{ podcast.guest_name || 'N/A' }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Created:</span>
            <span>{{ formatRelativeTime(podcast.created_at) }}</span>
          </div>
        </div>
        <!-- 分段信息（仅展示前2条，可展开） -->
        <div v-if="podcast.podcast_segments && podcast.podcast_segments.length > 0" class="border-t pt-2 mt-2">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold text-muted-foreground">Segments</span>
            <button
              v-if="podcast.podcast_segments.length > 2"
              class="text-xs text-primary hover:underline"
              @click="toggleSegments(String(podcast.podcast_id))"
              type="button"
            >
              {{ showAllSegments[String(podcast.podcast_id)] ? 'Collapse' : 'Show All' }}
            </button>
          </div>
          <div class="space-y-1 max-h-32 overflow-y-auto pr-1">
            <div
              v-for="(segment, index) in showAllSegments[String(podcast.podcast_id)] ? podcast.podcast_segments : podcast.podcast_segments.slice(0, 2)"
              :key="index"
              class="px-2 py-1 rounded bg-muted/50 flex items-start gap-2"
            >
              <span class="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary/20 text-primary font-bold text-xs mt-0.5">
                {{ (segment.speaker && segment.speaker[0]) ? segment.speaker[0].toUpperCase() : '?' }}
              </span>
              <div class="flex-1 min-w-0">
                <span class="text-xs font-medium text-foreground" :title="segment.speaker">
                  {{ segment.speaker || 'Unknown Speaker' }}
                </span>
                <span class="text-xs text-muted-foreground ml-2 truncate" :title="segment.text">
                  {{ segment.text || 'No text available' }}
                </span>
              </div>
            </div>
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
          variant="default"
          size="sm"
          class="w-full font-semibold"
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
import { ref } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Database } from '~/types/supabase';
import { useDateFormatter } from '~/composables/useDateFormatter';
// Icon component is globally available or auto-imported

const { formatRelativeTime } = useDateFormatter();

// 展开/收起分段的状态
const showAllSegments = ref<Record<string, boolean>>({});

function toggleSegments(podcastId: string) {
  showAllSegments.value[podcastId] = !showAllSegments.value[podcastId];
}

// Define types with nested relationships based on Supabase types
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'] & {
  duration_ms?: number | null; // Allow null to match database type
  params?: any; // Use 'any' or import 'Json' type for broader compatibility
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
