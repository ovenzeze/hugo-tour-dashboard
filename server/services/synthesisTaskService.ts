import { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '~/types/supabase';
import { consola } from 'consola';
import type { TimedAudioSegmentResult } from './timedAudioService';

export interface SynthesisTask {
  task_id: string;
  podcast_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress_completed: number;
  progress_total: number;
  progress_current_segment?: number | null;
  results?: (TimedAudioSegmentResult & { segmentIndex: number; provider?: string; voiceModelUsed?: string | null })[];
  error_message?: string | null;
  created_at: string;
  updated_at: string;
}

export class SynthesisTaskService {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  // 检查并确保synthesis_tasks表存在
  async ensureTableExists(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('synthesis_tasks')
        .select('task_id')
        .limit(1);
        
      if (error) {
        if (error.code === '42P01') { // Table does not exist
          consola.error('[SynthesisTaskService] synthesis_tasks table does not exist');
          throw new Error('Database table "synthesis_tasks" does not exist. Please run database migrations first.');
        } else {
          consola.error('[SynthesisTaskService] Database error during table check:', error);
          throw new Error(`Database error: ${error.message || error.code || 'Unknown database error'}`);
        }
      }
      
      consola.info('[SynthesisTaskService] synthesis_tasks table exists and is accessible');
    } catch (checkError: any) {
      if (checkError.message?.includes('Database table')) {
        throw checkError; // Re-throw our custom error
      }
      consola.error('[SynthesisTaskService] Exception while checking table existence:', checkError);
      throw new Error(`Failed to access database: ${checkError.message || 'Unknown error'}`);
    }
  }

  async createTask(podcastId: string, totalSegments: number): Promise<string> {
    consola.info(`[SynthesisTaskService] Creating task for podcast ${podcastId} with ${totalSegments} segments`);
    
    // Ensure table exists before attempting to insert
    await this.ensureTableExists();
    
    const { data, error } = await this.supabase
      .from('synthesis_tasks')
      .insert({
        podcast_id: podcastId,
        status: 'pending',
        progress_completed: 0,
        progress_total: totalSegments
      })
      .select('task_id')
      .single();

    if (error) {
      consola.error('[SynthesisTaskService] Failed to create task:', {
        error,
        errorMessage: error.message,
        errorCode: error.code,
        errorDetails: error.details,
        errorHint: error.hint,
        podcastId,
        totalSegments
      });
      throw new Error(`Failed to create synthesis task: ${error.message || error.code || JSON.stringify(error)}`);
    }

    if (!data) {
      consola.error('[SynthesisTaskService] No data returned from insert operation');
      throw new Error('Failed to create synthesis task: No data returned from database');
    }

    consola.info(`[SynthesisTaskService] Created task ${data.task_id} for podcast ${podcastId}`);
    return data.task_id;
  }

  async getTask(taskId: string): Promise<SynthesisTask | null> {
    const { data, error } = await this.supabase
      .from('synthesis_tasks')
      .select('*')
      .eq('task_id', taskId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      consola.error('[SynthesisTaskService] Failed to get task:', error);
      throw new Error(`Failed to get synthesis task: ${error.message}`);
    }

    return {
      ...data,
      results: data.results ? JSON.parse(data.results as string) : undefined
    };
  }

  async updateTaskStatus(
    taskId: string, 
    status: SynthesisTask['status'], 
    updates?: {
      progress_completed?: number;
      progress_current_segment?: number;
      error_message?: string;
    }
  ): Promise<void> {
    const updateData: any = { status };
    
    if (updates) {
      if (updates.progress_completed !== undefined) {
        updateData.progress_completed = updates.progress_completed;
      }
      if (updates.progress_current_segment !== undefined) {
        updateData.progress_current_segment = updates.progress_current_segment;
      }
      if (updates.error_message !== undefined) {
        updateData.error_message = updates.error_message;
      }
    }

    const { error } = await this.supabase
      .from('synthesis_tasks')
      .update(updateData)
      .eq('task_id', taskId);

    if (error) {
      consola.error('[SynthesisTaskService] Failed to update task status:', error);
      throw new Error(`Failed to update task status: ${error.message}`);
    }

    consola.info(`[SynthesisTaskService] Updated task ${taskId} status to ${status}`);
  }

  async updateTaskResults(
    taskId: string, 
    results: (TimedAudioSegmentResult & { segmentIndex: number; provider?: string; voiceModelUsed?: string | null })[]
  ): Promise<void> {
    const { error } = await this.supabase
      .from('synthesis_tasks')
      .update({
        results: JSON.stringify(results),
        status: 'completed'
      })
      .eq('task_id', taskId);

    if (error) {
      consola.error('[SynthesisTaskService] Failed to update task results:', error);
      throw new Error(`Failed to update task results: ${error.message}`);
    }

    consola.info(`[SynthesisTaskService] Updated task ${taskId} with results`);
  }

  async cleanupOldTasks(maxAgeHours: number = 24): Promise<void> {
    const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
    
    const { error } = await this.supabase
      .from('synthesis_tasks')
      .delete()
      .lt('created_at', cutoffDate.toISOString());

    if (error) {
      consola.error('[SynthesisTaskService] Failed to cleanup old tasks:', error);
    } else {
      consola.info(`[SynthesisTaskService] Cleaned up tasks older than ${maxAgeHours} hours`);
    }
  }

  async getTasksByPodcast(podcastId: string): Promise<SynthesisTask[]> {
    const { data, error } = await this.supabase
      .from('synthesis_tasks')
      .select('*')
      .eq('podcast_id', podcastId)
      .order('created_at', { ascending: false });

    if (error) {
      consola.error('[SynthesisTaskService] Failed to get tasks by podcast:', error);
      throw new Error(`Failed to get tasks by podcast: ${error.message}`);
    }

    return data.map(task => ({
      ...task,
      results: task.results ? JSON.parse(task.results as string) : undefined
    }));
  }
} 