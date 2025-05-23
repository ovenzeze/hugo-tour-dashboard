import { defineEventHandler, getRouterParam, createError } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';
import { SynthesisTaskService } from '~/server/services/synthesisTaskService';
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');
  
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required',
    });
  }

  try {
    // Initialize database connection
    const supabase = await serverSupabaseServiceRole<Database>(event);
    if (!supabase) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to initialize database connection'
      });
    }

    const taskService = new SynthesisTaskService(supabase);
    const task = await taskService.getTask(taskId);
    
    if (!task) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Task not found',
      });
    }

    // Fetch podcast information
    let podcast = null;
    if (task.podcast_id) {
      const { data: podcastData, error: podcastError } = await supabase
        .from('podcasts')
        .select('podcast_id, title, description, created_at')
        .eq('podcast_id', task.podcast_id)
        .single();
      
      if (!podcastError && podcastData) {
        podcast = podcastData;
      }
    }

    // Return response with both task and podcast information
    const response = {
      task: {
        task_id: task.task_id,
        podcast_id: task.podcast_id,
        status: task.status,
        progress_completed: task.progress_completed,
        progress_total: task.progress_total,
        progress_current_segment: task.progress_current_segment,
        error_message: task.error_message,
        results: task.results,
        created_at: task.created_at,
        updated_at: task.updated_at,
      },
      podcast: podcast,
      // Legacy format for backward compatibility
      taskId: task.task_id,
      podcastId: task.podcast_id,
      status: task.status,
      progress: {
        completed: task.progress_completed,
        total: task.progress_total,
        percentage: Math.round((task.progress_completed / task.progress_total) * 100),
        currentSegment: task.progress_current_segment,
      },
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      ...(task.status === 'completed' && task.results && {
        results: {
          success: task.results.filter(r => r.audioFileUrl && !r.error).length > 0,
          generatedSegments: task.results,
          message: `Synthesis completed. ${task.results.filter(r => r.audioFileUrl && !r.error).length}/${task.results.length} segments successful.`
        }
      }),
      ...(task.status === 'failed' && {
        error: task.error_message
      }),
    };

    return response;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to get task status: ${error.message || 'Unknown error'}`
    });
  }
}); 