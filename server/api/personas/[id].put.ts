import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json } from '~/types/supabase'

// Define the expected shape of the request body for updating a persona
// This should align with the 'Update' type for your 'personas' table
// All fields are optional for an update operation.
interface PersonaUpdateBody {
  name?: string
  description?: string | null
  system_prompt?: string | null
  avatar_url?: string | null
  voice_settings?: Json | null
  is_active?: boolean | null
  tts_provider?: string | null
  voice_model_identifier?: string | null
  voice_description?: string | null
  language_support?: string[] | null
  status?: string | null
  is_recommended_host?: boolean | null
  is_recommended_guest?: boolean | null
  recommended_priority?: number | null
  // Add any other fields that can be updated
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const personaId = event.context.params?.id
  const body = await readBody<PersonaUpdateBody>(event)

  if (!personaId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Persona ID is required',
    })
  }

  const idAsNumber = parseInt(personaId, 10)
  if (isNaN(idAsNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Persona ID format',
    })
  }

  // Construct the update object, only including fields present in the body
  const personaDataToUpdate: Partial<PersonaUpdateBody> = {}
  if (body.name !== undefined) personaDataToUpdate.name = body.name
  if (body.description !== undefined) personaDataToUpdate.description = body.description
  if (body.system_prompt !== undefined) personaDataToUpdate.system_prompt = body.system_prompt
  if (body.avatar_url !== undefined) personaDataToUpdate.avatar_url = body.avatar_url
  if (body.voice_settings !== undefined) personaDataToUpdate.voice_settings = body.voice_settings
  if (body.is_active !== undefined) personaDataToUpdate.is_active = body.is_active
  if (body.tts_provider !== undefined) personaDataToUpdate.tts_provider = body.tts_provider
  if (body.voice_model_identifier !== undefined) personaDataToUpdate.voice_model_identifier = body.voice_model_identifier
  if (body.voice_description !== undefined) personaDataToUpdate.voice_description = body.voice_description
  if (body.language_support !== undefined) personaDataToUpdate.language_support = body.language_support
  if (body.status !== undefined) personaDataToUpdate.status = body.status
  if (body.is_recommended_host !== undefined) personaDataToUpdate.is_recommended_host = body.is_recommended_host
  if (body.is_recommended_guest !== undefined) personaDataToUpdate.is_recommended_guest = body.is_recommended_guest
  if (body.recommended_priority !== undefined) personaDataToUpdate.recommended_priority = body.recommended_priority
  // Supabase automatically updates 'updated_at' if it's configured to do so

  if (Object.keys(personaDataToUpdate).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields provided for update',
    })
  }

  const { data, error } = await client
    .from('personas')
    .update(personaDataToUpdate)
    .eq('persona_id', idAsNumber) // Assuming 'persona_id' is the primary key
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // No row found for update
      throw createError({
        statusCode: 404,
        statusMessage: 'Persona not found for update',
      })
    }
    console.error('Error updating persona:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update persona: ${error.message}`,
    })
  }

  if (!data) { // Should be caught by PGRST116 but as a fallback
    throw createError({
      statusCode: 404,
      statusMessage: 'Persona not found after update attempt',
    })
  }

  return data
})
