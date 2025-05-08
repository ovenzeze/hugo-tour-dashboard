import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const audioGuideId = event.context.params?.id

  if (!audioGuideId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Audio Guide ID is required',
    })
  }

  const idAsNumber = parseInt(audioGuideId, 10)
  if (isNaN(idAsNumber)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid Audio Guide ID format',
    })
  }

  // Consider if deleting an audio file from storage (e.g., Supabase Storage) is also needed.
  // This current implementation only deletes the database record.
  // If the audio_url points to a file you manage, you might need to delete that file separately.

  const { error, count } = await client
    .from('guide_audios')
    .delete({ count: 'exact' })
    .eq('audio_guide_id', idAsNumber)

  if (error) {
    console.error('Error deleting guide audio:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to delete guide audio: ${error.message}`,
    })
  }

  if (count === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide audio not found for deletion. No records deleted.',
    })
  }

  event.node.res.statusCode = 204 // No Content
  return null // Or a success message: { message: 'Guide audio deleted successfully' }
})
