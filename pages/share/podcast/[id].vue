<template>
  <div class="min-h-screen bg-background flex flex-col items-center p-4 md:p-8">
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <p class="text-xl">Loading podcast...</p>
    </div>
    <div v-else-if="error" class="flex-grow flex items-center justify-center text-destructive">
      <p class="text-xl">Error loading podcast: {{ error.message }}</p>
    </div>
    <div v-else-if="podcast" class="w-full max-w-3xl mx-auto">
      <!-- Podcast Card -->
      <Card class="relative bg-card text-card-foreground rounded-xl shadow-md border overflow-hidden mb-8">
        <div class="relative">
          <img v-if="podcastCoverUrl" :src="podcastCoverUrl" alt="Podcast Cover"
            class="w-full aspect-square object-cover rounded-t-xl" />
          <div v-else class="w-full aspect-square flex items-center justify-center bg-muted text-muted-foreground rounded-t-xl">
            <Icon name="ph:image" class="h-16 w-16" />
          </div>
          <!-- 渐变蒙层 -->
          <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none rounded-t-xl" />
        </div>
        <div class="p-6">
          <div class="flex items-center gap-2 mb-2">
            <Badge v-if="podcast.topic" variant="secondary" class="rounded px-2 py-0.5 text-xs">{{ podcast.topic }}</Badge>
          </div>
          <h1 class="text-3xl md:text-4xl font-bold mb-2 leading-tight">{{ podcast.title }}</h1>
          <p v-if="podcastArtist" class="text-base text-muted-foreground mb-4">{{ podcastArtist }}</p>
          <p v-if="podcast.description" class="text-sm text-muted-foreground mb-4 line-clamp-3">{{ podcast.description }}</p>
          <!-- 分享操作区 -->
          <div class="flex flex-wrap gap-3 mt-4">
            <Button variant="outline" @click="copyShareLink" aria-label="Copy share link" title="Copy share link">
              <Icon name="ph:link" class="h-5 w-5 mr-2" />Copy Link
            </Button>
            <Button variant="outline" @click="showWeChatQr = true" aria-label="Share to WeChat" title="Share to WeChat">
              <Icon name="ph:wechat-logo" class="h-5 w-5 mr-2 text-green-500" />WeChat
            </Button>
            <Button variant="outline" @click="shareToWeibo" aria-label="Share to Weibo" title="Share to Weibo">
              <Icon name="ph:weibo-logo" class="h-5 w-5 mr-2 text-[#e6162d]" />Weibo
            </Button>
            <Button variant="outline" @click="shareToTwitter" aria-label="Share to Twitter" title="Share to Twitter">
              <Icon name="ph:twitter-logo" class="h-5 w-5 mr-2 text-blue-400" />Twitter
            </Button>
          </div>
          <!-- 微信二维码弹窗 -->
          <Dialog v-model:open="showWeChatQr">
            <DialogContent class="flex flex-col items-center p-6">
              <DialogTitle>Scan QR to Share on WeChat</DialogTitle>
              <div class="my-4">
                <QRCodeVue :value="shareUrl" :size="180" class="rounded-lg shadow-md" />
              </div>
              <DialogClose as-child>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <!-- 播放器与分段列表 -->
      <Card class="bg-card text-card-foreground rounded-xl shadow-md border overflow-hidden mb-8">
        <div v-if="audioQueue.length > 0" class="p-6">
          <div class="flex items-center gap-4 mb-4">
            <Button variant="ghost" :disabled="currentSegmentIndex === 0" @click="playPreviousSegment" aria-label="Previous segment">
              <Icon name="ph:skip-back" class="h-6 w-6" />
            </Button>
            <Button variant="default" @click="togglePlayPause" aria-label="Play/Pause">
              <Icon :name="isPlaying ? 'ph:pause-fill' : 'ph:play-fill'" class="h-8 w-8" />
            </Button>
            <Button variant="ghost" :disabled="currentSegmentIndex === audioQueue.length - 1" @click="playNextSegment" aria-label="Next segment">
              <Icon name="ph:skip-forward" class="h-6 w-6" />
            </Button>
            <span class="ml-4 text-sm text-muted-foreground">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>
          </div>
          <div class="w-full bg-muted rounded-full h-2 mb-4 cursor-pointer" @click="seek">
            <div class="bg-primary h-2 rounded-full transition-all" :style="{ width: progressPercentage + '%' }"></div>
          </div>
        </div>
        <div v-else class="p-6 text-muted-foreground text-center">No audio segments available for this podcast.</div>

        <div v-if="audioQueue.length > 0" class="p-6 pt-0">
          <h3 class="text-lg font-semibold mb-4">Episodes / Segments</h3>
          <ul>
            <li v-for="(segment, index) in audioQueue" :key="segment.url + '-' + index"
              @click="playSegment(index)"
              :class="['flex justify-between items-center p-3 rounded-md cursor-pointer transition', { 'bg-muted text-primary': currentSegmentIndex === index, 'hover:bg-accent': currentSegmentIndex !== index }]
              "
            >
              <div class="flex items-center min-w-0">
                <span class="mr-3 text-xs text-muted-foreground w-6 text-right flex-shrink-0">{{ index + 1 }}.</span>
                <span class="font-medium truncate h-6 leading-6 overflow-hidden">{{ segment.title }}</span>
              </div>
              <Icon v-if="currentSegmentIndex === index && isPlaying" name="ph:waveform" class="h-5 w-5 text-primary animate-pulse" />
              <Icon v-else name="ph:play" class="h-5 w-5 text-muted-foreground" />
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
import { ref, computed, onMounted, watch } from 'vue';

import { useRoute } from 'vue-router';
import { useAudioPlayer } from '~/composables/useAudioPlayer';
import QRCodeVue from 'qrcode-vue';
import { usePodcastDatabase, type Podcast } from '~/composables/usePodcastDatabase';

const showWeChatQr = ref(false);
const shareUrl = computed(() => window?.location?.href || '');
const { toast } = useToast();
const route = useRoute();
const { fetchPodcastById, selectedPodcast } = usePodcastDatabase();

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
      await fetchPodcastById(podcastId);

      if (selectedPodcast.value) {
        podcast.value = selectedPodcast.value;
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

function seek(event: MouseEvent) {
  if (audioPlayer.value && duration.value > 0 && !isLoadingAudio.value) {
    const progressBar = (event.currentTarget as HTMLElement);
    const clickPosition = (event.offsetX / progressBar.offsetWidth) * duration.value;
    audioPlayer.value.currentTime = clickPosition;
    if (!isPlaying.value) {
      currentTime.value = clickPosition;
    }
  }
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
.custom-player .progress-bar-container {
  transition: height 0.2s ease-in-out;
}
.custom-player .progress-bar-container:hover {
  height: 0.75rem;
}
.custom-player .progress-bar-container:hover .progress-bar {
  height: 0.75rem;
}
.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.segment-item:hover .text-gray-400:not(.w-6) {
  color: #ec4899;
}
</style>
