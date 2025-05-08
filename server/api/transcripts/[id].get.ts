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

  const { data, error } = await client
    .from('guide_texts')
    .select(`
      guide_text_id,
      transcript,
      language,
      version,
      is_latest_version,
      created_at,
      updated_at,
      object_id,
      gallery_id,
      museum_id,
      personas ( persona_id, name )
    `)
    .eq('guide_text_id', idAsNumber)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      throw createError({
        statusCode: 404,
        statusMessage: 'Guide text not found',
      })
    }
    console.error('Error fetching guide text:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch guide text: ${error.message}`,
    })
  }

  if (!data) { // Fallback, should be caught by PGRST116
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide text not found',
    })
  }

  return data
})
