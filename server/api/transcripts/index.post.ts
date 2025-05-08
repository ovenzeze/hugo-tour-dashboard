import { serverSupabaseClient } from '#supabase/server'
import { type Database, type Tables } from '~/types/supabase'

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
  if (body.museum_id === undefined && body.gallery_id === undefined && body.object_id === undefined) {
    throw createError({
      statusCode: 400,
      statusMessage: 'One of museum_id, gallery_id, or object_id must be provided to satisfy CHECK constraint.',
    })
  }

  const versionToUse = body.version === undefined ? 1 : body.version;
  const isLatestToUse = body.is_latest_version === undefined ? true : body.is_latest_version;

  let data: Tables<'guide_texts'> | null = null; 
  let error: any = null;

  // Try to find an existing record based on the unique index fields for museums
  // This logic currently assumes museum_id is the one being used, as per playground setup.
  // For a more generic upsert, you'd need to check which of museum_id, gallery_id, object_id is present.
  if (body.museum_id !== undefined && body.museum_id !== null) {
    const filterConditions = {
      persona_id: body.persona_id,
      language: body.language,
      museum_id: body.museum_id as number, // Assert as number due to the if condition
      version: versionToUse,
    };

    const { data: existingEntry, error: selectError } = await client
      .from('guide_texts')
      .select('*') // Select all to have data for potential update or return
      .match(filterConditions) // Use .match() with the filter object
      .maybeSingle(); // Returns one record or null, doesn't error if not found

    if (selectError) {
      console.error('Error selecting existing guide text:', selectError.message);
      throw createError({
        statusCode: 500,
        statusMessage: `DB error during select: ${selectError.message}`,
      });
    }

    if (existingEntry) {
      // Record exists, update it
      console.log(`Existing entry found (guide_text_id: ${existingEntry.guide_text_id}), updating.`);
      const { data: updatedData, error: updateError } = await client
        .from('guide_texts')
        .update({
          transcript: body.transcript, 
          updated_at: new Date().toISOString(), // Manually set updated_at
          is_latest_version: isLatestToUse, // Can be updated if needed
          // Potentially other fields from body if they are updatable
        })
        .eq('guide_text_id', existingEntry.guide_text_id)
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
      data = updatedData;
      error = updateError;
    } else {
      // Record does not exist, insert it
      console.log('No existing entry found, inserting new one.');
      const guideTextDataToInsert = {
        transcript: body.transcript,
        language: body.language,
        persona_id: body.persona_id,
        object_id: body.object_id,
        gallery_id: body.gallery_id,
        museum_id: body.museum_id,
        version: versionToUse,
        is_latest_version: isLatestToUse,
      };
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
      data = insertedData;
      error = insertError;
    }
  } else {
    // This case handles if museum_id is not present, implying gallery_id or object_id is.
    // The unique constraints for those are different (unique_text_gallery_version, unique_text_object_version).
    // For simplicity in this step, if not museum_id, we'll just try an insert.
    // A full solution would replicate the select-then-update/insert for gallery and object cases.
    console.log('Museum_id not provided, attempting direct insert (assuming gallery/object specific uniqueness).');
    const guideTextDataToInsert = {
        transcript: body.transcript,
        language: body.language,
        persona_id: body.persona_id,
        object_id: body.object_id,
        gallery_id: body.gallery_id,
        museum_id: body.museum_id,
        version: versionToUse,
        is_latest_version: isLatestToUse,
      };
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
      data = insertedData;
      error = insertError;
  }

  if (error) {
    console.error('Error in manual upsert for guide text:', error.message);
    // Check for specific error codes or messages if needed, e.g., from unique constraints if the 'else' block insert fails for gallery/object
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save guide text: ${error.message}`,
    });
  }
  if (!data) {
    throw createError({
        statusCode: 500,
        statusMessage: 'Failed to save guide text: No data returned from operation.'
    });
  }

  return data;
})
