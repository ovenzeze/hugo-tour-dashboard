import { ref, computed, watch } from 'vue';
import { useAudioPlayerStore, type AudioTrack } from '~/stores/audioPlayerStore';
import type { Podcast, Segment, SegmentAudio } from '~/types/podcast';

export function usePodcastPlayer() {
  const audioStore = useAudioPlayerStore();
  
  // Keep track of the current playing podcast
  const currentPlayingPodcastId = ref<string | null>(null);
  
  // Map to store relationships between podcast segments and audio tracks
  const segmentToTrackMap = ref<Map<string, string>>(new Map());
  const trackToSegmentMap = ref<Map<string, string>>(new Map());
  
  /**
   * Convert a podcast segment to an AudioTrack object
   */
  function segmentToAudioTrack(podcast: Podcast, segment: Segment): AudioTrack | null {
    if (!segment.segment_audios || segment.segment_audios.length === 0) {
      return null;
    }
    
    // Find a playable audio URL (prioritize final version)
    const finalAudio = segment.segment_audios.find(sa => sa.version_tag === 'final' && sa.audio_url);
    const anyAudio = segment.segment_audios.find(sa => sa.audio_url);
    
    if (!finalAudio && !anyAudio) {
      return null;
    }
    
    const audioToUse = finalAudio || anyAudio;
    if (!audioToUse || !audioToUse.audio_url) {
      return null;
    }
    
    // Generate unique track ID
    const trackId = `podcast-${podcast.podcast_id}-segment-${segment.segment_id}`;
    
    // Store the mapping between segment and track
    segmentToTrackMap.value.set(`${segment.segment_id}`, trackId);
    trackToSegmentMap.value.set(trackId, `${segment.segment_id}`);
    
    // Create AudioTrack object
    return {
      id: trackId,
      title: segment.speaker ? `${segment.speaker}: ${segment.text?.substring(0, 30)}...` : podcast.title || `Podcast #${podcast.podcast_id}`,
      artist: podcast.host_name || podcast.title || undefined,
      url: audioToUse.audio_url,
      coverImage: podcast.cover_image_url || undefined,
      duration: audioToUse.duration_ms ? audioToUse.duration_ms / 1000 : undefined,
      // Add podcast-specific metadata
      meta: {
        type: 'podcast',
        podcastId: `${podcast.podcast_id}`,
        segmentId: `${segment.segment_id}`,
        speaker: segment.speaker || undefined,
        fullText: segment.text || undefined
      }
    };
  }
  
  /**
   * Create a playlist from a podcast's segments
   */
  function createPlaylistFromPodcast(podcast: Podcast): AudioTrack[] {
    if (!podcast.podcast_segments || podcast.podcast_segments.length === 0) {
      return [];
    }

    const tracks: AudioTrack[] = [];

    podcast.podcast_segments.forEach((segment, index) => {
      if (segment.segment_audios && segment.segment_audios.length > 0) {
        // 只添加有音频的片段
        const audio = segment.segment_audios[0]; // 取第一个音频
        
        // 获取文本内容 - 从不同的可能字段中获取
        let content = '';
        // @ts-ignore - 忽略类型错误，兼容不同的数据结构
        if (segment.content) {
          // @ts-ignore
          content = segment.content;
        // @ts-ignore
        } else if (segment.segment_content) {
          // @ts-ignore
          content = segment.segment_content;
        } else if (segment.text) {
          // @ts-ignore
          content = segment.text;
        } else if (typeof segment.data === 'object' && segment.data?.text) {
          // @ts-ignore
          content = segment.data.text;
        }
        
        // 获取说话人名称
        let speakerName = '';
        // @ts-ignore
        if (segment.speaker) {
          // @ts-ignore
          speakerName = segment.speaker;
        // @ts-ignore
        } else if (segment.speaker_name) {
          // @ts-ignore
          speakerName = segment.speaker_name;
        } else if (typeof segment.data === 'object' && segment.data?.speaker) {
          // @ts-ignore
          speakerName = segment.data.speaker;
        }
        
        // 调试日志
        console.log(`[PodcastPlayer] Segment ${index} data:`, {
          id: segment.segment_id,
          speaker: speakerName,
          content: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          // @ts-ignore - 打印原始数据便于调试
          rawData: segment.data ? JSON.stringify(segment.data).substring(0, 100) : 'No data'
        });
        
        // 使用说话人和内容创建标题
        let title = content || 'Untitled Segment';
        if (speakerName) {
          title = `${speakerName}: ${content ? content.substring(0, 60) + (content.length > 60 ? '...' : '') : ''}`;
        }
        
        // 创建音频轨道 - 使用索引确保ID唯一
        const track: AudioTrack = {
          id: `podcast-${podcast.podcast_id}-segment-${index}-${Date.now()}`,
          title: title,
          url: audio.audio_url || '',
          duration: audio.duration_ms || 0,
          coverImage: podcast.cover_image_url || '',
          meta: {
            type: 'podcast',
            podcastId: podcast.podcast_id,
            segmentId: segment.segment_id ? String(segment.segment_id) : String(index),
            speaker: speakerName,
            fullText: content
          }
        };
        
        tracks.push(track);
      }
    });

    console.log(`[PodcastPlayer] Created ${tracks.length} tracks with unique IDs`);
    // 打印第一个曲目的标题和元数据，便于调试
    if (tracks.length > 0) {
      console.log(`[PodcastPlayer] First track title: ${tracks[0].title}`);
      console.log(`[PodcastPlayer] First track meta:`, tracks[0].meta);
    }
    
    return tracks;
  }
  
  /**
   * Start playing a podcast
   */
  function playPodcast(podcast: Podcast) {
    // Stop any current playback
    if (audioStore.isPlaying) {
      audioStore.pause();
    }
    
    // 创建播放列表
    const tracks = createPlaylistFromPodcast(podcast);
    
    console.log(`[PodcastPlayer] Playing podcast ${podcast.podcast_id} with ${tracks.length} segments`);
    
    // 打印所有曲目信息，便于调试
    tracks.forEach((track, index) => {
      console.log(`[PodcastPlayer] Track ${index + 1}/${tracks.length}: ${track.title}`);
    });
    
    try {
      // 1. 先完全清空播放器状态
      audioStore.stop();
      audioStore.clearPlaylist();
      
      // 2. 等待一下，确保清空操作完成
      setTimeout(() => {
        // 3. 手动设置播放列表
        console.log(`[PodcastPlayer] Setting up playlist with ${tracks.length} tracks`);
        
        // 添加所有片段到播放列表
        audioStore.addMultipleToPlaylist(tracks);
        
        // 4. 手动设置当前索引为 0
        (audioStore as any).currentTrackIndex = 0;
        
        // 5. 播放第一个片段
        if (tracks.length > 0) {
          console.log(`[PodcastPlayer] Starting playback with first track: ${tracks[0].title}`);
          audioStore.play(tracks[0]);
          
          // 打印播放列表状态
          console.log(`[PodcastPlayer] Playlist now has ${audioStore.playlist.length} tracks`);
          console.log(`[PodcastPlayer] Current index: ${audioStore.currentIndex}`);
          console.log(`[PodcastPlayer] hasNext check: ${audioStore.hasNext ? 'Yes' : 'No'}`);
        }
      }, 100);
    } catch (error) {
      console.error('[PodcastPlayer] Error setting up playlist:', error);
      
      // 如果出错，尝试使用原始方法
      audioStore.clearPlaylist();
      audioStore.addMultipleToPlaylist(tracks);
      if (tracks.length > 0) {
        audioStore.play(tracks[0]);
      }
    }
  }
  
  /**
   * Stop playing the current podcast
   */
  function stopPodcast() {
    audioStore.stop();
    audioStore.clearPlaylist();
    currentPlayingPodcastId.value = null;
  }
  
  /**
   * Check if a specific podcast is currently playing
   */
  function isPodcastPlaying(podcastId: string): boolean {
    return currentPlayingPodcastId.value === podcastId && audioStore.isPlaying;
  }
  
  /**
   * Get the ID of the currently playing podcast
   */
  function getCurrentPlayingPodcastId(): string | null {
    return currentPlayingPodcastId.value;
  }
  
  /**
   * Find the corresponding segment for the current playing track
   */
  function getCurrentPlayingSegment(): string | null {
    if (!audioStore.currentTrack) {
      return null;
    }
    
    return trackToSegmentMap.value.get(audioStore.currentTrack.id) || null;
  }
  
  // Watch for audio player state changes to update podcast playing status
  watch(() => audioStore.isPlaying, (isPlaying) => {
    if (!isPlaying && audioStore.currentTrack === null) {
      // If stopped completely, reset current podcast
      currentPlayingPodcastId.value = null;
    }
  });
  
  // Watch for track changes
  watch(() => audioStore.currentTrack, (track) => {
    if (!track || !track.meta || track.meta.type !== 'podcast') {
      // If track is not a podcast segment, reset current podcast
      currentPlayingPodcastId.value = null;
    } else if (track.meta.podcastId) {
      // Update current podcast ID based on track metadata
      currentPlayingPodcastId.value = track.meta.podcastId;
    }
  });
  
  return {
    // State
    currentPlayingPodcastId: computed(() => currentPlayingPodcastId.value),
    isPlaying: computed(() => audioStore.isPlaying),
    currentTime: computed(() => audioStore.currentTime),
    duration: computed(() => audioStore.duration),
    
    // Methods
    createPlaylistFromPodcast,
    playPodcast,
    stopPodcast,
    isPodcastPlaying,
    getCurrentPlayingPodcastId,
    getCurrentPlayingSegment,
  };
}
