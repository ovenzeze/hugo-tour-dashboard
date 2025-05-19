// server/api/generate-script.post.ts
import { consola } from "consola"; // For logging
import { createError, defineEventHandler, readBody } from "h3";
import { useStorage } from '#imports'; // Import Nitro's useStorage
import { callLLM, cleanAndParseJson } from "../utils/llmService"; // Import the new LLM service

// Interface for the expected request body from the frontend
interface GenerateScriptRequestBody {
  podcastSettings?: {
    // From stores/playground.ts
    title?: string; // Make optional as AI will suggest
    topic?: string; // Make optional as AI will suggest
    numberOfSegments?: number; // Make optional as AI will suggest
    style?: string; // Make optional as AI will suggest
    keywords?: string; // Make optional as AI will suggest
    hostPersonaId?: number | string | undefined;
    guestPersonaIds?: (number | string | undefined)[];
    backgroundMusic?: string;
    language?: string; // Make optional as AI will suggest
    museumId?: number;
    galleryId?: number;
    objectId?: number;
  };
  hostPersona?: {
    // Detailed host persona from frontend
    persona_id: number;
    name: string;
    voice_model_identifier: string;
  };
  guestPersonas?: {
    // Detailed guest personas array from frontend
    persona_id: number;
    name: string;
    voice_model_identifier: string;
  }[];
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateScriptRequestBody>(event);

  // API key check is now handled by llmService

  // --- Construct the prompt ---
  const storage = useStorage('assets:server');
  const promptFilePath = "prompts/podcast_script_generation.md"; // Relative to server/assets/

  consola.info(
    `Attempting to read prompt file from Nitro storage: assets:server:${promptFilePath}`
  );

  let promptTemplate: string | null = "";

  try {
    // Read the prompt template file content using Nitro storage
    promptTemplate = await storage.getItem(promptFilePath);
    if (promptTemplate === null) {
      consola.error(`Prompt file not found in storage at ${promptFilePath}`);
      throw createError({
        statusCode: 500,
        statusMessage: "Failed to read prompt template file (not found) on the server.",
      });
    }
    consola.success(`Successfully read prompt file from storage: ${promptFilePath}`);
  } catch (error) {
    consola.error(`Error reading prompt file from storage ${promptFilePath}:`, error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to read prompt template file on the server.",
    });
  }

  // Use actual values from the request body to replace placeholders
  const podcastSettings = body.podcastSettings;
  const hostPersona = body.hostPersona;
  const guestPersonas = body.guestPersonas || [];

  // Construct guest names string for the prompt
  const guestNames = guestPersonas.map((p) => p.name).join("、") || "Guest";

  // Construct voiceMap JSON string for the prompt
  const voiceMap: {
    [key: string]: { personaId: number; voice_model_identifier: string };
  } = {};
  if (hostPersona) {
    voiceMap[hostPersona.name] = {
      personaId: hostPersona.persona_id,
      voice_model_identifier: hostPersona.voice_model_identifier,
    };
  }
  guestPersonas.forEach((p) => {
    voiceMap[p.name] = {
      personaId: p.persona_id,
      voice_model_identifier: p.voice_model_identifier,
    };
  });
  const voiceMapJsonString = JSON.stringify(voiceMap, null, 2);

  // Get current date and time for time-based museum selection
  const now = new Date();
  const currentTimeString = now.toLocaleString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });

  let promptContent = promptTemplate
    .replace("{{title}}", podcastSettings?.title || "")
    .replace("{{topic}}", podcastSettings?.topic || "")
    .replace("{{hostName}}", hostPersona?.name || "Host") // Use hostPersona name
    .replace("{{guestNames}}", guestNames) // Use constructed guest names string
    .replace("{{style}}", podcastSettings?.style || "")
    .replace("{{keywords}}", podcastSettings?.keywords || "")
    .replace(
      "{{numberOfSegments}}",
      (podcastSettings?.numberOfSegments || 3).toString()
    )
    .replace("{{backgroundMusic}}", podcastSettings?.backgroundMusic || "")
    .replace("{{voiceMapJson}}", voiceMapJsonString) // Replace voiceMap placeholder
    .replace("{{currentTime}}", currentTimeString); // Add current time for museum selection

  // Remove any remaining double curly braces if a placeholder was missed or value was empty
  promptContent = promptContent.replace(/\{\{.*?\}\}/g, "").trim();

  // For Groq, the model is now determined within llmService.
  const llmProvider = 'groq'; // Specify Groq as the provider

  consola.info(
    `Using LLM service with provider: '${llmProvider}' (model determined by llmService), and template from: ${promptFilePath}`
  );

  try {
    const rawGeneratedContent = await callLLM({
      prompt: promptContent,
      // No model property passed for Groq, llmService will handle it
      provider: llmProvider,
      responseFormat: { type: "json_object" } // Ensure JSON output for Groq as well
    });

    // JSON parsing and cleaning is now handled by a utility function
    const parsedResponse = cleanAndParseJson(rawGeneratedContent);

    if (
      !parsedResponse ||
      !Array.isArray(parsedResponse.script) ||
      !parsedResponse.voiceMap ||
      typeof parsedResponse.podcastTitle !== "string" ||
      typeof parsedResponse.language !== "string"
    ) {
      consola.error(
        "Parsed JSON does not match the expected structuredData format:",
        parsedResponse
      );
      throw createError({
        statusCode: 500,
        statusMessage:
          "AI response format is incorrect: does not match expected structuredData structure.",
        data: { rawResponse: rawGeneratedContent, parsedResponse },
      });
    }

    consola.success(
      `Script and settings generated successfully by LLM provider: ${llmProvider}.`
    );
    return parsedResponse;

  } catch (error: any) {
    // Errors from callLLM or cleanAndParseJson will be H3Errors
    // If it's not an H3Error, wrap it
    if (error.statusCode && error.statusMessage) {
      throw error; // Re-throw H3 errors directly
    }
    consola.error("Unhandled error during LLM processing:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "An unexpected error occurred while generating the script.",
      data: error.message,
    });
  }
});
