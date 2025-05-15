<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
    <Card
      v-for="podcast in podcasts"
      :key="podcast.podcast_id"
      class="border rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-200 ease-in-out bg-card text-card-foreground flex flex-col cursor-pointer"
      @click="emit('select-podcast', podcast.podcast_id)"
    >
      <CardHeader class="pb-3">
        <div class="flex justify-between items-start gap-2">
          <div class="flex-1 min-w-0">
            <CardTitle class="text-lg font-semibold leading-tight truncate flex items-center">
              <Icon name="ph:microphone-stage-duotone" class="mr-2 h-5 w-5 text-primary flex-shrink-0" />
              <span class="truncate">{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</span>
            </CardTitle>
            <CardDescription class="text-xs text-muted-foreground mt-1">
              {{ podcast.topic || 'No topic specified' }}
            </CardDescription>
          </div>
          <div class="flex flex-row gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" @click.stop="emit('edit-podcast', podcast.podcast_id)" class="h-7 w-7">
              <Icon name="ph:pencil-simple" class="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" @click.stop="emit('delete-podcast', podcast.podcast_id)" class="text-destructive hover:text-destructive h-7 w-7">
              <Icon name="ph:trash" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent class="py-3 text-sm flex-grow">
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Status:</span>
            <span :class="getSynthesisStatusClass(podcast)">{{ getSynthesisStatus(podcast) }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Segments:</span>
            <span>{{ podcast.podcast_segments?.length || 0 }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-muted-foreground">Created:</span>
            <span>{{ podcast.created_at ? new Date(podcast.created_at).toLocaleDateString() : 'N/A' }}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter class="pt-3 pb-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" class="w-full" @click.stop="emit('preview-podcast', podcast.podcast_id)">
          <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
          Preview
        </Button>
        <Button variant="outline" size="sm" class="w-full" @click.stop="emit('download-podcast', podcast.podcast_id)">
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
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'];
type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};
type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
};

const props = defineProps<{
  podcasts: Podcast[];
}>();

const emit = defineEmits(['select-podcast', 'edit-podcast', 'delete-podcast', 'download-podcast', 'preview-podcast']);

// Function to determine synthesis status
function getSynthesisStatus(podcast: Podcast): string {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'No Segments';
  }

  const segmentsWithAudio = podcast.podcast_segments.filter(segment =>
    segment.segment_audios && segment.segment_audios.some(audio => audio.audio_url && audio.version_tag === 'final')
  ).length;

  if (segmentsWithAudio === podcast.podcast_segments.length) {
    return 'All Synced';
  } else if (segmentsWithAudio > 0) {
    return 'Partially Synced';
  } else {
    return 'Not Synced';
  }
}

function getSynthesisStatusClass(podcast: Podcast): string {
  const status = getSynthesisStatus(podcast);
  if (status === 'All Synced') return 'text-green-600 dark:text-green-400 font-medium';
  if (status === 'Partially Synced') return 'text-yellow-600 dark:text-yellow-400 font-medium';
  if (status === 'Not Synced') return 'text-red-600 dark:text-red-400 font-medium';
  return 'text-muted-foreground'; // For "No Segments"
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
