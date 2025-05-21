<template>
  <div class="min-h-screen bg-background flex flex-col items-center p-3 sm:p-4 md:p-8">
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <div class="flex flex-col items-center gap-2">
        <Icon name="ph:spinner-gap" class="h-8 w-8 animate-spin text-primary" />
        <p class="text-lg">Loading podcast...</p>
      </div>
    </div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-destructive">
      <p class="text-lg sm:text-xl">Error loading podcast: {{ error.message }}</p>
    </div>
    <div v-else-if="podcast" class="w-full max-w-3xl mx-auto">
      <!-- Podcast Card -->
      <Card class="relative bg-card text-card-foreground rounded-xl shadow-md border overflow-hidden mb-6 sm:mb-8">
        <div class="relative">
          <img v-if="podcastCoverUrl" :src="podcastCoverUrl" alt="Podcast Cover"
            class="w-full aspect-square object-cover rounded-t-xl" />
          <div v-else class="w-full aspect-square flex items-center justify-center bg-muted text-muted-foreground rounded-t-xl">
            <Icon name="ph:image" class="h-12 w-12 sm:h-16 sm:w-16" />
          </div>
          <!-- 渐变蒙层 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none rounded-t-xl" />
        </div>
        <div class="p-4 sm:p-6">
          <div class="flex items-center gap-2 mb-2">
            <Badge v-if="podcast.topic" variant="secondary" class="rounded px-2 py-0.5 text-xs">{{ podcast.topic }}</Badge>
          </div>
          <h1 class="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 leading-tight tracking-tight">{{ podcast.title }}</h1>
          <p v-if="podcastArtist" class="text-base text-muted-foreground mb-4">{{ podcastArtist }}</p>
          <p v-if="podcast.description" class="text-sm text-muted-foreground mb-4 line-clamp-3">{{ podcast.description }}</p>
          <!-- 分享操作区 -->
          <div class="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" @click="copyShareLink" aria-label="Copy share link" title="Copy share link" class="share-button">
              <Icon name="ph:link-simple" class="share-icon text-primary" />
              <span class="share-text">Copy Link</span>
            </Button>
            <Button variant="outline" @click="showWeChatQr = true" aria-label="Share to WeChat" title="Share to WeChat" class="share-button">
              <Icon name="ph:wechat-logo-fill" class="share-icon text-green-500" />
              <span class="share-text">WeChat</span>
            </Button>
            <Button variant="outline" @click="shareToWeibo" aria-label="Share to Weibo" title="Share to Weibo" class="share-button">
              <Icon name="simple-icons:sinaweibo" class="share-icon text-[#e6162d]" />
              <span class="share-text">Weibo</span>
            </Button>
            <Button variant="outline" @click="shareToTwitter" aria-label="Share to Twitter" title="Share to Twitter" class="share-button">
              <Icon name="ph:twitter-logo-fill" class="share-icon text-blue-400" />
              <span class="share-text">Twitter</span>
            </Button>
          </div>
          <!-- 微信二维码弹窗 -->
          <Dialog v-model:open="showWeChatQr">
            <DialogContent class="flex flex-col items-center p-4 sm:p-6">
              <DialogTitle>Scan QR to Share on WeChat</DialogTitle>
              <div class="my-4">
                <div v-if="qrCodeLoaded" class="qr-code-container rounded-lg shadow-md overflow-hidden">
                  <QRCodeVue3 :value="shareUrl" :size="qrCodeSize" :margin="2" class="rounded-lg" />
                </div>
                <div v-else class="qr-code-placeholder rounded-lg shadow-md flex items-center justify-center">
                  <Icon name="ph:qr-code" class="h-10 w-10 text-muted-foreground" />
                </div>
              </div>
              <DialogClose as-child>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <!-- 播放器与分段列表 -->
      <Card class="bg-card text-card-foreground rounded-xl shadow-md border overflow-hidden mb-6 sm:mb-8">
        <div v-if="audioQueue.length > 0" class="p-4 sm:p-6">
          <div class="player-controls">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <Button variant="ghost" :disabled="currentSegmentIndex === 0" @click="playPreviousSegment" aria-label="Previous segment" class="control-button">
                  <Icon name="ph:skip-back-fill" class="control-icon" />
                </Button>
                <Button variant="default" @click="togglePlayPause" aria-label="Play/Pause" :disabled="isLoadingAudio" class="play-button">
                  <Icon v-if="isLoadingAudio" name="ph:spinner-gap" class="play-icon animate-spin" />
                  <Icon v-else :name="isPlaying ? 'ph:pause-fill' : 'ph:play-fill'" class="play-icon" />
                </Button>
                <Button variant="ghost" :disabled="currentSegmentIndex === audioQueue.length - 1 || isLoadingAudio" @click="playNextSegment" aria-label="Next segment" class="control-button">
                  <Icon name="ph:skip-forward-fill" class="control-icon" />
                </Button>
              </div>
              <span class="text-sm text-muted-foreground time-display">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
            </div>
            <div class="progress-container">
              <div class="w-full bg-muted rounded-full h-2 mb-4 cursor-pointer player-progress-bar-container" @click="seek" @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
                <div class="bg-primary h-full rounded-full transition-all" :style="{ width: progressPercentage + '%' }">
                  <div class="progress-handle" :style="{ left: progressPercentage + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="p-6 text-muted-foreground text-center">No audio segments available for this podcast.</div>

        <div v-if="audioQueue.length > 0" class="p-4 sm:p-6 pt-0 mt-2">
          <h3 class="text-base sm:text-lg font-semibold mb-3 sm:mb-4 mt-4 sm:mt-6">Episodes / Segments</h3>
          <ul>
            <li v-for="(segment, index) in audioQueue" :key="segment.url + '-' + index"
              @click="playSegment(index)"
              :class="['flex justify-between items-center p-2 sm:p-3 rounded-md cursor-pointer transition group', { 'bg-muted text-primary': currentSegmentIndex === index, 'hover:bg-accent': currentSegmentIndex !== index }]
              "
            >
              <div class="flex items-center min-w-0">
                <span class="mr-2 sm:mr-3 text-xs text-muted-foreground w-5 sm:w-6 text-right flex-shrink-0">{{ index + 1 }}.</span>
                <span class="font-medium truncate h-5 sm:h-6 leading-5 sm:leading-6 overflow-hidden text-sm sm:text-base">{{ segment.title }}</span>
              </div>
              <Icon v-if="currentSegmentIndex === index && isPlaying" name="ph:waveform-fill" class="segment-icon text-primary animate-pulse" />
              <Icon v-else name="ph:play-fill" class="segment-icon text-muted-foreground group-hover:text-primary" />
            </li>
          </ul>
        </div>
      </Card>
    </div>
    <div v-else class="flex-grow flex items-center justify-center text-muted-foreground">
      <p class="text-xl">Podcast not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import QRCodeVue3 from 'qrcode-vue3';
