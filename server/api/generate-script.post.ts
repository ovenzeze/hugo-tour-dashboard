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

  // Fetch all available personas for the given language, with a soft limit for LLM context
  // The personaFetcher limit is now optional, we can fetch more and then cap at 100 for the LLM.
  const allLlmCandidatePersonas = await getPersonasByLanguage(event, language, 150); // Fetch up to 150 initially

  if (!effectiveHostPersona && allLlmCandidatePersonas.length > 0) {
    consola.info(`[generate-script] No host persona provided by client for language ${language}. Attempting to auto-select from ${allLlmCandidatePersonas.length} candidates.`);
    
    // Convert AutoSelectedPersona to EffectivePersona, ensuring all fields from AutoSelectedPersona are mapped
    const mappedCandidates: EffectivePersona[] = allLlmCandidatePersonas.map(p => ({
      persona_id: p.persona_id,
      name: p.name,
      // Ensure voice_model_identifier is handled, even if null from AutoSelectedPersona
      voice_model_identifier: p.voice_model_identifier || "default_voice_model_if_null_in_auto_selected",
      // Include other relevant fields if needed by EffectivePersona, though it's minimal now
    }));

    effectiveHostPersona = mappedCandidates.shift(); // Take the first as host
    effectiveGuestPersonas = mappedCandidates;    // Remaining are potential guests for default selection
    consola.info(`[generate-script] Auto-selected default host: ${effectiveHostPersona?.name}, Default guests: ${effectiveGuestPersonas.map(p => p.name).join(', ')}`);
  } else if (!effectiveHostPersona) {
    consola.warn(`[generate-script] No personas found for language ${language} and none provided by client. Proceeding with default "Host" name.`);
  }

  // Prepare the list of (up to 100) available personas for the LLM prompt
  const personasForLlmPrompt = allLlmCandidatePersonas.slice(0, 100).map(p => ({
    persona_id: p.persona_id,
    name: p.name,
    description: p.description,
    tts_provider: p.tts_provider,
    language_support: p.language_support,
    voice_description: p.voice_description,
    // voice_model_identifier is also available in p if needed here, but voiceMap handles specific models for selected roles
  }));
  const availablePersonasJsonString = JSON.stringify(personasForLlmPrompt, null, 2);

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
  // This part seems unrelated to the persona changes but is kept as is.
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

  // Helper for global replace
  const replaceAll = (str: string, find: string, replace: string) => {
    // Escape special characters in "find" string for RegExp
    const escapedFind = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return str.replace(new RegExp(escapedFind, 'g'), replace);
  };

  let tempPromptContent = languageInstruction + promptTemplate;

  tempPromptContent = replaceAll(tempPromptContent, "{{title}}", podcastSettings.title || "Suggest an Engaging Title");
  tempPromptContent = replaceAll(tempPromptContent, "{{topic}}", podcastSettings.topic || "A Fascinating Topic");
  tempPromptContent = replaceAll(tempPromptContent, "{{hostName}}", effectiveHostPersona?.name || "Host");
  tempPromptContent = replaceAll(tempPromptContent, "{{guestNames}}", guestNames);
  tempPromptContent = replaceAll(tempPromptContent, "{{style}}", podcastSettings.style || "conversational");
  tempPromptContent = replaceAll(tempPromptContent, "{{keywords}}", podcastSettings.keywords || "none");
  tempPromptContent = replaceAll(tempPromptContent, "{{numberOfSegments}}", (podcastSettings.numberOfSegments || 3).toString());
  tempPromptContent = replaceAll(tempPromptContent, "{{backgroundMusic}}", podcastSettings.backgroundMusic || "none");
  tempPromptContent = replaceAll(tempPromptContent, "{{voiceMapJson}}", voiceMapJsonString);
  tempPromptContent = replaceAll(tempPromptContent, "{{availablePersonasJson}}", availablePersonasJsonString);
  tempPromptContent = replaceAll(tempPromptContent, "{{currentTime}}", currentTimeString);

  // Clean up any remaining unreplaced placeholders (optional, good practice)
  // This regex will find {{any_chars_here}}
  let promptContent = tempPromptContent.replace(/\{\{.*?\}\}/g, (match) => {
    consola.warn(`[generate-script] Unreplaced placeholder in prompt after specific replaces: ${match}`);
    return ""; // Replace with empty string
  }).trim();

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
