<template>
  <Dialog :open="isOpen" @update:open="$emit('update:is-open', $event)">
    <DialogContent class="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[700px] h-[80vh] p-0 flex flex-col">
      <DialogHeader class="p-6 pb-0">
        <DialogTitle>Share Podcast Preview</DialogTitle>
        <DialogDescription>
          This is a preview of how your podcast will look when shared.
        </DialogDescription>
      </DialogHeader>

      <!-- Modal content -->
      <div class="px-6 pt-4 pb-2">
        <!-- Podcast Card Preview -->
        <div v-if="podcast" class="relative border rounded-xl shadow-md flex flex-col min-w-[320px] bg-card text-card-foreground mb-4 overflow-hidden">
          <div v-if="podcast.cover_image_url && typeof podcast.cover_image_url === 'string'" class="absolute inset-0 bg-center rounded-xl" :style="{ backgroundImage: `url(${encodeURIComponent(podcast.cover_image_url)})`, opacity: 0.6, zIndex: 0 }"></div>
          <div v-if="podcast.cover_image_url" class="absolute inset-0 bg-gradient-to-b from-black/85 via-black/50 to-black/80 rounded-xl" style="z-index:1"></div>
          <div class="relative z-10 p-6 flex flex-col gap-2">
            <div class="flex flex-row items-center justify-between">
              <h2 class="text-lg font-bold leading-tight line-clamp-2 break-words">{{ podcast.title || `Podcast #${podcast.podcast_id}` }}</h2>
              <span v-if="podcast.topic" class="px-3 py-1 rounded-full text-xs font-semibold ml-2" :class="podcast.cover_image_url ? 'bg-white/30 text-white' : 'bg-primary/10 text-primary'">{{ podcast.topic }}</span>
            </div>
            <p v-if="podcast.description" class="text-sm line-clamp-2 text-left mb-2" :class="podcast.cover_image_url ? 'text-white/90' : 'text-muted-foreground'">{{ podcast.description }}</p>
          </div>
        </div>
      </div>

      <div class="flex-1 px-6 pb-2" style="min-height:200px;">
        <iframe
          v-if="shareIframeSrc && !iframeError"
          :src="shareIframeSrc"
          class="w-full h-full border-0 rounded-md bg-muted"
          title="Podcast Share Preview"
          allow="autoplay; encrypted-media"
          allowfullscreen
          @error="onIframeError"
        ></iframe>
        <div v-else-if="iframeError" class="flex flex-col items-center justify-center h-full text-destructive">
          Failed to load preview.
          <Button variant="outline" class="mt-2" @click="retryIframe">Retry</Button>
        </div>
        <div v-else class="flex items-center justify-center h-full text-muted-foreground">
          Loading preview...
        </div>
      </div>

      <DialogFooter class="p-6 pt-0 flex flex-row flex-wrap gap-3 items-center">
        <Button
          variant="outline"
          @click="$emit('update:is-open', false)"
          class="rounded-lg h-10 px-4 shadow-sm transition-all"
          aria-label="Close share dialog"
          title="Close share dialog"
        >
          <Icon name="ph:x" class="h-5 w-5 mr-2 text-muted-foreground"/>Close
        </Button>
        <Button
          variant="default"
          @click="copyShareLink"
          class="rounded-lg h-10 px-4 flex items-center gap-2 shadow-md transition-all focus:ring-2 focus:ring-primary/60"
          aria-label="Copy share link"
          title="Copy share link"
        >
          <Icon name="ph:link" class="h-5 w-5 text-primary-foreground"/>Copy Link
        </Button>
        <Button
          variant="outline"
          @click="showWeChatQr = true"
          class="rounded-lg h-10 px-4 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
          aria-label="Share to WeChat"
          title="Share to WeChat"
        >
          <Icon name="ph:wechat-logo" class="h-5 w-5 text-green-500"/>WeChat
        </Button>
        <Button
          variant="outline"
          @click="shareToWeibo"
          class="rounded-lg h-10 px-4 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
          aria-label="Share to Weibo"
          title="Share to Weibo"
        >
          <Icon name="ph:weibo-logo" class="h-5 w-5 text-[#e6162d]"/>Weibo
        </Button>
        <Button
          variant="outline"
          @click="shareToTwitter"
          class="rounded-lg h-10 px-4 flex items-center gap-2 shadow-sm transition-all focus:ring-2 focus:ring-primary/30"
          aria-label="Share to Twitter"
          title="Share to Twitter"
        >
          <Icon name="ph:twitter-logo" class="h-5 w-5 text-sky-500"/>Twitter
        </Button>

        <!-- 微信二维码弹窗 -->
        <Dialog v-model:open="showWeChatQr">
          <DialogContent class="flex flex-col items-center justify-center gap-4 py-8">
            <div class="text-lg font-medium">Scan with WeChat to share</div>
            <qrcode-vue :value="getWindowOrigin() + shareIframeSrc" :size="160" class="rounded-lg shadow"/>
            <Button variant="outline" @click="showWeChatQr = false" class="mt-2">Close</Button>
          </DialogContent>
        </Dialog>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { Podcast } from '~/types/podcast';
import { toast } from 'vue-sonner';
import { useClientSafeFunctions } from '~/composables/useClientSafeFunctions';
import QrcodeVue from 'qrcode-vue3';

const { getWindowOrigin, openWindow } = useClientSafeFunctions();

const props = defineProps({
  isOpen: {
    type: Boolean,
    required: true
  },
  podcast: {
    type: Object as () => Podcast | null,
    default: null
  }
});

const emit = defineEmits(['update:is-open']);

const shareIframeSrc = computed(() => {
  if (!props.podcast) return '';
  return `/share/podcast/${props.podcast.podcast_id}`;
});

const iframeError = ref(false);
const showWeChatQr = ref(false);

// 监听 podcast 变化，重置 iframeError
watch(() => props.podcast, () => {
  iframeError.value = false;
}, { immediate: true });

function onIframeError() {
  iframeError.value = true;
}

function retryIframe() {
  iframeError.value = false;
}

function copyShareLink() {
  if (!props.podcast) return;
  
  const shareUrl = `${getWindowOrigin()}/share/podcast/${props.podcast.podcast_id}`;
  
  try {
    // 尝试使用现代 API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          toast.success('Link copied!');
        })
        .catch((err) => {
          console.error('Failed to copy with Clipboard API: ', err);
          // 回退到传统方法
          fallbackCopy();
        });
    } else {
      // 回退到传统方法
      fallbackCopy();
    }
    
    function fallbackCopy() {
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
    }
  } catch (err) {
    console.error('Failed to copy share link: ', err);
    toast.error('Failed to copy share link. Please copy manually.', {
      description: shareUrl,
      duration: 10000,
    });
  }
}

function shareToWeibo() {
  if (!props.podcast) return;
  
  const shareUrl = `${getWindowOrigin()}/share/podcast/${props.podcast.podcast_id}`;
  const title = props.podcast.title || `Podcast #${props.podcast.podcast_id}`;
  const weiboUrl = `https://service.weibo.com/share/share.php?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`;
  
  openWindow(weiboUrl, 'weibo-share', 'width=700,height=680');
}

function shareToTwitter() {
  if (!props.podcast) return;
  
  const shareUrl = `${getWindowOrigin()}/share/podcast/${props.podcast.podcast_id}`;
  const title = props.podcast.title || `Podcast #${props.podcast.podcast_id}`;
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
  
  openWindow(twitterUrl, 'twitter-share', 'width=700,height=680');
}
</script>
