<template>
  <PWALayout title="Podcasts" :show-header="true" :show-footer="false">
    <template #header>
      <div class="flex items-center justify-between p-4 safe-area-top">
        <h1 class="text-lg font-semibold">Podcasts</h1>
        <div class="flex items-center gap-2">
          <!-- 可以在这里添加头部操作按钮 -->
        </div>
      </div>
    </template>

    <div class="container mx-auto py-4 md:py-10 safe-area-all">
      <!-- Top Action Bar and Filters -->
      <div class="w-full mb-6 px-2 md:px-6">
        <!-- 筛选器容器 -->
        <div class="bg-background border rounded-lg p-3 shadow-sm">
          <!-- 移动端垂直布局，桌面端水平布局 -->
          <div class="flex flex-col md:flex-row md:items-center gap-4">
            <!-- 标题 -->
            <div class="flex items-center gap-2 text-sm font-medium">
              <Icon name="ph:funnel" class="h-4 w-4 text-primary" />
              Filters
            </div>
            
            <!-- 筛选器组 - 移动端垂直排列 -->
            <div class="flex flex-col md:flex-row md:items-center gap-3 md:flex-1">
              <!-- 搜索 - 移动端全宽 -->
              <div class="relative w-full md:min-w-[200px] md:w-auto">
                <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  v-model="searchTerm"
                  placeholder="Search podcasts..."
                  class="pl-10 h-8 text-sm w-full ios-input-fix"
                />
              </div>
              
              <!-- 状态选择器 - 移动端全宽，支持滚动 -->
              <div class="w-full md:w-auto">
                <div class="flex items-center bg-muted rounded-md p-1 w-full md:w-auto overflow-x-auto ios-fix">
                  <Button 
                    :variant="podcastStatusFilter === 'all' ? 'default' : 'ghost'" 
                    size="sm"
                    @click="podcastStatusFilter = 'all'"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    All
                  </Button>
                  <Button 
                    :variant="podcastStatusFilter === 'completed' ? 'default' : 'ghost'" 
                    size="sm"
                    @click="podcastStatusFilter = 'completed'"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <Icon name="ph:check-circle" class="mr-1 h-3 w-3" />
                    <span class="hidden xs:inline">Done</span>
                    <span class="xs:hidden">✓</span>
                  </Button>
                  <Button 
                    :variant="podcastStatusFilter === 'in-progress' ? 'default' : 'ghost'" 
                    size="sm"
                    @click="podcastStatusFilter = 'in-progress'"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <Icon name="ph:hourglass" class="mr-1 h-3 w-3" />
                    <span class="hidden xs:inline">Progress</span>
                    <span class="xs:hidden">⏳</span>
                  </Button>
                  <Button 
                    :variant="podcastStatusFilter === 'not-started' ? 'default' : 'ghost'" 
                    size="sm"
                    @click="podcastStatusFilter = 'not-started'"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <Icon name="ph:circle-dashed" class="mr-1 h-3 w-3" />
                    <span class="hidden xs:inline">New</span>
                    <span class="xs:hidden">○</span>
                  </Button>
                </div>
              </div>
              
              <!-- 语言选择器 - 移动端全宽，支持滚动 -->
              <div class="w-full md:w-auto">
                <div class="flex items-center bg-muted rounded-md p-1 w-full md:w-auto overflow-x-auto ios-fix">
                  <Button
                    :variant="languageFilter === 'all' ? 'default' : 'ghost'"
                    size="sm"
                    @click="languageFilter = 'all'"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <Icon name="ph:globe" class="mr-1 h-3 w-3" />
                    <span class="hidden xs:inline">All</span>
                    <span class="xs:hidden">🌐</span>
                  </Button>
                  <Button
                    v-for="lang in availableLanguages.slice(0, 3)"
                    :key="lang"
                    :variant="languageFilter === lang ? 'default' : 'ghost'"
                    size="sm"
                    @click="languageFilter = lang"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <div class="flex items-center gap-1">
                      <span class="text-sm">{{ getLanguageFlag(lang) }}</span>
                      <span class="hidden sm:inline">{{ lang }}</span>
                    </div>
                  </Button>
                  <!-- 更多语言按钮 -->
                  <Button
                    v-if="availableLanguages.length > 3"
                    variant="ghost"
                    size="sm"
                    @click="showMoreLanguages = !showMoreLanguages"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <Icon name="ph:dots-three" class="h-3 w-3" />
                    <span class="hidden sm:inline ml-1">+{{ availableLanguages.length - 3 }}</span>
                  </Button>
                </div>
              </div>
              
              <!-- 展开的更多语言 - 移动端独立一行 -->
              <div v-if="showMoreLanguages && availableLanguages.length > 3" 
                   class="w-full md:w-auto">
                <div class="flex items-center bg-muted rounded-md p-1 w-full md:w-auto overflow-x-auto ios-fix">
                  <Button
                    v-for="lang in availableLanguages.slice(3)"
                    :key="`extra-${lang}`"
                    :variant="languageFilter === lang ? 'default' : 'ghost'"
                    size="sm"
                    @click="selectLanguage(lang)"
                    class="h-6 px-2 text-xs rounded-sm flex-shrink-0 touch-target"
                  >
                    <div class="flex items-center gap-1">
                      <span class="text-sm">{{ getLanguageFlag(lang) }}</span>
                      <span class="hidden sm:inline">{{ lang }}</span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
            
            <!-- 统计和重置 - 移动端水平排列，桌面端不变 -->
            <div class="flex items-center justify-between md:justify-end gap-3 text-sm">
              <span class="text-muted-foreground whitespace-nowrap">{{ filteredPodcasts.length }} results</span>
              <Button variant="ghost" size="sm" @click="resetFilters" class="h-8 px-3 text-sm touch-target">
                <Icon name="ph:arrow-clockwise" class="mr-1 h-4 w-4" />
                <span class="hidden xs:inline">Reset</span>
                <span class="xs:hidden">↻</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Conditional Rendering for Content Area -->
      <div class="p-4 mx-auto safe-area-bottom">
        <!-- Loading State -->
        <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4 w-full">
          <div v-for="n in 3" :key="`skeleton-${n}`" class="border rounded-xl overflow-hidden shadow-md bg-card"> 
            <div class="p-4 space-y-3">
              <div class="flex justify-between items-start">
                <div class="flex-1 space-y-2">
                  <Skeleton class="h-5 w-3/4" />
                  <Skeleton class="h-3 w-1/2" />
                </div>
                <div class="flex gap-1">
                  <Skeleton class="h-7 w-7 rounded" />
                  <Skeleton class="h-7 w-7 rounded" />
                </div>
              </div>
              <div class="space-y-2 pt-2">
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-5/6" />
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-4/5" />
                <Skeleton class="h-4 w-full" />
                <Skeleton class="h-4 w-2/3" />
              </div>
              <div class="grid grid-cols-2 gap-2 pt-2">
                <Skeleton class="h-9 w-full rounded" />
                <Skeleton class="h-9 w-full rounded" />
              </div>
            </div>
          </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="text-center py-10">
          <Icon name="ph:warning-circle-duotone" class="mx-auto h-16 w-16 text-destructive mb-4" />
          <p class="text-xl font-medium text-destructive">Failed to load podcasts</p>
          <p class="text-md text-muted-foreground mb-6">{{ error }}</p>
          <Button @click="fetchPodcasts" size="lg" class="touch-button">
            <Icon name="ph:arrow-clockwise-duotone" class="mr-2 h-5 w-5" />
            Try Again
          </Button>
        </div>
        
        <!-- Podcast List (includes its own empty state) -->
        <PodcastList
          v-else
          :podcasts="filteredPodcasts"
          :current-previewing-id="podcastPlayer.currentPlayingPodcastId.value?.toString() || ''"
          :is-audio-playing="!!podcastPlayer.isPlaying.value"
          @select-podcast="handleSelectPodcast"
          @edit-podcast="handleEditPodcast"
          @delete-podcast="handleDeletePodcast"
          @download-podcast="handleDownloadAll"
          @preview-podcast="handlePreviewPodcast"
          @stop-preview="stopPreview"
          @generate-cover="handleGenerateCover"
        />
      </div>

      <!-- Podcast Synthesis Card Modal -->
      <Dialog :open="!!selectedPodcast" @update:open="handleCloseModal">
        <DialogContent class="podcast-synthesis-modal">
          <ScrollArea class="max-h-[98vh] flex-1 w-full">
            <div class="p-2 md:p-4 lg:p-6 w-full">
              <PodcastSynthesisCard
                :podcast="selectedPodcast"
                :personas="personaCache.personas.value"
                :is-processing="processingPodcastIds.has(selectedPodcast?.podcast_id?.toString() || '')"
                @close="handleCloseModal"
                @synthesize-all="handleSynthesizeAll"
                @resynthesize-segment="handleResynthesizeSegment"
                @preview-podcast="handlePreviewSelectedPodcast"
                @download-all="() => handleDownloadAll(selectedPodcast?.podcast_id?.toString() || '')"
                @publish-podcast="handlePublishPodcast"
              />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <!-- No longer need hidden audio player, now using global audio player -->
    </div>
  </PWALayout>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computed, nextTick, onMounted, ref } from 'vue';
