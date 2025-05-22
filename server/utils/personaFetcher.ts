import { serverSupabaseClient } from '#supabase/server';
import type { H3Event } from 'h3';
import type { Database } from '~/types/supabase'; // Assuming your Supabase types are here
import { consola } from 'consola';

export interface AutoSelectedPersona {
  persona_id: number;
  name: string;
  description: string | null;
  voice_model_identifier: string | null; // Can be null from DB
  tts_provider: string | null; // Can be null from DB
  language_support: string[] | null;
  voice_description: string | null;
}

/**
 * Fetches personas from the database, filtered by language.
 * @param event H3Event
 * @param languageCode The language code to filter by (e.g., 'zh-CN', 'en-US')
 * @param limit Max number of personas to return
 * @returns Array of personas
 */
export async function getPersonasByLanguage(
  event: H3Event,
  languageCode: string,
  limit?: number // Limit is now optional
): Promise<AutoSelectedPersona[]> {
  consola.info(`[personaFetcher] Fetching personas for language: ${languageCode}${limit ? ` (limit: ${limit})` : ''}`);
  const supabase = await serverSupabaseClient<Database>(event);
  
  let query = supabase
    .from('personas')
    .select('persona_id, name, description, voice_model_identifier, tts_provider, language_support, voice_description, status')
    .eq('status', 'active');

  // Apply language filter if a specific language is requested
  const langLower = languageCode ? languageCode.toLowerCase() : '';
  if (langLower && langLower !== 'all' && langLower !== '*') {
    let targetLanguageCode = languageCode;
    // Normalize common variations to a primary code assumed to be in the DB
    if (langLower === 'en') {
      targetLanguageCode = 'en-US'; // Assume en-US is the primary English code in DB
      consola.info(`[personaFetcher] Normalized language 'en' to 'en-US' for query.`);
    } else if (langLower === 'zh') {
      targetLanguageCode = 'zh-CN'; // Assume zh-CN is the primary Chinese code in DB
      consola.info(`[personaFetcher] Normalized language 'zh' to 'zh-CN' for query.`);
    } else if (langLower === 'zh-hans'){
      targetLanguageCode = 'zh-CN'; // Treat zh-hans as zh-CN
      consola.info(`[personaFetcher] Normalized language 'zh-hans' to 'zh-CN' for query.`);
    }
    // For other specific codes like 'en-US', 'zh-CN', use them directly.
    
    query = query.contains('language_support', [targetLanguageCode]);
    consola.info(`[personaFetcher] Applied language filter for: ${targetLanguageCode} (originally ${languageCode})`);
  } else {
    consola.info(`[personaFetcher] No specific language filter applied (or 'all'/'*' requested), fetching all active personas.`);
  }

  if (limit) {
    query = query.limit(limit);
    consola.info(`[personaFetcher] Applying limit: ${limit}`);
  }

  const { data, error } = await query;

  if (error) {
    consola.error(`[personaFetcher] Error fetching personas (lang: ${languageCode}, limit: ${limit}):`, error.message);
    return [];
  }

  if (!data || data.length === 0) {
    consola.warn(`[personaFetcher] No personas found matching criteria (lang: ${languageCode}, limit: ${limit})`);
    return [];
  }
  
  consola.success(`[personaFetcher] Successfully fetched ${data.length} personas raw from DB.`);
  return processPersonaData(data, languageCode);
}

/**
 * 处理从数据库获取的人物数据，确保符合AutoSelectedPersona接口要求
 * @param data 从数据库获取的人物数据
 * @param languageCode 当前语言代码（用于日志输出）
 * @returns 处理后的符合AutoSelectedPersona接口的人物数组
 */
function processPersonaData(data: any[], languageCodeForLog: string): AutoSelectedPersona[] {
  type DbPersona = Database['public']['Tables']['personas']['Row'];

  const typedData: AutoSelectedPersona[] = data
    .map((p: DbPersona) => {
      if (typeof p.persona_id !== 'number' || typeof p.name !== 'string') {
        consola.warn(`[personaFetcher] Persona from DB (id: ${p.persona_id}, name: ${p.name}) has missing/invalid essential fields. Skipping.`);
        return null;
      }
      return {
        persona_id: p.persona_id,
        name: p.name,
        description: p.description || null,
        // Ensure voice_model_identifier is passed, even if null, or provide a default if your logic requires it
        voice_model_identifier: p.voice_model_identifier || null,
        tts_provider: p.tts_provider || null,
        language_support: p.language_support || null,
        voice_description: p.voice_description || null,
      };
    })
    .filter((p): p is AutoSelectedPersona => p !== null);

  consola.success(`[personaFetcher] Processed and validated ${typedData.length} personas (originally for lang: ${languageCodeForLog}).`);
  return typedData;
}

/**
 * Fetches a single persona by its ID from the database.
 * @param event H3Event
 * @param personaId The ID of the persona to fetch.
 * @returns A single persona object or null if not found or an error occurs.
 */
export async function getPersonaById(
  event: H3Event,
  personaId: number
): Promise<AutoSelectedPersona | null> {
  consola.info(`[personaFetcher] Fetching persona by ID: ${personaId}`);
  if (typeof personaId !== 'number' || isNaN(personaId)) {
    consola.warn(`[personaFetcher] Invalid personaId provided: ${personaId}. Must be a number.`);
    return null;
  }

  const supabase = await serverSupabaseClient<Database>(event);

  const { data, error } = await supabase
    .from('personas')
    .select('persona_id, name, description, voice_model_identifier, tts_provider, language_support, voice_description, status')
    .eq('persona_id', personaId)
    .eq('status', 'active') // Ensure only active personas are fetched
    .single(); // Expect a single result

  if (error) {
    if (error.code === 'PGRST116') { // PostgREST error code for "No rows found"
      consola.warn(`[personaFetcher] No active persona found with ID: ${personaId}`);
    } else {
      consola.error(`[personaFetcher] Error fetching persona by ID ${personaId}:`, error.message);
    }
    return null;
  }

  if (!data) {
    consola.warn(`[personaFetcher] No data returned for persona ID: ${personaId} (this should ideally be caught by error.code PGRST116)`);
    return null;
  }
  
  consola.success(`[personaFetcher] Successfully fetched persona ID: ${data.persona_id} raw from DB.`);
  
  // Use processPersonaData to ensure consistent data structure and validation, even for a single item
  // Wrap data in an array for processPersonaData and expect a single item or empty array back
  const processed = processPersonaData([data as any], `ID ${personaId}`); // Cast to any as data is single, processPersonaData expects array
  if (processed.length > 0) {
    consola.success(`[personaFetcher] Successfully processed persona ID: ${processed[0].persona_id}.`);
    return processed[0];
  } else {
    consola.warn(`[personaFetcher] Persona ID ${personaId} was fetched but failed processing/validation.`);
    return null;
  }
}
