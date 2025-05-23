<template>
  <Card
    @mouseenter="hoveredPodcastId = Number(podcast.podcast_id)"
    @mouseleave="hoveredPodcastId = null"
    :style="{
      'transition': 'all 0.3s ease-in-out',
      'transform': hoveredPodcastId === Number(podcast.podcast_id) ? 'translateY(-4px)' : 'translateY(0)'
    }"
    :class="[
      'border rounded-xl shadow-md flex flex-col min-w-[100px] sm:min-w-[280px] max-w-none',
      'aspect-[3/4]',
      'group hover:shadow-xl transition-all duration-300 ease-in-out overflow-hidden relative',
      !podcast.cover_image_url ? 'bg-card text-card-foreground' : 'text-white',
      podcast.cover_image_url && 'bg-center bg-cover bg-no-repeat',
      currentPreviewingId === podcast.podcast_id ? 'ring-2 ring-primary shadow-xl' : 'cursor-pointer',
      hoveredPodcastId === Number(podcast.podcast_id) && 'shadow-lg',
      hoveredPodcastId === Number(podcast.podcast_id) ? 'scale-[1.02]' : 'scale-100'
    ]"
    @click.prevent="currentPreviewingId === podcast.podcast_id ? null : emit('select-podcast', podcast.podcast_id)"
  >
    <!-- Background image with loading state -->
    <div
      v-if="podcast.cover_image_url"
      class="absolute inset-0 bg-center bg-cover transition-opacity duration-500 ease-in-out rounded-md"
      :style="{
        backgroundImage: podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? `url(${podcast.cover_image_url})` : 'none',
        opacity: imageLoaded[Number(podcast.podcast_id)] ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
        zIndex: 0,
        filter: 'brightness(0.8)'
      }"
    >
      <img
        :src="podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? podcast.cover_image_url : ''"
        @load="() => handleImageLoad(Number(podcast.podcast_id))"
        class="hidden"
        alt=""
      />
    </div>

    <!-- 顶部整体渐变遮罩，圆角与卡片一致 -->
    <div class="absolute inset-x-0 top-0 h-[50%] z-10 rounded-t-xl pointer-events-none card-gradient-overlay"></div>

    <!-- Core content always visible -->
    <div :class="[
      'card-content-fade',
      hoveredPodcastId === Number(podcast.podcast_id) ? 'opacity-100' : 'opacity-100'
    ]">
      <CardHeader class="pb-1 sm:pb-2 relative z-20 p-2 sm:p-6">
        <div class="flex flex-col items-start">
          <div class="flex justify-between items-start w-full">
            <CardTitle class="text-sm sm:text-lg font-bold leading-tight text-left card-title-shadow">
              <span class="line-clamp-2 break-words" :title="podcast.title">{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</span>
            </CardTitle>

            <Button 
              variant="ghost"
              size="icon"
              class="h-5 w-5 sm:h-7 sm:w-7 transition-opacity duration-300 ease-in-out hidden sm:flex"
              :class="[
                podcast.cover_image_url ? 'text-white hover:bg-white/20' : '',
                hoveredPodcastId === Number(podcast.podcast_id) ? 'opacity-100' : 'opacity-0'
              ]"
              title="Delete Podcast"
              @click.stop="emit('delete-podcast', podcast.podcast_id)"
            >
              <Icon name="ph:trash" class="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
        </div>

        <!-- 播客基本信息 - 主持人和时长 (始终可见) -->
        <div class="flex items-center justify-between w-full mt-1 sm:mt-2 text-xs transition-all duration-300 ease-in-out"
          :class="{
            'opacity-100': hoveredPodcastId === Number(podcast.podcast_id),
            'opacity-0': hoveredPodcastId !== Number(podcast.podcast_id) && podcast.cover_image_url
          }">
          <div class="flex items-center" v-if="podcast.host_name">
            <Icon name="ph:microphone" class="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 mr-1" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
            <span class="truncate max-w-[60px] sm:max-w-[100px] text-xs" :title="podcast.host_name">{{ podcast.host_name }}</span>
          </div>
          <div class="flex items-center">
            <Icon name="ph:clock" class="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 mr-1" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
            <span class="text-xs">{{ getPodcastTotalDuration(podcast) }}</span>
          </div>
        </div>

        <!-- Topic tag always visible -->
        <div class="flex items-center mt-1 sm:mt-2 w-full transition-all duration-300 ease-in-out"
          :class="{
            'opacity-80': hoveredPodcastId === Number(podcast.podcast_id),
            'opacity-0': hoveredPodcastId !== Number(podcast.podcast_id) && podcast.cover_image_url
          }">
          <span
            v-if="podcast.topic"
            class="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs font-semibold line-clamp-1 transition-all duration-300 ease-in-out"
            :class="[
              podcast.cover_image_url ? 'text-white' : 'bg-primary/10 text-primary',
              hoveredPodcastId === Number(podcast.podcast_id) && podcast.cover_image_url ? 'bg-white/30' : 'bg-white/10'
            ]"
            :title="podcast.topic"
          >
            {{ podcast.topic }}
          </span>
        </div>
        </div>
      </CardHeader>

      <!-- Extended content on hover - simple opacity change -->
      <CardContent class="py-1 sm:py-2 text-sm relative z-10 flex-1 p-2 sm:p-6">
        <div 
          :class="{
            'opacity-100 transform translate-y-0': hoveredPodcastId === Number(podcast.podcast_id),
            'opacity-0 transform translate-y-2': hoveredPodcastId !== Number(podcast.podcast_id)
          }"
          class="transition-all duration-300 ease-in-out h-full flex flex-col">
          <!-- Podcast description -->
          <CardDescription v-if="podcast.description"
            :class="podcast.cover_image_url ? 'text-white/90' : 'text-muted-foreground'"
            class="text-xs sm:text-sm line-clamp-2 text-left mb-1 sm:mb-3">
            {{ podcast.description }}
          </CardDescription>
        </div>
      </CardContent>
    </div>

    <!-- 中央播放/暂停按钮或继续按钮 (二选一) -->
    <div class="z-20 absolute inset-16 sm:inset-20 flex items-end justify-center">
      <!-- 继续制作按钮 (未完成的播客) -->
      <Button
        v-if="hasUnsynthesizedSegments(podcast)"
        variant="outline"
        class="flex items-center justify-center rounded-lg shadow-md bg-secondary/70 hover:bg-secondary text-white px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
        @click.stop="navigateToPlayground(Number(podcast.podcast_id))"
        title="Some segments need audio synthesis"
      >
        <Icon name="ph:arrow-square-out" class="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
        <span class="hidden sm:inline">Continue on Playground</span>
        <span class="sm:hidden">Continue</span>
      </Button>
      
      <!-- 播放按钮 (已完成的播客，当前未播放) -->
      <Button
        v-else-if="hasPlayableSegments(podcast) && currentPreviewingId !== podcast.podcast_id"
        variant="outline"
        class="flex items-center justify-center rounded-lg shadow-md bg-secondary/70 hover:bg-secondary text-white px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
        @click.stop="emit('preview-podcast', podcast.podcast_id)"
      >
        <Icon name="ph:play-fill" class="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
        Preview
      </Button>
      
      <!-- 停止按钮 (当前正在播放) -->
      <Button
        v-else-if="currentPreviewingId === podcast.podcast_id"
        variant="outline"
        class="flex items-center justify-center rounded-lg shadow-md bg-destructive/70 hover:bg-destructive text-white px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
        @click.stop="emit('stop-preview')"
      >
        <Icon name="ph:stop-fill" class="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
        Stop
      </Button>
      
      <!-- 禁用状态 (无可播放内容) -->
      <TooltipProvider v-else>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="outline"
              class="flex items-center justify-center rounded-lg shadow-md bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed px-2 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm"
              disabled
            >
              <Icon name="ph:play-fill" class="mr-1 sm:mr-2 h-3 w-3 sm:h-5 sm:w-5" />
              Preview
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>No audio content available for this podcast</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    
    <!-- 底部操作区域 (始终显示，悬停时更明显) -->
    <div 
      class="z-10 absolute bottom-0 left-0 right-0 p-2 sm:p-4 bg-gradient-to-t from-black/80 to-transparent transition-all duration-300 ease-in-out"
      :class="{
        'opacity-100': hoveredPodcastId === Number(podcast.podcast_id),
        'opacity-80': hoveredPodcastId !== Number(podcast.podcast_id)
      }"
    >
      <!-- 主要操作按钮区域 -->
      <div class="flex gap-1 sm:gap-2 w-full mb-1 sm:mb-3">
        <!-- 留空作为布局占位符 -->
      </div>
      
      <!-- 工具按钮 -->
      <div class="flex flex-wrap gap-1 sm:gap-2 w-full justify-center">
        <!-- Generate cover button -->
        <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
            title="Generate cover image"
            @click.stop="emit('generate-cover', String(podcast.podcast_id))"
            :disabled="currentPreviewingId === podcast.podcast_id || (loadingCovers && loadingCovers[Number(podcast.podcast_id)])"
            :class="podcast.cover_image_url ? 'text-white hover:text-white' : ''"
          >
            <Icon 
              v-if="!(loadingCovers && loadingCovers[Number(podcast.podcast_id)])" 
              name="ph:image" 
              class="h-3 w-3 sm:h-5 sm:w-5" 
            />
            <Icon 
              v-else 
              name="ph:spinner" 
              class="h-3 w-3 sm:h-5 sm:w-5 animate-spin" 
            />
          </Button>
          
          <!-- Download button -->
          <TooltipProvider v-if="!hasPlayableSegments(podcast)">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 dark:bg-white/5"
                  :disabled="!hasPlayableSegments(podcast)"
                  :class="[{ 'opacity-50 cursor-not-allowed': !hasPlayableSegments(podcast) },
                    podcast.cover_image_url ? 'text-white/80' : '']"
                >
                  <Icon 
                    name="ph:download-simple" 
                    class="h-3 w-3 sm:h-5 sm:w-5" 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>No audio content available to download</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            v-else
            variant="ghost"
            size="icon"
            class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
            title="Download podcast"
            @click.stop="emit('download-podcast', String(podcast.podcast_id))"
            :disabled="!hasPlayableSegments(podcast)"
            :class="podcast.cover_image_url ? 'text-white hover:text-white' : ''"
          >
            <Icon 
              name="ph:download-simple" 
              class="h-3 w-3 sm:h-5 sm:w-5" 
            />
          </Button>
          
          <!-- Edit button -->
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
            title="Edit podcast"
            @click.stop="emit('edit-podcast', podcast.podcast_id)"
            :class="podcast.cover_image_url ? 'text-white hover:text-white' : ''"
          >
            <Icon 
              name="ph:pencil-simple" 
              class="h-3 w-3 sm:h-5 sm:w-5" 
            />
          </Button>
          
          <!-- Preview share button -->
          <TooltipProvider v-if="!hasPlayableSegments(podcast)">
            <Tooltip>
              <TooltipTrigger as-child>
                <Button
                  variant="ghost"
                  size="icon"
                  class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 dark:bg-white/5"
                  :disabled="!hasPlayableSegments(podcast)"
                  :class="[{ 'opacity-50 cursor-not-allowed': !hasPlayableSegments(podcast) },
                    podcast.cover_image_url ? 'text-white/80' : '']"
                >
                  <Icon 
                    name="ph:eye" 
                    class="h-3 w-3 sm:h-5 sm:w-5" 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>No audio content available for this podcast</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            v-else
            variant="ghost"
            size="icon"
            class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
            title="Preview share"
            @click.stop="openSharePreviewModal(podcast.podcast_id)"
            :disabled="!hasPlayableSegments(podcast)"
            :class="podcast.cover_image_url ? 'text-white hover:text-white' : ''"
          >
            <Icon 
              name="ph:eye" 
              class="h-3 w-3 sm:h-5 sm:w-5" 
            />
          </Button>
          
          <!-- Share button -->
          <Button
            variant="ghost"
            size="icon"
            class="h-6 w-6 sm:h-10 sm:w-10 rounded-lg bg-black/10 hover:bg-black/20 dark:bg-white/5 dark:hover:bg-white/10"
            title="Share podcast"
            @click.stop="sharePodcast(podcast.podcast_id)"
            :class="podcast.cover_image_url ? 'text-white hover:text-white' : ''"
          >
            <Icon 
              name="ph:share-network" 
              class="h-3 w-3 sm:h-5 sm:w-5 text-primary" 
            />
          </Button>
        </div>
    </div>

    <!-- 继续合成确认对话框 -->
    <ContinueSynthesisDialog
      v-model:visible="showContinueDialog"
      :segment-count="pendingSegmentCount"
      :podcast-title="podcast.title"
      @confirm="handleConfirmContinue"
      @cancel="handleCancelContinue"
    />
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
import ContinueSynthesisDialog from './ContinueSynthesisDialog.vue';

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
  showAllSegments: {
    type: Object as PropType<Record<string, boolean>>,
    default: () => ({})
  }
});

