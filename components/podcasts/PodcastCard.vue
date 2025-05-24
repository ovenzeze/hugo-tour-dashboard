<template>
  <div
    @mouseenter="hoveredPodcastId = Number(podcast.podcast_id)"
    @mouseleave="hoveredPodcastId = null"
    :class="[
      'rounded-2xl md:rounded-3xl bg-muted/20 backdrop-blur-sm flex flex-col min-w-[100px] sm:min-w-[280px] max-w-none',
      'aspect-[3/4]',
      'group transition-all duration-300 ease-in-out overflow-hidden relative cursor-pointer',
      !podcast.cover_image_url ? 'text-card-foreground' : 'text-white',
      currentPreviewingId === podcast.podcast_id && 'ring-2 ring-primary',
      hoveredPodcastId === Number(podcast.podcast_id) && 'transform hover:scale-[1.02]'
    ]"
    @click.prevent="currentPreviewingId === podcast.podcast_id ? null : emit('select-podcast', podcast.podcast_id)"
  >
    <!-- Background image with loading state -->
    <div
      v-if="podcast.cover_image_url"
      class="absolute inset-0 bg-center bg-cover transition-opacity duration-500 ease-in-out rounded-2xl md:rounded-3xl"
      :style="{
        backgroundImage: podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? `url(${podcast.cover_image_url})` : 'none',
        opacity: imageLoaded[Number(podcast.podcast_id)] ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out',
        zIndex: 0,
        filter: 'brightness(0.7)'
      }"
    >
      <img
        :src="podcast.cover_image_url && typeof podcast.cover_image_url === 'string' ? podcast.cover_image_url : ''"
        @load="() => handleImageLoad(Number(podcast.podcast_id))"
        class="hidden"
        alt=""
      />
    </div>

    <!-- Simplified Gradient Overlay -->
    <div v-if="podcast.cover_image_url" class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 z-10 pointer-events-none rounded-2xl md:rounded-3xl"></div>
    
    <!-- Top Right Corner - Progress Indicator -->
    <div v-if="podcast.podcast_segments?.length" class="absolute top-4 right-4 z-20">
      <div class="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm"
           :class="podcast.cover_image_url ? 'bg-black/30' : 'bg-muted/80'">
        <div class="w-2 h-2 rounded-full" 
             :class="getPodcastStatusIcon(podcast) === 'ph:check-circle' ? 'bg-green-400' : 
                     getPodcastStatusIcon(podcast) === 'ph:hourglass' ? 'bg-yellow-400' : 'bg-gray-400'">
        </div>
        <span class="text-xs font-medium" :class="podcast.cover_image_url ? 'text-white' : 'text-foreground'">
          {{ getCompletedSegments(podcast) }}/{{ podcast.podcast_segments.length }}
        </span>
      </div>
    </div>

    <!-- Core content -->
    <div class="relative z-20 h-full flex flex-col p-4 md:p-6">
      <!-- 顶部区域 - 标题和主要状态 -->
      <div class="flex flex-col space-y-3">
        <!-- Podcast Title -->
        <div class="w-full">
          <h3 
            ref="titleElement"
            class="podcast-title text-base sm:text-lg md:text-xl font-bold leading-tight text-left line-clamp-2 break-words" 
            :title="podcast.title"
            :data-has-chinese="hasChinese(podcast.title || '')"
            :lang="hasChinese(podcast.title || '') ? 'zh' : 'en'"
          >
            {{ podcast.title || `Podcast #${podcast.podcast_id}` }}
          </h3>
        </div>

        <!-- Primary Status Row -->
        <div class="flex items-center justify-between w-full gap-2">
          <Badge 
            :variant="getPodcastStatusVariant(podcast)"
            class="text-xs px-2.5 py-1.5 h-7 font-medium shrink-0"
            :class="podcast.cover_image_url ? 'bg-white/20 text-white border-white/30' : ''"
          >
            <Icon :name="getPodcastStatusIcon(podcast)" class="h-3 w-3 mr-1.5" />
            {{ getPodcastStatusText(podcast) }}
          </Badge>
          
          <div class="flex items-center text-xs font-medium shrink-0">
            <Icon name="ph:clock" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/90' : 'text-muted-foreground'" />
            <span :class="podcast.cover_image_url ? 'text-white/90' : 'text-foreground'">{{ getPodcastTotalDuration(podcast) }}</span>
          </div>
        </div>
      </div>

      <!-- 中部区域 - 灵活间距，垂直居中分布 -->
      <div class="flex-1 flex flex-col justify-center min-h-0 py-6">
        <!-- Topic Tag -->
        <div v-if="podcast.topic" class="flex justify-center">
          <span
            class="inline-flex px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 max-w-full truncate"
            :class="podcast.cover_image_url ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-primary/10 text-primary hover:bg-primary/15'"
            :title="podcast.topic"
          >
            {{ podcast.topic }}
          </span>
        </div>
      </div>

      <!-- 底部区域 - 元数据信息和描述 -->
      <div class="space-y-3">
        <!-- Metadata Information -->
        <div class="text-xs text-center space-y-1.5">
          <!-- Host Information -->
          <div v-if="podcast.host_name" class="flex items-center justify-center">
            <Icon name="ph:microphone" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
            <span class="font-medium truncate" :class="podcast.cover_image_url ? 'text-white/90' : 'text-foreground'" :title="podcast.host_name">
              {{ podcast.host_name }}
            </span>
          </div>

          <!-- Stats and Date Row -->
          <div class="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
            <div v-if="podcast.podcast_segments?.length" class="flex items-center">
              <Icon name="ph:list-bullets" class="h-3 w-3 mr-1" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
              <span :class="podcast.cover_image_url ? 'text-white/90' : 'text-foreground'">
                {{ podcast.podcast_segments.length }}
              </span>
            </div>
            
            <div v-if="podcast.total_word_count" class="flex items-center">
              <Icon name="ph:text-aa" class="h-3 w-3 mr-1" :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'" />
              <span :class="podcast.cover_image_url ? 'text-white/90' : 'text-foreground'">
                {{ formatWordCount(podcast.total_word_count) }}
              </span>
            </div>

            <div v-if="podcast.created_at" class="flex items-center">
              <!-- Icon for expired status -->
              <Icon
                v-if="isPodcastExpired(podcast)"
                name="ph:calendar-x"
                class="h-3 w-3 mr-1 text-red-400"
                title="Podcast Expired"
              />
              <Icon
                v-else
                name="ph:calendar"
                class="h-3 w-3 mr-1"
                :class="podcast.cover_image_url ? 'text-white/70' : 'text-muted-foreground'"
              />
              <span :class="podcast.cover_image_url ? 'text-white/90' : 'text-foreground'">
                {{ formatEnglishRelativeTime(podcast.created_at) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div v-if="podcast.description" class="min-h-[2rem]">
          <p 
            :class="podcast.cover_image_url ? 'text-white/85' : 'text-muted-foreground'"
            class="text-xs leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-all duration-500 ease-out transform group-hover:translate-y-0 translate-y-1"
          >
            {{ podcast.description }}
          </p>
        </div>

        <!-- Bottom spacer for action buttons -->
        <div class="h-8"></div>
      </div>

      <!-- 右下角播放按钮 -->
      <div class="absolute bottom-4 right-4 z-30">
        <!-- Continue Editing Button -->
        <Button
          v-if="hasUnsynthesizedSegments(podcast)"
          variant="default"
          size="icon"
          class="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:scale-110 transition-all duration-300"
          @click.stop="navigateToPlayground(Number(podcast.podcast_id))"
          title="Continue editing in Playground"
        >
          <Icon name="ph:arrow-square-out" class="w-5 h-5" />
        </Button>
        
        <!-- Play Button -->
        <Button
          v-else-if="hasPlayableSegments(podcast) && currentPreviewingId !== podcast.podcast_id"
          variant="default"
          size="icon"
          class="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:scale-110 transition-all duration-300"
          @click.stop="emit('preview-podcast', podcast.podcast_id)"
          title="Preview podcast"
        >
          <Icon name="ph:play-fill" class="w-5 h-5" />
        </Button>
        
        <!-- Stop Button -->
        <Button
          v-else-if="currentPreviewingId === podcast.podcast_id"
          variant="destructive"
          size="icon"
          class="w-12 h-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:scale-110 transition-all duration-300 animate-pulse"
          @click.stop="emit('stop-preview')"
          title="Stop preview"
        >
          <Icon name="ph:stop-fill" class="w-5 h-5" />
        </Button>
        
        <!-- Disabled State -->
        <Button
          v-else
          variant="secondary"
          size="icon"
          class="w-12 h-12 rounded-full bg-muted/50 text-muted-foreground opacity-50 cursor-not-allowed"
          disabled
          title="No audio available"
        >
          <Icon name="ph:play-fill" class="w-5 h-5" />
        </Button>
      </div>
      
      <!-- 左下角操作按钮 -->
      <div class="absolute bottom-4 left-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-30">
        <!-- Generate cover button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40 transition-all duration-200"
          :class="podcast.cover_image_url ? 'text-white hover:text-white' : 'text-foreground'"
          title="Generate cover image"
          @click.stop="emit('generate-cover', String(podcast.podcast_id))"
          :disabled="currentPreviewingId === podcast.podcast_id || (loadingCovers && loadingCovers[Number(podcast.podcast_id)])"
        >
          <Icon 
            v-if="!(loadingCovers && loadingCovers[Number(podcast.podcast_id)])" 
            name="ph:image" 
            class="h-4 w-4" 
          />
          <Icon 
            v-else 
            name="ph:spinner" 
            class="h-4 w-4 animate-spin" 
          />
        </Button>
        
        <!-- Download button -->
        <Button
          v-if="hasPlayableSegments(podcast)"
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40 transition-all duration-200"
          :class="podcast.cover_image_url ? 'text-white hover:text-white' : 'text-foreground'"
          title="Download podcast"
          @click.stop="emit('download-podcast', String(podcast.podcast_id))"
        >
          <Icon name="ph:download-simple" class="h-4 w-4" />
        </Button>
        
        <!-- Edit button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40 transition-all duration-200"
          :class="podcast.cover_image_url ? 'text-white hover:text-white' : 'text-foreground'"
          title="Edit podcast"
          @click.stop="emit('edit-podcast', podcast.podcast_id)"
        >
          <Icon name="ph:pencil-simple" class="h-4 w-4" />
        </Button>
        
        <!-- Share button -->
        <Button
          v-if="hasPlayableSegments(podcast)"
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40 transition-all duration-200"
          :class="podcast.cover_image_url ? 'text-white hover:text-white' : 'text-foreground'"
          title="Share podcast"
          @click.stop="openSharePreviewModal(podcast.podcast_id)"
        >
          <Icon name="ph:share" class="h-4 w-4" />
        </Button>
        
        <!-- Delete button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-destructive/20 hover:bg-destructive/30 transition-all duration-200"
          :class="podcast.cover_image_url ? 'text-red-300 hover:text-red-200' : 'text-destructive'"
          title="Delete podcast"
          @click.stop="emit('delete-podcast', podcast.podcast_id)"
        >
          <Icon name="ph:trash" class="h-4 w-4" />
        </Button>
      </div>
    </div>

    <!-- Continue Synthesis Confirmation Dialog -->
    <ContinueSynthesisDialog
      v-model:visible="showContinueDialog"
      :segment-count="pendingSegmentCount"
      :podcast-title="podcast.title"
      @confirm="handleConfirmContinue"
      @cancel="handleCancelContinue"
    />
  </div>
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

// Convert imageLoaded from props to a local ref variable
const imageLoaded = ref<Record<number, boolean>>({});

// Ensure safe access to showAllSegments
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

// Hover state management
const hoveredPodcastId = ref<number | null>(null);

// Continue synthesis dialog state
const showContinueDialog = ref(false);
const pendingSegmentCount = ref(0);
const pendingPodcastId = ref<number | null>(null);

// Helper functions
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

  // Convert to minutes:seconds format
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
  
  // Check if any segments do not have associated audio
  return podcast.podcast_segments.some(segment => 
    !segment.segment_audios || segment.segment_audios.length === 0
  );
}

function toggleSegments(podcastId: number) {
  // Trigger event to notify parent component to toggle segment display state
  emit('toggle-segments', podcastId);
}

// Safely get segment visibility state
function getSegmentVisibility(podcastId: string | number): boolean {
  return safeShowAllSegments.value[String(podcastId)] || false;
}

function navigateToPlayground(podcastId: number) {
  // Calculate the number of unsynthesized segments
  const unsynthesizedCount = getUnsynthesizedSegmentsCount(props.podcast);
  
  if (unsynthesizedCount > 0) {
    // Show confirmation dialog
    pendingSegmentCount.value = unsynthesizedCount;
    pendingPodcastId.value = podcastId;
    showContinueDialog.value = true;
  } else {
    // No unsynthesized segments, navigate directly
    router.push(`/playground?podcast=${podcastId}`);
  }
}

// Get the number of unsynthesized segments
function getUnsynthesizedSegmentsCount(podcast: Podcast): number {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 0;
  }
  
  return podcast.podcast_segments.filter(segment => 
    !segment.segment_audios || segment.segment_audios.length === 0
  ).length;
}

