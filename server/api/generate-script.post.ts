import { serverSupabaseClient } from '#supabase/server';
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
  console.log('Backend: /api/generate-script.post handler started.'); // Log: Handler start

  const runtimeConfig = useRuntimeConfig();
  const { apiKey: OPENROUTER_API_KEY, model: OPENROUTER_MODEL, referer: OPENROUTER_REFERER } = runtimeConfig.openrouter;

  if (!OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key or model not configured.',
    });
  }

  const supabase = await serverSupabaseClient<Database>(event);
  // Read the new prompt structure from the frontend
  const { personaId, system_prompt: feSystemPrompt, user_prompt: feUserPrompt } = await readBody(event);

  console.log('Backend: Received from frontend - personaId:', personaId, '; system_prompt:', feSystemPrompt, '; user_prompt:', feUserPrompt); // Log: Received body

  if (!personaId) { 
    console.error('Backend: Persona ID is missing!');
    throw createError({
      statusCode: 400,
      statusMessage: 'Persona ID is required',
    });
  }

  // Fetch persona details for context or potential augmentation, but it won't be the primary system prompt anymore.
  const { data: personaDetails, error: personaError } = await supabase
    .from('personas')
    .select('name, description, language_support')
    .eq('persona_id', personaId) 
    .single();

  if (personaError || !personaDetails) {
    console.error('Error fetching persona:', personaError);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch persona details: ${personaError?.message || 'Unknown error'}`,
    });
  }

  // Use the system_prompt from the frontend directly.
  // Persona details can be logged or used for more nuanced logic if needed later.
  let systemPromptForLLM = feSystemPrompt;
  if (!systemPromptForLLM) {
    // Fallback if frontend somehow doesn't send a system_prompt, though it should
    console.warn('Frontend did not send system_prompt, constructing a basic one.');
    systemPromptForLLM = `You are an AI assistant embodying the persona of ${personaDetails.name}.`;
    if (personaDetails.description) {
      systemPromptForLLM += ` ${personaDetails.description}`;
    }
    systemPromptForLLM += " Your task is to generate a dialogue script based on the user's request. Ensure the dialogue is natural and engaging.";
  }

  // Use the user_prompt from the frontend directly.
  if (!feUserPrompt) {
    // If user_prompt is empty, it might be intentional for some scenarios,
    // but usually, we expect some user input. For now, we'll allow it to be empty.
    // Consider if an error should be thrown if feUserPrompt is essential.
    console.warn('Frontend did not send a user_prompt or it was empty.');
    // If an empty user_prompt is not acceptable, throw an error:
    // throw createError({
    //   statusCode: 400,
    //   statusMessage: 'User prompt for script content is missing.',
    // });
  }

  const openRouterRequestBody = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: "system", content: systemPromptForLLM },
      { role: "user", content: feUserPrompt || "" } 
    ],
  };

  console.log('Backend: Request body for OpenRouter:', JSON.stringify(openRouterRequestBody, null, 2)); // Log: OpenRouter request body

  try {
    const response = await $fetch<any>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_REFERER || '', 
      },
      body: openRouterRequestBody,
    } as any);

    if (response.choices && response.choices.length > 0 && response.choices[0].message) {
      return { script: response.choices[0].message.content.trim() };
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to generate script: No valid response from OpenRouter.',
    });
  } catch (error: any) {
    console.error('Error calling OpenRouter API:', error.data ? error.data.error : error.message);
    const errorMessage = error.data?.error?.message || 'Failed to generate script due to an API error.';
    const statusCode = error.data?.error?.code || 500;
    throw createError({
      statusCode: typeof statusCode === 'string' ? 500 : statusCode, 
      statusMessage: errorMessage,
    });
  }
});
