<template>
  <div class="border-t pt-3" :class="hasCoverImage ? 'border-white/30' : ''">
    <div class="flex items-center justify-between mb-2">
      <span class="text-sm font-medium" :class="{'text-white': hasCoverImage}">Segments</span>
      <Button
        v-if="podcast.podcast_segments && podcast.podcast_segments.length > 2"
        variant="ghost"
        size="sm"
        class="h-6 text-xs"
        :class="hasCoverImage ? 'text-white hover:bg-white/20' : ''"
        @click.stop="$emit('toggle-segments', Number(podcast.podcast_id))"
      >
        {{ showAllSegments ? 'Collapse' : 'Show All' }}
      </Button>
    </div>

    <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
      <div
        v-for="(segment, index) in visibleSegments"
        :key="segment.segment_id"
        class="flex gap-2 group p-2 rounded-md transition-colors"
        :class="hasCoverImage ? 'hover:bg-white/10' : 'hover:bg-muted/80'"
      >
        <div
          class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
          :class="getSpeakerColorClass(segment.speaker, hasCoverImage)"
        >
          <span class="text-xs font-bold">{{ getSpeakerInitial(segment.speaker) }}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-medium">{{ segment.speaker || 'Unknown' }}</span>
              <span v-if="segment.voice_id" class="text-xs text-muted-foreground">
                VoiceID: {{ segment.voice_id }}
              </span>
            </div>
            <span class="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  :class="hasCoverImage ? 'text-white/70' : 'text-muted-foreground'">
              {{ formatDuration(getSegmentDuration(segment)) }}
            </span>
          </div>
          <p class="text-xs truncate "
             :class="hasCoverImage ? 'text-white/70' : 'text-muted-foreground'">
            {{ segment.text || 'No text available' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue';
import type { Podcast, Segment } from '~/types/podcast';

const props = defineProps({
  podcast: {
    type: Object as PropType<Podcast>,
    required: true
  },
  showAllSegments: {
    type: Boolean,
    default: false
  },
  hasCoverImage: {
    type: Boolean,
    default: false
  }
});

defineEmits(['toggle-segments']);

// Computed property: visible segments
const visibleSegments = computed(() => {
  if (!props.podcast.podcast_segments) return [];
  
  if (props.showAllSegments) {
    return props.podcast.podcast_segments;
  } else {
    return props.podcast.podcast_segments.slice(0, 2);
  }
});

// Helper functions
function getSpeakerInitial(speakerName: string | null): string {
  if (!speakerName) return '?';
  return speakerName.charAt(0).toUpperCase();
}

function getSpeakerColorClass(speakerName: string | null, hasCoverImage: boolean): string {
  if (!speakerName) return hasCoverImage ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground';
  
  // Generate consistent color based on name
  const colorIndex = speakerName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 5;
  
  const colorClasses = [
    hasCoverImage ? 'bg-blue-500/70 text-white' : 'bg-blue-100 text-blue-800',
    hasCoverImage ? 'bg-green-500/70 text-white' : 'bg-green-100 text-green-800',
    hasCoverImage ? 'bg-purple-500/70 text-white' : 'bg-purple-100 text-purple-800',
    hasCoverImage ? 'bg-orange-500/70 text-white' : 'bg-orange-100 text-orange-800',
    hasCoverImage ? 'bg-pink-500/70 text-white' : 'bg-pink-100 text-pink-800',
  ];
  
  return colorClasses[colorIndex];
}

function getSegmentDuration(segment: Segment): number {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return 0;
  }
  
  return segment.segment_audios.reduce((total: number, audio: any) => total + (audio.duration_ms || 0), 0);
}

function formatDuration(durationMs: number): string {
  if (!durationMs) return '0:00';
  
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
</script>