// 将 imageLoaded 从 props 转换为本地的 ref 变量
const imageLoaded = ref<Record<number, boolean>>({});

// 确保安全访问 showAllSegments
const safeShowAllSegments = computed(() => props.showAllSegments || {});

const emit = defineEmits<{
  (e: 'select-podcast', podcastId: string): void;
  (e: 'edit-podcast', podcastId: string): void;
  (e: 'delete-podcast', podcastId: string): void;
  (e: 'preview-podcast', podcastId: string): void;
  (e: 'stop-preview'): void;
  (e: 'generate-cover', podcastId: string): void;
  (e: 'toggle-segments', podcastId: number): void;
  (e: 'open-share-preview', podcastId: string): void;
  (e: 'share-podcast', podcastId: string): void;
  (e: 'download-podcast', podcastId: string): void;
  (e: 'image-loaded', podcastId: number): void;
}>();

// 悬停状态管理
const hoveredPodcastId = ref<number | null>(null);

// 继续合成对话框状态
const showContinueDialog = ref(false);
const pendingSegmentCount = ref(0);
const pendingPodcastId = ref<number | null>(null);

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
  // 直接在本地组件中设置图片加载状态，而不仅仅是发送事件
  imageLoaded.value[podcastId] = true;
  // 同时发送事件通知父组件
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
  // 触发事件通知父组件切换分段显示状态
  emit('toggle-segments', podcastId);
}

