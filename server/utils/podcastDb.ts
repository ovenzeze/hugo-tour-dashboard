// server/utils/podcastDb.ts
import type { H3Event } from 'h3';
import { serverSupabaseClient } from '#supabase/server';
import type { Database, Tables } from '~/types/supabase';

type Podcast = Tables<'podcasts'>;

export const fetchPodcastByIdForServer = async (event: H3Event, id: string): Promise<Podcast | null> => {
  const supabase = await serverSupabaseClient<Database>(event);
  const { data, error } = await supabase
    .from('podcasts')
    .select('*')
    .eq('podcast_id', id)
    .single();
  if (error) {
    console.error(`Error fetching podcast by ID (${id}) for server:`, error.message);
    return null;
  }
  return data;
};

export const updatePodcastCoverForServer = async (event: H3Event, podcastId: string, coverImageUrl: string): Promise<Podcast | null> => {
  const supabase = await serverSupabaseClient<Database>(event);
  const { data, error } = await supabase
    .from('podcasts')
    .update({ cover_image_url: coverImageUrl })
    .eq('podcast_id', podcastId)
    .select()
    .single();
  if (error) {
    console.error(`Error updating podcast cover for (${podcastId}) for server:`, error.message);
    return null;
  }
  return data;
};