import PodcastSynthesisCard from '~/components/podcasts/PodcastSynthesisCard.vue';
import PodcastList from '~/components/podcasts/PodcastList.vue';
import { usePodcastDatabase } from '~/composables/usePodcastDatabase';
import { usePersonaCache } from '~/composables/usePersonaCache'; // 新增导入
import { type Podcast, type Segment, type SegmentAudio } from '~/types/podcast';
import { usePodcastPlayer } from '~/composables/usePodcastPlayer';
import PWALayout from '~/components/layout/PWALayout.vue';

const searchTerm = ref('');
const podcastStatusFilter = ref('completed'); // 播客状态筛选，默认显示已完成状态
const languageFilter = ref('all'); // 新增语言筛选状态
const availableLanguages = ref<string[]>([]); // 新增可用语言列表
const showMoreLanguages = ref(false);

// 处理中的播客IDs
const processingPodcastIds = ref(new Set<string>());

const {
  podcasts,
  selectedPodcast,
  loading, // Destructure loading state
  error,   // Destructure error state
  fetchPodcasts,
  fetchPodcastById,
  deletePodcast,
  downloadPodcast,
  resynthesizeAllSegments
} = usePodcastDatabase();

const personaCache = usePersonaCache(); // 新增

// Initialize podcast player
const podcastPlayer = usePodcastPlayer();

