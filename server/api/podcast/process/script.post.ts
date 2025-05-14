import { createError, defineEventHandler, readBody } from "h3";
import {
  processPodcastScript,
  type PreparedSegmentForSynthesis,
} from "../../../utils/podcastScriptProcessor";
import { serverSupabaseClient } from '#supabase/server'; // For database interaction
import type { Database, TablesInsert } from '~/types/supabase'; // For database types

interface Persona { // This interface is for the `personas` object used by processPodcastScript
  name: string;
  voice_model_identifier: string;
}

interface ScriptSegment {
  speaker: string;
  text: string;
}

interface RequestBody {
  podcastTitle: string; // Used to generate podcastId (a string identifier, not a DB ID)
  script: ScriptSegment[];
  personas: { // Used by processPodcastScript for voice matching
    hostPersona?: Persona; // Matches processPodcastScript's expectation
    guestPersonas?: Persona[];
  };
  // Additional fields required for saving to guide_texts table
  hostPersonaId: number; // The actual ID of the host persona from the 'personas' table (DB FK)
  language: string;      // e.g., 'en', 'es', required for guide_texts table
  // Optional context for guide_texts table
  museumId?: number;
  galleryId?: number;
  objectId?: number;
}

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) as RequestBody;
    // Destructure all fields from the body, including new ones for DB saving
    const {
      podcastTitle,
      script,
      personas,
      hostPersonaId,
      language,
      museumId,
      galleryId,
      objectId,
    } = body;

    // Validation for all required fields
    if (
      !podcastTitle ||
      !script ||
      !Array.isArray(script) ||
      // script.length === 0 is allowed, means empty script, won't save to DB but processing is "successful"
      !personas ||
      hostPersonaId === undefined || hostPersonaId === null || // hostPersonaId is required for DB
      !language // language is required for DB
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Invalid request body. "podcastTitle", "script" array, "personas" object, "hostPersonaId", and "language" are required.',
      });
    }

    // Generate a string podcastId from the title (for local identification/logging, not a DB ID)
    const podcastId = podcastTitle
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_|_$/g, "");
    if (!podcastId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid podcastTitle, resulted in empty podcastId.",
      });
    }

    console.log(`API: Preparing script segments for podcastId: ${podcastId}`);
    const preparedSegments: PreparedSegmentForSynthesis[] =
      await processPodcastScript(podcastId, script, personas);

    // ---- BEGIN DATABASE INSERT LOGIC ----
    const isScriptProcessingSuccessful = preparedSegments.every(
      (segment) => !segment.error
    );

    if (isScriptProcessingSuccessful && script.length > 0) {
      // Use original script segments to form the full text
      const fullScriptText = script
        .map((segment) => `${segment.speaker}: ${segment.text}`)
        .join("\n\n");

      if (fullScriptText.trim() !== "") {
        try {
          const supabase = await serverSupabaseClient<Database>(event);
          const newGuideTextEntry: TablesInsert<'guide_texts'> = {
            transcript: fullScriptText,
            language: language,
            persona_id: Number(hostPersonaId), // Ensure it's a number
            museum_id: museumId ?? null,
            gallery_id: galleryId ?? null,
            object_id: objectId ?? null,
            // is_latest_version: true, // Default to true or handle via DB
            // version: 1, // Default to 1 or handle via DB
          };

          const { data: dbData, error: dbError } = await supabase
            .from('guide_texts')
            .insert(newGuideTextEntry)
            .select()
            .single();

          if (dbError) {
            console.error(
              `Database insert error for script related to podcastId ${podcastId}: ${dbError.message}`,
              dbError
            );
            // Log error but do not fail the API response, as script processing might still be useful
          } else {
            console.log(
              `Successfully saved processed script to guide_texts for podcastId ${podcastId}. DB response:`,
              dbData
            );
          }
        } catch (dbSetupError: any) {
          console.error(
            `Error with Supabase client or during DB operation for ${podcastId}: ${dbSetupError.message}`,
            dbSetupError
          );
        }
      } else {
        console.log(`Full script text for podcastId ${podcastId} is empty. Not saving to database.`);
      }
    } else if (!isScriptProcessingSuccessful) {
      console.log(
        `Script processing for podcastId ${podcastId} had errors in one or more segments. Not saving to database.`
      );
    } else if (script.length === 0) {
      console.log(
        `Input script for podcastId ${podcastId} was empty. Not saving to database.`
      );
    }
    // ---- END DATABASE INSERT LOGIC ----

    return {
      success: true,
      podcastId: podcastId, // The string identifier generated from title
      preparedSegments: preparedSegments,
      message: `Script processed and segments prepared for podcast ${podcastId}. Next step: synthesize segments.`,
    };
  } catch (error: any) {
    console.error(
      `Error in /api/podcast/process/script.post.ts:`,
      error.message || error
    );
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to process script: ${
        error.statusMessage || error.message
      }`,
      data: error.data || error,
    });
  }
});

// 示例校验逻辑
const validateScript = (content: string) => {
  const MIN_LENGTH = 300;
  const DIALOG_REGEX = /^[\w\s]+:.+/gm;
  
  const errors: string[] = [];
  
  if (content.length < MIN_LENGTH) {
    errors.push(`脚本过短（最少 ${MIN_LENGTH} 字符）`);
  }
  
  const dialogLines = content.match(DIALOG_REGEX) || [];
  if (dialogLines.length < 3) {
    errors.push("至少需要3段对话");
  }

  return {
    valid: errors.length === 0,
    error: errors.join(", ")
  };
};
