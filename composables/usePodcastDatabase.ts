 // composables/usePodcastDatabase.ts
import { ref } from 'vue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useSupabaseClient } from '#imports'; // Ensure this is correctly imported for client-side
// Import shared types
import type { Podcast, Segment, SegmentAudio } from '~/types/podcast';

// Re-export types for use in other files - 不再导出 Persona 以避免重复
export type { Podcast, Segment, SegmentAudio };

export const usePodcastDatabase = () => {
  const podcasts = ref<Podcast[]>([]);
  const selectedPodcast = ref<Podcast | null>(null);
  const loading = ref(false); // For general list loading
  const loadingSelected = ref(false); // For loading individual podcast details
  const error = ref<string | null>(null);

  const commonSelectQuery = '*, cover_image_url, podcast_segments(*, segment_audios(*)), host_persona:personas!podcasts_host_persona_id_fkey(*), creator_persona:personas!podcasts_creator_persona_id_fkey(*), guest_persona:personas!podcasts_guest_persona_id_fkey(*)';

  // Fetch all podcasts with nested segments and segment audios
  const fetchPodcasts = async () => {
    loading.value = true;
    error.value = null;
    console.log('[usePodcastDatabase] Starting fetchPodcasts...');
    try {
      const client = useSupabaseClient<SupabaseClient>();
      const { data, error: dbError } = await client
        .from('podcasts')
        .select(commonSelectQuery)
        .order('created_at', { ascending: false });

      console.log('[usePodcastDatabase] Raw data from Supabase:', data);
      console.log('[usePodcastDatabase] Supabase error:', dbError);

      if (dbError) {
        throw dbError;
      }
      podcasts.value = data as Podcast[];
      console.log('[usePodcastDatabase] Parsed podcasts.value:', podcasts.value);
    } catch (e: any) {
      error.value = e.message;
      console.error('Error fetching podcasts:', e);
    } finally {
      loading.value = false;
      console.log('[usePodcastDatabase] fetchPodcasts finished. Loading:', loading.value, 'Error:', error.value);
    }
  };

  // Fetch a single podcast with nested segments and segment audios by ID
  const fetchPodcastById = async (podcastId: string) => {
    loadingSelected.value = true;
    error.value = null;
    console.log(`[usePodcastDatabase] Starting fetchPodcastById for ID: ${podcastId}`);
    try {
      const client = useSupabaseClient<SupabaseClient>();
      const { data, error: dbError } = await client
        .from('podcasts')
        .select(commonSelectQuery)
        .eq('podcast_id', podcastId)
        .single();

      if (dbError) {
        throw dbError;
      }
      selectedPodcast.value = data as Podcast;
      console.log('[usePodcastDatabase] fetchPodcastById successful. Selected podcast:', JSON.parse(JSON.stringify(selectedPodcast.value)));
    } catch (e: any) {
      error.value = e.message;
      console.error(`[usePodcastDatabase] Error fetching podcast with ID ${podcastId}:`, e);
    } finally {
      loadingSelected.value = false;
      console.log(`[usePodcastDatabase] fetchPodcastById finished. LoadingSelected: ${loadingSelected.value} Error: ${error.value}`);
    }
  };

  const createPodcast = async (newPodcastData: { title: string; topic?: string; host_persona_id?: number; creator_persona_id?: number; cover_image_url?: string | null }) => {
    loading.value = true;
    error.value = null;
    console.log('[usePodcastDatabase] Starting createPodcast with data:', JSON.parse(JSON.stringify(newPodcastData)));
    try {
      const client = useSupabaseClient<SupabaseClient>();
      const { data, error: dbError } = await client
        .from('podcasts')
        .insert([newPodcastData])
        .select(commonSelectQuery)
        .single();

      if (dbError) {
        throw dbError;
      }

      if (data) {
        // Preserve existing DTO construction and update logic
        const newPodcastEntryDto = {
          podcast_id: data.podcast_id,
          created_at: data.created_at,
          title: data.title,
          topic: data.topic,
          host_persona_id: data.host_persona_id,
          creator_persona_id: data.creator_persona_id,
          guest_persona_id: data.guest_persona_id,
          total_duration_ms: data.total_duration_ms,
          total_word_count: data.total_word_count,
          cover_image_url: data.cover_image_url,
          host_persona: data.host_persona ? { ...data.host_persona } : null,
          creator_persona: data.creator_persona ? { ...data.creator_persona } : null,
          guest_persona: data.guest_persona ? { ...data.guest_persona } : null,
          podcast_segments: data.podcast_segments || [],
        };
        podcasts.value = [newPodcastEntryDto as any, ...podcasts.value as any[]] as Podcast[];
        selectedPodcast.value = newPodcastEntryDto as Podcast;
        console.log('[usePodcastDatabase] createPodcast successful. New podcast:', JSON.parse(JSON.stringify(selectedPodcast.value)), 'Updated podcasts list:', JSON.parse(JSON.stringify(podcasts.value)));
      }
    } catch (e: any) {
      error.value = e.message;
      console.error('[usePodcastDatabase] Error creating podcast:', e);
    } finally {
      loading.value = false;
      console.log(`[usePodcastDatabase] createPodcast finished. Loading: ${loading.value} Error: ${error.value}`);
    }
  };

  const updatePodcast = async (podcastId: string, updates: Partial<Podcast>) => {
    loading.value = true;
    error.value = null;
    console.log(`[usePodcastDatabase] Starting updatePodcast for ID: ${podcastId} with updates:`, JSON.parse(JSON.stringify(updates)));
    try {
      const client = useSupabaseClient<SupabaseClient>();
      const { data, error: dbError } = await client
        .from('podcasts')
        .update(updates)
        .eq('podcast_id', podcastId)
        .select(commonSelectQuery)
        .single();

      if (dbError) {
        throw dbError;
      }

      if (data) {
        const index = podcasts.value.findIndex(p => p.podcast_id === podcastId);
        if (index !== -1) {
          podcasts.value[index] = { ...podcasts.value[index], ...data } as any; // Avoid deep type instantiation
        }
        if (selectedPodcast.value?.podcast_id === podcastId) {
          selectedPodcast.value = { ...selectedPodcast.value, ...data } as any; // Avoid deep type instantiation
        }
        console.log('[usePodcastDatabase] updatePodcast successful. Updated data:', JSON.parse(JSON.stringify(data)), 'Updated podcasts list:', JSON.parse(JSON.stringify(podcasts.value)));
      }
      return data as Podcast;
    } catch (e: any) {
      error.value = e.message;
      console.error(`[usePodcastDatabase] Error updating podcast ${podcastId}:`, e);
      throw e; // Re-throw to allow caller to handle
    } finally {
      loading.value = false;
      console.log(`[usePodcastDatabase] updatePodcast finished. Loading: ${loading.value} Error: ${error.value}`);
    }
  };

  const deletePodcast = async (podcastId: string) => {
    loading.value = true;
    error.value = null;
    console.log(`[usePodcastDatabase] Starting deletePodcast for ID: ${podcastId}`);
    try {
      const client = useSupabaseClient<SupabaseClient>();
      const { error: dbError } = await client
        .from('podcasts')
        .delete()
        .eq('podcast_id', podcastId);

      if (dbError) {
        throw dbError;
      }

      const indexToDelete = podcasts.value.findIndex((p: any) => p.podcast_id === podcastId);
      if (indexToDelete !== -1) {
        podcasts.value.splice(indexToDelete, 1);
      }
      if (selectedPodcast.value?.podcast_id === podcastId) {
        selectedPodcast.value = null;
      }
      console.log(`[usePodcastDatabase] deletePodcast successful for ID: ${podcastId}. Updated podcasts list:`, JSON.parse(JSON.stringify(podcasts.value)));
    } catch (e: any) {
      error.value = e.message;
      console.error(`[usePodcastDatabase] Error deleting podcast with ID ${podcastId}:`, e);
    } finally {
      loading.value = false;
      console.log(`[usePodcastDatabase] deletePodcast finished. Loading: ${loading.value} Error: ${error.value}`);
    }
  };

  const downloadPodcast = async (podcastId: string) => {
    console.log('Download entire podcast:', podcastId);
    // TODO: Implement logic
  };

  const resynthesizeAllSegments = async (podcastId: string) => {
    loading.value = true;
    error.value = null;
    console.log(`Requesting resynthesis for all segments of podcast: ${podcastId}`);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Refresh data after operation
      const podcastToRefresh = podcasts.value.find((p: any) => p.podcast_id === podcastId);
      if (podcastToRefresh) {
        await fetchPodcastById(podcastToRefresh.podcast_id); // Use existing fetch function
      }
      console.log(`Resynthesis for all segments of podcast ${podcastId} (simulated) complete.`);
    } catch (e: any) {
      error.value = e.message;
      console.error(`[usePodcastDatabase] Error resynthesizing all segments for podcast ${podcastId}:`, e);
    } finally {
      loading.value = false;
      console.log(`[usePodcastDatabase] resynthesizeAllSegments finished. Loading: ${loading.value} Error: ${error.value}`);
    }
  };

  const resynthesizeSegment = async (segmentId: string) => {
    loading.value = true;
    error.value = null;
    console.log(`Requesting resynthesis for segment: ${segmentId}`);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Refresh data after operation
      const podcastToRefresh = podcasts.value.find((p: any) => p.podcast_segments?.some((s: any) => s.segment_text_id === segmentId));
      if (podcastToRefresh) {
        await fetchPodcastById(podcastToRefresh.podcast_id); // Use existing fetch function
      }
      console.log(`Resynthesis for segment ${segmentId} (simulated) complete.`);
    } catch (e: any) {
      error.value = e.message;
      console.error(`[usePodcastDatabase] Error resynthesizing segment ${segmentId}:`, e);
    } finally {
      loading.value = false;
      console.log(`[usePodcastDatabase] resynthesizeSegment finished. Loading: ${loading.value} Error: ${error.value}`);
    }
  };

  return {
    podcasts,
    selectedPodcast,
    loading,
    loadingSelected, // Export the new loading state
    error,
    fetchPodcasts,
    fetchPodcastById,
    createPodcast,
    updatePodcast, // Added
    deletePodcast,
    downloadPodcast,
    resynthesizeAllSegments,
    resynthesizeSegment,
  };
};
