import { serverSupabaseClient } from '#supabase/server'
import type { Database } from '~/types/supabase'

// Define the expected shape of the request body for updating a guide text
interface GuideTextUpdateBody {
  transcript?: string
  language?: string
  persona_id?: number
  object_id?: number | null
  gallery_id?: number | null
  museum_id?: number | null
  version?: number | null
  is_latest_version?: boolean | null
  // Add other relevant fields from your 'guide_texts' table Update type
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const guideTextId = event.context.params?.id
  const body = await readBody<GuideTextUpdateBody>(event)

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

  // Construct the update object, only including fields present in the body
  const guideTextDataToUpdate: Partial<GuideTextUpdateBody> = {}
  if (body.transcript !== undefined) guideTextDataToUpdate.transcript = body.transcript
  if (body.language !== undefined) guideTextDataToUpdate.language = body.language
  if (body.persona_id !== undefined) guideTextDataToUpdate.persona_id = body.persona_id
  if (body.object_id !== undefined) guideTextDataToUpdate.object_id = body.object_id
  if (body.gallery_id !== undefined) guideTextDataToUpdate.gallery_id = body.gallery_id
  if (body.museum_id !== undefined) guideTextDataToUpdate.museum_id = body.museum_id
  if (body.version !== undefined) guideTextDataToUpdate.version = body.version
  if (body.is_latest_version !== undefined) guideTextDataToUpdate.is_latest_version = body.is_latest_version
  // 'updated_at' is typically handled by Supabase/database defaults

  if (Object.keys(guideTextDataToUpdate).length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No fields provided for update',
    })
  }

  const { data, error } = await client
    .from('guide_texts')
    .update(guideTextDataToUpdate)
    .eq('guide_text_id', idAsNumber)
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
    if (error.code === 'PGRST116') { // Not found for update
      throw createError({
        statusCode: 404,
        statusMessage: 'Guide text not found for update',
      })
    }
    console.error('Error updating guide text:', error.message)
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to update guide text: ${error.message}`,
    })
  }

  if (!data) { // Fallback
    throw createError({
      statusCode: 404,
      statusMessage: 'Guide text not found after update attempt',
    })
  }

  return data
})