// 安全获取分段显示状态
function getSegmentVisibility(podcastId: string | number): boolean {
  return safeShowAllSegments.value[String(podcastId)] || false;
}

function navigateToPlayground(podcastId: number) {
  // 计算未合成的segments数量
  const unsynthesizedCount = getUnsynthesizedSegmentsCount(props.podcast);
  
  if (unsynthesizedCount > 0) {
    // 显示确认对话框
    pendingSegmentCount.value = unsynthesizedCount;
    pendingPodcastId.value = podcastId;
    showContinueDialog.value = true;
  } else {
    // 没有未合成的segments，直接跳转
    router.push(`/playground?podcast=${podcastId}`);
  }
}

// 获取未合成segments的数量
function getUnsynthesizedSegmentsCount(podcast: Podcast): number {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 0;
  }
  
  return podcast.podcast_segments.filter(segment => 
    !segment.segment_audios || segment.segment_audios.length === 0
  ).length;
}

// 触发后台合成
async function triggerBackgroundSynthesis(podcastId: number, segmentCount: number) {
  try {
    console.log(`开始后台合成播客 ${podcastId} 的 ${segmentCount} 个片段`);
    
    // 定义API响应类型
    interface ContinueSynthesisResponse {
      success: boolean;
      message: string;
      taskId?: string;
      segmentsToProcess: number;
      podcastId: string;
    }
    
    // 调用后台合成API
    const response = await $fetch<ContinueSynthesisResponse>('/api/podcast/continue-synthesis', {
      method: 'POST'
    }, { 
      podcastId: podcastId.toString(),
      segmentCount 
    });
    
    if (response.success) {
      if (response.taskId) {
        toast.success(`开始后台合成 ${response.segmentsToProcess} 个片段`, {
          description: `任务ID: ${response.taskId}，您可以在Playground中查看进度`
        });
      } else {
        toast.info(response.message, {
          description: '所有片段已完成合成'
        });
      }
      
      // 跳转到playground页面
      router.push(`/playground?podcast=${podcastId}`);
    } else {
      throw new Error(response.message || '合成任务创建失败');
    }
    
  } catch (error: any) {
    console.error('后台合成启动失败:', error);
    toast.error('启动后台合成失败', {
      description: error.data?.message || error.message || '请稍后重试'
    });
  }
}

