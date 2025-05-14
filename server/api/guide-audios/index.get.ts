import { serverSupabaseClient } from "#supabase/server";
import { createError, defineEventHandler } from "h3";
import type { Database } from "~/types/supabase";

export default defineEventHandler(async (event) => {
  const client = await serverSupabaseClient<Database>(event);

  // Query guide_audios, join personas and guide_texts for display fields
  const { data, error } = await client
    .from("guide_audios")
    .select(
      `
      audio_guide_id,
      audio_url,
      duration_seconds,
      gallery_id,
      generated_at,
      guide_text_id,
      is_active,
      is_latest_version,
      language,
      metadata,
      museum_id,
      object_id,
      persona_id,
      version,
      personas ( name ),
      guide_texts ( transcript )
    `
    )
    .order("generated_at", { ascending: false });

  if (error) {
    console.error("Error fetching guide audios:", error.message);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch guide audios: ${error.message}`,
    });
  }

  // Map to GuideAudio interface expected by frontend
  const result = (data || []).map((row: any) => ({
    audio_guide_id: row.audio_guide_id,
    audio_url: row.audio_url,
    duration_seconds: row.duration_seconds,
    gallery_id: row.gallery_id,
    generated_at: row.generated_at,
    guide_text_id: row.guide_text_id,
    guide_text_preview: row.guide_texts?.transcript
      ? row.guide_texts.transcript.slice(0, 80)
      : undefined,
    is_active: row.is_active,
    is_latest_version: row.is_latest_version,
    language: row.language,
    metadata: row.metadata,
    museum_id: row.museum_id,
    object_id: row.object_id,
    persona_id: row.persona_id,
    persona_name: row.personas?.name,
    version: row.version,
  }));

  return result;
});
