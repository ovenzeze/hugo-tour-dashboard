import { serverSupabaseClient } from '#supabase/server';
import type { Database } from '~/types/supabase';
import { ElevenLabsProvider } from '~/server/services/tts/elevenlabs'; // Import the provider
import type { PodcastCreationRequest, PodcastCreationResponse } from '~/server/services/tts/types'; // Import types

export default defineEventHandler(async (event) => {
  console.log('Backend: /api/generate-script.post handler started.');

  const runtimeConfig = useRuntimeConfig();
  const { apiKey: OPENROUTER_API_KEY, model: OPENROUTER_MODEL, referer: OPENROUTER_REFERER } = runtimeConfig.openrouter;
  const elevenLabsApiKey = runtimeConfig.elevenlabs?.apiKey;

  if (!OPENROUTER_API_KEY || !OPENROUTER_MODEL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'OpenRouter API key or model not configured.',
    });
  }

  if (!elevenLabsApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'ElevenLabs API key not configured (runtimeConfig.elevenlabs.apiKey).',
    });
  }

  const supabase = await serverSupabaseClient<Database>(event);
  const body = await readBody(event);

  // Destructure all expected fields, ensuring correct naming for persona_id
  const {
    persona_id: rawPersonaId, // Corrected: use persona_id from body
    system_prompt: feSystemPrompt,
    user_prompt: feUserPrompt,
    createPodcast = false, // Default to false if not provided
    elevenLabsProjectId,
    podcastName,
    hostVoiceId,
    guestVoiceId,
    podcastModelId,
    titleVoiceId,
    podcastSpeakerMapping, // { hostIdentifierInScript: string, guestIdentifierInScript: string }
  } = body;

  console.log('Backend: Raw body:', JSON.stringify(body, null, 2));
  console.log('Backend: Raw body.persona_id (from request):', rawPersonaId);
  console.log('Backend: Type of body.persona_id:', typeof rawPersonaId);
  
  const parsedPersonaId = rawPersonaId ? Number(rawPersonaId) : undefined;
  
  console.log('Backend: Parsed personaId (after Number()):', parsedPersonaId);
  console.log('Backend: Type of parsed personaId:', typeof parsedPersonaId);
  console.log('Backend: Received - createPodcast:', createPodcast);

  // A valid parsedPersonaId is always required, for standard mode or as Host Persona ID for podcast mode.
  if (!parsedPersonaId) { // Checks for undefined, null, 0, NaN
    console.error('Backend: Parsed Persona ID is invalid or missing. Cannot proceed.');
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid Persona ID is required.', // General message
    });
  }

  // Podcast-specific validations for other fields if in podcast mode
  if (createPodcast) {
    console.log('Podcast params - projectId:', elevenLabsProjectId, 'name:', podcastName, 'hostVoice:', hostVoiceId, 'guestVoice:', guestVoiceId);
    if (!elevenLabsProjectId || !podcastName || !hostVoiceId || !guestVoiceId || !podcastSpeakerMapping || !podcastSpeakerMapping.hostIdentifierInScript || !podcastSpeakerMapping.guestIdentifierInScript) {
      console.error('Backend: Missing required fields for podcast generation.');
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields for podcast generation (Project ID, Podcast Name, Host/Guest Voice IDs, Speaker Mapping).',
      });
    }
  }

  // Fetch persona details - parsedPersonaId is now guaranteed to be a valid number
  const { data: personaDetails, error: personaError } = await supabase
    .from('personas')
    .select('name, description, language_support')
    .eq('persona_id', parsedPersonaId) // Now safe from undefined
    .single();

  if (personaError || !personaDetails) {
    console.error(`Backend: Error fetching persona details for ID ${parsedPersonaId}:`, personaError?.message);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch persona details: ${personaError?.message || 'Unknown error'}`, 
    });
  }

  let systemPromptForLLM = feSystemPrompt;
  if (!systemPromptForLLM) {
    console.warn('Frontend did not send system_prompt, constructing a basic one.');
    systemPromptForLLM = `You are an AI assistant embodying the persona of ${personaDetails.name}.`;
    if (personaDetails.description) {
      systemPromptForLLM += ` ${personaDetails.description}`;
    }
  }

  // Construct the messages payload for OpenRouter
  const messages = [
    {
      role: 'system',
      content: `You are an AI assistant that generates scripts for presentations, commentaries, or discussions.
The user will provide a scenario or topic. Your task is to generate a script based on this user request.

The output MUST be a valid JSON object adhering to the following structure:
{
  "script": [
    {
      "speaker": "string (Name of the speaker)",
      "text": "string (The dialogue or speech of the speaker)"
    }
    // ... more segments if applicable
  ]
}

Ensure that each segment in the 'script' array contains exactly two keys: 'speaker' and 'text'.
The 'speaker' value should be the name of the character or role speaking.
The 'text' value should be the dialogue content for that speaker.
Do NOT deviate from this JSON structure, regardless of the specifics in the user's prompt.
The content of the 'speaker' and 'text' fields should be derived from the user's prompt.`,
    },
    {
      role: 'user',
      content: feUserPrompt || "Please generate a short piece of content in JSON format, with a root key 'data'."
    }
  ];

  const openRouterRequestBody = {
    model: OPENROUTER_MODEL,
    messages,
    response_format: { type: "json_object" }, // Request JSON mode from OpenRouter if available
  };

  console.log('Backend: Request body for OpenRouter:', JSON.stringify(openRouterRequestBody, null, 2));

  try {
    const llmResponse = await $fetch<any>('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': OPENROUTER_REFERER || '', 
      },
      body: openRouterRequestBody,
    } as any);

    if (!llmResponse.choices || llmResponse.choices.length === 0 || !llmResponse.choices[0].message || !llmResponse.choices[0].message.content) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Failed to generate script: No valid response content from OpenRouter.',
      });
    }

    const llmOutputContentRaw = llmResponse.choices[0].message.content;
    console.log('Backend: Raw content from LLM (before trim):', llmOutputContentRaw);

    // Clean the LLM output: remove Markdown code block fences if present
    let llmOutputContentCleaned = llmOutputContentRaw.trim();
    if (llmOutputContentCleaned.startsWith('```json')) {
      llmOutputContentCleaned = llmOutputContentCleaned.substring(7); // Remove ```json
      if (llmOutputContentCleaned.endsWith('```')) {
        llmOutputContentCleaned = llmOutputContentCleaned.substring(0, llmOutputContentCleaned.length - 3); // Remove ```
      }
    }
    llmOutputContentCleaned = llmOutputContentCleaned.trim(); // Trim again after potential removals

    console.log('Backend: Cleaned content from LLM (after attempting to remove fences):', llmOutputContentCleaned);

    let parsedJsonScript: any;
    try {
      parsedJsonScript = JSON.parse(llmOutputContentCleaned);
    } catch (e: any) {
      console.error('Backend: Failed to parse cleaned LLM output as JSON.', e.message);
      console.error('Cleaned LLM Output was:', llmOutputContentCleaned);
      // Include the original raw output as well for better debugging if cleaning failed
      console.error('Original Raw LLM Output was:', llmOutputContentRaw);
      throw createError({
        statusCode: 500,
        statusMessage: 'LLM output was not valid JSON even after cleaning. Raw output: ' + llmOutputContentRaw, // Send raw for debugging
      });
    }
    
    console.log('Backend: Parsed JSON script from LLM:', parsedJsonScript);

    if (createPodcast) {
      // Transform the generic JSON script to the Host/Guest format for ElevenLabs Podcast
      let scriptForElevenLabs = "";
      // Assuming parsedJsonScript has a structure like { "script_segments": [{ "speaker": "X", "dialogue": "..." }, ...] }
      // The actual path to segments and speaker/dialogue keys should be robust or defined by user_prompt indirectly.
      // For this example, let's assume a common 'script_segments' key, or that the root is an array.
      const segments = parsedJsonScript.script_segments || 
                       parsedJsonScript.script || // Added check for 'script' key
                       (Array.isArray(parsedJsonScript) ? parsedJsonScript : null);

      if (!Array.isArray(segments)) {
        console.error('Backend: Cannot find script segments array in LLM JSON output for podcast transformation.');
        throw createError({
            statusCode: 500,
            statusMessage: 'LLM JSON output does not contain a recognized array of script segments for podcast transformation. Expected e.g. { "script_segments": [...] } or an array at the root.',
        });
      }

      for (const segment of segments) {
        // The user_prompt should guide the LLM to use consistent keys for speaker and dialogue.
        // For this example, we'll assume 'speaker' and 'dialogue' as keys within each segment.
        // A more robust solution might involve the user specifying these keys in the request.
        const speakerNameFromLlm = segment.speaker_name || segment.speaker || segment.role; 
        const dialogueText = segment.dialogue_text || segment.dialogue || segment.text;

        if (typeof speakerNameFromLlm === 'string' && typeof dialogueText === 'string') {
          // Check if the current speaker from LLM matches the one designated as Host in the mapping
          if (speakerNameFromLlm === podcastSpeakerMapping.hostIdentifierInScript) {
            scriptForElevenLabs += `Host: ${dialogueText.trim()}\n`;
          // Check if the current speaker from LLM matches the one designated as Guest in the mapping
          } else if (speakerNameFromLlm === podcastSpeakerMapping.guestIdentifierInScript) {
            scriptForElevenLabs += `Guest: ${dialogueText.trim()}\n`;
          }
          // Segments from other speakers not mapped to Host or Guest will be ignored in scriptForElevenLabs
        }
      }

      if (!scriptForElevenLabs.trim()) {
        console.error('Backend: Failed to transform JSON script to ElevenLabs format. Resulting script is empty. Check speaker mapping and JSON structure. Mapped Host:', podcastSpeakerMapping.hostIdentifierInScript, 'Mapped Guest:', podcastSpeakerMapping.guestIdentifierInScript, 'LLM Speakers found in first segment:', segments[0]?.speaker || segments[0]?.speaker_name || segments[0]?.role);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to transform JSON script for ElevenLabs. Ensure speaker mapping matches identifiers in the JSON script and that segments have text.',
        });
      }
      // TODO: Consider if other speakers from the LLM script should be handled or reported.

      console.log('Backend: Script transformed for ElevenLabs:', scriptForElevenLabs);

      const elevenLabsProvider = new ElevenLabsProvider({ elevenlabs: { apiKey: elevenLabsApiKey } });
      const podcastRequest: PodcastCreationRequest = {
        elevenLabsApiKey: elevenLabsApiKey,
        elevenLabsProjectId: elevenLabsProjectId!,
        podcastName: podcastName!,
        scriptText: scriptForElevenLabs,
        hostVoiceId: hostVoiceId!,
        guestVoiceId: guestVoiceId!,
        modelId: podcastModelId,
        titleVoiceId: titleVoiceId,
      };

      try {
        const podcastResponse = await elevenLabsProvider.createPodcastConversation(podcastRequest);
        console.log('Backend: Podcast creation successful:', podcastResponse);
        return { 
          generatedScript: parsedJsonScript, // Return the original JSON script
          podcastDetails: podcastResponse 
        };
      } catch (podcastError: any) {
        console.error('Backend: ElevenLabs podcast creation failed:', podcastError.message);
        return { 
          generatedScript: parsedJsonScript, // Still return the generated JSON script
          podcastError: podcastError.message || 'Failed to create podcast with ElevenLabs.' 
        };
      }
    } else {
      // If not creating a podcast, just return the parsed JSON script
      return { generatedScript: parsedJsonScript };
    }

  } catch (error: any) {
    const errorMessage = error.data?.error?.message || error.message || 'Unknown error during script generation or podcast creation.';
    console.error('Backend: Error in handler:', errorMessage, error.data ? error.data.error : error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: errorMessage,
    });
  }
});
