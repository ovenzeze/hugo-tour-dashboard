<template>
  <!-- 保持模板部分不变 -->
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDateFormatter } from '~/composables/useDateFormatter';
import type { Database } from '~/types/supabase';
import { toast } from 'vue-sonner';
import { useClientSafeFunctions } from '~/composables/useClientSafeFunctions';
import { Icon } from '@iconify/vue';

const { formatRelativeTime } = useDateFormatter();
const { getWindowOrigin } = useClientSafeFunctions();

// 类型定义
type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'] & {
  duration_ms?: number | null;
  params?: any;
};

type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
  voice_id?: string;
};

type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
  host_name?: string;
  guest_name?: string;
  description?: string;
};

// ref 变量
const currentPreviewingId = ref<string | null>(null);
const hoveredPodcastId = ref<string | null>(null);
const imageLoaded = ref<Record<string, boolean>>({});
const loadingCovers = ref<Record<string, boolean>>({});
const showAllSegments = ref<Record<string, boolean>>({});
const isShareModalOpen = ref(false);

// props 和 emits
const props = defineProps({
  podcasts: {
    type: Array as PropType<Podcast[]>,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  hideEmptyPodcastsToggle: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['select-podcast', 'edit-podcast', 'delete-podcast', 'preview-podcast', 'stop-preview', 'generate-cover']);

// computed 属性
const filteredPodcasts = computed(() => {
  if (!props.hideEmptyPodcastsToggle) {
    return props.podcasts;
  }
  return props.podcasts.filter(podcast => {
    if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
      return false;
    }
    return podcast.podcast_segments.some(segment =>
      segment.segment_audios && segment.segment_audios.length > 0
    );
  });
});

const shareIframeSrc = computed(() => {
  if (currentPreviewingId.value) {
    return `/share/podcast/${currentPreviewingId.value}`;
  }
  return '';
});

// 函数定义
function handleImageLoad(podcastId: string) {
  imageLoaded.value[podcastId] = true;
}

function toggleSegments(podcastId: string) {
  showAllSegments.value[podcastId] = !showAllSegments.value[podcastId];
}

function visibleSegments(podcast: Podcast) {
  if (!podcast.podcast_segments) return [];
  return showAllSegments.value[String(podcast.podcast_id)] 
    ? podcast.podcast_segments 
    : podcast.podcast_segments.slice(0, 2);
}

function getSpeakerInitial(speaker: string | null): string {
  return speaker ? speaker[0].toUpperCase() : '?';
}

function getSpeakerColorClass(speaker: string | null, hasCoverImage: boolean = false): string {
  if (!speaker) return hasCoverImage ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700';
  
  const initial = speaker[0].toLowerCase();
  const colorMap = hasCoverImage ? {
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
  } : {
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
  
  return colorMap[initial as keyof typeof colorMap] || (hasCoverImage ? 'bg-white/30 text-white' : 'bg-primary/20 text-primary');
}

function formatDuration(ms: number | null): string {
  if (!ms) return '00:00';
  
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function getSegmentDuration(segment: Segment): number | null {
  if (!segment?.segment_audios?.length) return null;
  
  const finalAudio = segment.segment_audios.find(sa => sa.version_tag === 'final');
  if (!finalAudio) return null;

  return finalAudio.duration_ms ?? finalAudio.params?.duration_ms ?? null;
}

function getPodcastTotalDuration(podcast: Podcast): string {
  const totalMs = podcast.podcast_segments?.reduce((total, segment) => {
    const duration = getSegmentDuration(segment);
    return total + (duration ?? 0);
  }, 0) ?? 0;

  if (totalMs === 0) return 'N/A';

  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function hasPlayableSegments(podcast: Podcast): boolean {
  return podcast.podcast_segments?.some(segment => 
    segment.voice_id || segment.segment_audios?.some(audio => audio.audio_url?.trim())
  ) ?? false;
}

function handleGenerateCover(podcastId: string) {
  loadingCovers.value[podcastId] = true;
  emit('generate-cover', podcastId);
}

async function sharePodcast(podcastId: string | number) {
  const shareUrl = `${getWindowOrigin()}/share/podcast/${podcastId}`;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard!');
    } else {
      toast.info('Please copy the link manually.', {
        description: shareUrl,
        duration: 10000,
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
    }
  } catch (err) {
    console.error('Failed to copy share link: ', err);
    toast.error('Failed to copy share link. Please copy manually.', {
      description: shareUrl,
      duration: 10000,
    });
  }
}

function openSharePreviewModal(podcastId: string) {
  currentPreviewingId.value = podcastId;
  isShareModalOpen.value = true;
}

// 监听 podcasts 变化，更新 loadingCovers
watch(() => props.podcasts, (newPodcasts) => {
  newPodcasts.forEach(podcast => {
    if (podcast.cover_image_url && loadingCovers.value[podcast.podcast_id]) {
      loadingCovers.value[podcast.podcast_id] = false;
    }
  });
}, { deep: true });

</script>
