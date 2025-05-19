import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export interface PodcastSegmentData {
  idx: number;
  speaker: string;
  text: string;
}

export interface SegmentAudioData {
  versionTag: string;
  audioUrl: string;
  params?: Record<string, any>;
}

/**
 * 创建新的播客记录
 */
export const createPodcast = async (
  event: H3Event,
  data: {
    title: string;
    topic?: string;
    // 可以根据需要添加其他字段
  }
) => {
  const supabase = await serverSupabaseClient<Database>(event);

  const { data: podcast, error } = await supabase
    .from('podcasts')
    .insert({
      title: data.title,
      topic: data.topic,
    })
    .select()
    .single();

  if (error) {
    console.error('创建播客记录失败:', error);
    throw new Error(`创建播客记录失败: ${error.message}`);
  }

  return podcast;
};

/**
 * 为播客添加段落
 */
export const addPodcastSegments = async (
  event: H3Event,
  podcastId: string,
  segments: PodcastSegmentData[]
) => {
  const supabase = await serverSupabaseClient<Database>(event);

  const formattedSegments = segments.map((segment) => ({
    podcast_id: podcastId,
    idx: segment.idx,
    speaker: segment.speaker,
    text: segment.text,
  }));

  const { data: createdSegments, error } = await supabase
    .from('podcast_segments')
    .insert(formattedSegments)
    .select();

  if (error) {
    console.error('创建播客段落失败:', error);
    throw new Error(`创建播客段落失败: ${error.message}`);
  }

  return createdSegments;
};

/**
 * 为段落添加音频版本
 */
export const addSegmentAudio = async (
  event: H3Event,
  segmentId: string,
  data: SegmentAudioData
) => {
  const supabase = await serverSupabaseClient<Database>(event);

  const { data: audio, error } = await supabase
    .from('segment_audios')
    .insert({
      segment_id: segmentId,
      version_tag: data.versionTag,
      audio_url: data.audioUrl,
      params: data.params,
    })
    .select()
    .single();

  if (error) {
    console.error('创建段落音频失败:', error);
    throw new Error(`创建段落音频失败: ${error.message}`);
  }

  return audio;
};

/**
 * 获取播客及其所有段落和音频版本
 */
export const getPodcastWithSegments = async (event: H3Event, podcastId: string) => {
  const supabase = await serverSupabaseClient<Database>(event);

  // 获取播客
  const { data: podcast, error: podcastError } = await supabase
    .from('podcasts')
    .select('*')
    .eq('podcast_id', podcastId)
    .single();

  if (podcastError) {
    console.error('获取播客失败:', podcastError);
    throw new Error(`获取播客失败: ${podcastError.message}`);
  }

  // 获取段落及其音频
  const { data: segments, error: segmentsError } = await supabase
    .from('podcast_segments')
    .select(`
      *,
      segment_audios (*)
    `)
    .eq('podcast_id', podcastId)
    .order('idx');

  if (segmentsError) {
    console.error('获取播客段落失败:', segmentsError);
    throw new Error(`获取播客段落失败: ${segmentsError.message}`);
  }

  return {
    ...podcast,
    segments: segments || [],
  };
};