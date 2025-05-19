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
  
  // Assumption: Your 'personas' table has a 'language_support' array column (string[]).
  // We will filter personas where this array contains the requested languageCode.
  const { data, error } = await supabase
    .from('personas')
    .select('persona_id, name, voice_model_identifier, language_support') // Selected language_support for potential debugging
    .filter('language_support', 'cs', `{"${languageCode}"}`) // Check if language_support array contains languageCode
    // .eq('is_active', true) // Optional: if you have an active flag
    .limit(limit);

  if (error) {
    consola.error('[personaFetcher] Error fetching personas by language. Query was for language_support containing languageCode. Error:', error);
    return [];
  }

  // If data is null (which can happen if query targets non-existent columns, even if error is also null sometimes)
  // or if data is an empty array.
  if (!data || data.length === 0) { 
    consola.warn('[personaFetcher] No personas data returned or data is empty for language:', languageCode);
    return [];
  }
  
  // Ensure the returned data matches the AutoSelectedPersona interface
  // This map assumes 'data' is an array of objects with the selected fields.
  // If the select query itself failed due to wrong column names, 'data' might not be what we expect.
  // The Supabase client might return an empty array and an error object, or data as null.
  // The check for 'error' above should handle critical DB errors.

  // Define a type for the data structure returned by our specific select query
  type SelectedPersonaFields = {
    persona_id: number;
    name: string;
    voice_model_identifier: string | null; // From DB schema, can be null
    language_support: string[] | null;     // From DB schema, can be null
  };

  const typedData: AutoSelectedPersona[] = (data as SelectedPersonaFields[]).map((p: SelectedPersonaFields) => {
    // voice_model_identifier can be null in the DB.
    // AutoSelectedPersona requires a non-null voice_model_identifier.
    // So, if it's null, or if other essential fields are not of the correct type, we skip this persona.
    if (typeof p.persona_id !== 'number' || 
        typeof p.name !== 'string' || 
        typeof p.voice_model_identifier !== 'string' // This check filters out nulls for voice_model_identifier
    ) {
      consola.warn(`[personaFetcher] Persona object from DB (id: ${p.persona_id}, name: ${p.name}) has missing/invalid fields or null voice_model_identifier. Skipping.`);
      return null; 
    }
    return {
      persona_id: p.persona_id,
      name: p.name,
      voice_model_identifier: p.voice_model_identifier, // Now confirmed to be a string
    };
  }).filter((p): p is AutoSelectedPersona => p !== null); // Type guard to ensure correct type after filter

  consola.success(`[personaFetcher] Fetched and validated ${typedData.length} personas for language ${languageCode}.`);
  return typedData;
}
