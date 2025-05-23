<template>
  <div class="container mx-auto py-4 md:py-10">
    <!-- Top Action Bar and Filters -->
    <div class="w-full mb-6 px-2 md:px-6">
      <!-- 筛选器容器 -->
      <div class="bg-background border rounded-lg p-3 shadow-sm">
        <!-- 标题和筛选器一行布局 -->
        <div class="flex items-center gap-4">
          <!-- 标题 -->
          <div class="flex items-center gap-2 text-sm font-medium">
            <Icon name="ph:funnel" class="h-4 w-4 text-primary" />
            Filters
          </div>
          
          <!-- 筛选器组 -->
          <div class="flex items-center gap-3 flex-1">
            <!-- 搜索 -->
            <div class="relative min-w-[200px]">
              <Icon name="ph:magnifying-glass" class="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                v-model="searchTerm"
                placeholder="Search..."
                class="pl-10 h-8 text-sm"
              />
            </div>
            
            <!-- 状态选择器 -->
            <div class="flex items-center bg-muted rounded-md p-1">
              <Button 
                :variant="podcastStatusFilter === 'all' ? 'default' : 'ghost'" 
                size="sm"
                @click="podcastStatusFilter = 'all'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                All
              </Button>
              <Button 
                :variant="podcastStatusFilter === 'completed' ? 'default' : 'ghost'" 
                size="sm"
                @click="podcastStatusFilter = 'completed'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:check-circle" class="mr-1 h-3 w-3" />
                Done
              </Button>
              <Button 
                :variant="podcastStatusFilter === 'in-progress' ? 'default' : 'ghost'" 
                size="sm"
                @click="podcastStatusFilter = 'in-progress'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:hourglass" class="mr-1 h-3 w-3" />
                Progress
              </Button>
              <Button 
                :variant="podcastStatusFilter === 'not-started' ? 'default' : 'ghost'" 
                size="sm"
                @click="podcastStatusFilter = 'not-started'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:circle-dashed" class="mr-1 h-3 w-3" />
                New
              </Button>
            </div>
            
            <!-- 语言选择器 -->
            <div class="flex items-center bg-muted rounded-md p-1">
              <Button
                :variant="languageFilter === 'all' ? 'default' : 'ghost'"
                size="sm"
                @click="languageFilter = 'all'"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:globe" class="mr-1 h-3 w-3" />
                All
              </Button>
              <Button
                v-for="lang in availableLanguages.slice(0, 3)"
                :key="lang"
                :variant="languageFilter === lang ? 'default' : 'ghost'"
                size="sm"
                @click="languageFilter = lang"
                class="h-6 px-2 text-xs rounded-sm"
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
                class="h-6 px-2 text-xs rounded-sm"
              >
                <Icon name="ph:dots-three" class="h-3 w-3" />
                <span class="hidden sm:inline ml-1">+{{ availableLanguages.length - 3 }}</span>
              </Button>
            </div>
            
            <!-- 展开的更多语言 -->
            <div v-if="showMoreLanguages && availableLanguages.length > 3" 
                 class="flex items-center bg-muted rounded-md p-1 ml-2">
              <Button
                v-for="lang in availableLanguages.slice(3)"
                :key="`extra-${lang}`"
                :variant="languageFilter === lang ? 'default' : 'ghost'"
                size="sm"
                @click="selectLanguage(lang)"
                class="h-6 px-2 text-xs rounded-sm"
              >
                <div class="flex items-center gap-1">
                  <span class="text-sm">{{ getLanguageFlag(lang) }}</span>
                  <span class="hidden sm:inline">{{ lang }}</span>
                </div>
              </Button>
            </div>
          </div>
          
          <!-- 统计和重置 -->
          <div class="flex items-center gap-3 text-sm">
            <span class="text-muted-foreground whitespace-nowrap">{{ filteredPodcasts.length }} results</span>
            <Button variant="ghost" size="sm" @click="resetFilters" class="h-8 px-3 text-sm">
              <Icon name="ph:arrow-clockwise" class="mr-1 h-4 w-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Conditional Rendering for Content Area -->
    <div class="p-4 mx-auto">
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
        <Button @click="fetchPodcasts" size="lg">
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

    <!-- Podcast Detail Drawer/Sheet -->
    <Sheet :open="!!selectedPodcast" @update:open="handleCloseDrawer">
      <SheetContent side="right" class="w-full sm:max-w-2xl"> 
        <SheetHeader>
          <SheetTitle>Podcast Details</SheetTitle>
          <SheetDescription>
            View and manage podcast details and segments.
          </SheetDescription>
        </SheetHeader>
        <PodcastDetailDrawer
          :podcast="selectedPodcast"
          @close="handleCloseDrawer"
          @resynthesize-all="handleResynthesizeAll"
          @download-all="handleDownloadAll"
          @delete-podcast="handleDeletePodcast"
        />
      </SheetContent>
    </Sheet>

    <!-- No longer need hidden audio player, now using global audio player -->
  </div>
</template>

<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { computed, nextTick, onMounted, ref } from 'vue';
import PodcastDetailDrawer from '~/components/podcasts/PodcastDetailDrawer.vue';
import PodcastList from '~/components/podcasts/PodcastList.vue';
import { usePodcastDatabase } from '~/composables/usePodcastDatabase';
import { usePersonaCache } from '~/composables/usePersonaCache'; // 新增导入
import { type Podcast, type Segment, type SegmentAudio } from '~/types/podcast';
import { usePodcastPlayer } from '~/composables/usePodcastPlayer';

const searchTerm = ref('');
const podcastStatusFilter = ref('completed'); // 播客状态筛选，默认显示已完成状态
const languageFilter = ref('all'); // 新增语言筛选状态
const availableLanguages = ref<string[]>([]); // 新增可用语言列表
const showMoreLanguages = ref(false);

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
        podcast.host_persona.language_support.forEach(lang => podcastLanguages.add(lang));
      }
      if (podcast.guest_persona?.language_support) {
        podcast.guest_persona.language_support.forEach(lang => podcastLanguages.add(lang));
      }
      if (podcast.creator_persona?.language_support) {
        podcast.creator_persona.language_support.forEach(lang => podcastLanguages.add(lang));
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

// Handle closing the detail drawer
const handleCloseDrawer = () => {
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

<style scoped>
/* Page styles */
</style>
