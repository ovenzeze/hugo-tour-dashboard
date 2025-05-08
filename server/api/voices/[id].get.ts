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

  const { data, error } = await client
    .from('guide_audios')
    .select(`
      audio_guide_id,
      audio_url,
      language,
      duration_seconds,
      version,
      is_latest_version,
      is_active,
      generated_at,
      metadata,
      object_id,
      gallery_id,
      museum_id,
      personas ( persona_id, name ),
      guide_texts ( guide_text_id, transcript, language )
    `)
    .eq('audio_guide_id', idAsNumber)
    .single()

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      throw createError({
        statusCode: 404,
        statusMessage: 'Guide audio not found',
      })
    }
    console.error('Error fetching guide audio:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch guide audio: ${error.message}`,
    })
  }

  if (!data) { // Fallback
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide audio not found',
    })
  }

  return data
})
