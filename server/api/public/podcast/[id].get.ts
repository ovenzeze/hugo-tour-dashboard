// 公共 API 端点，用于分享页面获取播客数据
import { serverSupabaseClient } from '#supabase/server';
import { H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  try {
    // 获取 podcast ID
    const id = event.context.params?.id;
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing podcast ID'
      });
    }

    // 使用服务端 Supabase 客户端
    const client = await serverSupabaseClient(event);
    
    // 构建查询
    const commonSelectQuery = '*, cover_image_url, podcast_segments(*, segment_audios(*)), host_persona:personas!podcasts_host_persona_id_fkey(*), creator_persona:personas!podcasts_creator_persona_id_fkey(*), guest_persona:personas!podcasts_guest_persona_id_fkey(*)';
    
    // 查询数据库
    const { data, error } = await client
      .from('podcasts')
      .select(commonSelectQuery)
      .eq('podcast_id', id)
      .single();

    // 处理错误
    if (error) {
      console.error('Error fetching podcast:', error);
      throw createError({
        statusCode: 500,
        statusMessage: error.message
      });
    }

    // 检查是否找到播客
    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Podcast not found'
      });
    }

    // 返回数据
    return data;
  } catch (error: any) {
    console.error('Error in public podcast API:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Internal Server Error'
    });
  }
});