// 计算播客的状态
function getPodcastStatus(podcast: Podcast): 'completed' | 'in-progress' | 'not-started' {
  if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
    return 'not-started'; // 没有片段，未开始状态
  }
  
  // 检查是否所有片段都有音频
  const allSegmentsHaveAudio = podcast.podcast_segments.every(segment => 
    segment.segment_audios && segment.segment_audios.length > 0
  );
  
  // 检查是否至少有一个片段有音频
  const someSegmentsHaveAudio = podcast.podcast_segments.some(segment => 
    segment.segment_audios && segment.segment_audios.length > 0
  );
  
  if (allSegmentsHaveAudio) {
    return 'completed'; // 所有片段都有音频，已完成
  } else if (someSegmentsHaveAudio) {
    return 'in-progress'; // 部分片段有音频，制作中
  } else {
    return 'not-started'; // 没有片段有音频，未开始
  }
}

// Filtered podcasts based on searchTerm and podcastStatusFilter
const filteredPodcasts = computed<Podcast[]>(() => {
  let result = podcasts.value;
  console.log('[PodcastsPage] Original podcasts:', JSON.parse(JSON.stringify(podcasts.value)));
  console.log('[PodcastsPage] Current searchTerm:', searchTerm.value);
  console.log('[PodcastsPage] Current podcastStatusFilter:', podcastStatusFilter.value);

  // Apply search term filter
  if (searchTerm.value) {
    const lowerSearchTerm = searchTerm.value.toLowerCase();
    result = result.filter(podcast =>
      (podcast.title && podcast.title.toLowerCase().includes(lowerSearchTerm)) ||
      (podcast.topic && podcast.topic.toLowerCase().includes(lowerSearchTerm))
    );
    console.log('[PodcastsPage] Podcasts after searchTerm filter:', JSON.parse(JSON.stringify(result)));
  }
  
  // Apply podcast status filter
  if (podcastStatusFilter.value !== 'all') {
    result = result.filter(podcast => getPodcastStatus(podcast) === podcastStatusFilter.value);
    console.log(`[PodcastsPage] Podcasts after ${podcastStatusFilter.value} filter:`, JSON.parse(JSON.stringify(result)));
  }

  // Apply language filter
  if (languageFilter.value !== 'all') {
    result = result.filter(podcast => {
      const podcastLanguages = new Set<string>();
      if (podcast.host_persona?.language_support) {
        podcast.host_persona.language_support.forEach((lang: string) => podcastLanguages.add(lang));
      }
      if (podcast.guest_persona?.language_support) {
        podcast.guest_persona.language_support.forEach((lang: string) => podcastLanguages.add(lang));
      }
      if (podcast.creator_persona?.language_support) {
        podcast.creator_persona.language_support.forEach((lang: string) => podcastLanguages.add(lang));
      }
      // Check if any of the podcast's languages match the filter
      return podcastLanguages.has(languageFilter.value);
    });
    console.log(`[PodcastsPage] Podcasts after ${languageFilter.value} language filter:`, JSON.parse(JSON.stringify(result)));
  }

  console.log('[PodcastsPage] Final filteredPodcasts:', JSON.parse(JSON.stringify(result)));
  return result;
});

