import { serverSupabaseClient } from '#supabase/server';
import type { H3Event } from 'h3';
import type { Database } from '~/types/supabase'; // Assuming your Supabase types are here
import { consola } from 'consola';

export interface AutoSelectedPersona {
  persona_id: number;
  name: string;
  voice_model_identifier: string;
  // Add any other fields needed from your persona table, like 'language_code' if it exists
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
  limit: number = 10
): Promise<AutoSelectedPersona[]> {
  consola.info(`[personaFetcher] Fetching up to ${limit} personas for language: ${languageCode}`);
  const supabase = await serverSupabaseClient<Database>(event);
  
  // 首先尝试获取支持特定语言的人物
  consola.info(`[personaFetcher] Attempting to fetch personas with language_support containing: ${languageCode}`);
  const { data, error } = await supabase
    .from('personas')
    .select('persona_id, name, voice_model_identifier, language_support') 
    .contains('language_support', [languageCode]) // 正确的语法：检查language_support数组是否包含languageCode
    .limit(limit);

  if (error) {
    consola.error('[personaFetcher] Error fetching personas by language. Query was for language_support containing languageCode. Error:', error);
    
    // 如果查询出错，尝试获取所有人物作为备选
    consola.info('[personaFetcher] Attempting to fetch all personas as fallback');
    const fallbackResult = await supabase
      .from('personas')
      .select('persona_id, name, voice_model_identifier, language_support')
      .limit(limit);
      
    if (fallbackResult.error) {
      consola.error('[personaFetcher] Error fetching all personas as fallback:', fallbackResult.error);
      return [];
    }
    
    if (!fallbackResult.data || fallbackResult.data.length === 0) {
      consola.warn('[personaFetcher] No personas found in fallback query');
      return [];
    }
    
    consola.success(`[personaFetcher] Fetched ${fallbackResult.data.length} personas as fallback`);
    // 输出每个人物的language_support字段以便调试
    fallbackResult.data.forEach(p => {
      consola.info(`[personaFetcher] Persona ${p.name} (ID: ${p.persona_id}) has language_support: ${JSON.stringify(p.language_support)}`);
    });
    
    // 如果有人物数据，则返回处理后的结果
    return processPersonaData(fallbackResult.data, languageCode);
  }

  // 如果没有找到支持特定语言的人物
  if (!data || data.length === 0) { 
    consola.warn(`[personaFetcher] No personas found with language_support containing: ${languageCode}`);
    
    // 尝试获取所有人物作为备选
    consola.info('[personaFetcher] Attempting to fetch all personas as fallback');
    const fallbackResult = await supabase
      .from('personas')
      .select('persona_id, name, voice_model_identifier, language_support')
      .limit(limit);
      
    if (fallbackResult.error || !fallbackResult.data || fallbackResult.data.length === 0) {
      consola.warn('[personaFetcher] No personas found in fallback query');
      return [];
    }
    
    consola.success(`[personaFetcher] Fetched ${fallbackResult.data.length} personas as fallback`);
    // 输出每个人物的language_support字段以便调试
    fallbackResult.data.forEach(p => {
      consola.info(`[personaFetcher] Persona ${p.name} (ID: ${p.persona_id}) has language_support: ${JSON.stringify(p.language_support)}`);
    });
    
    // 如果有人物数据，则返回处理后的结果
    return processPersonaData(fallbackResult.data, languageCode);
  }
  
  // 输出找到的支持特定语言的人物信息
  consola.success(`[personaFetcher] Found ${data.length} personas supporting language: ${languageCode}`);
  data.forEach(p => {
    consola.info(`[personaFetcher] Persona ${p.name} (ID: ${p.persona_id}) supports language: ${languageCode}`);
  });
  
  // 处理并返回数据
  return processPersonaData(data, languageCode);
}

/**
 * 处理从数据库获取的人物数据，确保符合AutoSelectedPersona接口要求
 * @param data 从数据库获取的人物数据
 * @param languageCode 当前语言代码（用于日志输出）
 * @returns 处理后的符合AutoSelectedPersona接口的人物数组
 */
function processPersonaData(data: any[], languageCode: string): AutoSelectedPersona[] {
  // Define a type for the data structure returned by our specific select query
  type SelectedPersonaFields = {
    persona_id: number;
    name: string;
    voice_model_identifier: string | null; // From DB schema, can be null
    language_support: string[] | null;     // From DB schema, can be null
  };

  const typedData: AutoSelectedPersona[] = (data as SelectedPersonaFields[]).map((p: SelectedPersonaFields) => {
    // 如果voice_model_identifier为null，使用默认值
    const voiceModelId = p.voice_model_identifier || "default_voice_model";
    
    // 检查必要字段是否存在且类型正确
    if (typeof p.persona_id !== 'number' || typeof p.name !== 'string') {
      consola.warn(`[personaFetcher] Persona object from DB (id: ${p.persona_id}, name: ${p.name}) has missing/invalid essential fields. Skipping.`);
      return null; 
    }
    
    // 返回符合AutoSelectedPersona接口的对象
    return {
      persona_id: p.persona_id,
      name: p.name,
      voice_model_identifier: voiceModelId,
    };
  }).filter((p): p is AutoSelectedPersona => p !== null); // Type guard to ensure correct type after filter

  consola.success(`[personaFetcher] Processed and validated ${typedData.length} personas for language ${languageCode}.`);
  return typedData;
}
