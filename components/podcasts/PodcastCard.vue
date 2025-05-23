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

    <!-- Core content -->
    <div class="relative z-20 h-full flex flex-col p-4 md:p-6">
      <!-- Header Area -->
      <div class="flex flex-col items-start flex-1">
        <div class="flex justify-between items-start w-full mb-3">
          <h3 class="text-sm sm:text-lg font-bold leading-tight text-left line-clamp-2 break-words flex-1 mr-2" :title="podcast.title">
            {{ podcast.title || `Podcast #${podcast.podcast_id}` }}
          </h3>

          <Button 
            variant="ghost"
            size="sm"
            class="h-6 w-6 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm"
            :class="podcast.cover_image_url ? 'text-white hover:bg-white/20' : 'hover:bg-muted/40'"
            title="Delete Podcast"
            @click.stop="emit('delete-podcast', podcast.podcast_id)"
          >
            <Icon name="ph:trash" class="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>

        <!-- Basic Podcast Info -->
        <div class="w-full space-y-2 mb-4">
          <!-- Row 1: Host and Duration -->
          <div class="flex items-center justify-between w-full text-xs">
            <div class="flex items-center" v-if="podcast.host_name">
              <Icon name="ph:microphone" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
              <span class="truncate max-w-[60px] sm:max-w-[100px]" :title="podcast.host_name">{{ podcast.host_name }}</span>
            </div>
            <div class="flex items-center">
              <Icon name="ph:clock" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
              <span>{{ getPodcastTotalDuration(podcast) }}</span>
            </div>
          </div>

          <!-- Row 2: Publish Date and Status -->
          <div class="flex items-center justify-between w-full text-xs">
            <div class="flex items-center" v-if="podcast.created_at">
              <Icon name="ph:calendar" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
              <span class="truncate" :title="formatDate(podcast.created_at)">{{ formatEnglishRelativeTime(podcast.created_at) }}</span>
            </div>
            <div class="flex items-center gap-1">
              <!-- Completion Status Badge -->
              <Badge 
                :variant="getPodcastStatusVariant(podcast)"
                class="text-xs px-1.5 py-0.5 h-5"
                :class="podcast.cover_image_url ? 'border-white/30' : ''"
              >
                <Icon :name="getPodcastStatusIcon(podcast)" class="h-2.5 w-2.5 mr-1" />
                {{ getPodcastStatusText(podcast) }}
              </Badge>
            </div>
          </div>

          <!-- Row 3: Statistics -->
          <div class="flex items-center justify-between w-full text-xs" v-if="podcast.podcast_segments?.length">
            <div class="flex items-center">
              <Icon name="ph:list-bullets" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
              <span>{{ podcast.podcast_segments.length }} segments</span>
            </div>
            <div class="flex items-center" v-if="podcast.total_word_count">
              <Icon name="ph:text-aa" class="h-3 w-3 mr-1.5" :class="podcast.cover_image_url ? 'text-white/80' : 'text-muted-foreground'" />
              <span>{{ formatWordCount(podcast.total_word_count) }} words</span>
            </div>
          </div>

          <!-- Topic tag -->
          <div v-if="podcast.topic" class="flex items-center">
            <span
              class="px-3 py-1 rounded-full text-xs font-medium line-clamp-1 transition-all duration-300"
              :class="podcast.cover_image_url ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-primary/10 text-primary'"
              :title="podcast.topic"
            >
              {{ podcast.topic }}
            </span>
          </div>
        </div>

        <!-- Extended content - Description -->
        <div class="flex-1">
          <p 
            v-if="podcast.description"
            :class="podcast.cover_image_url ? 'text-white/90' : 'text-muted-foreground'"
            class="text-xs sm:text-sm line-clamp-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            {{ podcast.description }}
          </p>
        </div>
      </div>

      <!-- Central Play Button Area -->
      <div class="absolute bottom-4 right-4 z-30">
        <!-- Continue Editing Button -->
        <Button
          v-if="hasUnsynthesizedSegments(podcast)"
          variant="default"
          size="icon"
          class="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:scale-110 transition-all"
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
          class="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:scale-110 transition-all"
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
          class="w-12 h-12 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-lg hover:scale-110 transition-all animate-pulse"
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
      
      <!-- Bottom Actions Area -->
      <div class="absolute bottom-4 left-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
        <!-- Generate cover button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40"
          :class="podcast.cover_image_url ? 'text-white' : 'text-foreground'"
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
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40"
          :class="podcast.cover_image_url ? 'text-white' : 'text-foreground'"
          title="Download podcast"
          @click.stop="emit('download-podcast', String(podcast.podcast_id))"
        >
          <Icon name="ph:download-simple" class="h-4 w-4" />
        </Button>
        
        <!-- Edit button -->
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40"
          :class="podcast.cover_image_url ? 'text-white' : 'text-foreground'"
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
          class="h-8 w-8 rounded-full backdrop-blur-sm bg-background/20 hover:bg-background/40"
          :class="podcast.cover_image_url ? 'text-white' : 'text-foreground'"
          title="Share podcast"
          @click.stop="openSharePreviewModal(podcast.podcast_id)"
        >
          <Icon name="ph:share" class="h-4 w-4" />
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
</script>

<style scoped>
/* Keep animations concise */
.group {
  transition: all 0.3s cubic-bezier(.4,0,.2,1);
}

/* Simplified hover effect */
.group:hover {
  transform: scale(1.02);
}

/* Retain necessary text shadow effect */
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
</style>
