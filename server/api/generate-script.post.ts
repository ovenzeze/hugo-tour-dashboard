// server/api/generate-script.post.ts
import { defineEventHandler, readBody, createError } from 'h3';
import { consola } from 'consola'; // For logging

// Interface for the expected request body from the frontend
interface GenerateScriptRequestBody {
  user_instruction: string; // This will be the main prompt for the LLM
  podcastName?: string; // For context, might be part of user_instruction
  // Add any other parameters from the frontend that might be useful
  // e.g., hostPersonaId, guestPersonaIds, etc., if they help in constructing a better prompt
  // or if the LLM needs them structured.
  // For now, assuming user_instruction is comprehensive.
  podcastSettings?: { // From stores/playground.ts
    title: string;
    topic: string;
    numberOfSegments: number;
    style: string;
    keywords: string;
    hostPersonaId: number | string | undefined;
    guestPersonaIds: (number | string | undefined)[];
    // Potentially other fields like language if LLM needs it
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody<GenerateScriptRequestBody>(event);

  if (!body.user_instruction || body.user_instruction.trim() === "") {
    throw createError({
      statusCode: 400,
      statusMessage: 'User instruction (prompt) is required to generate a script.',
    });
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterApiKey) {
    consola.error('OPENROUTER_API_KEY environment variable is not set.');
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key is not configured on the server.',
    });
  }

  // --- Construct the prompt for Open Router ---
  // The body.user_instruction is expected to be a well-formed prompt.
  // We can augment it if necessary using other parts of body.podcastSettings
  let promptContent = body.user_instruction;

  // Example: If you want to ensure some structure or add more details from podcastSettings
  // if (body.podcastSettings) {
  //   promptContent += `\n\nFurther context for the podcast script:`;
  //   promptContent += `\n- Title: ${body.podcastSettings.title}`;
  //   promptContent += `\n- Topic: ${body.podcastSettings.topic}`;
  //   // Add more details as needed by your LLM prompt engineering
  // }


  consola.info('Sending request to OpenRouter with prompt:', promptContent.substring(0, 200) + "..."); // Log a snippet

  try {
    // Replace 'your-preferred-model' with the actual model you want to use from OpenRouter
    // e.g., 'openai/gpt-3.5-turbo', 'anthropic/claude-2', 'mistralai/mistral-7b-instruct'
    const llmModel = process.env.OPENROUTER_LLM_MODEL || 'mistralai/mistral-7b-instruct'; // Default model

    // @ts-ignore: $fetch is globally available in Nuxt server routes
    const response = await $fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        // Optional: Add 'HTTP-Referer' and 'X-Title' if OpenRouter requires/recommends them
        // 'HTTP-Referer': process.env.YOUR_SITE_URL, // e.g., http://localhost:3000
        // 'X-Title': process.env.YOUR_APP_NAME, // e.g., My Podcast App
      },
      body: {
        model: llmModel,
        messages: [
          // You can add a system prompt here if desired
          // { role: "system", content: "You are a helpful assistant that generates podcast scripts." },
          { role: "user", content: promptContent },
        ],
        // Add other parameters like temperature, max_tokens as needed
        // temperature: 0.7,
        // max_tokens: 2000,
      },
    });

    // @ts-ignore
    if (response.choices && response.choices.length > 0 && response.choices[0].message && response.choices[0].message.content) {
      // @ts-ignore
      const generatedScript = response.choices[0].message.content.trim();
      consola.success('Script generated successfully by OpenRouter.');
      return { script: generatedScript };
    } else {
      consola.error('OpenRouter response did not contain expected script content:', response);
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to parse script from OpenRouter response.',
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