<template>
  <Card
    @mouseenter="hoveredPodcastId = Number(podcast.podcast_id)"
    @mouseleave="hoveredPodcastId = null"
    :style="{
      '--bg-image': 'none',
      ...(podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? {
        '--bg-image': `url(${encodeURIComponent(podcast.cover_image_url)})`,
        'background-image': 'var(--bg-image)'
      } : {}),
      'background-size': 'cover',
      'background-position': 'center',
      'background-repeat': 'no-repeat',
      'transition': 'all 0.3s ease-in-out',
      'transform': hoveredPodcastId === Number(podcast.podcast_id) ? 'translateY(-4px)' : 'translateY(0)'
    }"
    :class="[
      'border rounded-xl shadow-md flex flex-col min-w-[320px] max-w-[390px]',
      'aspect-[3/4]',
      'group hover:shadow-xl transition-all duration-300 ease-in-out',
      !podcast.cover_image_url ? 'bg-card text-card-foreground' : 'text-white',
      podcast.cover_image_url && 'bg-center',
      currentPreviewingId === podcast.podcast_id ? 'ring-2 ring-primary shadow-xl' : 'cursor-pointer',
      hoveredPodcastId === Number(podcast.podcast_id) && 'shadow-lg',
      hoveredPodcastId === Number(podcast.podcast_id) ? 'scale-[1.02]' : 'scale-100'
    ]"
    @click="currentPreviewingId === podcast.podcast_id ? null : emit('select-podcast', podcast.podcast_id)"
  >
    <!-- Background image with loading state -->
    <div
      v-if="podcast.cover_image_url"
      class="absolute inset-0 bg-center transition-opacity duration-500 ease-in-out rounded-md"
      :style="{
        backgroundImage: podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? `url(${encodeURIComponent(podcast.cover_image_url)})` : 'none',
        opacity: imageLoaded[podcast.podcast_id] ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
        zIndex: 0
      }"
    >
      <img
        :src="podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? podcast.cover_image_url : ''"
        @load="() => handleImageLoad(podcast.podcast_id)"
        class="hidden"
        alt=""
      />
    </div>

    <!-- Enhanced overlay for better text readability when there's a background image -->
    <div
      v-if="podcast.cover_image_url"
      class="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/80 transition-opacity duration-300 ease-in-out"
      :style="{
        opacity: hoveredPodcastId === Number(podcast.podcast_id) ? '0.85' : '0.7',
        zIndex: 1
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
      <div :class="hoveredPodcastId === Number(podcast.podcast_id) ? 'opacity-100' : 'opacity-0'"
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

        <!-- 分段信息展示 -->
        <div v-if="podcast.podcast_segments && podcast.podcast_segments.length > 0" class="border-t pt-3 mt-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Segments ({{ podcast.podcast_segments.length }})</span>
            <Button
              variant="ghost"
              size="sm"
              class="h-6 text-xs"
              @click.stop="toggleSegments(Number(podcast.podcast_id))"
            >
              {{ showAllSegments[String(podcast.podcast_id)] ? 'Collapse' : 'Show All' }}
            </Button>
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
          <template v-else> <!-- Not currently previewing -->
            <TooltipProvider v-if="!hasPlayableSegments(podcast)">
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    variant="default"
                    class="w-full flex items-center justify-center"
                    :disabled="true"
                    :class="{ 'opacity-50 cursor-not-allowed': true }"
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
            <template v-else> <!-- Has playable segments -->
              <Button
                v-if="hasUnsynthesizedSegments(podcast)"
                variant="secondary"
                class="w-full flex items-center justify-center h-auto text-xs leading-tight py-2"
                @click.stop="navigateToPlayground(Number(podcast.podcast_id))"
                title="Some segments are not synthesized yet. Continue in playground."
              >
                <Icon name="ph:arrow-square-out" class="mr-2 h-4 w-4" />
                Continue On Playground
              </Button>
              <!-- All playable segments are synthesized -->
              <Button
                v-else
                variant="default"
                class="w-full flex items-center justify-center"
                @click.stop="emit('preview-podcast', podcast.podcast_id)"
              >
                <Icon name="ph:play-fill" class="mr-2 h-4 w-4" />
                Preview
              </Button>
            </template>
          </template>
        </div>

        <div class="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9"
            title="Generate Cover Image"
            @click.stop="emit('generate-cover', String(podcast.podcast_id))"
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
            @click.stop="openSharePreviewModal(Number(podcast.podcast_id))"
            :disabled="!hasPlayableSegments(podcast)"
          >
            <Icon name="ph:eye" class="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="h-9 w-9 hover:bg-primary/10"
            title="Share Podcast"
            @click.stop="sharePodcast(Number(podcast.podcast_id))"
          >
            <Icon name="ph:share-network" class="h-5 w-5 text-primary" />
          </Button>
        </div>
      </CardFooter>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue';
import type { Podcast, Segment } from '~/types/podcast';
import { useDateFormatter } from '~/composables/useDateFormatter';
import { toast } from 'vue-sonner';
import { useClientSafeFunctions } from '~/composables/useClientSafeFunctions';
import { useRouter } from 'vue-router';
import PodcastSegmentsList from './PodcastSegmentsList.vue';

const { formatRelativeTime } = useDateFormatter();
const { getWindowOrigin } = useClientSafeFunctions();
const router = useRouter();

const props = defineProps({
  podcast: {
    type: Object as PropType<Podcast>,
    required: true
  },
  currentPreviewingId: {
    type: String as PropType<string | null>,
    default: null
  },
  loadingCovers: {
    type: Object as PropType<Record<number, boolean>>,
    default: () => ({})
  },
  imageLoaded: {
    type: Object as PropType<Record<number, boolean>>,
    default: () => ({})
  },
  showAllSegments: {
    type: Object as PropType<Record<string, boolean>>,
    default: () => ({})
  }
});

const emit = defineEmits([
  'select-podcast',
  'edit-podcast',
  'delete-podcast',
  'preview-podcast',
  'stop-preview',
  'generate-cover',
  'toggle-segments',
  'open-share-preview',
  'share-podcast',
  'image-loaded'
]);

const hoveredPodcastId = ref<number | null>(null);

// 辅助函数
function getPodcastTotalDuration(podcast: Podcast): string {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return '0:00';
  }

  let totalDurationMs = 0;
  podcast.podcast_segments.forEach(segment => {
    if (segment.segment_audios && segment.segment_audios.length > 0) {
      segment.segment_audios.forEach(audio => {
        totalDurationMs += audio.duration_ms || 0;
      });
    }
  });

  // 转换为分钟:秒格式
  const totalSeconds = Math.floor(totalDurationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function handleImageLoad(podcastId: number) {
  emit('image-loaded', podcastId);
}

function hasPlayableSegments(podcast: Podcast): boolean {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return false;
  }
  return podcast.podcast_segments.some(segment => 
    segment.segment_audios && segment.segment_audios.length > 0
  );
}

function hasUnsynthesizedSegments(podcast: Podcast): boolean {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return false;
  }
  
  // 检查是否有任何段落没有关联的音频
  return podcast.podcast_segments.some(segment => 
    !segment.segment_audios || segment.segment_audios.length === 0
  );
}

function toggleSegments(podcastId: number) {
  emit('toggle-segments', podcastId);
}

function navigateToPlayground(podcastId: number) {
  router.push(`/playground?podcast=${podcastId}`);
}

function openSharePreviewModal(podcastId: number) {
  emit('open-share-preview', podcastId);
}

function sharePodcast(podcastId: number) {
  emit('share-podcast', podcastId);
}
</script>
