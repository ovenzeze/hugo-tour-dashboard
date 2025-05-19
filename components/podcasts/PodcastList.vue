<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-20 mt-4 px-6">
    <Card
      v-for="podcast in filteredPodcasts"
      :key="podcast.podcast_id"
      @mouseenter="hoveredPodcastId = podcast.podcast_id"
      @mouseleave="hoveredPodcastId = null"
      :style="podcast.cover_image_url ? { backgroundImage: `url(${podcast.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}"
      :class="[
        'border rounded-xl overflow-hidden shadow-md flex flex-col relative min-w-[320px]',
        currentPreviewingId === podcast.podcast_id ? 'ring-2 ring-primary shadow-xl' : 'cursor-pointer',
        podcast.cover_image_url ? 'text-white' : 'bg-card text-card-foreground',
        hoveredPodcastId === podcast.podcast_id ? 'shadow-lg' : ''
      ]"
      @click="currentPreviewingId === podcast.podcast_id ? null : emit('select-podcast', podcast.podcast_id)"
    >
      <!-- Enhanced overlay for better text readability when there's a background image -->
      <div 
        v-if="podcast.cover_image_url" 
        class="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/80"
        :style="{
          opacity: hoveredPodcastId === podcast.podcast_id ? '0.85' : '0.7',
          transition: 'opacity 300ms ease'
        }"
      ></div>
      
      <!-- Core content always visible -->
      <CardHeader class="pb-3 relative group z-10">
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
                :class="podcast.cover_image_url ? 'text-white hover:bg-white/20' : ''"
              >
                <Icon name="ph:pencil-simple" class="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                @click.stop="emit('delete-podcast', podcast.podcast_id)"
                class="text-destructive hover:text-destructive h-7 w-7"
                :class="podcast.cover_image_url ? 'text-white hover:bg-white/20' : ''"
                title="Delete Podcast"
              >
                <Icon name="ph:trash" class="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <!-- Topic tag always visible -->
          <div class="flex items-center mt-2 w-full">
            <span
              v-if="podcast.topic"
              class="px-3 py-1 rounded-full text-xs font-semibold line-clamp-1"
              :class="podcast.cover_image_url ? 'bg-white/30 text-white' : 'bg-primary/10 text-primary'"
              :title="podcast.topic"
            >
              {{ podcast.topic }}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <!-- Extended content on hover - simple opacity change -->
      <CardContent class="py-3 text-sm relative z-10">
        <div :class="hoveredPodcastId === podcast.podcast_id ? 'opacity-100' : 'opacity-0'"
             class="transition-opacity duration-300 ease-in-out">
          <!-- Podcast description -->
          <CardDescription v-if="podcast.description" 
            :class="podcast.cover_image_url ? 'text-white/90' : 'text-muted-foreground'"
            class="text-sm line-clamp-2 text-left mb-3">
            {{ podcast.description }}
          </CardDescription>
          
          <!-- 状态信息区域 -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xs flex items-center">
                <Icon name="ph:clock" class="h-4 w-4 mr-1" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                {{ getPodcastTotalDuration(podcast) }}
              </span>
            </div>
            
            <div class="grid grid-cols-2 gap-x-4 gap-y-2">
              <div v-if="podcast.host_name" class="flex items-center">
                <Icon name="ph:microphone" class="h-4 w-4 mr-2" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                <span class="text-sm truncate" :title="podcast.host_name">{{ podcast.host_name }}</span>
              </div>
              <div v-if="podcast.guest_name" class="flex items-center">
                <Icon name="ph:user" class="h-4 w-4 mr-2" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                <span class="text-sm truncate" :title="podcast.guest_name">{{ podcast.guest_name }}</span>
              </div>
              <div class="flex items-center col-span-2">
                <Icon name="ph:calendar" class="h-4 w-4 mr-2" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
                <span class="text-xs">{{ formatRelativeTime(podcast.created_at) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 分段信息展示优化 -->
          <div v-if="podcast.podcast_segments && podcast.podcast_segments.length > 0" class="border-t pt-3" :class="podcast.cover_image_url ? 'border-white/30' : ''">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-medium" :class="{'text-white': podcast.cover_image_url}">Segments</span>
              <Button 
                v-if="podcast.podcast_segments.length > 2" 
                variant="ghost" 
                size="sm" 
                class="h-6 text-xs"
                :class="podcast.cover_image_url ? 'text-white hover:bg-white/20' : ''"
                @click.stop="toggleSegments(String(podcast.podcast_id))"
              >
                {{ showAllSegments[String(podcast.podcast_id)] ? 'Collapse' : 'Show All' }}
              </Button>
            </div>
            
            <div class="space-y-2 max-h-40 overflow-y-auto pr-1">
              <div
                v-for="(segment, index) in visibleSegments(podcast)"
                :key="index"
                class="flex gap-2 group p-2 rounded-md transition-colors"
                :class="podcast.cover_image_url ? 'hover:bg-white/10' : 'hover:bg-muted/80'"
              >
                <div 
                  class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  :class="getSpeakerColorClass(segment.speaker, !!podcast.cover_image_url)"
                >
                  <span class="text-xs font-bold">{{ getSpeakerInitial(segment.speaker) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium">{{ segment.speaker || 'Unknown' }}</span>
                    <span class="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'">
                      {{ formatDuration(getSegmentDuration(segment)) }}
                    </span>
                  </div>
                  <p class="text-xs truncate "
                     :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'">
                    {{ segment.text || 'No text available' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>

      <!-- Compact actions -->
      <div class="z-10 mt-auto">
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
            <template v-else>
              <TooltipProvider v-if="!hasPlayableSegments(podcast)">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button
                      variant="default"
                      class="w-full flex items-center justify-center"
                      :disabled="!hasPlayableSegments(podcast)"
                      :class="{ 'opacity-50 cursor-not-allowed': !hasPlayableSegments(podcast) }"
                    >
                      <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
                      Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>此播客当前没有可播放的音频内容</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                v-else
                variant="default"
                class="w-full flex items-center justify-center"
                @click.stop="emit('preview-podcast', podcast.podcast_id)"
                :disabled="!hasPlayableSegments(podcast)"
              >
                <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
                Preview
              </Button>
            </template>
          </div>
          
          <div class="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              class="h-9 w-9" 
              title="Generate Cover Image"
              @click.stop="handleGenerateCover(String(podcast.podcast_id))"
              :disabled="currentPreviewingId === podcast.podcast_id || loadingCovers[podcast.podcast_id]"
            >
              <Icon v-if="!loadingCovers[podcast.podcast_id]" name="ph:image" class="h-4 w-4" />
              <Icon v-else name="ph:spinner-gap" class="h-4 w-4 animate-spin" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              class="h-9 w-9" 
              title="Edit Podcast"
              @click.stop="emit('edit-podcast', podcast.podcast_id)"
            >
              <Icon name="ph:pencil-simple" class="h-4 w-4" />
            </Button>
            <TooltipProvider v-if="!hasPlayableSegments(podcast)">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="outline"
                    size="icon"
                    class="h-9 w-9"
                    :disabled="!hasPlayableSegments(podcast)"
                    :class="{ 'opacity-50 cursor-not-allowed': !hasPlayableSegments(podcast) }"
                  >
                    <Icon name="ph:eye" class="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>此播客当前没有可播放的音频内容</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              v-else
              variant="outline"
              size="icon"
              class="h-9 w-9"
              title="Preview Share"
              @click.stop="openSharePreviewModal(String(podcast.podcast_id))"
              :disabled="!hasPlayableSegments(podcast)"
            >
              <Icon name="ph:eye" class="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="h-9 w-9 hover:bg-primary/10"
              title="Share Podcast"
              @click.stop="sharePodcast(String(podcast.podcast_id))"
            >
              <Icon name="ph:share-network" class="h-5 w-5 text-primary" />
            </Button>
          </div>
        </CardFooter>
      </div>
    </Card>
    <div v-if="!filteredPodcasts || filteredPodcasts.length === 0" class="col-span-full text-center py-8 text-muted-foreground">
      <Icon name="ph:microphone-slash-duotone" class="mx-auto h-12 w-12" />
      <h3 class="mt-2 text-sm font-medium">No Podcasts Yet</h3>
      <p class="mt-1 text-sm">Get started by creating a new podcast.</p>
    </div>
  </div>

  <!-- Share Preview Modal -->
  <Dialog :open="isShareModalOpen" @update:open="isShareModalOpen = $event">
    <DialogContent class="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[700px] h-[80vh] p-0">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle>Share Podcast Preview</DialogTitle>
        <DialogDescription>
          This is a preview of how your podcast will look when shared.
        </DialogDescription>
      </DialogHeader>
      <div class="p-6 pt-2 h-[calc(100%-100px)]">
        <iframe
          v-if="shareIframeSrc"
          :src="shareIframeSrc"
          class="w-full h-full border-0 rounded-md"
          title="Podcast Share Preview"
          allow="autoplay; encrypted-media"
          allowfullscreen
        ></iframe>
        <div v-else class="flex items-center justify-center h-full text-muted-foreground">
          Loading preview...
        </div>
      </div>
      <DialogFooter class="p-6 pt-0">
        <Button variant="outline" @click="isShareModalOpen = false">Close</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ref, computed, watch } from 'vue';
import { useDateFormatter } from '~/composables/useDateFormatter';
import type { Database } from '~/types/supabase';
import { toast } from 'vue-sonner';
// Icon component is globally available or auto-imported

const { formatRelativeTime } = useDateFormatter();

// Track hovered podcast
const hoveredPodcastId = ref<string | null>(null);

// Track podcasts with loading covers
const loadingCovers = ref<Record<string, boolean>>({});

// Share Modal State
const isShareModalOpen = ref(false);
const currentPodcastIdForModal = ref<string | null>(null);

const shareIframeSrc = computed(() => {
  if (currentPodcastIdForModal.value) {
    return `/share/podcast/${currentPodcastIdForModal.value}`;
  }
  return '';
});

function openSharePreviewModal(podcastId: string) {
  currentPodcastIdForModal.value = podcastId;
  isShareModalOpen.value = true;
}


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
function getSpeakerColorClass(speaker: string | null, hasCoverImage: boolean = false): string {
  if (!speaker) return hasCoverImage ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700';
  
  // 根据说话者名称的首字母分配不同的颜色
  const initial = speaker[0].toLowerCase();
  
  if (hasCoverImage) {
    // 当有封面图时，使用半透明白色背景的变体
    const coverImageColorMap: Record<string, string> = {
      'a': 'bg-blue-500/60 text-white',
      'b': 'bg-green-500/60 text-white',
      'c': 'bg-purple-500/60 text-white',
      'd': 'bg-yellow-500/60 text-white',
      'e': 'bg-pink-500/60 text-white',
      'f': 'bg-indigo-500/60 text-white',
      'g': 'bg-red-500/60 text-white',
      'h': 'bg-orange-500/60 text-white',
      'i': 'bg-teal-500/60 text-white',
      'j': 'bg-cyan-500/60 text-white',
    };
    return coverImageColorMap[initial] || 'bg-white/30 text-white';
  }
  
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
  if (!segment) return null;
  
  // 检查segment_audios是否存在并且有值
  if (segment.segment_audios && segment.segment_audios.length > 0) {
    const finalAudio = segment.segment_audios.find(sa => sa.version_tag === 'final');
    if (finalAudio) {
      // 直接从属性获取
      if (typeof finalAudio.duration_ms === 'number') {
        return finalAudio.duration_ms;
      }
      // 从params对象获取
      if (finalAudio.params && typeof finalAudio.params.duration_ms === 'number') {
        return finalAudio.params.duration_ms;
      }
    }
  }
  
  return null;
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
  hideEmptyPodcastsToggle?: boolean; // Added for filtering empty podcasts
}>();

const emit = defineEmits(['select-podcast', 'edit-podcast', 'delete-podcast', 'download-podcast', 'preview-podcast', 'stop-preview', 'generate-cover']);

// Listen for event from parent when cover generation starts/completes
// This allows us to properly reflect loading state in the UI
watch(() => props.podcasts, (newPodcasts) => {
  // Clear any loading states for podcasts that have covers
  for (const podcast of newPodcasts) {
    if (podcast.cover_image_url && loadingCovers.value[podcast.podcast_id]) {
      loadingCovers.value[podcast.podcast_id] = false;
    }
  }
}, { deep: true });

// Modify the original emit method for generate-cover to track loading state
function handleGenerateCover(podcastId: string) {
  loadingCovers.value[podcastId] = true;
  emit('generate-cover', podcastId);
}

const filteredPodcasts = computed(() => {
  if (!props.hideEmptyPodcastsToggle) {
    return props.podcasts;
  }
  return props.podcasts.filter(podcast => {
    if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
      return false; // Filter out if podcast_segments is empty
    }
    // Check if any segment has at least one segment_audio
    const hasAnySegmentWithAudio = podcast.podcast_segments.some(segment =>
      segment.segment_audios && segment.segment_audios.length > 0
    );
    return hasAnySegmentWithAudio; // Keep if at least one segment has audio
  });
});

// Function to get podcast total duration (placeholder)
function getPodcastTotalDuration(podcast: Podcast): string {
  // TODO: Implement actual duration calculation
  // This might involve summing durations from podcast.podcast_segments -> segment.segment_audios
  // Assuming each segment_audio has a 'duration_ms' field
  let totalMs = 0;
  if (podcast.podcast_segments) {
    for (const segment of podcast.podcast_segments) {
      const segmentDuration = getSegmentDuration(segment);
      if (segmentDuration) {
        totalMs += segmentDuration;
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

async function sharePodcast(podcastId: string | number) {
  const shareUrl = `${window.location.origin}/share/podcast/${podcastId}`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } else {
      // For non-secure contexts or when clipboard API is not available
      toast.info('Please copy the link manually.', {
        description: shareUrl,
        duration: 10000, // Keep it longer for manual copy
        action: {
          label: 'Copy',
          onClick: () => {
            try {
              const textArea = document.createElement('textarea');
              textArea.value = shareUrl;
              document.body.appendChild(textArea);
              textArea.select();
              document.execCommand('copy');
              document.body.removeChild(textArea);
              toast.success('Link copied!');
            } catch (copyErr) {
              toast.error('Failed to auto-copy. Please copy manually.');
            }
          },
        },
      });
      // Fallback for very old browsers or specific scenarios, though less likely with vue-sonner
      // window.prompt('Copy this link to share:', shareUrl);
    }
  } catch (err) {
    console.error('Failed to copy share link: ', err);
    toast.error('Failed to copy share link. Please copy manually.', {
      description: shareUrl,
      duration: 10000,
    });
    // window.prompt('Could not copy to clipboard. Please copy this link manually:', shareUrl);
  }
}

// Function to check if podcast has any playable segments
function hasPlayableSegments(podcast: Podcast): boolean {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return false;
  }
  for (const segment of podcast.podcast_segments) {
    if (segment.segment_audios && segment.segment_audios.length > 0) {
      for (const audio of segment.segment_audios) {
        if (audio.audio_url && audio.audio_url.trim() !== '') {
          return true; // Found a playable audio URL
        }
      }
    }
  }
  return false; // No playable audio URL found
}

// Handle hover to ensure only one card expands at a time
function handleCardHover(podcastId: string) {
  // Always clear before setting to ensure clean transitions
  hoveredPodcastId.value = null;
  
  // Use setTimeout to create a tiny delay that helps with transition
  setTimeout(() => {
    hoveredPodcastId.value = podcastId;
  }, 5);
}
</script>

<style scoped>
/* Component-specific styles if needed */
</style>