function openSharePreviewModal(podcastId: string) {
  emit('open-share-preview', podcastId);
}

function sharePodcast(podcastId: string) {
  emit('share-podcast', podcastId);
}

// 确认继续合成
function handleConfirmContinue() {
  if (pendingPodcastId.value && pendingSegmentCount.value > 0) {
    triggerBackgroundSynthesis(pendingPodcastId.value, pendingSegmentCount.value);
  }
  handleCancelContinue();
}

// 取消继续合成
function handleCancelContinue() {
  showContinueDialog.value = false;
  pendingSegmentCount.value = 0;
  pendingPodcastId.value = null;
}
</script>

<style scoped>
/* Text shadow effects */
.card-content-fade {
  transition: opacity 0.3s cubic-bezier(.4,0,.2,1);
}
.card-gradient-overlay {
  border-top-left-radius: 0.75rem;
  border-top-right-radius: 0.75rem;
  background: linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%);
  transition: background 0.3s cubic-bezier(.4,0,.2,1);
}
.card-title-shadow {
  text-shadow: 0 2px 8px rgba(0,0,0,0.7);
  transition: text-shadow 0.3s cubic-bezier(.4,0,.2,1);
}

/* 保留按钮阴影等与卡片功能相关的样式 */
.card-hover-effect {
  transition: all 0.3s ease-in-out;
}
.card-hover-effect:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}
.btn-shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
.btn-shadow:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
</style>