import { useWindowSize } from '@vueuse/core';
import { toast } from 'vue-sonner';
import type { Podcast } from '~/composables/usePodcastDatabase';

const showWeChatQr = ref(false);
const shareUrl = computed(() => window?.location?.href || '');
const route = useRoute();

const podcast = ref<Podcast | null>(null);
const loading = ref(true);
const error = ref<Error | null>(null);

const audioPlayer = ref<HTMLAudioElement | null>(null);
const audioQueue = ref<{ title: string; url: string }[]>([]);
const currentSegmentIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const isLoadingAudio = ref(false);

// 响应式窗口尺寸
const { width } = useWindowSize();
const isMobile = computed(() => width.value < 640);

// QR码尺寸响应式调整
const qrCodeSize = computed(() => isMobile.value ? 150 : 180);
const qrCodeLoaded = ref(true);

// 创建音频元素
onMounted(() => {
  audioPlayer.value = new Audio();
  audioPlayer.value.addEventListener('timeupdate', updateProgress);
  audioPlayer.value.addEventListener('loadedmetadata', updateDurationAndPlay);
  audioPlayer.value.addEventListener('ended', handleSegmentEnd);
  audioPlayer.value.addEventListener('error', handleAudioError);
});

// 清理音频元素
onBeforeUnmount(() => {
  if (audioPlayer.value) {
    audioPlayer.value.removeEventListener('timeupdate', updateProgress);
    audioPlayer.value.removeEventListener('loadedmetadata', updateDurationAndPlay);
    audioPlayer.value.removeEventListener('ended', handleSegmentEnd);
    audioPlayer.value.removeEventListener('error', handleAudioError);
    audioPlayer.value.pause();
    audioPlayer.value = null;
  }
});

