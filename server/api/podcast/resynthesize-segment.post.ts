import { defineEventHandler, readBody, createError } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';
import { createServerPodcastDatabase } from '~/server/composables/useServerPodcastDatabase';
import type { Database } from '~/types/supabase';
import { consola } from 'consola';
import { getPersonaById } from '~/server/utils/personaFetcher';

interface ResynthesizeSegmentRequest {
  podcastId: string;
  segmentId: string; // segment_text_id
}

interface ResynthesizeSegmentResponse {
  success: boolean;
  message: string;
  segmentId: string;
  taskId?: string;
}

export default defineEventHandler(async (event): Promise<ResynthesizeSegmentResponse> => {
  try {
    const body = await readBody<ResynthesizeSegmentRequest>(event);
    consola.info('[resynthesize-segment] Received request:', body);

    if (!body || !body.podcastId || !body.segmentId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Request body, podcast ID and segment ID are required'
      });
    }

    // 1. 获取数据库连接
    const supabase = await serverSupabaseServiceRole<Database>(event);
    if (!supabase) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to initialize database connection'
      });
    }

    const podcastDb = createServerPodcastDatabase(supabase);

    // 2. 获取segment信息
    const segments = await podcastDb.getSegmentsByPodcastId(body.podcastId);
    const targetSegment = segments.find(s => s.segment_text_id === body.segmentId);
    
    if (!targetSegment) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Segment not found'
      });
    }

    // 3. 获取播客信息以确定persona映射
    const podcast = await podcastDb.getPodcastWithSegments(body.podcastId);
    if (!podcast) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Podcast not found'
      });
    }

    // 4. 确定speaker的persona ID
    let speakerPersonaId = 1; // 默认persona ID
    
    if (podcast.host_persona_id && targetSegment.speaker) {
      const speakerLower = targetSegment.speaker.toLowerCase();
      if (speakerLower.includes('host') || speakerLower.includes('主持') || targetSegment.idx === 0) {
        speakerPersonaId = podcast.host_persona_id;
      } else if (podcast.guest_persona_id) {
        speakerPersonaId = podcast.guest_persona_id;
      } else {
        speakerPersonaId = podcast.host_persona_id;
      }
    }

    // 5. 验证persona存在
    const persona = await getPersonaById(event, speakerPersonaId);
    if (!persona) {
      throw createError({
        statusCode: 404,
        statusMessage: `Persona with ID ${speakerPersonaId} not found`
      });
    }

    // 6. 构建合成请求数据
    const synthesisRequest = {
      podcastId: body.podcastId,
      segments: [{
        segmentIndex: targetSegment.idx,
        text: targetSegment.text || '',
        speakerPersonaId,
        speakerName: targetSegment.speaker || 'Unknown'
      }],
      async: false, // 单个片段用同步处理
      globalTtsProvider: 'volcengine',
      globalSynthesisParams: {
        speed: 1.0,
        pitch: 1.0,
        volume: 1.0
      }
    };

    // 7. 调用合成API
    try {
      const synthesisResponse = await $fetch('/api/podcast/process/synthesize', {
        method: 'POST',
        body: synthesisRequest
      });

      consola.info('[resynthesize-segment] Synthesis response:', synthesisResponse);

      return {
        success: true,
        message: `Successfully restarted synthesis for segment ${targetSegment.idx}`,
        segmentId: body.segmentId,
        taskId: synthesisResponse.taskId
      };

    } catch (synthesisError: any) {
      consola.error('[resynthesize-segment] Synthesis API error:', synthesisError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to resynthesize segment: ${synthesisError.message || 'Unknown error'}`
      });
    }

  } catch (error: any) {
    consola.error('[resynthesize-segment] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to resynthesize segment: ${error.message || 'Unknown error'}`
    });
  }
}); 