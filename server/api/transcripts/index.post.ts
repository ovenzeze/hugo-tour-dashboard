import { serverSupabaseClient } from '#supabase/server'
import { type Database, type Tables } from '~/types/supabase'

// Define the expected shape of the request body for creating a guide text
interface GuideTextInsertBody {
  transcript: string
  language: string
  persona_id: number
  object_id?: number | null
  gallery_id?: number | null
  museum_id?: number | null // For playground, this will be 4
  version?: number // Version will be calculated for museum entries
  is_latest_version?: boolean // Will be set to true for new museum entries
}

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event)
  const body = await readBody<GuideTextInsertBody>(event)

  // Basic validation
  if (!body.transcript || !body.language || !body.persona_id) {
    throw createError({ statusCode: 400, statusMessage: 'Missing required fields: transcript, language, or persona_id' })
  }
  if (body.museum_id === undefined && body.gallery_id === undefined && body.object_id === undefined) {
    throw createError({ statusCode: 400, statusMessage: 'One of museum_id, gallery_id, or object_id must be provided to satisfy CHECK constraint.' })
  }

  let nextVersion = 1;
  // is_latest_version will be true for new inserts by default in this logic flow.

  // Logic for museum-specific entries (e.g., Playground with museum_id: 4)
  if (body.museum_id !== undefined && body.museum_id !== null) {
    const museumIdForQuery = body.museum_id as number; // Type assertion after check

    // 1. Fetch the maximum existing version for this combination
    const { data: maxVersionEntry, error: maxVersionError } = await client
      .from('guide_texts')
      .select('version')
      .eq('persona_id', body.persona_id)
      .eq('language', body.language)
      .eq('museum_id', museumIdForQuery)
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (maxVersionError) {
      console.error('Error fetching max version for museum entry:', maxVersionError.message);
      throw createError({ statusCode: 500, statusMessage: `DB error fetching max version: ${maxVersionError.message}` });
    }

    if (maxVersionEntry && typeof maxVersionEntry.version === 'number') {
      nextVersion = maxVersionEntry.version + 1;
    }
    // If no entry, nextVersion remains 1.

    // 2. Update previous latest version to false for this combination
    if (nextVersion > 1) { // Only if there were previous versions
      const { error: updateOldLatestError } = await client
        .from('guide_texts')
        .update({ is_latest_version: false })
        .eq('persona_id', body.persona_id)
        .eq('language', body.language)
        .eq('museum_id', museumIdForQuery)
        .eq('is_latest_version', true); // Target the current latest

      if (updateOldLatestError) {
        console.warn('Warning: Error updating old latest versions, proceeding with insert:', updateOldLatestError.message);
        // Decide if this is a critical failure or just a warning
      }
    }
  } else {
    // For gallery_id or object_id based entries (not Playground's primary path)
    // Use version from body or default to 1. No automatic version incrementing here unless specified.
    nextVersion = body.version === undefined ? 1 : body.version;
    // is_latest_version would also typically be true, or follow body.is_latest_version if provided.
  }

  // 3. Prepare data for insertion
  const guideTextDataToInsert = {
    transcript: body.transcript,
    language: body.language,
    persona_id: body.persona_id,
    object_id: body.object_id, // Will be null if museum_id is present (Playground)
    gallery_id: body.gallery_id, // Will be null if museum_id is present (Playground)
    museum_id: body.museum_id,
    version: nextVersion,
    is_latest_version: true, // New inserts are always the latest for their scope
  };

  // 4. Insert the new guide text record
  const { data: insertedData, error: insertError } = await client
    .from('guide_texts')
    .insert(guideTextDataToInsert)
    .select(`
      guide_text_id,
      transcript,
      language,
      persona_id,
      version,
      is_latest_version,
      created_at,
      updated_at,
      object_id,
      gallery_id,
      museum_id,
      personas ( persona_id, name )
    `)
    .single();

  if (insertError) {
    console.error('Error inserting new guide text:', insertError.message);
    // This could still fail if a similar unique constraint exists for gallery/object and isn't handled
    throw createError({ statusCode: 500, statusMessage: `Failed to insert guide text: ${insertError.message}` });
  }
  if (!insertedData) {
    throw createError({ statusCode: 500, statusMessage: 'Failed to insert guide text: No data returned from insert operation.' });
  }

  console.log(`Successfully inserted new guide text with id: ${insertedData.guide_text_id}, version: ${insertedData.version}`);
  return insertedData;
})
