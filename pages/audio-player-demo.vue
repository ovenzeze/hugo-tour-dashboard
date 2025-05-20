<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-6">全局音频播放器示例</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- 普通音频示例 -->
      <div class="p-6 border rounded-lg bg-card">
        <h2 class="text-xl font-semibold mb-4">普通音频文件</h2>
        <div class="space-y-4">
          <div v-for="(track, index) in regularTracks" :key="index" class="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
            <Button @click="playTrack(track)" variant="outline" size="sm">
              <Icon name="ph:play" class="mr-2 h-4 w-4" />
              播放
            </Button>
          </div>
        </div>
      </div>

      <!-- 流媒体音频示例 -->
      <div class="p-6 border rounded-lg bg-card">
        <h2 class="text-xl font-semibold mb-4">M3U8 流媒体</h2>
        <div class="space-y-4">
          <div v-for="(track, index) in streamingTracks" :key="index" class="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
            <Button @click="playTrack(track)" variant="outline" size="sm">
              <Icon name="ph:play" class="mr-2 h-4 w-4" />
              播放
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- 播放列表 -->
    <div class="mt-8 p-6 border rounded-lg bg-card">
      <h2 class="text-xl font-semibold mb-4">播放列表</h2>
      
      <div v-if="audioStore.playlist.length > 0" class="space-y-2">
        <div v-for="(track, index) in audioStore.playlist" :key="track.id" 
          class="flex items-center justify-between p-3 border rounded-md"
          :class="{'bg-primary/10': audioStore.currentTrack?.id === track.id}">
          <div class="flex items-center">
            <div class="w-8 text-center text-muted-foreground">{{ index + 1 }}</div>
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <Button @click="playTrack(track)" variant="ghost" size="icon" class="h-8 w-8">
              <Icon :name="audioStore.currentTrack?.id === track.id && audioStore.isPlaying ? 'ph:pause' : 'ph:play'" class="h-4 w-4" />
            </Button>
            <Button @click="removeFromPlaylist(track.id)" variant="ghost" size="icon" class="h-8 w-8">
              <Icon name="ph:x" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-8 text-muted-foreground">
        <Icon name="ph:playlist" class="h-12 w-12 mx-auto mb-2" />
        <p>播放列表为空</p>
      </div>

      <div class="flex justify-end mt-4">
        <Button @click="clearPlaylist" variant="outline" :disabled="audioStore.playlist.length === 0">
          <Icon name="ph:trash" class="mr-2 h-4 w-4" />
          清空播放列表
        </Button>
      </div>
    </div>

    <!-- 播放控制 -->
    <div class="mt-8 p-6 border rounded-lg bg-card">
      <h2 class="text-xl font-semibold mb-4">播放控制</h2>
      
      <div class="flex flex-wrap gap-4">
        <Button @click="audioStore.previous()" :disabled="!audioStore.hasPrevious">
          <Icon name="ph:skip-back" class="mr-2 h-4 w-4" />
          上一首
        </Button>
        
        <Button @click="audioStore.togglePlay()" :disabled="!audioStore.currentTrack">
          <Icon :name="audioStore.isPlaying ? 'ph:pause' : 'ph:play'" class="mr-2 h-4 w-4" />
          {{ audioStore.isPlaying ? '暂停' : '播放' }}
        </Button>
        
        <Button @click="audioStore.next()" :disabled="!audioStore.hasNext">
          <Icon name="ph:skip-forward" class="mr-2 h-4 w-4" />
          下一首
        </Button>
        
        <Button @click="audioStore.toggleMute()" variant="outline">
          <Icon :name="audioStore.isMuted ? 'ph:speaker-slash' : 'ph:speaker-high'" class="mr-2 h-4 w-4" />
          {{ audioStore.isMuted ? '取消静音' : '静音' }}
        </Button>
      </div>

      <div class="mt-4">
        <p class="text-sm text-muted-foreground mb-2">音量: {{ Math.round(audioStore.volume * 100) }}%</p>
        <div class="flex items-center gap-2">
          <Icon name="ph:speaker-low" class="h-4 w-4 text-muted-foreground" />
          <Slider 
            :model-value="[audioStore.volume * 100]" 
            @update:model-value="updateVolume" 
            :min="0" 
            :max="100" 
            :step="1" 
            class="w-full max-w-md" 
          />
          <Icon name="ph:speaker-high" class="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAudioPlayerStore, type AudioTrack } from '~/stores/audioPlayerStore';
import { Button } from '~/components/ui/button';
import { Slider } from '~/components/ui/slider';

const audioStore = useAudioPlayerStore();

// 普通音频示例
const regularTracks = ref<AudioTrack[]>([
  {
    id: '1',
    title: '示例音频 1',
    artist: '演示艺术家',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3',
    coverImage: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    title: '示例音频 2',
    artist: '演示艺术家',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_1MG.mp3',
    coverImage: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: '3',
    title: '示例音频 3',
    artist: '演示艺术家',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_2MG.mp3',
    coverImage: 'https://picsum.photos/200/200?random=3'
  }
]);

// 流媒体音频示例
const streamingTracks = ref<AudioTrack[]>([
  {
    id: 'stream1',
    title: 'HLS 流媒体示例 1',
    artist: '流媒体演示',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    isM3u8: true,
    coverImage: 'https://picsum.photos/200/200?random=4'
  },
  {
    id: 'stream2',
    title: 'HLS 流媒体示例 2',
    artist: '流媒体演示',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    isM3u8: true,
    coverImage: 'https://picsum.photos/200/200?random=5'
  }
]);

// 播放音频
function playTrack(track: AudioTrack) {
  // 如果当前播放的是同一首歌，则切换播放/暂停状态
  if (audioStore.currentTrack?.id === track.id) {
    audioStore.togglePlay();
    return;
  }
  
  // 添加到播放列表（如果不存在）
  audioStore.addToPlaylist(track);
  
  // 播放
  audioStore.play(track);
}

// 从播放列表中移除
function removeFromPlaylist(trackId: string) {
  audioStore.removeFromPlaylist(trackId);
}

// 清空播放列表
function clearPlaylist() {
  audioStore.clearPlaylist();
}

// 更新音量
function updateVolume(value: number[] | undefined) {
  if (value && value.length > 0) {
    audioStore.setVolume(value[0] / 100);
  }
}
</script>