// Trigger background synthesis
async function triggerBackgroundSynthesis(podcastId: number, segmentCount: number) {
  try {
    console.log(`Starting background synthesis for podcast ${podcastId} with ${segmentCount} segments`);
    
    // Define API response type
    interface ContinueSynthesisResponse {
      success: boolean;
      message: string;
      taskId?: string;
      segmentsToProcess: number;
      podcastId: string;
    }
    
    // Call background synthesis API
    const response = await $fetch<ContinueSynthesisResponse>('/api/podcast/continue-synthesis', {
      method: 'POST',
      // @ts-ignore - Following project pattern for body type handling
      body: {
        podcastId: podcastId.toString(),
        segmentCount 
      }
    });
    
    if (response.success) {
      if (response.taskId) {
        toast.success(`Starting background synthesis for ${response.segmentsToProcess} segments`, {
          description: `Task ID: ${response.taskId}, redirecting to progress page`
        });
        
        // Redirect to public synthesis progress page
        router.push(`/synthesis-progress/${response.taskId}`);
      } else {
        toast.info(response.message, {
          description: 'All segments are already synthesized'
        });
        
        // If nothing needs to be synthesized, navigate to playground to view results
        router.push(`/playground?podcast=${podcastId}`);
      }
    } else {
      throw new Error(response.message || 'Synthesis task creation failed');
    }
    
  } catch (error: any) {
    console.error('Background synthesis failed to start:', error);
    toast.error('Failed to start background synthesis', {
      description: error.data?.message || error.message || 'Please try again later'
    });
  }
}

