<template>
  <div>
    <Table v-if="segments && segments.length > 0">
      <TableHeader>
        <TableRow>
          <TableHead class="w-[50px]">#</TableHead>
          <TableHead>Speaker</TableHead>
          <TableHead>Text</TableHead>
          <TableHead class="w-[150px]">Audio Status</TableHead>
          <TableHead class="text-right w-[200px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="segment in segments" :key="segment.segment_text_id">
          <TableCell>{{ segment.idx }}</TableCell>
          <TableCell>{{ segment.speaker || 'N/A' }}</TableCell>
          <TableCell class="truncate max-w-xs">{{ segment.text || 'No text' }}</TableCell>
          <TableCell>
            <span :class="getSegmentAudioStatusClass(segment)">
              {{ getSegmentAudioStatus(segment) }}
            </span>
          </TableCell>
          <TableCell class="text-right space-x-1">
            <Button
              variant="outline"
              size="sm"
              @click="emit('play-audio', segment.segment_text_id, getAudioUrl(segment))"
              :disabled="!getAudioUrl(segment)"
            >
              <Icon name="ph:play-circle-duotone" class="mr-1 h-4 w-4" />
              Listen
            </Button>
            <Button
              variant="outline"
              size="sm"
              @click="emit('resynthesize-segment', segment.segment_text_id)"
            >
              <Icon name="ph:arrows-clockwise-duotone" class="mr-1 h-4 w-4" />
              Re-sync
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
    <div v-else class="text-center py-4 text-muted-foreground">
      <p>No segments available for this podcast.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Database } from '~/types/supabase';
// Icon component is globally available or auto-imported

// Define types with nested relationships based on Supabase types
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'];
type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};

const props = defineProps<{
  segments: Segment[];
}>();

const emit = defineEmits(['play-audio', 'resynthesize-segment']); // Removed 'download-audio'

// Function to get the status of segment audio based on available data
function getSegmentAudioStatus(segment: Segment): string {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return 'No Audio';
  }
  const finalAudio = segment.segment_audios.find(audio => audio.version_tag === 'final' && audio.audio_url);
  if (finalAudio) {
    return 'Synced (Final)';
  }
  // Check if any audio URL exists, even if not final (e.g., preview, v1)
  const anyPlayableAudio = segment.segment_audios.some(audio => audio.audio_url);
  if (anyPlayableAudio) {
    return 'Available (Preview)'; // Indicates it's listenable but not the final version
  }
  return 'Pending Synthesis'; // No audio URL found at all
}

function getSegmentAudioStatusClass(segment: Segment): string {
  const status = getSegmentAudioStatus(segment);
  if (status === 'Synced (Final)') return 'text-green-600 dark:text-green-400 font-medium';
  if (status === 'Available (Preview)') return 'text-blue-600 dark:text-blue-400 font-medium';
  if (status === 'Pending Synthesis') return 'text-orange-600 dark:text-orange-400';
  return 'text-muted-foreground'; // For "No Audio"
}

// Function to get a listenable audio URL. Prioritizes 'final', then any other available audio.
function getAudioUrl(segment: Segment): string | null {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return null;
  }
  // Prioritize final version
  const finalAudio = segment.segment_audios.find(audio => audio.version_tag === 'final' && audio.audio_url);
  if (finalAudio) {
    return finalAudio.audio_url;
  }
  // Fallback to any other audio URL if final is not available
  const anyPlayableAudio = segment.segment_audios.find(audio => audio.audio_url);
  return anyPlayableAudio?.audio_url || null;
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
