import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const guideTextId = event.context.params?.id

  if (!guideTextId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Guide Text ID is required',
    })
  }

  const idAsNumber = parseInt(guideTextId, 10)
  if (isNaN(idAsNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Guide Text ID format',
    })
  }

  // Before deleting a guide_text, consider implications if guide_audios are linked to it.
  // Depending on your schema's CASCADE rules or application logic, you might need to:
  // 1. Explicitly delete or unlink associated guide_audios.
  // 2. Let the database handle it via CASCADE DELETE (if set up).
  // 3. Prevent deletion if linked guide_audios exist and CASCADING is not desired.
  // For now, this is a direct delete. Add checks if necessary.

  const { error, count } = await client
    .from('guide_texts')
    .delete({ count: 'exact' })
    .eq('guide_text_id', idAsNumber)

  if (error) {
    console.error('Error deleting guide text:', error.message)
    // Check for foreign key violations (e.g., if guide_audios depend on this guide_text and ON DELETE RESTRICT)
    // error.code '23503' for foreign_key_violation
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete guide text: ${error.message}`,
    })
  }

  if (count === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide text not found for deletion. No records deleted.',
    })
  }

  event.node.res.statusCode = 204 // No Content
  return null // Or a success message: { message: 'Guide text deleted successfully' }
})
