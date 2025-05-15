import { serverSupabaseClient } from '#supabase/server';
import type { Database } from "~/types/supabase";
import type { H3Event } from 'h3';

// 使用生成的类型定义
type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];
type PodcastInsert = Database["public"]["Tables"]["podcasts"]["Insert"];
type Segment = Database["public"]["Tables"]["podcast_segments"]["Row"];
type SegmentInsert = Database["public"]["Tables"]["podcast_segments"]["Insert"];
type SegmentAudio = Database["public"]["Tables"]["segment_audios"]["Row"];
type SegmentAudioInsert =
  Database["public"]["Tables"]["segment_audios"]["Insert"];

// Helper function to get the Supabase client on the server
const getSupabaseClientServer = async (event: H3Event) => {
  const client = await serverSupabaseClient<Database>(event);
  if (!client) {
    throw new Error('Supabase client is not available on the server.');
  }
  return client;
};

/**
 * 创建新的播客记录 (Server-side)
 */
export const createPodcastServer = async (event: H3Event, data: PodcastInsert) => {
  const supabase = await getSupabaseClientServer(event);
  const { data: podcast, error } = await supabase
    .from("podcasts")
    .insert(data)
    .select()
    .single();

  if (error) throw new Error(`Failed to create podcast: ${error.message}`);
  return podcast as Podcast;
};

/**
 * 为播客添加段落 (Server-side)
 */
export const addPodcastSegmentsServer = async (
  event: H3Event,
  podcastId: string,
  segments: Array<Omit<SegmentInsert, "podcast_id">>
) => {
  const supabase = await getSupabaseClientServer(event);
  const formattedSegments: SegmentInsert[] = segments.map((segment) => ({
    podcast_id: podcastId,
    idx: segment.idx,
    speaker: segment.speaker,
    text: segment.text,
  }));

  const { data, error } = await supabase
    .from("podcast_segments")
    .insert(formattedSegments)
    .select();

  if (error)
    throw new Error(`Failed to add podcast segments: ${error.message}`);
  return data as Segment[];
};

/**
 * 添加音频版本到段落 (Server-side)
 */
export const addSegmentAudioServer = async (
  event: H3Event,
  segmentId: string,
  audioUrl: string,
  versionTag = "default",
  params?: Record<string, any>
) => {
  const supabase = await getSupabaseClientServer(event);
  const { data, error } = await supabase
    .from("segment_audios")
    .insert({
      segment_id: segmentId,
      version_tag: versionTag,
      audio_url: audioUrl,
      params,
    } as SegmentAudioInsert)
    .select()
    .single();

  if (error) throw new Error(`Failed to add segment audio: ${error.message}`);
  return data as SegmentAudio;
};

/**
 * 根据播客ID获取所有段落 (Server-side)
 */
export const getSegmentsByPodcastIdServer = async (event: H3Event, podcastId: string) => {
  const supabase = await getSupabaseClientServer(event);
  const { data, error } = await supabase
    .from("podcast_segments")
    .select("*")
    .eq("podcast_id", podcastId)
    .order("idx");

  if (error)
    throw new Error(
      `Failed to fetch segments for podcast ${podcastId}: ${error.message}`
    );
  return data as Segment[];
};

// You can add other server-side database utility functions here as needed