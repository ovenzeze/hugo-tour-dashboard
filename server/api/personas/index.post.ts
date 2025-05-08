import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json } from '~/types/supabase'

// Define the expected shape of the request body for creating a persona
interface PersonaInsertBody {
  name: string
  description?: string | null
  system_prompt?: string | null
  avatar_url?: string | null
  voice_settings?: Json | null // Assuming voice_settings is of type Json as per your supabase.ts
  is_active?: boolean | null
  // Add any other fields that are part of your 'personas' table Insert type
  // and are expected/allowed to be set during creation.
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<PersonaInsertBody>(event)

  // Basic validation
  if (!body.name) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required field: name',
    })
  }

  // Prepare the data for insertion
  // This should map directly to the columns in your 'personas' table
  const personaDataToInsert = {
    name: body.name,
    description: body.description,
    system_prompt: body.system_prompt,
    avatar_url: body.avatar_url,
    voice_settings: body.voice_settings,
    is_active: body.is_active === undefined ? true : body.is_active, // Default is_active to true
    // created_at and updated_at are typically handled by Supabase/database defaults
    // persona_id is typically auto-generated (serial primary key)
  }

  const { data, error } = await client
    .from('personas')
    .insert(personaDataToInsert) // Supabase expects an object or array of objects
    .select() // Select the columns you want to return
    .single() // Assuming you want to return the single created record

  if (error) {
    console.error('Error creating persona:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create persona: ${error.message}`,
    })
  }

  return data
})
