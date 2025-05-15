// composables/usePodcastDatabase.ts

import { useSupabaseClient } from '#imports';
import type { Database } from '~/types/supabase';

// Define types with nested relationships based on Supabase types for composable use
export type SegmentAudio = Database['public']['Tables']['segment_audios']['Row'];
export type Segment = Database['public']['Tables']['podcast_segments']['Row'] & {
  segment_audios?: SegmentAudio[];
};
export type Podcast = Database['public']['Tables']['podcasts']['Row'] & {
  podcast_segments?: Segment[];
};

export const usePodcastDatabase = () => {
  const supabase = useSupabaseClient<Database>();

  const podcasts = ref<Podcast[]>([]);
  const selectedPodcast = ref<Podcast | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all podcasts with nested segments and segment audios
  const fetchPodcasts = async () => {
    loading.value = true;
    error.value = null;
    try {
      // Fetch podcasts and nested relationships
      const { data, error: dbError } = await supabase
        .from('podcasts')
        .select('*, podcast_segments(*, segment_audios(*))') // Select nested data
        .order('created_at', { ascending: false }); // Order by creation date, newest first

      if (dbError) {
        throw dbError;
      }

      podcasts.value = data as Podcast[]; // Cast to our defined type
    } catch (e: any) {
      error.value = e.message;
      console.error('Error fetching podcasts:', e);
    } finally {
      loading.value = false;
    }
  };

  // Fetch a single podcast with nested segments and segment audios by ID
  const fetchPodcastById = async (podcastId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: dbError } = await supabase
        .from('podcasts')
        .select('*, podcast_segments(*, segment_audios(*))') // Select nested data
        .eq('podcast_id', podcastId)
        .single(); // Expect a single result

      if (dbError) {
        throw dbError;
      }

      selectedPodcast.value = data as Podcast; // Cast to our defined type
    } catch (e: any) {
      error.value = e.message;
      console.error(`Error fetching podcast with ID ${podcastId}:`, e);
    } finally {
      loading.value = false;
    }
  };

  // Placeholder functions for actions (to be implemented)
  const createPodcast = async (newPodcastData: { title: string; topic?: string }) => {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: dbError } = await supabase
        .from('podcasts')
        .insert([newPodcastData])
        .select() // Select the inserted data to get the new podcast_id
        .single();

      if (dbError) {
        throw dbError;
      }

      // Add the newly created podcast to the local state
      if (data) {
         // Fetch the full podcast data with segments and audios after creation
         await fetchPodcastById(data.podcast_id);
         if(selectedPodcast.value) {
            podcasts.value.push(selectedPodcast.value);
         }
      }

    } catch (e: any) {
      error.value = e.message;
      console.error('Error creating podcast:', e);
    } finally {
      loading.value = false;
    }
  };

  const deletePodcast = async (podcastId: string) => {
    loading.value = true;
    error.value = null;
    try {
      const { error: dbError } = await supabase
        .from('podcasts')
        .delete()
        .eq('podcast_id', podcastId);

      if (dbError) {
        throw dbError;
      }

      // Remove the deleted podcast from the local state
      const indexToDelete = podcasts.value.findIndex((p: Podcast) => p.podcast_id === podcastId);
      if (indexToDelete !== -1) {
        podcasts.value.splice(indexToDelete, 1);
      }
      // If the deleted podcast was the selected one, clear selectedPodcast
      if (selectedPodcast.value?.podcast_id === podcastId) {
        selectedPodcast.value = null;
      }

    } catch (e: any) {
      error.value = e.message;
      console.error(`Error deleting podcast with ID ${podcastId}:`, e);
    } finally {
      loading.value = false;
    }
  };

  const downloadPodcast = async (podcastId: string) => {
    console.log('Download entire podcast:', podcastId);
    // TODO: Implement logic to fetch and download the final combined podcast audio.
    // This will likely involve:
    // 1. Finding the podcast by ID.
    // 2. Checking if a final combined audio URL exists (assuming a new field in the podcasts table or a related table).
    // 3. If the URL exists, trigger the download (similar to the segment download logic, but for a single file).
    // 4. Handle cases where the final audio is not yet available.

    // Placeholder for future implementation:
    // loading.value = true;
    // error.value = null;
    // try {
    //   const podcastToDownload = podcasts.value.find(p => p.podcast_id === podcastId);
    //   if (!podcastToDownload) {
    //     throw new Error(`Podcast with ID ${podcastId} not found.`);
    //   }
    //   // Assuming podcastToDownload has a final_audio_url field
    //   if (podcastToDownload.final_audio_url) {
    //     const link = document.createElement('a');
    //     link.href = podcastToDownload.final_audio_url;
    //     link.setAttribute('download', `${podcastToDownload.title}.mp3`); // Suggest a filename
    //     document.body.appendChild(link);
    //     link.click();
    //     document.body.removeChild(link);
    //   } else {
    //     console.warn(`Final audio not available for podcast with ID ${podcastId}.`);
    //     // Optionally set an error message for the user
    //     // error.value = 'Final audio not available.';
    //   }
    // } catch (e: any) {
    //   error.value = e.message;
    //   console.error(`Error downloading podcast with ID ${podcastId}:`, e);
    // } finally {
    //   loading.value = false;
    // }
  };

  const resynthesizeAllSegments = async (podcastId: string) => {
    loading.value = true;
    error.value = null;
    console.log(`Requesting resynthesis for all segments of podcast: ${podcastId}`);
    try {
      // TODO: Replace with actual API call
      // Example: await $fetch(`/api/podcasts/${podcastId}/synthesize-all`, { method: 'POST' });
      // For now, simulate a delay and then refresh the podcast data
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call delay
      await fetchPodcastById(podcastId); // Refresh data to reflect potential changes
      console.log(`Resynthesis for all segments of podcast ${podcastId} (simulated) complete.`);
    } catch (e: any) {
      error.value = e.message;
      console.error(`Error resynthesizing all segments for podcast ${podcastId}:`, e);
    } finally {
      loading.value = false;
    }
  };

  const resynthesizeSegment = async (segmentId: string) => {
    // Note: segmentId here is likely segment_text_id from the podcast_segments table
    loading.value = true;
    error.value = null;
    console.log(`Requesting resynthesis for segment: ${segmentId}`);
    try {
      // TODO: Replace with actual API call
      // Example: await $fetch(`/api/podcast-segments/${segmentId}/synthesize`, { method: 'POST' });
      // For now, simulate a delay.
      // After a successful call, you'd typically want to refresh the specific podcast
      // or at least the segment's audio status.
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call delay
      
      // Find which podcast this segment belongs to and refresh it
      const podcastToRefresh = podcasts.value.find(p => p.podcast_segments?.some(s => s.segment_text_id === segmentId));
      if (podcastToRefresh) {
        await fetchPodcastById(podcastToRefresh.podcast_id);
      }
      console.log(`Resynthesis for segment ${segmentId} (simulated) complete.`);
    } catch (e: any) {
      error.value = e.message;
      console.error(`Error resynthesizing segment ${segmentId}:`, e);
    } finally {
      loading.value = false;
    }
  };

  return {
    podcasts,
    selectedPodcast,
    loading,
    error,
    fetchPodcasts,
    fetchPodcastById,
    createPodcast,
    deletePodcast,
    downloadPodcast,
    resynthesizeAllSegments,
    resynthesizeSegment,
  };
};