// Fetch podcasts and languages on component mount
onMounted(async () => {
  await fetchPodcasts();
  await personaCache.fetchPersonas();
  availableLanguages.value = personaCache.getSupportedLanguages();
  console.log('[PodcastsPage] Available languages:', availableLanguages.value);
});

// Handle selecting a podcast from the list
const handleSelectPodcast = (podcastId: string) => {
  stopPreview(); // Stop any ongoing preview
  fetchPodcastById(podcastId);
};

// Handle closing the modal
const handleCloseModal = () => {
  selectedPodcast.value = null;
};

// Placeholder handlers for actions
const handleCreateNewPodcast = () => {
  console.log('Create new podcast clicked');
  // Implementation needed
};

const handleEditPodcast = (podcastId: string) => {
  console.log('Edit podcast clicked:', podcastId);
  stopPreview();
  fetchPodcastById(podcastId);
};

// No longer needed since we're using the global audio player

// Stop any current podcast playback
const stopPreview = () => {
  podcastPlayer.stopPodcast();
};

// Handle preview podcast click
const handlePreviewPodcast = async (podcastId: string) => {
  // If same podcast is playing, stop it
  if (podcastPlayer.currentPlayingPodcastId.value === podcastId) {
    stopPreview();
    return;
  }
  
  // Find the podcast by ID
  const podcastToPreview = podcasts.value.find(p => String(p.podcast_id) === String(podcastId));
  
  // If found, play it using the podcast player
  if (podcastToPreview) {
    podcastPlayer.playPodcast(podcastToPreview);
  } else {
    console.warn(`Podcast with ID ${podcastId} not found`);
  }
};


// 合成所有片段
const handleSynthesizeAll = () => {
  if (!selectedPodcast.value) return;
  
  const podcastId = selectedPodcast.value.podcast_id.toString();
  processingPodcastIds.value.add(podcastId);
  
  console.log('Synthesize all segments for podcast:', podcastId);
  resynthesizeAllSegments(podcastId).finally(() => {
    processingPodcastIds.value.delete(podcastId);
  });
};

