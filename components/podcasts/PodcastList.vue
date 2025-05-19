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
  <div class="flex flex-col items-start">
    <div class="flex justify-between items-start w-full mb-2">
      <CardTitle class="text-lg font-bold leading-tight text-left">
        <span
          class="line-clamp-2 break-words"
          :title="podcast.title"
        >{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</span>
      </CardTitle>
      
      <div class="flex flex-row gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
    
    <CardDescription v-if="podcast.description" class="text-sm text-muted-foreground line-clamp-2 text-left hover:line-clamp-none transition-all cursor-pointer">
      {{ podcast.description }}
    </CardDescription>
    
    <div class="flex items-center mt-2 w-full">
      <span
        v-if="podcast.topic"
        class="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold line-clamp-1"
        :title="podcast.topic"
      >
        {{ podcast.topic }}
      </span>
    </div>
  </div>
</CardHeader>
      <CardContent class="py-3 text-sm flex-grow">
        <!-- 状态信息区域 -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-3">
            <Badge :variant="getSynthesisStatusVariant(podcast)" class="mr-2">
              {{ getSynthesisStatusText(podcast) }}
            </Badge>
            <span class="text-xs flex items-center">
              <Icon name="ph:clock" class="h-4 w-4 mr-1 text-muted-foreground" />
              {{ getPodcastTotalDuration(podcast) }}
            </span>
          </div>
          
          <div class="grid grid-cols-2 gap-x-4 gap-y-2">
            <div v-if="podcast.host_name" class="flex items-center">
              <Icon name="ph:microphone" class="h-4 w-4 mr-2 text-muted-foreground" />
              <span class="text-sm truncate" :title="podcast.host_name">{{ podcast.host_name }}</span>
            </div>
            <div v-if="podcast.guest_name" class="flex items-center">
              <Icon name="ph:user" class="h-4 w-4 mr-2 text-muted-foreground" />
              <span class="text-sm truncate" :title="podcast.guest_name">{{ podcast.guest_name }}</span>
            </div>
            <div class="flex items-center col-span-2">
              <Icon name="ph:calendar" class="h-4 w-4 mr-2 text-muted-foreground" />
              <span class="text-xs">{{ formatRelativeTime(podcast.created_at) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 分段信息展示优化 -->
        <div v-if="podcast.podcast_segments && podcast.podcast_segments.length > 0" class="border-t pt-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Segments</span>
            <Button 
              v-if="podcast.podcast_segments.length > 2" 
              variant="ghost" 
              size="sm" 
              class="h-6 text-xs"
              @click.stop="toggleSegments(String(podcast.podcast_id))"
            >
              {{ showAllSegments[String(podcast.podcast_id)] ? 'Collapse' : 'Show All' }}
            </Button>
          </div>
          
          <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
            <div
              v-for="(segment, index) in visibleSegments(podcast)"
              :key="index"
                  {{ segment.speaker || 'Unknown Speaker' }}
                </span>
                <span class="text-xs text-muted-foreground ml-2 truncate" :title="segment.text ?? undefined">
                  {{ segment.text || 'No text available' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter class="pt-3 pb-4 flex gap-2 justify-between">
        <div class="flex-1">
          <Button
            v-if="currentPreviewingId === podcast.podcast_id"
            variant="destructive"
            class="w-full flex items-center justify-center"
            @click.stop="emit('stop-preview')"
          >
            <Icon name="ph:stop-fill" class="mr-2 h-4 w-4" />
            Stop
          </Button>
          <Button
            v-else
            variant="default"
            class="w-full flex items-center justify-center"
            @click.stop="emit('preview-podcast', podcast.podcast_id)"
          >
            <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
            Preview
          </Button>
        </div>
        
        <div class="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            class="h-9 w-9" 
            title="Download"
            @click.stop="emit('download-podcast', podcast.podcast_id)"
            :disabled="currentPreviewingId === podcast.podcast_id"
          >
            <Icon name="ph:download-simple" class="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            class="h-9 w-9" 
            title="Edit"
            @click.stop="emit('edit-podcast', podcast.podcast_id)"
          >
            <Icon name="ph:pencil-simple" class="h-4 w-4" />
          </Button>
        </div>
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ref } from 'vue';
import { useDateFormatter } from '~/composables/useDateFormatter';
import type { Database } from '~/types/supabase';
// Icon component is globally available or auto-imported

const { formatRelativeTime } = useDateFormatter();

// 展开/收起分段的状态
const showAllSegments = ref<Record<string, boolean>>({});

function toggleSegments(podcastId: string) {
  showAllSegments.value[podcastId] = !showAllSegments.value[podcastId];
}

// 获取可见的分段
function visibleSegments(podcast: Podcast) {
  if (!podcast.podcast_segments) return [];
  return showAllSegments.value[String(podcast.podcast_id)] 
    ? podcast.podcast_segments 
    : podcast.podcast_segments.slice(0, 2);
}

// 获取说话者首字母
function getSpeakerInitial(speaker: string | null): string {
  if (!speaker) return '?';
  return speaker[0].toUpperCase();
}

// 获取说话者颜色类
function getSpeakerColorClass(speaker: string | null): string {
  if (!speaker) return 'bg-gray-200 text-gray-700';
  
  // 根据说话者名称的首字母分配不同的颜色
  const initial = speaker[0].toLowerCase();
  const colorMap: Record<string, string> = {
    'a': 'bg-blue-100 text-blue-700',
    'b': 'bg-green-100 text-green-700',
    'c': 'bg-purple-100 text-purple-700',
    'd': 'bg-yellow-100 text-yellow-700',
    'e': 'bg-pink-100 text-pink-700',
    'f': 'bg-indigo-100 text-indigo-700',
    'g': 'bg-red-100 text-red-700',
    'h': 'bg-orange-100 text-orange-700',
    'i': 'bg-teal-100 text-teal-700',
    'j': 'bg-cyan-100 text-cyan-700',
  };
  
  return colorMap[initial] || 'bg-primary/20 text-primary';
}

// 格式化时长
function formatDuration(ms: number | null): string {
  if (!ms) return '00:00';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  
  const s = seconds < 10 ? `0${seconds}` : seconds;
  const m = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${m}:${s}`;
}

// 获取分段时长
function getSegmentDuration(segment: Segment): number | null {
  if (!segment.segment_audios || segment.segment_audios.length === 0) {
    return null;
  }
  
  const finalAudio = segment.segment_audios.find(sa => sa.version_tag === 'final');
  if (finalAudio) {
    if (typeof finalAudio.duration_ms === 'number') {
      return finalAudio.duration_ms;
    }
    if (finalAudio.params && typeof finalAudio.params.duration_ms === 'number') {
      return finalAudio.params.duration_ms;
    }
  }
  
  return null;
}

// 获取合成状态变体
function getSynthesisStatusVariant(podcast: Podcast): string {
  const status = getSynthesisStatusText(podcast);
  if (status === 'All Synced') return 'success';
  if (status === 'Partially Synced') return 'warning';
  if (status === 'Not Synced') return 'destructive';
  return 'secondary'; // For "No Segments"
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
  description?: string; // Added for description
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
