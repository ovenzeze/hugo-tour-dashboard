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

  const idAsNumber = parseInt(personaId, 10)
  if (isNaN(idAsNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Persona ID format',
    })
  }

  const { error, count } = await client
    .from('personas')
    .delete({ count: 'exact' }) // Request the count of deleted rows
    .eq('persona_id', idAsNumber) // Assuming 'persona_id' is the primary key

  if (error) {
    console.error('Error deleting persona:', error.message)
    // Check for specific foreign key constraint errors if personas are linked elsewhere
    // e.g., if error.code === '23503' (foreign_key_violation)
    // You might want to return a more specific error message in that case.
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete persona: ${error.message}`,
    })
  }

  if (count === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Persona not found for deletion. No records deleted.',
    })
  }

  // Successfully deleted
  event.node.res.statusCode = 204 // No Content
  return null // Or a success message: { message: 'Persona deleted successfully' }
})
