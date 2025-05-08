import { serverSupabaseClient } from '#supabase/server'
import type { Database, Json } from '~/types/supabase'

// Define the expected shape of the request body for updating a guide audio
interface GuideAudioUpdateBody {
  audio_url?: string
  language?: string
  persona_id?: number
  guide_text_id?: number | null
  object_id?: number | null
  gallery_id?: number | null
  museum_id?: number | null
  duration_seconds?: number | null
  version?: number | null
  is_latest_version?: boolean | null
  is_active?: boolean | null
  metadata?: Json | null
  // 'generated_at' might be updated if re-generating, or left as is
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const audioGuideId = event.context.params?.id
  const body = await readBody<GuideAudioUpdateBody>(event)

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

  // Construct the update object, only including fields present in the body
  const guideAudioDataToUpdate: Partial<GuideAudioUpdateBody> = {}
  if (body.audio_url !== undefined) guideAudioDataToUpdate.audio_url = body.audio_url
  if (body.language !== undefined) guideAudioDataToUpdate.language = body.language
  if (body.persona_id !== undefined) guideAudioDataToUpdate.persona_id = body.persona_id
  if (body.guide_text_id !== undefined) guideAudioDataToUpdate.guide_text_id = body.guide_text_id
  if (body.object_id !== undefined) guideAudioDataToUpdate.object_id = body.object_id
  if (body.gallery_id !== undefined) guideAudioDataToUpdate.gallery_id = body.gallery_id
  if (body.museum_id !== undefined) guideAudioDataToUpdate.museum_id = body.museum_id
  if (body.duration_seconds !== undefined) guideAudioDataToUpdate.duration_seconds = body.duration_seconds
  if (body.version !== undefined) guideAudioDataToUpdate.version = body.version
  if (body.is_latest_version !== undefined) guideAudioDataToUpdate.is_latest_version = body.is_latest_version
  if (body.is_active !== undefined) guideAudioDataToUpdate.is_active = body.is_active
  if (body.metadata !== undefined) guideAudioDataToUpdate.metadata = body.metadata

  if (Object.keys(guideAudioDataToUpdate).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields provided for update',
    })
  }

  const { data, error } = await client
    .from('guide_audios')
    .update(guideAudioDataToUpdate)
    .eq('audio_guide_id', idAsNumber)
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
    if (error.code === 'PGRST116') { // Not found for update
      throw createError({
        statusCode: 404,
        statusMessage: 'Guide audio not found for update',
      })
    }
    console.error('Error updating guide audio:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update guide audio: ${error.message}`,
    })
  }

  if (!data) { // Fallback
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide audio not found after update attempt',
    })
  }

  return data
})
