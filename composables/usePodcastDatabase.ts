// Nuxt auto-imports useSupabaseClient, no explicit import needed
import type { Database } from "~/types/supabase"; // 导入生成的数据库类型

// 使用生成的类型定义
type Podcast = Database["public"]["Tables"]["podcasts"]["Row"];
type PodcastInsert = Database["public"]["Tables"]["podcasts"]["Insert"];
type Segment = Database["public"]["Tables"]["podcast_segments"]["Row"];
type SegmentInsert = Database["public"]["Tables"]["podcast_segments"]["Insert"];
type SegmentAudio = Database["public"]["Tables"]["segment_audios"]["Row"];
type SegmentAudioInsert =
  Database["public"]["Tables"]["segment_audios"]["Insert"];

export const usePodcastDatabase = () => {
  const supabase = useSupabaseClient<Database>(); // 指定 Supabase 客户端的类型

  /**
   * 获取所有播客
   */
  const getPodcasts = async () => {
    const { data, error } = await supabase
      .from("podcasts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch podcasts: ${error.message}`);
    return data as Podcast[]; // 使用导入的类型
  };

  /**
   * 获取单个播客详情及其段落
   */
  const getPodcastWithSegments = async (podcastId: string) => {
    // 获取播客
    const { data: podcast, error: podcastError } = await supabase
      .from("podcasts")
      .select("*")
      .eq("podcast_id", podcastId) // Changed from "id" to "podcast_id"
      .single();

    if (podcastError)
      throw new Error(
        `Failed to fetch podcast details: ${podcastError.message}`
      );

    // 获取段落和音频
    const { data: segments, error: segmentsError } = await supabase
      .from("podcast_segments")
      .select(
        `
        *,
        segment_audios (*)
      `
      )
      .eq("podcast_id", podcastId)
      .order("idx");

    if (segmentsError)
      throw new Error(
        `Failed to fetch podcast segments: ${segmentsError.message}`
      );

    // 明确指定 podcast 的类型，解决 spread 运算符错误
    const typedPodcast: Podcast = podcast;

    return {
      ...typedPodcast,
      segments: segments || [],
    } as Podcast & { segments: Segment[] }; // 使用导入的类型
  };

  /**
   * 添加音频版本到段落
   */
  const addSegmentAudio = async (
    segmentId: string,
    audioUrl: string,
    versionTag = "default",
    params?: Record<string, any>
  ) => {
    const { data, error } = await supabase
      .from("segment_audios")
      .insert({
        // 使用导入的插入类型
        // segment_id here refers to the column in segment_audios,
        // which is a foreign key to podcast_segments.segment_text_id
        segment_id: segmentId,
        version_tag: versionTag,
        audio_url: audioUrl,
        params,
      } as SegmentAudioInsert) // 明确指定插入数据的类型
      .select()
      .single();

    if (error) throw new Error(`Failed to add segment audio: ${error.message}`);
    return data as SegmentAudio; // 使用导入的类型
  };

  /**
   * 获取段落的所有音频版本
   */
  const getSegmentAudios = async (segmentId: string) => {
    const { data, error } = await supabase
      .from("segment_audios")
      .select("*")
      .eq("segment_id", segmentId)
      .order("created_at", { ascending: false });

    if (error)
      throw new Error(`Failed to fetch segment audios: ${error.message}`);
    return data as SegmentAudio[]; // 使用导入的类型
  };
  /**
   * 根据播客ID获取所有段落
   */
  const getSegmentsByPodcastId = async (podcastId: string) => {
    const { data, error } = await supabase
      .from("podcast_segments")
      .select("*")
      .eq("podcast_id", podcastId)
      .order("idx");

    if (error)
      throw new Error(
        `Failed to fetch segments for podcast ${podcastId}: ${error.message}`
      );
    return data as Segment[]; // 使用导入的类型
  };

  return {
    createPodcast,
    addPodcastSegments,
    getPodcasts,
    getPodcastWithSegments,
    addSegmentAudio,
    getSegmentAudios,
    getSegmentsByPodcastId, // 添加这个
  };
};
