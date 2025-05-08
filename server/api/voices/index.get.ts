import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  // TODO: Add query params for filtering (language, persona_id, guide_text_id, object_id, etc.)
  // and pagination.

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
    .order('generated_at', { ascending: false })

  if (error) {
    console.error('Error fetching guide audios:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch guide audios: ${error.message}`,
    })
  }

  return data
})
