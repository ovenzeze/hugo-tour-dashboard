import { defineEventHandler, getRouterParam, createError } from 'h3';
import { getSynthesisTask } from '../process/synthesize.post';

export default defineEventHandler(async (event) => {
  const taskId = getRouterParam(event, 'taskId');
  
  if (!taskId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Task ID is required',
    });
  }

  const task = getSynthesisTask(taskId);
  
  if (!task) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Task not found',
    });
  }

  // Return task status without internal details
  const response = {
    taskId: task.taskId,
    podcastId: task.podcastId,
    status: task.status,
    progress: {
      completed: task.progress.completed,
      total: task.progress.total,
      percentage: Math.round((task.progress.completed / task.progress.total) * 100),
      currentSegment: task.progress.currentSegment,
    },
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    ...(task.status === 'completed' && task.results && {
      results: {
        success: task.results.filter(r => r.audioFileUrl && !r.error).length > 0,
        generatedSegments: task.results,
        message: `Synthesis completed. ${task.results.filter(r => r.audioFileUrl && !r.error).length}/${task.results.length} segments successful.`
      }
    }),
    ...(task.status === 'failed' && {
      error: task.error
    }),
  };

  return response;
}); 