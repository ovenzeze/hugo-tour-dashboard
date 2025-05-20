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
    
    // Clear previous mappings
    segmentToTrackMap.value.clear();
    trackToSegmentMap.value.clear();
    
    // Convert segments to tracks
    const tracks = podcast.podcast_segments
      .map(segment => segmentToAudioTrack(podcast, segment))
      .filter(track => track !== null) as AudioTrack[];
    
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
    
    // Create playlist from podcast segments
    const tracks = createPlaylistFromPodcast(podcast);
    
    if (tracks.length > 0) {
      // Clear the current playlist
      audioStore.clearPlaylist();
      
      // Add new tracks to the playlist
      audioStore.addMultipleToPlaylist(tracks);
      
      // Start playing the first track
      audioStore.play(tracks[0]);
      
      // Update current podcast ID
      currentPlayingPodcastId.value = `${podcast.podcast_id}`;
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
