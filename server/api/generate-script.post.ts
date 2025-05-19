// server/api/generate-script.post.ts
import { consola } from "consola";
import { createError, defineEventHandler, readBody, type H3Event } from "h3";
import { useStorage } from '#imports';
import { callLLM, cleanAndParseJson } from "../utils/llmService";
import { getPersonasByLanguage, type AutoSelectedPersona } from "../utils/personaFetcher";

// Interface for persona details used within this script logic
interface EffectivePersona {
  persona_id: number;
  name: string;
  voice_model_identifier: string;
}

// Interface for the expected request body from the frontend
interface GenerateScriptRequestBody {
  podcastSettings?: {
    title?: string;
    topic?: string;
    numberOfSegments?: number;
    style?: string;
    keywords?: string;
    hostPersonaId?: number | string | undefined; // Kept for potential future direct ID usage
    guestPersonaIds?: (number | string | undefined)[]; // Kept for potential future direct ID usage
    backgroundMusic?: string;
    language?: string;
    museumId?: number;
    galleryId?: number;
    objectId?: number;
  };
  // Frontend might send detailed personas if selected by the user
  hostPersona?: EffectivePersona; 
  guestPersonas?: EffectivePersona[];
}

export default defineEventHandler(async (event: H3Event) => {
  const body = await readBody<GenerateScriptRequestBody>(event);
  const podcastSettings = body.podcastSettings || {}; // Ensure podcastSettings is an object
  const language = podcastSettings.language || 'en-US'; // Default to en-US if not provided

  let effectiveHostPersona: EffectivePersona | undefined = body.hostPersona;
  let effectiveGuestPersonas: EffectivePersona[] = body.guestPersonas || [];

  if (!effectiveHostPersona) {
    consola.info(`[generate-script] No host persona provided by client for language ${language}. Attempting to auto-select.`);
    try {
      const availablePersonas = await getPersonasByLanguage(event, language, 10);

      if (availablePersonas.length > 0) {
        // Convert AutoSelectedPersona to EffectivePersona (they are compatible)
        const allEffectivePersonas: EffectivePersona[] = availablePersonas.map(p => ({
          persona_id: p.persona_id,
          name: p.name,
          voice_model_identifier: p.voice_model_identifier,
        }));
        
        effectiveHostPersona = allEffectivePersonas.shift(); // Take the first as host
        effectiveGuestPersonas = allEffectivePersonas;    // Remaining are potential guests
        consola.info(`[generate-script] Auto-selected host: ${effectiveHostPersona?.name}, Guests: ${effectiveGuestPersonas.map(p => p.name).join(', ')}`);
      } else {
        consola.warn(`[generate-script] No personas found for language ${language}. Proceeding with default "Host" name and empty voice map. This might cause issues downstream.`);
        // effectiveHostPersona remains undefined, effectiveGuestPersonas remains empty.
        // The prompt will use "Host" and an empty voiceMapJson.
        // Consider if an error should be thrown here if personas are mandatory for a good script.
      }
    } catch (fetchError: any) {
        consola.error(`[generate-script] Error auto-selecting personas: ${fetchError.message}`, fetchError);
        // Decide how to handle: proceed with defaults or throw error?
        // For now, proceed with defaults as per the warning above.
    }
  }

  // --- Construct the prompt ---
  const storage = useStorage('assets:server');
  const promptFilePath = "prompts/podcast_script_generation.md";

  consola.info(`[generate-script] Attempting to read prompt file: ${promptFilePath}`);
  let promptTemplate: string = ""; // Initialize to empty string, not null
  try {
    const item = await storage.getItem(promptFilePath);
    if (typeof item !== 'string') { // Check if item is a string
        consola.error(`[generate-script] Prompt file content is not a string or not found at ${promptFilePath}`);
        throw new Error("Prompt file content is invalid or not found.");
    }
    promptTemplate = item;
    consola.success(`[generate-script] Successfully read prompt file: ${promptFilePath}`);
  } catch (error: any) {
    consola.error(`[generate-script] Error reading prompt file ${promptFilePath}:`, error.message);
    throw createError({ statusCode: 500, statusMessage: "Failed to read prompt template file on the server." });
  }

  // Construct guest names string for the prompt
  const guestNames = effectiveGuestPersonas.length > 0 
    ? effectiveGuestPersonas.map((p) => p.name).join("、") 
    : "Guest"; // Default if no guests or auto-selection failed to find guests

  // Construct voiceMap JSON string for the prompt
  const voiceMap: { [key: string]: { personaId: number; voice_model_identifier: string } } = {};
  if (effectiveHostPersona) {
    voiceMap[effectiveHostPersona.name] = {
      personaId: effectiveHostPersona.persona_id,
      voice_model_identifier: effectiveHostPersona.voice_model_identifier,
    };
  }
  effectiveGuestPersonas.forEach((p) => {
    voiceMap[p.name] = {
      personaId: p.persona_id,
      voice_model_identifier: p.voice_model_identifier,
    };
  });
  const voiceMapJsonString = JSON.stringify(voiceMap, null, 2);

  // Get current date and time for time-based museum selection
  const now = new Date();
  const currentTimeString = now.toLocaleString("en-US", {
    hour: "numeric", minute: "numeric", hour12: true,
    day: "numeric", month: "long", year: "numeric", weekday: "long",
  });

  // Insert language instruction if language is not English
  function getLanguageName(code: string): string {
    const map: Record<string, string> = {
      'zh-CN': 'Chinese', 'zh-TW': 'Chinese', 'es': 'Spanish', 'fr': 'French',
      'de': 'German', 'ja': 'Japanese', 'pt': 'Portuguese', 'ru': 'Russian',
      'hi': 'Hindi', 'ar': 'Arabic', 'en': 'English', 'en-US': 'English'
    };
    return map[code] || code;
  }
  
  const languageName = getLanguageName(language); // Use the language variable defined at the top
  const languageInstruction = (language === 'en' || language === 'en-US') 
    ? '' 
    : `Please use ${languageName} to generate the podcast script.\n`;

  let promptContent = languageInstruction + promptTemplate
    .replace("{{title}}", podcastSettings.title || "Suggest an Engaging Title")
    .replace("{{topic}}", podcastSettings.topic || "A Fascinating Topic")
    .replace("{{hostName}}", effectiveHostPersona?.name || "Host") 
    .replace("{{guestNames}}", guestNames) 
    .replace("{{style}}", podcastSettings.style || "conversational")
    .replace("{{keywords}}", podcastSettings.keywords || "none")
    .replace("{{numberOfSegments}}", (podcastSettings.numberOfSegments || 3).toString())
    .replace("{{backgroundMusic}}", podcastSettings.backgroundMusic || "none")
    .replace("{{voiceMapJson}}", voiceMapJsonString)
    .replace("{{currentTime}}", currentTimeString);

  promptContent = promptContent.replace(/\{\{.*?\}\}/g, "").trim();

  const llmProvider = 'groq';
  consola.info(`[generate-script] Using LLM service with provider: '${llmProvider}', template: ${promptFilePath}`);

  try {
    const rawGeneratedContent = await callLLM({
      prompt: promptContent,
      provider: llmProvider,
      responseFormat: { type: "json_object" }
    });

    const parsedResponse = cleanAndParseJson(rawGeneratedContent);

    if (!parsedResponse || !Array.isArray(parsedResponse.script) || !parsedResponse.voiceMap ||
        typeof parsedResponse.podcastTitle !== "string" || typeof parsedResponse.language !== "string") {
      consola.error("[generate-script] Parsed JSON does not match expected format:", parsedResponse);
      throw createError({
        statusCode: 500,
        statusMessage: "AI response format is incorrect.",
        data: { rawResponse: rawGeneratedContent, parsedResponse },
      });
    }

    consola.success(`[generate-script] Script generated successfully by LLM provider: ${llmProvider}.`);
    return parsedResponse;

  } catch (error: any) {
    if (error.statusCode && error.statusMessage) throw error;
    consola.error("[generate-script] Unhandled error during LLM processing:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "An unexpected error occurred while generating the script.",
      data: error.message,
    });
  }
});
