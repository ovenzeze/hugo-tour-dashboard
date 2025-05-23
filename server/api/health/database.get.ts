import { defineEventHandler } from 'h3';
import { serverSupabaseServiceRole } from '#supabase/server';
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
  try {
    // Initialize database connection
    const supabase = await serverSupabaseServiceRole<Database>(event);
    if (!supabase) {
      return {
        healthy: false,
        error: 'Failed to initialize database connection',
        timestamp: new Date().toISOString()
      };
    }

    // Test synthesis_tasks table specifically
    const { data, error } = await supabase
      .from('synthesis_tasks')
      .select('count')
      .limit(1);
      
    if (error) {
      return {
        healthy: false,
        error: `synthesis_tasks table error: ${error.message || error.code}`,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      };
    }

    return {
      healthy: true,
      message: 'Database and synthesis_tasks table are accessible',
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    return {
      healthy: false,
      error: `Health check exception: ${error.message}`,
      timestamp: new Date().toISOString()
    };
  }
}); 