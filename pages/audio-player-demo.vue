<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-6 text-primary">Global Audio Player Demo</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Regular Audio Examples -->
      <div class="p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
        <h2 class="text-xl font-semibold mb-4">Regular Audio Files</h2>
        <div class="space-y-4">
          <div v-for="(track, index) in regularTracks" :key="index" class="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
            <Button @click="playTrack(track)" variant="outline" size="sm" class="hover:bg-primary hover:text-primary-foreground transition-colors">
              <Icon name="ph:play" class="mr-2 h-4 w-4" />
              Play
            </Button>
          </div>
        </div>
      </div>

      <!-- Streaming Audio Examples -->
      <div class="p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
        <h2 class="text-xl font-semibold mb-4">M3U8 Streaming</h2>
        <div class="space-y-4">
          <div v-for="(track, index) in streamingTracks" :key="index" class="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
            <Button @click="playTrack(track)" variant="outline" size="sm" class="hover:bg-primary hover:text-primary-foreground transition-colors">
              <Icon name="ph:play" class="mr-2 h-4 w-4" />
              Play
            </Button>
          </div>
        </div>
      </div>
    </div>

    <!-- Playlist -->
    <div class="mt-8 p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
      <h2 class="text-xl font-semibold mb-4">Playlist</h2>
      
      <div v-if="audioStore.playlist.length > 0" class="space-y-2">
        <div v-for="(track, index) in audioStore.playlist" :key="track.id" 
          class="flex items-center justify-between p-3 border rounded-md transition-all duration-200"
          :class="{'bg-primary/10 scale-[1.01]': audioStore.currentTrack?.id === track.id}">
          <div class="flex items-center">
            <div class="w-8 text-center text-muted-foreground">{{ index + 1 }}</div>
            <div>
              <p class="font-medium">{{ track.title }}</p>
              <p class="text-sm text-muted-foreground">{{ track.artist }}</p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <Button @click="playTrack(track)" variant="ghost" size="icon" class="h-8 w-8 hover:bg-primary hover:text-primary-foreground transition-colors">
              <Icon :name="audioStore.currentTrack?.id === track.id && audioStore.isPlaying ? 'ph:pause' : 'ph:play'" class="h-4 w-4" />
            </Button>
            <Button @click="removeFromPlaylist(track.id)" variant="ghost" size="icon" class="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground transition-colors">
              <Icon name="ph:x" class="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div v-else class="text-center py-8 text-muted-foreground">
        <Icon name="ph:playlist" class="h-12 w-12 mx-auto mb-2 animate-pulse" />
        <p>Playlist is empty</p>
      </div>

      <div class="flex justify-end mt-4">
        <Button @click="clearPlaylist" variant="outline" :disabled="audioStore.playlist.length === 0" class="hover:bg-destructive hover:text-destructive-foreground transition-colors">
          <Icon name="ph:trash" class="mr-2 h-4 w-4" />
          Clear Playlist
        </Button>
      </div>
    </div>

    <!-- Playback Controls -->
    <div class="mt-8 p-6 border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
      <h2 class="text-xl font-semibold mb-4">Playback Controls</h2>
      
      <div class="flex flex-wrap gap-4">
        <Button @click="audioStore.previous()" :disabled="!audioStore.hasPrevious" class="hover:bg-primary hover:text-primary-foreground transition-colors">
          <Icon name="ph:skip-back" class="mr-2 h-4 w-4" />
          Previous
        </Button>
        
        <Button @click="audioStore.togglePlay()" :disabled="!audioStore.currentTrack" class="hover:bg-primary hover:text-primary-foreground transition-colors">
          <Icon :name="audioStore.isPlaying ? 'ph:pause' : 'ph:play'" class="mr-2 h-4 w-4" />
          {{ audioStore.isPlaying ? 'Pause' : 'Play' }}
        </Button>
        
        <Button @click="audioStore.next()" :disabled="!audioStore.hasNext" class="hover:bg-primary hover:text-primary-foreground transition-colors">
          <Icon name="ph:skip-forward" class="mr-2 h-4 w-4" />
          Next
        </Button>
        
        <Button @click="audioStore.toggleMute()" variant="outline" class="hover:bg-primary hover:text-primary-foreground transition-colors">
          <Icon :name="audioStore.isMuted ? 'ph:speaker-slash' : 'ph:speaker-high'" class="mr-2 h-4 w-4" />
          {{ audioStore.isMuted ? 'Unmute' : 'Mute' }}
        </Button>
      </div>

      <div class="mt-4">
        <p class="text-sm text-muted-foreground mb-2">Volume: {{ Math.round(audioStore.volume * 100) }}%</p>
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

// Regular audio examples
const regularTracks = ref<AudioTrack[]>([
  {
    id: '1',
    title: 'Audio Sample 1',
    artist: 'Demo Artist',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3',
    coverImage: 'https://picsum.photos/200/200?random=1'
  },
  {
    id: '2',
    title: 'Audio Sample 2',
    artist: 'Demo Artist',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_1MG.mp3',
    coverImage: 'https://picsum.photos/200/200?random=2'
  },
  {
    id: '3',
    title: 'Audio Sample 3',
    artist: 'Demo Artist',
    url: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_2MG.mp3',
    coverImage: 'https://picsum.photos/200/200?random=3'
  }
]);

// Streaming audio examples
const streamingTracks = ref<AudioTrack[]>([
  {
    id: 'stream1',
    title: 'HLS Streaming Example 1',
    artist: 'Streaming Demo',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    isM3u8: true,
    coverImage: 'https://picsum.photos/200/200?random=4'
  },
  {
    id: 'stream2',
    title: 'HLS Streaming Example 2',
    artist: 'Streaming Demo',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    isM3u8: true,
    coverImage: 'https://picsum.photos/200/200?random=5'
  }
]);

// Play audio
function playTrack(track: AudioTrack) {
  // If currently playing the same track, toggle play/pause state
  if (audioStore.currentTrack?.id === track.id) {
    audioStore.togglePlay();
    return;
  }
  
  // Add to playlist (if not exists)
  audioStore.addToPlaylist(track);
  
  // Play
  audioStore.play(track);
}

// Remove from playlist
function removeFromPlaylist(trackId: string) {
  audioStore.removeFromPlaylist(trackId);
}

// Clear playlist
function clearPlaylist() {
  audioStore.clearPlaylist();
}

// Update volume
function updateVolume(value: number[] | undefined) {
  if (value && value.length > 0) {
    audioStore.setVolume(value[0] / 100);
  }
}
</script>
整体guang'an