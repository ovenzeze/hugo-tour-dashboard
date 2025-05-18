// server/api/generate-script.post.ts
import { defineEventHandler, readBody, createError } from 'h3';
import { consola } from 'consola'; // For logging
import fs from 'node:fs'; // Import Node.js file system module
import path from 'node:path'; // Import Node.js path module

// Interface for the expected request body from the frontend
interface GenerateScriptRequestBody {
  podcastSettings?: { // From stores/playground.ts
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
  hostPersona?: { // Detailed host persona from frontend
    persona_id: number;
    name: string;
    voice_model_identifier: string;
  };
  guestPersonas?: { // Detailed guest personas array from frontend
    persona_id: number;
    name: string;
    voice_model_identifier: string;
  }[];
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateScriptRequestBody>(event);

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    consola.error('OPENROUTER_API_KEY environment variable is not set.');
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key is not configured on the server.',
    });
  }

  // --- Construct the prompt for Open Router ---
  const promptFilePath = path.resolve(process.cwd(), 'prompts', 'podcast_script_generation.md');
  let promptTemplate = '';

  try {
    // Read the prompt template file content
    promptTemplate = fs.readFileSync(promptFilePath, 'utf-8');
  } catch (error) {
    consola.error('Error reading prompt file:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to read prompt template file on the server.',
    });
  }

  // Use actual values from the request body to replace placeholders
  const podcastSettings = body.podcastSettings;
  const hostPersona = body.hostPersona;
  const guestPersonas = body.guestPersonas || [];

  // Construct guest names string for the prompt
  const guestNames = guestPersonas.map(p => p.name).join("、") || "Guest";

  // Construct voiceMap JSON string for the prompt
  const voiceMap: { [key: string]: { personaId: number; voice_model_identifier: string } } = {};
  if (hostPersona) {
    voiceMap[hostPersona.name] = {
      personaId: hostPersona.persona_id,
      voice_model_identifier: hostPersona.voice_model_identifier,
    };
  }
  guestPersonas.forEach(p => {
    voiceMap[p.name] = {
      personaId: p.persona_id,
      voice_model_identifier: p.voice_model_identifier,
    };
  });
  const voiceMapJsonString = JSON.stringify(voiceMap, null, 2);


  let promptContent = promptTemplate
    .replace('{{title}}', podcastSettings?.title || '')
    .replace('{{topic}}', podcastSettings?.topic || '')
    .replace('{{hostName}}', hostPersona?.name || 'Host') // Use hostPersona name
    .replace('{{guestNames}}', guestNames) // Use constructed guest names string
    .replace('{{style}}', podcastSettings?.style || '')
    .replace('{{keywords}}', podcastSettings?.keywords || '')
    .replace('{{numberOfSegments}}', (podcastSettings?.numberOfSegments || 3).toString())
    .replace('{{backgroundMusic}}', podcastSettings?.backgroundMusic || '')
    .replace('{{voiceMapJson}}', voiceMapJsonString); // Replace voiceMap placeholder

  // Remove any remaining double curly braces if a placeholder was missed or value was empty
  promptContent = promptContent.replace(/\{\{.*?\}\}/g, '').trim();


  const llmModel = process.env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct'; // Default model, corrected env variable name
  consola.info(`Sending request to OpenRouter using template: ${path.basename(promptFilePath)} with model: ${llmModel}`);
  const startTime = Date.now();

  try {
    // @ts-ignore: $fetch is globally available in Nuxt server routes
    const response = await $fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
      },
      body: {
        model: llmModel,
        messages: [
          { role: "user", content: promptContent },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      },
    });

    // @ts-ignore
    if (response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
      // @ts-ignore
      const rawGeneratedContent = response.choices[0].message.content.trim();
      const endTime = Date.now();
      const timeTaken = endTime - startTime;
      consola.success(`Received response from OpenRouter. Content length: ${rawGeneratedContent.length} characters. Time taken: ${timeTaken}ms.`);
      // Optionally, log a snippet for debugging if needed, perhaps under a specific log level or condition
      // consola.debug('Raw content snippet:', rawGeneratedContent.substring(0, 200) + "...");

      let parsedResponse;
      let cleanedContent = rawGeneratedContent;

      try {
        try {
            parsedResponse = JSON.parse(rawGeneratedContent);
            consola.success('Successfully parsed raw AI response as JSON.');
        } catch (jsonError: any) {
            consola.warn('Failed to parse raw AI response as JSON, attempting cleaning:', jsonError.message);
            consola.debug('Raw AI response:', rawGeneratedContent);
            cleanedContent = rawGeneratedContent.replace(/\\" +/g, '\\"').replace(/\\ +/g, '\\');
            
            // Attempt to remove Markdown JSON code block fences
            const markdownJsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
            if (markdownJsonMatch && markdownJsonMatch[1]) {
              consola.info('Markdown JSON fences detected, extracting content.');
              cleanedContent = markdownJsonMatch[1];
            }

            parsedResponse = JSON.parse(cleanedContent);
            consola.success('Successfully parsed cleaned AI response as JSON.');
            consola.debug('Cleaned AI response:', cleanedContent);
        }

        if (
            !parsedResponse ||
            !Array.isArray(parsedResponse.script) ||
            !parsedResponse.voiceMap ||
            typeof parsedResponse.podcastTitle !== 'string' ||
            typeof parsedResponse.language !== 'string'
        ) {
             consola.error('Parsed JSON does not match the expected structuredData format:', parsedResponse);
             throw createError({
               statusCode: 500,
               statusMessage: 'AI response format is incorrect: does not match expected structuredData structure.',
               data: { rawResponse: rawGeneratedContent, parsedResponse },
             });
        }

        consola.success('Script and settings generated successfully by OpenRouter.');
        return parsedResponse;

      } catch (finalJsonError: any) {
         consola.error('Failed to parse AI response as JSON even after cleaning:', finalJsonError.message);
         consola.debug('Content that failed parsing (after cleaning):', cleanedContent); // Log the content that failed
         throw createError({
           statusCode: 500,
           statusMessage: `Failed to parse AI response as JSON: ${finalJsonError.message}`,
           data: { rawResponse: rawGeneratedContent, cleanedResponse: cleanedContent, errorDetails: finalJsonError.toString() },
         });
      }

    } else {
      consola.error('OpenRouter response did not contain expected content:', response);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to get content from OpenRouter response.',
        data: response,
      });
    }
  } catch (error: any) {
    consola.error('Error calling OpenRouter API:', error.response?.data || error.message || error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error generating script via OpenRouter.';
    throw createError({
      statusCode: error.response?.status || 500,
      statusMessage: `OpenRouter API Error: ${errorMessage}`,
      data: error.response?.data,
    });
  }
});