const podcastCoverUrl = computed(() => {
  if (!podcast.value) return null;
  return podcast.value.cover_image_url || podcast.value.host_persona?.avatar_url || podcast.value.creator_persona?.avatar_url || null;
});

const podcastArtist = computed(() => {
  if (!podcast.value) return 'Unknown Artist';
  return podcast.value.host_persona?.name || podcast.value.creator_persona?.name || 'Unknown Artist';
});

const currentSegment = computed(() => {
  return audioQueue.value[currentSegmentIndex.value] || null;
});

const progressPercentage = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

function copyShareLink() {
  navigator.clipboard.writeText(shareUrl.value);
  toast({ title: 'Link copied!', description: 'Share link copied to clipboard.', variant: 'success' });
}
function shareToWeibo() {
  window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl.value)}`, '_blank');
}
function shareToTwitter() {
  window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl.value)}`, '_blank');
}

onMounted(async () => {
  const podcastId = route.params.id as string;
  if (podcastId) {
    try {
      loading.value = true;
      error.value = null;
      
      // 使用新创建的公共 API 端点获取播客数据
      const { data: podcastData } = await useFetch(`/api/public/podcast/${podcastId}`);
      
      if (podcastData.value) {
        podcast.value = podcastData.value as Podcast;
        const rawSegments: { idx: number; fullTitle: string; truncatedTitle: string; audioUrl?: string }[] = [];
        if (podcast.value && podcast.value.podcast_segments) {
          podcast.value.podcast_segments.forEach((segment: any) => {
            let audioUrlToPlay: string | undefined = undefined;
            if (segment.segment_audios && segment.segment_audios.length > 0) {
              const finalAudio = segment.segment_audios.find((audio: any) => audio.version_tag === 'final');
              audioUrlToPlay = (finalAudio?.audio_url ?? undefined) || (segment.segment_audios.find((audio: any) => audio.audio_url)?.audio_url ?? undefined);
            }
            const fullText = (segment.text && String(segment.text).length > 0) ? String(segment.text) : `Segment ${segment.idx}`;
            const truncatedText = fullText.length > 50 ? fullText.substring(0, 50) + '...' : fullText;
            if (audioUrlToPlay) {
              rawSegments.push({
                idx: segment.idx,
                fullTitle: fullText,
                truncatedTitle: truncatedText,
                audioUrl: audioUrlToPlay
              });
            }
          });
        }
        prepareAudioQueue(rawSegments);
      } else {
        error.value = new Error(`Podcast with id ${podcastId} not found.`);
      }
    } catch (err) {
      console.error('Failed to fetch podcast:', err);
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  } else {
    loading.value = false;
    error.value = new Error('Podcast ID is missing from route parameters.');
  }
});

function prepareAudioQueue(segments: { idx: number; fullTitle: string; truncatedTitle: string; audioUrl?: string }[]) {
  audioQueue.value = segments
    .filter(segment => segment.audioUrl)
    .map(segment => ({
      title: segment.truncatedTitle,
      fullTitle: segment.fullTitle,
      url: segment.audioUrl!,
    }));
  if (audioQueue.value.length > 0 && audioPlayer.value) {
    audioPlayer.value.src = audioQueue.value[0].url;
    currentSegmentIndex.value = 0;
  }
}

function loadAndPlayAudio(playWhenReady: boolean = true) {
  if (audioPlayer.value && currentSegment.value) {
    isLoadingAudio.value = true;
    audioPlayer.value.src = currentSegment.value.url;
    audioPlayer.value.load();
    if (playWhenReady) {
      // Play will be called in updateDurationAndPlay after metadata is loaded
    } else {
      const canPlayHandler = () => {
        isLoadingAudio.value = false;
        audioPlayer.value?.removeEventListener('canplay', canPlayHandler);
      };
      audioPlayer.value.addEventListener('canplay', canPlayHandler);
    }
  } else {
    console.warn("Audio player or current segment not available for loading.");
    isLoadingAudio.value = false;
  }
}

function playAudio() {
  if (audioPlayer.value && audioPlayer.value.src && audioPlayer.value.readyState >= 2) {
    audioPlayer.value.play().then(() => {
      isPlaying.value = true;
      isLoadingAudio.value = false;
    }).catch(e => {
      console.error('Error playing audio:', e);
      isPlaying.value = false;
      isLoadingAudio.value = false;
      error.value = new Error(`Playback failed: ${e.message}`);
    });
  } else if (audioPlayer.value && currentSegment.value) {
    loadAndPlayAudio(true);
  }
}

function pauseAudio() {
  if (audioPlayer.value) {
    audioPlayer.value.pause();
    isPlaying.value = false;
  }
}

function togglePlayPause() {
  if (isLoadingAudio.value) return;
  if (isPlaying.value) {
    pauseAudio();
  } else {
    playAudio();
  }
}

function playSegment(index: number) {
  if (isLoadingAudio.value) return;
  if (index >= 0 && index < audioQueue.value.length) {
    currentSegmentIndex.value = index;
    // isPlaying.value will determine if loadAndPlayAudio auto-plays
  }
}

function playNextSegment() {
  if (isLoadingAudio.value) return;
  const nextIndex = currentSegmentIndex.value + 1;
  if (nextIndex < audioQueue.value.length) {
    playSegment(nextIndex);
  }
}

function playPreviousSegment() {
  if (isLoadingAudio.value) return;
  const prevIndex = currentSegmentIndex.value - 1;
  if (prevIndex >= 0) {
    playSegment(prevIndex);
  }
}

function playLatestOrFirstSegment() {
  if (audioQueue.value.length > 0) {
    if (currentSegmentIndex.value === 0 && isPlaying.value) {
      pauseAudio();
    } else if (currentSegmentIndex.value === 0 && !isPlaying.value) {
      playAudio();
    } else {
      playSegment(0);
    }
  }
}

function updateProgress() {
  if (audioPlayer.value) {
    currentTime.value = audioPlayer.value.currentTime;
  }
}

function updateDurationAndPlay() {
  if (audioPlayer.value) {
    duration.value = audioPlayer.value.duration;
    isLoadingAudio.value = false;
    if (isPlaying.value) {
      audioPlayer.value.play().catch(e => {
        console.error('Error auto-playing after metadata load:', e);
        isPlaying.value = false;
      });
    }
  }
}

function handleSegmentEnd() {
  isPlaying.value = false;
  const nextIndex = currentSegmentIndex.value + 1;
  if (nextIndex < audioQueue.value.length) {
    currentSegmentIndex.value = nextIndex;
    isPlaying.value = true;
  } else {
    currentSegmentIndex.value = 0;
    if(audioPlayer.value) {
      audioPlayer.value.src = audioQueue.value[0]?.url || '';
    }
    duration.value = 0;
    currentTime.value = 0;
  }
}

function handleAudioError(e: Event) {
  console.error('Audio player error:', e);
  const audioEl = e.target as HTMLAudioElement;
  let errorMsg = 'Unknown audio error.';
  if (audioEl.error) {
    switch (audioEl.error.code) {
      case MediaError.MEDIA_ERR_ABORTED: errorMsg = 'Playback aborted.'; break;
      case MediaError.MEDIA_ERR_NETWORK: errorMsg = 'Network error.'; break;
      case MediaError.MEDIA_ERR_DECODE: errorMsg = 'Decoding error.'; break;
      case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMsg = 'Audio format not supported.'; break;
      default: errorMsg = `Unknown error. Code: ${audioEl.error.code}`;
    }
  }
  error.value = new Error(errorMsg);
  isPlaying.value = false;
  isLoadingAudio.value = false;
}

// 进度条触摸处理
const isTouching = ref(false);

function seek(event: MouseEvent) {
  if (audioPlayer.value && duration.value > 0 && !isLoadingAudio.value) {
    const progressBar = (event.currentTarget as HTMLElement);
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPosition = (clickX / progressBar.offsetWidth) * duration.value;
    audioPlayer.value.currentTime = clickPosition;
    if (!isPlaying.value) {
      currentTime.value = clickPosition;
    }
  }
}

function handleTouchStart(event: TouchEvent) {
  isTouching.value = true;
  handleTouchMove(event);
}

function handleTouchMove(event: TouchEvent) {
  if (!isTouching.value) return;
  
  event.preventDefault(); // 防止页面滚动
  
  if (audioPlayer.value && duration.value > 0 && !isLoadingAudio.value) {
    const progressBar = (event.currentTarget as HTMLElement);
    const rect = progressBar.getBoundingClientRect();
    const touchX = event.touches[0].clientX - rect.left;
    
    // 确保值在进度条范围内
    const boundedX = Math.max(0, Math.min(touchX, progressBar.offsetWidth));
    const touchPosition = (boundedX / progressBar.offsetWidth) * duration.value;
    
    // 在拖动过程中更新显示的时间，但不立即设置音频时间
    currentTime.value = touchPosition;
  }
}

function handleTouchEnd(event: TouchEvent) {
  if (!isTouching.value) return;
  
  if (audioPlayer.value && duration.value > 0 && !isLoadingAudio.value) {
    const progressBar = (event.currentTarget as HTMLElement);
    const rect = progressBar.getBoundingClientRect();
    const touchX = event.changedTouches[0].clientX - rect.left;
    
    // 确保值在进度条范围内
    const boundedX = Math.max(0, Math.min(touchX, progressBar.offsetWidth));
    const touchPosition = (boundedX / progressBar.offsetWidth) * duration.value;
    
    // 触摸结束时设置音频时间
    audioPlayer.value.currentTime = touchPosition;
  }
  
  isTouching.value = false;
}

function formatTime(time: number) {
  if (isNaN(time) || time === Infinity) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

watch(currentSegmentIndex, (newIndex, oldIndex) => {
  if (newIndex !== oldIndex && audioQueue.value[newIndex]) {
    loadAndPlayAudio(isPlaying.value);
  } else if (!audioQueue.value[newIndex] && audioPlayer.value) {
    audioPlayer.value.src = '';
    isPlaying.value = false;
    duration.value = 0;
    currentTime.value = 0;
  }
});

definePageMeta({
  layout: 'fullscreen',
});
</script>

<style scoped>
.podcast-page {
  /* Tailwind handles bg and text */
}
.podcast-cover img, .podcast-cover div {
  border: 1px solid rgba(255,255,255,0.1);
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 播放器进度条样式 */
.progress-container {
  position: relative;
  touch-action: none; /* 防止触摸时页面滚动 */
}

.player-progress-bar-container {
  transition: height 0.2s ease-in-out;
  height: 0.5rem; /* Corresponds to h-2 */
  position: relative;
}

.player-progress-bar-container:hover {
  height: 0.75rem; /* Corresponds to h-3, a bit thicker on hover */
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background-color: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.player-progress-bar-container:hover .progress-handle,
.player-progress-bar-container:active .progress-handle {
  opacity: 1;
}

/* 控制按钮样式 */
.player-controls {
  width: 100%;
}

.control-button {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.play-button {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-icon {
  height: 1.5rem;
  width: 1.5rem;
}

.play-icon {
  height: 2rem;
  width: 2rem;
}

.time-display {
  font-variant-numeric: tabular-nums;
}

/* 分享按钮样式 */
.share-button {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
}

.share-icon {
  height: 1.25rem;
  width: 1.25rem;
  margin-right: 0.5rem;
}

.share-text {
  font-size: 0.875rem;
}

/* 分段列表图标 */
.segment-icon {
  height: 1.25rem;
  width: 1.25rem;
}

/* 移动端适配 */
@media (max-width: 640px) {
  .player-controls {
    padding: 0;
  }
  
  .control-button {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .play-button {
    width: 3rem;
    height: 3rem;
  }
  
  .control-icon {
    height: 1.25rem;
    width: 1.25rem;
  }
  
  .play-icon {
    height: 1.75rem;
    width: 1.75rem;
  }
  
  .time-display {
    font-size: 0.75rem;
  }
  
  .share-button {
    padding: 0.375rem 0.625rem;
  }
  
  .share-icon {
    height: 1.125rem;
    width: 1.125rem;
    margin-right: 0.375rem;
  }
  
  .share-text {
    font-size: 0.75rem;
  }
  
  .qr-code-container,
  .qr-code-placeholder {
    width: 150px;
    height: 150px;
  }
}

/* 触摸设备优化 */
@media (hover: none) {
  .progress-handle {
    opacity: 1;
    width: 1.25rem;
    height: 1.25rem;
  }
  
  .player-progress-bar-container {
    height: 0.75rem;
  }
}
</style>
