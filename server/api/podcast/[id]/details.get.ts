import { defineEventHandler, getRouterParam, createError } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';
import { createServerPodcastDatabase } from '~/server/composables/useServerPodcastDatabase';
import type { Database } from '~/types/supabase';
import { consola } from 'consola';

interface PodcastDetailsResponse {
  success: boolean;
  podcast: {
    id: string;
    title: string;
    topic?: string;
    language?: string;
    host_persona_id?: number;
    guest_persona_id?: number;
    created_at: string;
  };
  script: {
    content: string;
    segments: Array<{
      idx: number;
      speaker: string;
      text: string;
      speakerPersonaId?: number;
      hasAudio: boolean;
    }>;
  };
  settings: {
    title: string;
    topic?: string;
    language?: string;
    hostPersonaId?: number;
    guestPersonaIds?: number[];
    ttsProvider?: string;
  };
}

export default defineEventHandler(async (event): Promise<PodcastDetailsResponse> => {
  try {
    const podcastId = getRouterParam(event, 'id');
    
    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Podcast ID is required'
      });
    }

    consola.info(`[podcast-details] Fetching details for podcast ${podcastId}`);

    // 初始化数据库连接
    const supabase = await serverSupabaseServiceRole<Database>(event);
    if (!supabase) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to initialize database connection'
      });
    }

    const podcastDb = createServerPodcastDatabase(supabase);

    // 1. 获取播客基本信息
    const podcast = await podcastDb.getPodcastById(podcastId);
    if (!podcast) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Podcast not found'
      });
    }

    // 2. 获取播客的segments
    const segments = await podcastDb.getSegmentsByPodcastId(podcastId);
    
    // 3. 检查每个segment是否有音频
    const segmentsWithAudioStatus = await Promise.all(
      segments.map(async (segment) => {
        const audios = await podcastDb.getSegmentAudios(segment.segment_text_id);
        return {
          idx: segment.idx,
          speaker: segment.speaker || 'Unknown',
          text: segment.text || '',
          speakerPersonaId: undefined, // TODO: 从数据库或推断获取
          hasAudio: audios && audios.length > 0
        };
      })
    );

    // 4. 重建脚本内容
    const scriptContent = segmentsWithAudioStatus
      .sort((a, b) => a.idx - b.idx)
      .map(segment => `${segment.speaker}: ${segment.text}`)
      .join('\n');

    // 5. 构建设置信息
    const settings = {
      title: podcast.title || 'Untitled Podcast',
      topic: podcast.topic || undefined,
      language: 'zh', // TODO: 从数据库获取或推断
      hostPersonaId: podcast.host_persona_id || undefined,
      guestPersonaIds: podcast.guest_persona_id ? [podcast.guest_persona_id] : [],
      ttsProvider: 'volcengine' // TODO: 从数据库获取
    };

    consola.info(`[podcast-details] Successfully fetched details for podcast ${podcastId}: ${segments.length} segments`);

    return {
      success: true,
      podcast: {
        id: podcast.podcast_id,
        title: podcast.title || 'Untitled Podcast',
        topic: podcast.topic || undefined,
        language: 'zh',
        host_persona_id: podcast.host_persona_id || undefined,
        guest_persona_id: podcast.guest_persona_id || undefined,
        created_at: podcast.created_at || new Date().toISOString()
      },
      script: {
        content: scriptContent,
        segments: segmentsWithAudioStatus
      },
      settings
    };

  } catch (error: any) {
    consola.error('[podcast-details] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch podcast details: ${error.message || 'Unknown error'}`
    });
  }
}); 