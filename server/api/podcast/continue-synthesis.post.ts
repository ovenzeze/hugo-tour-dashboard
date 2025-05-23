import { defineEventHandler, readBody, createError } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';
import { createServerPodcastDatabase } from '~/server/composables/useServerPodcastDatabase';
import type { Database } from '~/types/supabase';
import { consola } from 'consola';

interface ContinueSynthesisRequest {
  podcastId: string;
  segmentCount?: number; // Optional, for validation
}

interface ContinueSynthesisResponse {
  success: boolean;
  message: string;
  taskId?: string;
  segmentsToProcess: number;
  podcastId: string;
}

export default defineEventHandler(async (event): Promise<ContinueSynthesisResponse> => {
  try {
    const body = await readBody<ContinueSynthesisRequest>(event);
    consola.info('[continue-synthesis] Received request:', body);

    if (!body.podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Podcast ID is required'
      });
    }

    // 1. 从数据库获取播客信息和未合成的segments
    const supabase = await serverSupabaseServiceRole<Database>(event);
    if (!supabase) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to initialize database connection'
      });
    }

    const podcastDb = createServerPodcastDatabase(supabase);
    
    // 获取播客的所有segments
    const segments = await podcastDb.getSegmentsByPodcastId(body.podcastId);
    if (!segments || segments.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'No segments found for this podcast'
      });
    }

    // 找出未合成的segments（没有audio的segments）
    const segmentsWithAudio = await Promise.all(
      segments.map(async (segment) => {
        const audios = await podcastDb.getSegmentAudios(segment.segment_text_id);
        return {
          segment,
          hasAudio: audios && audios.length > 0
        };
      })
    );

    const unsynthesizedSegments = segmentsWithAudio
      .filter(item => !item.hasAudio)
      .map(item => item.segment);

    consola.info(`[continue-synthesis] Found ${unsynthesizedSegments.length} unsynthesized segments out of ${segments.length} total`);

    if (unsynthesizedSegments.length === 0) {
      return {
        success: true,
        message: 'All segments are already synthesized',
        segmentsToProcess: 0,
        podcastId: body.podcastId
      };
    }

    // 2. 准备合成请求数据
    // 获取播客信息以获取persona映射
    const podcast = await podcastDb.getPodcastById(body.podcastId);
    if (!podcast) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Podcast not found'
      });
    }

    // 从现有segments构建合成请求
    const synthesisSegments = unsynthesizedSegments.map((segment, index) => {
      // 简单的persona映射逻辑：使用播客的host和guest persona
      let speakerPersonaId = 1; // 默认persona ID
      
      if (podcast.host_persona_id && segment.speaker) {
        // 如果speaker包含host相关关键词，使用host persona
        const speakerLower = segment.speaker.toLowerCase();
        if (speakerLower.includes('host') || speakerLower.includes('主持') || segment.idx === 0) {
          speakerPersonaId = podcast.host_persona_id;
        } else if (podcast.guest_persona_id) {
          // 否则使用guest persona
          speakerPersonaId = podcast.guest_persona_id;
        } else {
          speakerPersonaId = podcast.host_persona_id; // 如果没有guest，fallback到host
        }
      }
      
      return {
        segmentIndex: segment.idx,
        text: segment.text || '',
        speakerPersonaId,
        speakerName: segment.speaker || 'Unknown'
      };
    });

    // 3. 调用现有的合成API
    try {
      const synthesisResponse = await $fetch('/api/podcast/process/synthesize', {
        method: 'POST',
        body: {
          podcastId: body.podcastId,
          segments: synthesisSegments,
          async: true, // 强制异步处理
          globalTtsProvider: 'volcengine', // 默认TTS提供商
          globalSynthesisParams: {
            speed: 1.0,
            pitch: 1.0,
            volume: 1.0
          }
        }
      });

      consola.info('[continue-synthesis] Synthesis task created:', synthesisResponse);

      return {
        success: true,
        message: `Started background synthesis for ${unsynthesizedSegments.length} segments`,
        taskId: synthesisResponse.taskId,
        segmentsToProcess: unsynthesizedSegments.length,
        podcastId: body.podcastId
      };

    } catch (synthesisError: any) {
      consola.error('[continue-synthesis] Synthesis API error:', synthesisError);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to start synthesis: ${synthesisError.message || 'Unknown error'}`
      });
    }

  } catch (error: any) {
    consola.error('[continue-synthesis] Error:', error);
    
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to continue synthesis: ${error.message || 'Unknown error'}`
    });
  }
}); 