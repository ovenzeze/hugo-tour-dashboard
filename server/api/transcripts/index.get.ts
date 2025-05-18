import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)

  // TODO: Consider adding query parameters for filtering and pagination in the future
  // e.g., by language, persona_id, object_id, gallery_id, museum_id

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
      personas ( persona_id, name ),
      objects ( object_id, title ),
      galleries ( gallery_id, name ),
      museums ( museum_id, name )
    `)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching guide texts:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch guide texts: ${error.message}`,
    })
  }

  console.log('Fetched guide texts:', data)
  return data
})
