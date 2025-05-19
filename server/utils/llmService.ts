// server/utils/llmService.ts
import { consola } from "consola";
import { createError } from "h3";

interface LLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  // Potentially other fields depending on the provider
}

interface LLMError {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
    status?: number;
  };
  message?: string;
}

export type LLMProvider = 'openrouter' | 'groq';

export interface CallLLMOptions {
  prompt: string;
  model?: string; // Model is now optional, especially for Groq where it's determined internally
  provider?: LLMProvider;
  temperature?: number;
  responseFormat?: { type: string }; // e.g., { type: "json_object" }
}

/**
 * Calls a Large Language Model (LLM) API.
 *
 * @param options The options for the LLM call.
 * @returns The content string from the LLM response.
 * @throws Error if API key is not set, or if the API call fails or returns an unexpected format.
 */
export async function callLLM(
  options: CallLLMOptions
): Promise<string> {
  const {
    prompt,
    // model is now handled below based on provider
    provider = 'openrouter', // Default to 'openrouter'
    temperature = 0.7,
    responseFormat // Will be used if provided
  } = options;

  let apiKey: string | undefined;
  let apiUrl: string;
  let apiKeyEnvVar: string;
  let currentModel: string; // This will hold the model name to be used

  consola.info(`Attempting to call LLM with provider: ${provider}`);

  if (provider === 'groq') {
    apiKeyEnvVar = 'GROQ_API_KEY';
    apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    apiKey = process.env[apiKeyEnvVar];
    const groqModelNameFromEnv = process.env.GROQ_MODEL_NAME;
    if (groqModelNameFromEnv && groqModelNameFromEnv.trim() !== '') {
      currentModel = groqModelNameFromEnv;
      consola.info(`Using GROQ model from environment variable GROQ_MODEL_NAME: ${currentModel}`);
    } else {
      currentModel = 'mixtral-8x7b-32768'; // Default Groq model
      consola.info(`GROQ_MODEL_NAME not set or empty, using default Groq model: ${currentModel}`);
    }
  } else if (provider === 'openrouter') {
    apiKeyEnvVar = 'OPENROUTER_API_KEY';
    apiUrl = "https://openrouter.ai/api/v1/chat/completions";
    apiKey = process.env[apiKeyEnvVar];
    if (!options.model) {
      consola.error(`Model parameter is required for 'openrouter' provider.`);
      throw createError({
        statusCode: 400,
        statusMessage: `Model parameter is required for 'openrouter' provider.`,
      });
    }
    currentModel = options.model;
  } else {
    // This case should ideally be prevented by TypeScript's type checking for LLMProvider
    consola.error(`Unsupported LLM provider specified: ${provider}`);
    throw createError({
      statusCode: 400, // Bad Request, as an unsupported provider was given
      statusMessage: `Unsupported LLM provider: ${provider}. Supported providers are 'openrouter' and 'groq'.`,
    });
  }

  if (!apiKey) {
    consola.error(`Required API key environment variable '${apiKeyEnvVar}' is not set for provider '${provider}'.`);
    throw createError({
      statusCode: 500,
      statusMessage: `LLM API key (${apiKeyEnvVar}) for provider '${provider}' is not configured on the server. Please set the ${apiKeyEnvVar} environment variable.`,
    });
  }

  consola.info(
    `Sending request to LLM provider '${provider}' at ${apiUrl} with model: ${currentModel}`
  );
  const startTime = Date.now();

  const requestBody: any = {
    model: currentModel, // Use the determined model
    messages: [{ role: "user", content: prompt }],
    temperature: temperature,
  };

  // Add response_format if it's provided.
  // OpenAI-compatible APIs (like Groq aims to be) often support this.
  if (responseFormat) {
    requestBody.response_format = responseFormat;
    consola.info(`Using response_format: ${JSON.stringify(responseFormat)} for provider '${provider}'.`);
  } else if (provider === 'openrouter') {
    // Default to json_object for openrouter if no responseFormat is specified
    requestBody.response_format = { type: "json_object" };
    consola.info(`Defaulting to response_format: { type: "json_object" } for provider 'openrouter'.`);
  }


  try {
    // @ts-ignore: Ignoring TypeScript errors for this $fetch call if $fetch is not globally typed
    const response = await $fetch<LLMResponse>(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
    } as any);

    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    if (
      response.choices &&
      response.choices.length > 0 &&
      response.choices[0].message &&
      response.choices[0].message.content
    ) {
      const rawGeneratedContent = response.choices[0].message.content.trim();
      consola.success(
        `Received response from LLM (${provider}). Content length: ${rawGeneratedContent.length} characters. Time taken: ${timeTaken}ms.`
      );
      return rawGeneratedContent;
    } else {
      consola.error(
        `LLM response (${provider}) did not contain expected content:`,
        JSON.stringify(response, null, 2) // Log the full response for debugging
      );
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to get content from LLM response (${provider}). The response structure was unexpected.`,
        data: response,
      });
    }
  } catch (error: any) {
    const llmError = error as LLMError;
    consola.error(
      `Error calling LLM API (${provider}) at ${apiUrl}:`,
      llmError.response?.data || llmError.message || llmError
    );

    let statusMessage = `Unknown error during LLM API call (${provider}).`;
    if (llmError.response?.data?.error?.message) {
      statusMessage = llmError.response.data.error.message;
    } else if (llmError.message) {
      statusMessage = llmError.message;
    } else if (typeof llmError.response?.data === 'string') {
      statusMessage = llmError.response.data;
    }


    throw createError({
      statusCode: llmError.response?.status || 500,
      statusMessage: `LLM API Error (${provider}): ${statusMessage}`,
      data: llmError.response?.data || llmError,
    });
  }
}

/**
 * Cleans and parses a JSON string, attempting to fix common issues.
 * @param jsonString The JSON string to parse.
 * @returns The parsed JSON object.
 * @throws Error if parsing fails even after cleaning.
 */
export function cleanAndParseJson(jsonString: string): any {
  let cleanedContent = jsonString;
  let parsedResponse;

  try {
    parsedResponse = JSON.parse(jsonString);
    consola.success("Successfully parsed raw AI response as JSON.");
    return parsedResponse;
  } catch (jsonError: any) {
    consola.warn(
      "Failed to parse raw AI response as JSON, attempting cleaning:",
      jsonError.message
    );
    consola.debug("Raw AI response for cleaning:", jsonString);

    // Basic cleaning
    cleanedContent = jsonString
      .replace(/\\" +/g, '\\"') // Fix excessive backslashes before quotes
      .replace(/\\ +/g, "\\");    // Fix excessive backslashes

    // Attempt to remove Markdown JSON code block fences
    const markdownJsonMatch = cleanedContent.match(
      /```json\s*([\s\S]*?)\s*```/
    );
    if (markdownJsonMatch && markdownJsonMatch[1]) {
      consola.info("Markdown JSON fences detected, extracting content.");
      cleanedContent = markdownJsonMatch[1];
    }

    // Enhanced cleaning for common JSON formatting issues
    // Fix missing commas between array elements (specifically targeting the issue at line 10)
    cleanedContent = cleanedContent.replace(/}\s*\n\s*{/g, '},\n{');
    // Fix missing commas between object properties
    cleanedContent = cleanedContent.replace(/"\s*\n\s*"/g, '",\n"');
    // Fix trailing commas in arrays and objects
    cleanedContent = cleanedContent.replace(/,\s*]/g, ']');
    cleanedContent = cleanedContent.replace(/,\s*}/g, '}');
    // Fix unquoted property names (be careful with this one, might be too aggressive)
    // cleanedContent = cleanedContent.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
    // A less aggressive version for unquoted keys:
    cleanedContent = cleanedContent.replace(/(?<!")(\b\w+\b)(?=:)/g, '"$1"');


    // Fix single quotes used instead of double quotes for keys and string values
    // This needs to be careful not to replace single quotes within string values that are legitimate.
    // A more robust solution would involve a proper JSON parser or more complex regex.
    // For now, a simpler replacement:
    // cleanedContent = cleanedContent.replace(/'/g, '"');
    // Let's try a more targeted approach for single quotes around keys and simple values
    cleanedContent = cleanedContent.replace(/'([^']+)':/g, '"$1":'); // Keys
    cleanedContent = cleanedContent.replace(/:\s*'([^']*)'/g, ': "$1"'); // String values

    consola.info("Applied enhanced JSON cleaning techniques.");

    try {
      parsedResponse = JSON.parse(cleanedContent);
      consola.success("Successfully parsed cleaned AI response as JSON.");
      consola.debug("Cleaned AI response content:", cleanedContent);
      return parsedResponse;
    } catch (finalJsonError: any) {
      consola.error(
        "Failed to parse AI response as JSON even after cleaning:",
        finalJsonError.message
      );
      consola.debug(
        "Content that failed parsing (after cleaning):",
        cleanedContent
      );
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to parse AI response as JSON after cleaning: ${finalJsonError.message}`,
        data: {
          originalResponse: jsonString,
          cleanedResponse: cleanedContent,
          errorDetails: finalJsonError.toString(),
        },
      });
    }
  }
}