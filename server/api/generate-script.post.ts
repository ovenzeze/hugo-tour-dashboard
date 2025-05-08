import { serverSupabaseClient } from '#supabase/server';
import type { Database } from '~/types/supabase';

export default defineEventHandler(async (event) => {
  const runtimeConfig = useRuntimeConfig();
  const { apiKey: OPENROUTER_API_KEY, model: OPENROUTER_MODEL, referer: OPENROUTER_REFERER } = runtimeConfig.openrouter;

  if (!OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key or model not configured.',
    });
  }

  const supabase = await serverSupabaseClient<Database>(event);
  const { persona_id, prompt: userPromptContent } = await readBody(event);

  if (!persona_id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Persona ID is required',
    });
  }

  const { data: personaDetails, error: personaError } = await supabase
    .from('personas')
    .select('name, description, language_support')
    .eq('persona_id', persona_id)
    .single();

  if (personaError || !personaDetails) {
    console.error('Error fetching persona:', personaError);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch persona details: ${personaError?.message || 'Unknown error'}`,
    });
  }

  let systemPromptContent = `You are an AI assistant embodying the persona of ${personaDetails.name}.`;
  if (personaDetails.description) {
    systemPromptContent += ` ${personaDetails.description}`;
  }
  if (personaDetails.language_support && personaDetails.language_support.length > 0) {
    systemPromptContent += ` You primarily communicate in ${personaDetails.language_support[0]}.`;
  }
  systemPromptContent += " Your task is to generate a dialogue script based on the user's request. Ensure the dialogue is natural, engaging, and stays true to your persona.";

  if (!userPromptContent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Prompt for script content is missing.',
    });
  }

  const openRouterRequestBody = {
    model: OPENROUTER_MODEL,
    messages: [
      { role: "system", content: systemPromptContent },
      { role: "user", content: userPromptContent }
    ],
  };

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
