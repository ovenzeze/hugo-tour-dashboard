import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

// Define the expected shape of the request body for creating a guide text
interface GuideTextInsertBody {
  transcript: string
  language: string
  persona_id: number
  object_id?: number | null
  gallery_id?: number | null
  museum_id?: number | null
  version?: number | null
  is_latest_version?: boolean | null
  // Add other relevant fields from your 'guide_texts' table Insert type
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<GuideTextInsertBody>(event)

  // Basic validation
  if (!body.transcript || !body.language || !body.persona_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: transcript, language, or persona_id',
    })
  }

  // Prepare the data for insertion
  const guideTextDataToInsert = {
    transcript: body.transcript,
    language: body.language,
    persona_id: body.persona_id,
    object_id: body.object_id,
    gallery_id: body.gallery_id,
    museum_id: body.museum_id,
    version: body.version === undefined ? 1 : body.version, // Default version to 1 if not provided
    is_latest_version: body.is_latest_version === undefined ? true : body.is_latest_version, // Default to true
    // created_at and updated_at are typically handled by Supabase/database defaults
    // guide_text_id is typically auto-generated
  }

  const { data, error } = await client
    .from('guide_texts')
    .insert(guideTextDataToInsert)
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
    .single()

  if (error) {
    console.error('Error creating guide text:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create guide text: ${error.message}`,
    })
  }

  return data
})