function openSharePreviewModal(podcastId: string) {
  emit('open-share-preview', podcastId);
}

function sharePodcast(podcastId: string) {
  emit('share-podcast', podcastId);
}

// Confirm continue synthesis
function handleConfirmContinue() {
  if (pendingPodcastId.value && pendingSegmentCount.value > 0) {
    triggerBackgroundSynthesis(pendingPodcastId.value, pendingSegmentCount.value);
  }
  handleCancelContinue();
}

// Cancel continue synthesis
function handleCancelContinue() {
  showContinueDialog.value = false;
  pendingSegmentCount.value = 0;
  pendingPodcastId.value = null;
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format word count
function formatWordCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  } else if (count < 10000) {
    return `${(count / 1000).toFixed(1)}k`;
  } else {
    return `${(count / 10000).toFixed(1)}0k`;
  }
}

// English relative time formatting
function formatEnglishRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) {
    return 'today';
  } else if (diffDays === 2) {
    return 'yesterday';
  } else if (diffDays <= 7) {
    return `${diffDays - 1}d ago`;
  } else if (diffDays <= 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else if (diffDays <= 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}y ago`;
  }
}

// Get podcast status text
function getPodcastStatusText(podcast: Podcast): string {
  // TODO: Determine the actual logic for 'Expired' status based on business requirements
  // For now, adding a placeholder check
  // if (isPodcastExpired(podcast)) {
  //   return 'Expired';
  // }

  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'Draft';
  }
  
  const totalSegments = podcast.podcast_segments.length;
  const synthesizedSegments = podcast.podcast_segments.filter(segment =>
    segment.segment_audios && segment.segment_audios.length > 0
  ).length;
  
  if (synthesizedSegments === 0) {
    return 'New';
  } else if (synthesizedSegments < totalSegments) {
    return 'In Progress';
  } else {
    return 'Completed';
  }
}

// Get podcast status icon
function getPodcastStatusIcon(podcast: Podcast): string {
  // TODO: Determine the actual logic for 'Expired' status based on business requirements
  // For now, adding a placeholder check
  // if (isPodcastExpired(podcast)) {
  //   return 'ph:calendar-x'; // Using calendar-x to represent expired
  // }

  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'ph:file-dashed';
  }
  
  const totalSegments = podcast.podcast_segments.length;
  const synthesizedSegments = podcast.podcast_segments.filter(segment =>
    segment.segment_audios && segment.segment_audios.length > 0
  ).length;
  
  if (synthesizedSegments === 0) {
    return 'ph:circle-dashed';
  } else if (synthesizedSegments < totalSegments) {
    return 'ph:hourglass';
  } else {
    return 'ph:check-circle';
  }
}

// Get podcast status variant style
function getPodcastStatusVariant(podcast: Podcast): "default" | "secondary" | "destructive" | "outline" {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'outline';
  }
  
  const totalSegments = podcast.podcast_segments.length;
  const synthesizedSegments = podcast.podcast_segments.filter(segment => 
    segment.segment_audios && segment.segment_audios.length > 0
  ).length;
  
  if (synthesizedSegments === 0) {
    return 'secondary';
  } else if (synthesizedSegments < totalSegments) {
    return 'default';
  } else {
    return 'outline';
  }
}

// Get completed segments count
function getCompletedSegments(podcast: Podcast): number {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 0;
  }
  
  return podcast.podcast_segments.filter(segment => 
    segment.segment_audios && segment.segment_audios.length > 0
  ).length;
}

// Helper function to determine if a podcast is expired (example logic)
function isPodcastExpired(podcast: Podcast): boolean {
  if (!podcast.created_at) {
    return false;
  }
  const createdAt = new Date(podcast.created_at);
  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  return createdAt < oneYearAgo;
}

// 检测文本中是否包含中文字符
function hasChinese(text: string): boolean {
  const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;
  return chineseRegex.test(text);
}
</script>

<style scoped>
/* 优化的动画效果 */
.group {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 改进的悬停效果 */
.group:hover {
  transform: scale(1.02);
  filter: brightness(1.05);
}

/* 文本截断样式 */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 响应式字体大小优化 */
@media (max-width: 640px) {
  .text-base {
    font-size: 0.9rem;
  }
  
  /* 移动端间距调整 */
  .py-6 {
    padding-top: 1.5rem;
    padding-bottom: 1.5rem;
  }
  
  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
  
  .space-y-2 > * + * {
    margin-top: 0.5rem;
  }
  
  .space-y-1\.5 > * + * {
    margin-top: 0.375rem;
  }
}

/* 改进的阴影效果 */
.shadow-lg {
  box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}

/* 优化的过渡动画 */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* 渐变遮罩优化 */
.bg-gradient-to-t {
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6) 0%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.3) 100%);
}

/* 确保中部区域垂直居中 */
.justify-center {
  justify-content: center;
}

/* 确保卡片高度分布均匀 */
.min-h-0 {
  min-height: 0;
}

/* 文本居中对齐优化 */
.text-center {
  text-align: center;
}

/* 中文标题优化设计 */
.podcast-title {
  /* 优先使用更好的中文字体 */
  font-family: 
    "Noto Sans SC",
    "PingFang SC", 
    "Hiragino Sans GB", 
    "Source Han Sans SC", 
    "Microsoft YaHei", 
    "WenQuanYi Micro Hei",
    "Crimson Text", 
    system-ui, 
    -apple-system, 
    sans-serif;
  
  /* 中文优化的字重 */
  font-weight: 600;
  
  /* 改进的行高，适合中文字符 */
  line-height: 1.45;
  
  /* 字间距优化，中文字符更舒适的间距 */
  letter-spacing: 0.025em;
  
  /* 中文字体的字符间距微调 */
  word-spacing: 0.1em;
  
  /* 文字渲染优化 */
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  
  /* 更好的文字阴影效果（有背景图时） */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  
  /* 响应式字体大小优化 */
  font-size: clamp(0.95rem, 2.5vw, 1.25rem);
}

/* 无背景图时的标题样式 */
.podcast-title:not([style*="text-shadow"]) {
  text-shadow: none;
}

/* 移动端标题样式优化 */
@media (max-width: 640px) {
  .podcast-title {
    font-weight: 600;
    letter-spacing: 0.015em;
    line-height: 1.35;
    font-size: clamp(0.9rem, 4vw, 1rem);
  }
}

/* 有背景图片时的标题样式增强 */
.group .podcast-title {
  /* 确保在背景图上有足够的对比度 */
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* 悬停时的标题效果 */
.group:hover .podcast-title {
  /* 轻微的发光效果 */
  text-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 0 20px rgba(255, 255, 255, 0.1);
}

/* 针对中文字符的特殊样式 */
.podcast-title:lang(zh) {
  font-weight: 700;
  letter-spacing: 0.03em;
  word-spacing: 0.15em;
}

/* 检测到中文字符时的增强样式 */
.podcast-title[data-has-chinese="true"] {
  font-family: 
    "Noto Sans SC",
    "PingFang SC", 
    "Hiragino Sans GB", 
    "Source Han Sans SC", 
    "Microsoft YaHei",
    sans-serif;
  font-weight: 700;
  letter-spacing: 0.03em;
  word-spacing: 0.15em;
  /* 中文字符的特殊渲染优化 */
  font-feature-settings: "kern" 1, "liga" 0, "calt" 0;
  /* 更好的中文字符间距 */
  text-justify: inter-character;
}

.space-y-3 p {
  font-family:
    "Georgia", /* Preferred serif font */
    "Palatino Linotype", /* Another option */
    "Times New Roman", /* Common serif */
    "Crimson Text", /* Existing serif */
    "Noto Sans SC", /* Chinese fonts */
    "PingFang SC",
    "Hiragino Sans GB",
    "Source Han Sans SC",
    "Microsoft YaHei",
    "WenQuanYi Micro Hei",
    system-ui,
    -apple-system,
    serif; /* Generic serif fallback */
}
</style>
