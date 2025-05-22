<template>
  <div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-x-10 gap-y-20 md:gap-y-20 mt-4 md:px-6">
    <!-- Skeleton loading state -->
    <Card v-if="loading" v-for="n in 10" :key="`skeleton-${n}`"
      class="border rounded-xl overflow-hidden shadow-md min-w-[320px] max-w-[390px] aspect-[3/4] animate-pulse bg-muted/50">
      <div class="h-48 bg-muted/30"></div>
      <div class="p-4 space-y-4">
        <div class="h-6 bg-muted/30 rounded w-3/4"></div>
        <div class="h-4 bg-muted/30 rounded w-1/2"></div>
        <div class="space-y-2">
          <div class="h-3 bg-muted/30 rounded w-full"></div>
          <div class="h-3 bg-muted/30 rounded w-5/6"></div>
        </div>
      </div>
    </Card>

    <!-- Podcast cards -->
    <PodcastCard 
      v-else
      v-for="podcast in filteredPodcasts"
      :key="podcast.podcast_id"
      :podcast="podcast"
      :current-previewing-id="currentPreviewingId"
      :loading-covers="loadingCovers"
      :show-all-segments="showAllSegments"
      @select-podcast="emit('select-podcast', $event)"
      @edit-podcast="emit('edit-podcast', $event)"
      @delete-podcast="emit('delete-podcast', $event)"
      @preview-podcast="emit('preview-podcast', $event)"
      @stop-preview="emit('stop-preview')"
      @generate-cover="handleGenerateCover($event)"
      @toggle-segments="toggleSegments($event)"
      @image-loaded="handleImageLoad($event)"
      @open-share-preview="openSharePreviewModal($event)"
      @share-podcast="sharePodcast($event)"
    />
    
    <div v-if="!filteredPodcasts || filteredPodcasts.length === 0" class="col-span-full text-center py-8 text-muted-foreground">
      <Icon name="ph:microphone-slash-duotone" class="mx-auto h-12 w-12" />
      <h3 class="mt-2 text-sm font-medium">No Podcasts Yet</h3>
      <p class="mt-1 text-sm">Get started by creating a new podcast.</p>
    </div>
  </div>

  <!-- Share Preview Modal -->
  <PodcastShareModal
    :is-open="isShareModalOpen"
    :podcast="currentPodcastForModal"
    @update:is-open="isShareModalOpen = $event"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { Podcast } from '~/types/podcast';
import PodcastCard from './PodcastCard.vue';
import PodcastShareModal from './PodcastShareModal.vue';
import { toast } from 'vue-sonner';

// props 和 emits
const props = defineProps({
  podcasts: {
    type: Array as PropType<Podcast[]>,
    required: true,
    default: () => []
  },
  currentPreviewingId: {
    type: String as PropType<string | null>,
    default: null,
  },
  isAudioPlaying: {
    type: Boolean as PropType<boolean>,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'select-podcast',
  'edit-podcast',
  'delete-podcast',
  'download-podcast',
  'preview-podcast',
  'stop-preview',
  'generate-cover'
]);

// computed 属性
const filteredPodcasts = computed(() => {
  // 如果没有播客数据，返回空数组
  if (!props.podcasts || props.podcasts.length === 0) {
    return [];
  }
  return props.podcasts;
});

// 状态变量
const showAllSegments = ref<Record<string, boolean>>({});
const loadingCovers = ref<Record<number, boolean>>({});
const isShareModalOpen = ref(false);
const currentPodcastIdForModal = ref<string | null>(null);
const currentPodcastForModal = computed(() => {
  console.log('[PodcastList] Trying to find podcast for modal. currentPodcastIdForModal:', currentPodcastIdForModal.value, '(type:', typeof currentPodcastIdForModal.value, ')');
  
  if (!props.podcasts || props.podcasts.length === 0) {
    console.warn('[PodcastList] props.podcasts is empty or undefined.');
    return null;
  }

  // Log all available podcast IDs in the props.podcasts array for comparison
  // console.log('[PodcastList] Available podcast_ids in props.podcasts:');
  // props.podcasts.forEach(p => {
  //   console.log(`  - ID: ${p.podcast_id}, Type: ${typeof p.podcast_id}`);
  // });

  if (!currentPodcastIdForModal.value) {
    console.log('[PodcastList] currentPodcastIdForModal.value is null or empty, returning null for currentPodcastForModal.');
    return null;
  }

  const foundPodcast = props.podcasts.find(p => {
    const isMatch = p.podcast_id === currentPodcastIdForModal.value;
    // if (isMatch) {
    //   console.log(`[PodcastList] Match found: p.podcast_id (${p.podcast_id}) === currentPodcastIdForModal.value (${currentPodcastIdForModal.value})`);
    // }
    return isMatch;
  });

  if (foundPodcast) {
    console.log('[PodcastList] Found podcast for modal:', foundPodcast);
  } else {
    console.warn(`[PodcastList] Podcast NOT FOUND for ID: ${currentPodcastIdForModal.value}`);
    // Log all IDs again if not found, to help manual inspection
    if (props.podcasts.length < 20) { // Avoid flooding console for very large lists
        console.log('[PodcastList] Available podcast_ids in props.podcasts (when not found):');
        props.podcasts.forEach(p => {
            console.log(`  - ID: ${p.podcast_id} (Type: ${typeof p.podcast_id})`);
        });
    }
  }
  return foundPodcast || null;
});

// 处理函数
function handleImageLoad(podcastId: number) {
  // 图片加载状态现在由 PodcastCard 组件内部管理
  // 这里只需接收事件，不需要做任何处理
  console.log('Image loaded for podcast:', podcastId);
}

function toggleSegments(podcastId: string) {
  showAllSegments.value[podcastId] = !showAllSegments.value[podcastId];
}

function handleGenerateCover(podcastId: string) {
  if (loadingCovers.value[Number(podcastId)]) return;
  
  // 设置加载状态
  loadingCovers.value[Number(podcastId)] = true;
  
  console.log(`[PodcastList] Generating cover for podcast ${podcastId}...`);
  
  fetch(`/api/podcast/${podcastId}/generate-cover`, {
    method: 'POST',
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Failed to generate cover: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('[PodcastList] Cover generated successfully:', data);
      toast.success('封面图片生成成功！');
      
      // 局部刷新：触发父组件重新获取播客列表
      emit('generate-cover', podcastId);
      
      // 延迟一段时间后重置加载状态，确保新图片有时间加载
      setTimeout(() => {
        loadingCovers.value[Number(podcastId)] = false;
      }, 1000);
    })
    .catch(error => {
      console.error('Error generating cover:', error);
      toast.error(`生成封面失败: ${error.message}`);
      loadingCovers.value[Number(podcastId)] = false;
    });
}

function sharePodcast(podcastId: string) {
  // 这个函数现在只是打开分享模态框，实际的分享逻辑在 PodcastShareModal 组件中处理
  openSharePreviewModal(podcastId);
}

function openSharePreviewModal(podcastId: string) {
  currentPodcastIdForModal.value = podcastId;
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