// 重新合成特定片段
const handleResynthesizeSegment = (segmentIndex: number) => {
  if (!selectedPodcast.value) return;
  
  const podcastId = selectedPodcast.value.podcast_id.toString();
  console.log('Resynthesize segment', segmentIndex, 'for podcast:', podcastId);
  // TODO: 实现单个片段重新合成逻辑
};

// 预览选中的播客
const handlePreviewSelectedPodcast = () => {
  if (!selectedPodcast.value) return;
  
  const podcastId = selectedPodcast.value.podcast_id.toString();
  handlePreviewPodcast(podcastId);
};

// 发布播客
const handlePublishPodcast = () => {
  if (!selectedPodcast.value) return;
  
  const podcastId = selectedPodcast.value.podcast_id.toString();
  console.log('Publish podcast:', podcastId);
  // TODO: 实现发布播客逻辑
};

const handleResynthesizeAll = (podcastId: string) => {
  console.log('Resynthesize all segments for podcast:', podcastId);
  resynthesizeAllSegments(podcastId);
};

const handleDownloadAll = (podcastId: string) => {
  console.log('Download all audio for podcast:', podcastId);
  downloadPodcast(podcastId);
};

const handleDeletePodcast = (podcastId: string) => {
  console.log('Delete podcast:', podcastId);
  deletePodcast(podcastId);
};

const handleGenerateCover = async (podcastId: string) => {
  console.log('[PodcastsPage] Refreshing podcasts after cover generation for podcast:', podcastId);
  
  try {
    // 只刷新播客数据，不再生成封面
    await fetchPodcasts();
    console.log('[PodcastsPage] Podcasts refreshed successfully');
  } catch (error) {
    console.error('[PodcastsPage] Error refreshing podcasts:', error);
  }
};

const resetFilters = () => {
  searchTerm.value = '';
  podcastStatusFilter.value = 'completed';
  languageFilter.value = 'all';
  showMoreLanguages.value = false;
};

// 获取语言对应的国旗
const getLanguageFlag = (lang: string) => {
  const languageFlags: Record<string, string> = {
    'English': '🇬🇧',
    'Chinese': '🇨🇳',
    'Japanese': '🇯🇵',
    'Korean': '🇰🇷',
    'Spanish': '🇪🇸',
    'French': '🇫🇷',
    'German': '🇩🇪',
    'Italian': '🇮🇹',
    'Portuguese': '🇵🇹',
    'Russian': '🇷🇺',
    'Arabic': '🇦🇪',
    'Hindi': '🇮🇳'
  };
  return languageFlags[lang] || '🌐';
};

// 选择语言并关闭更多语言面板
const selectLanguage = (lang: string) => {
  languageFilter.value = lang;
  showMoreLanguages.value = false;
};
</script>

<style>
/* 强制覆盖DialogContent的默认样式 */
.podcast-synthesis-modal {
  width: 98vw !important;
  max-width: 1400px !important;
  max-height: 98vh !important;
  overflow: hidden !important;
  padding: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  grid-template-columns: none !important;
}

/* 如果还有更深层的grid样式，也强制覆盖 */
.podcast-synthesis-modal[data-state="open"] {
  display: flex !important;
}
</style>

<style scoped>
/* 添加xs断点支持 */
@media (min-width: 475px) {
  .xs\:inline {
    display: inline;
  }
  .xs\:hidden {
    display: none;
  }
}

@media (max-width: 474px) {
  .xs\:inline {
    display: none;
  }
  .xs\:hidden {
    display: inline;
  }
}

/* 移动端滚动条样式优化 */
.overflow-x-auto {
  scrollbar-width: thin;
  scrollbar-color: rgb(203 213 225 / 0.5) transparent;
}

.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background-color: rgb(203 213 225 / 0.5);
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background-color: rgb(203 213 225 / 0.8);
}

/* 确保按钮在移动端有足够的触摸目标 */
@media (max-width: 768px) {
  .flex-shrink-0 {
    min-width: 40px;
    min-height: 32px;
  }
}
</style>
