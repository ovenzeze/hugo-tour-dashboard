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

    // 根据语言优先级进行排序：完全匹配的语言 > 部分匹配 > 其他
    const sortedCandidates = mappedCandidates.sort((a, b) => {
      const aPersona = allLlmCandidatePersonas.find(p => p.persona_id === a.persona_id);
      const bPersona = allLlmCandidatePersonas.find(p => p.persona_id === b.persona_id);
      
      const aSupportsLang = aPersona?.language_support?.includes(language) || false;
      const bSupportsLang = bPersona?.language_support?.includes(language) || false;
      
      if (aSupportsLang && !bSupportsLang) return -1;
      if (!aSupportsLang && bSupportsLang) return 1;
      return 0; // 保持原顺序
    });

    effectiveHostPersona = sortedCandidates.shift(); // Take the first (highest priority) as host
    effectiveGuestPersonas = sortedCandidates.slice(0, 3); // 限制guest数量，避免prompt过长
    consola.info(`[generate-script] Auto-selected language-prioritized host: ${effectiveHostPersona?.name}, Guests: ${effectiveGuestPersonas.map(p => p.name).join(', ')}`);
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
  tempPromptContent = replaceAll(tempPromptContent, "{{numberOfSegments}}", (podcastSettings.numberOfSegments || 10).toString()); // 默认改为10
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

  // 打印完整的提示词内容用于调试
  consola.info(`[generate-script] ========== COMPLETE PROMPT START ==========`);
  consola.info(promptContent);
  consola.info(`[generate-script] ========== COMPLETE PROMPT END ==========`);
  
  // 打印关键的替换变量以便调试
  consola.info(`[generate-script] ========== KEY VARIABLES ==========`);
  consola.info(`Host Name: ${effectiveHostPersona?.name || "Host"}`);
  consola.info(`Guest Names: ${guestNames}`);
  consola.info(`Number of Segments: ${podcastSettings.numberOfSegments || 10}`);
  consola.info(`Language: ${language}`);
  consola.info(`Voice Map JSON: ${voiceMapJsonString}`);
  consola.info(`Available Personas Count: ${personasForLlmPrompt.length}`);
  consola.info(`[generate-script] ================================================`);

  try {
    const rawGeneratedContent = await callLLM({
      prompt: promptContent,
      provider: llmProvider,
      responseFormat: { type: "json_object" }
    });

    // 打印原始AI响应用于调试
    consola.info(`[generate-script] ========== RAW AI RESPONSE START ==========`);
    consola.info(rawGeneratedContent);
    consola.info(`[generate-script] ========== RAW AI RESPONSE END ==========`);

    const parsedResponse = cleanAndParseJson(rawGeneratedContent);

    // 打印解析后的响应用于调试
    consola.info(`[generate-script] ========== PARSED RESPONSE START ==========`);
    consola.info(JSON.stringify(parsedResponse, null, 2));
    consola.info(`[generate-script] ========== PARSED RESPONSE END ==========`);

    // 详细分析script数组中的segment
    if (parsedResponse && Array.isArray(parsedResponse.script)) {
      consola.info(`[generate-script] ========== SCRIPT ANALYSIS ==========`);
      consola.info(`Total segments in script: ${parsedResponse.script.length}`);
      
      parsedResponse.script.forEach((segment, index) => {
        consola.info(`Segment ${index + 1}:`);
        consola.info(`  - Speaker field: "${segment.speaker || 'MISSING'}"`);
        consola.info(`  - Name field (deprecated): "${segment.name || 'NOT_PROVIDED'}"`);
        consola.info(`  - Role: "${segment.role || 'MISSING'}"`);
        consola.info(`  - Text length: ${segment.text ? segment.text.length : 0} chars`);
        consola.info(`  - Text preview: "${segment.text ? segment.text.substring(0, 100) + '...' : 'MISSING'}"`);
        
        // 检查字段一致性
        if (segment.name && segment.speaker && segment.name !== segment.speaker) {
          consola.warn(`  - WARNING: 'name' (${segment.name}) and 'speaker' (${segment.speaker}) fields differ! This will cause confusion.`);
        }
        if (!segment.speaker && segment.name) {
          consola.warn(`  - WARNING: Using deprecated 'name' field instead of 'speaker'. Please update AI prompt.`);
        }
      });
      
      // 分析voice map
      if (parsedResponse.voiceMap) {
        consola.info(`Voice Map keys: ${Object.keys(parsedResponse.voiceMap).join(', ')}`);
        Object.entries(parsedResponse.voiceMap).forEach(([key, value]) => {
          consola.info(`  - ${key}: personaId=${value.personaId}, voice_model=${value.voice_model_identifier}`);
        });
      }
      consola.info(`[generate-script] ================================================`);
    }

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
