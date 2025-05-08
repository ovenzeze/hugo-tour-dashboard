import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json } from '~/types/supabase'

// Define the expected shape of the request body for creating a guide audio
interface GuideAudioInsertBody {
  audio_url: string
  language: string
  persona_id: number
  guide_text_id?: number | null // Can be null if audio is not directly from a transcript
  object_id?: number | null
  gallery_id?: number | null
  museum_id?: number | null
  duration_seconds?: number | null
  version?: number | null
  is_latest_version?: boolean | null
  is_active?: boolean | null
  metadata?: Json | null
  // 'generated_at' could be set here or defaulted in DB
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<GuideAudioInsertBody>(event)

  // Basic validation
  if (!body.audio_url || !body.language || !body.persona_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields: audio_url, language, or persona_id',
    })
  }

  // Prepare the data for insertion
  const guideAudioDataToInsert = {
    audio_url: body.audio_url,
    language: body.language,
    persona_id: body.persona_id,
    guide_text_id: body.guide_text_id,
    object_id: body.object_id,
    gallery_id: body.gallery_id,
    museum_id: body.museum_id,
    duration_seconds: body.duration_seconds,
    version: body.version === undefined ? 1 : body.version, // Default version to 1
    is_latest_version: body.is_latest_version === undefined ? true : body.is_latest_version, // Default to true
    is_active: body.is_active === undefined ? true : body.is_active, // Default to true
    metadata: body.metadata,
    generated_at: new Date().toISOString(), // Set generation time, or let DB handle it
    // audio_guide_id is typically auto-generated
  }

  const { data, error } = await client
    .from('guide_audios')
    .insert(guideAudioDataToInsert)
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
    .single()

  if (error) {
    console.error('Error creating guide audio:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create guide audio: ${error.message}`,
    })
  }

  return data
})
