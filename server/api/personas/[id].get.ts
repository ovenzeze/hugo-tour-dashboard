import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const personaId = event.context.params?.id

  if (!personaId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Persona ID is required',
    })
  }

  // Ensure personaId is a number if your DB expects an integer ID
  const idAsNumber = parseInt(personaId, 10)
  if (isNaN(idAsNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Persona ID format',
    })
  }

  const { data, error } = await client
    .from('personas')
    .select('*')
    .eq('persona_id', idAsNumber) // Assuming 'persona_id' is the primary key column
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // PGRST116 often means 'मतलब '0' row was returned by .single()'
      throw createError({
        statusCode: 404,
        statusMessage: 'Persona not found',
      })
    }
    console.error('Error fetching persona:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch persona: ${error.message}`,
    })
  }

  if (!data) { // Should be caught by PGRST116 but as a fallback
    throw createError({
      statusCode: 404,
      statusMessage: 'Persona not found',
    })
  }

  return data
})
