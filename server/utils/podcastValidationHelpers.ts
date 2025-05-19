import { useRuntimeConfig } from '#imports'; // For useRuntimeConfig in callLLM
import type { H3Event } from 'h3'; // For event type in callLLM

// Define request body interface
export interface RequestBody {
  rawScript: string;
  title: string;
  personas: {
    hostPersona: {
      id: number;
      name: string;
      voice_model_identifier: string;
    };
    guestPersonas: Array<{
      id: number;
      name: string;
      voice_model_identifier: string;
    }>;
  };
  preferences?: {
    style: string;
    language: string;
    keywords: string;
    numberOfSegments?: number;
    backgroundMusic?: string;
  };
  language?: string; // For backward compatibility
  cover_image_url?: string | null; // Add cover_image_url for validation
}

// Define structured script segment interface
export interface ScriptSegment {
  role: 'host' | 'guest';
  name?: string;
  text: string;
}

// Define response interface (though primarily used by the main handler, kept here for type cohesion)
export interface ValidateResponseData { // Renamed to avoid conflict if ValidateResponse is used elsewhere
  podcastTitle: string;
  script: ScriptSegment[];
  voiceMap: Record<string, {
    personaId: number;
    voice_model_identifier: string;
  }>;
  language: string;
}

// Generate mock response for testing
export function generateMockResponse(body: RequestBody): any {
  console.log('[generateMockResponse] Generating mock response data');
  
  const hostPersona = body.personas.hostPersona || { id: 0, name: "Default Host", voice_model_identifier: "UNKNOWN_HOST_VOICE_ID" };
  const guestPersona = body.personas.guestPersonas && body.personas.guestPersonas.length > 0 
    ? body.personas.guestPersonas[0] 
    : { id: -1, name: "Default Guest", voice_model_identifier: "UNKNOWN_GUEST_VOICE_ID" };
  
  console.log('[generateMockResponse] Using host persona:', {
    id: hostPersona.id,
    name: hostPersona.name,
    voiceId: hostPersona.voice_model_identifier
  });
  
  console.log('[generateMockResponse] Using guest persona:', {
    id: guestPersona.id,
    name: guestPersona.name,
    voiceId: guestPersona.voice_model_identifier
  });
  
  // Extract dialogue from raw script
  const lines = body.rawScript.split('\n').filter(line => line.trim() !== '');
  const scriptSegments: Array<{role: 'host' | 'guest', name: string, text: string}> = [];
  
  console.log('[generateMockResponse] Processing script with', lines.length, 'lines');
  
  for (const line of lines) {
    if (line.startsWith('主持人：') || line.includes('主持人：')) {
      scriptSegments.push({
        role: 'host',
        name: hostPersona.name.replace(/\s+/g, '_'),
        text: line.replace('主持人：', '').trim()
      });
    } else if (line.startsWith('嘉宾：') || line.includes('嘉宾：')) {
      scriptSegments.push({
        role: 'guest',
        name: guestPersona.name.replace(/\s+/g, '_'),
        text: line.replace('嘉宾：', '').trim()
      });
    } else {
      // If there is no explicit role identification, default to the previous role continuing to speak
      // If it's the first line, default to host
      const role: 'host' | 'guest' = scriptSegments.length > 0
        ? (scriptSegments[scriptSegments.length - 1].role as 'host' | 'guest')
        : 'host';
      const name: string = role === 'host'
        ? hostPersona.name.replace(/\s+/g, '_')
        : guestPersona.name.replace(/\s+/g, '_');
      
      scriptSegments.push({
        role,
        name,
        text: line.trim()
      });
    }
  }
  
  console.log('[generateMockResponse] Created', scriptSegments.length, 'script segments');
  
  // Build mock response
  const hostName = hostPersona.name.replace(/\s+/g, '_');
  const guestName = guestPersona.name.replace(/\s+/g, '_');
  
  // Ensure all necessary fields exist
  const mockResponse = {
    podcastTitle: body.title,
    script: scriptSegments,
    voiceMap: {
      host: {
        personaId: hostPersona.id,
        voice_model_identifier: hostPersona.voice_model_identifier
      },
      guest: {
        personaId: guestPersona.id,
        voice_model_identifier: guestPersona.voice_model_identifier
      },
      [hostName]: {
        personaId: hostPersona.id,
        voice_model_identifier: hostPersona.voice_model_identifier
      },
      [guestName]: {
        personaId: guestPersona.id,
        voice_model_identifier: guestPersona.voice_model_identifier
      }
    },
    language: body.language || 'en-US'
  };
  
  console.log('[generateMockResponse] Generated mock response with', 
    Object.keys(mockResponse.voiceMap).length, 'voice mappings');
  return mockResponse;
}

// Generate LLM prompt - updated version
export function generateLLMPrompt(body: RequestBody): string {
  console.log('[generateLLMPrompt] Starting prompt generation');
  
  const hostPersona = body.personas.hostPersona;
  const guestPersonas = body.personas.guestPersonas;
  const language = body.preferences?.language || body.language || 'en-US';
  const style = body.preferences?.style || 'conversational';
  const keywords = body.preferences?.keywords || '';

  console.log('[generateLLMPrompt] Using language:', language);
  console.log('[generateLLMPrompt] Using style:', style);
  console.log('[generateLLMPrompt] Using keywords:', keywords || 'none');

  // Prepare host information
  const hostInfo = hostPersona 
    ? `Host: ${hostPersona.name} (ID: ${hostPersona.id}, Voice Model: ${hostPersona.voice_model_identifier})`
    : 'No host information provided. Use default values: personaId: 0, voice_model_identifier: "UNKNOWN_HOST_VOICE_ID"';

  // Prepare guest information
  const guestInfo = guestPersonas && guestPersonas.length > 0
    ? `Guests: ${guestPersonas.map(g => `${g.name} (ID: ${g.id}, Voice Model: ${g.voice_model_identifier})`).join(', ')}`
    : 'No guest information provided. If there are guests in the script, use default values: personaId: -1, voice_model_identifier: "UNKNOWN_GUEST_VOICE_ID"';

  // Add style and keyword information
  const styleInfo = `Style: ${style}`;
  const keywordsInfo = keywords ? `Keywords: ${keywords}` : 'No keywords provided';

  const prompt = `
You are a podcast script analyzer. Your task is to analyze the following podcast script and structure it into a specific JSON format.

Input Parameters:
- Podcast Title: ${body.title}
- Available Role Information:
  ${hostInfo}
  ${guestInfo}
- Style Information:
  ${styleInfo}
  ${keywordsInfo}
- Original Script: ${body.rawScript}

Requirements:
1. Analyze the script and identify the speaker for each paragraph
2. Determine if each speaker is a "host" or "guest"
3. Extract speaker names from context when possible
4. Standardize names by:
   - Replacing spaces with underscores
   - Removing non-alphanumeric characters
5. Use provided role information for IDs and voice model identifiers
6. Try to identify possible ID fields, use default values if not identifiable

Output Format:
{
  "podcastTitle": "title",
  "script": [
    {
      "role": "host|guest",  // Only one Host allowed, others are Guests
      "name": "speaker_name", // Use actual name if identifiable, otherwise use Guest_A, Host_A, etc.
      "text": "spoken content"
    }
  ],
  "voiceMap": {
    "speaker_name": {
      "personaId": "id_from_role_info",
      "voice_model_identifier": "voice_model_from_role_info"
    }
  },
  "language": "${language}"
}

Return only the JSON structure without any additional content or explanations.

重要：请务必确保您的输出是一个完整且有效的 JSON 对象。所有字符串值都必须用双引号正确包裹并闭合。所有大括号 \`{}\` 和方括号 \`[]\` 都必须正确配对和闭合。如果由于任何原因（例如内容过长）需要缩短或截断回复，请优先保证 JSON 结构的完整性和有效性，确保所有开启的结构都被正确关闭。
`;

  console.log('[generateLLMPrompt] Prompt generation completed, length:', prompt.length);
  return prompt;
}

// Call LLM API
export async function callLLMForPodcastValidation(prompt: string, event: H3Event): Promise<ValidateResponseData> { // Added H3Event type for event
  console.log('[callLLMForPodcastValidation] Starting LLM API call');
  
  // Get runtime configuration
  const config = useRuntimeConfig(event); // Pass event to useRuntimeConfig
  
  try {
    // Get OpenRouter API key
    const apiKey = config.openrouter.apiKey;
    const model = config.openrouter.model || 'openai/gpt-4-turbo-preview';
    const referer = config.openrouter.referer || 'http://localhost:3000';
    
    console.log('[callLLMForPodcastValidation] Configuration:', {
      model,
      referer,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    if (!apiKey) {
      console.error('[callLLMForPodcastValidation] OpenRouter API key not configured');
      throw new Error('OpenRouter API key not configured');
    }
    
    // Call OpenRouter API
    console.log('[callLLMForPodcastValidation] Sending request to OpenRouter API');
    const startTime = Date.now();
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': referer
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a podcast script analyzer that converts raw scripts into structured JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Low temperature for consistency
        max_tokens: 2000
      })
    });
    const endTime = Date.now();
    console.log('[callLLMForPodcastValidation] API request completed in', (endTime - startTime), 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[callLLMForPodcastValidation] API response error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }

    console.log('[callLLMForPodcastValidation] Received successful response');
    const result = await response.json();
    console.log('[callLLMForPodcastValidation] Response JSON parsed successfully');

    // Parse the returned JSON string
    try {
        // Add stricter checks to ensure result.choices exists and has a value
        if (!result || !result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
          console.error('[callLLMForPodcastValidation] API result format incorrect:', JSON.stringify(result));
          throw new Error('API result format incorrect, choices array missing or empty');
        }

        // Check if message and content exist
        if (!result.choices[0].message || !result.choices[0].message.content) {
          console.error('[callLLMForPodcastValidation] Missing message or content in API result:', JSON.stringify(result.choices[0]));
          throw new Error('Missing message or content in API result');
        }

        const content = result.choices[0].message.content;
        console.log('[callLLMForPodcastValidation] Parsing LLM response content, length:', content.length);

        // Extract JSON part (remove possible markdown code block markers)
        const jsonStr = content.replace(/```json|```/g, '').trim();
        console.log('[callLLMForPodcastValidation] Extracted JSON string, length:', jsonStr.length);

        if (!jsonStr) {
          throw new Error('LLM response content empty or invalid');
        }

        const parsedResult: ValidateResponseData = JSON.parse(jsonStr);
        console.log('[callLLMForPodcastValidation] Successfully parsed JSON response with fields:', Object.keys(parsedResult).join(', '));

        // Log key statistics about the parsed result
        console.log('[callLLMForPodcastValidation] Parsed result statistics:', {
          podcastTitle: parsedResult.podcastTitle?.substring(0, 30) + '...',
          scriptSegmentsCount: parsedResult.script?.length || 0,
          voiceMapKeysCount: Object.keys(parsedResult.voiceMap || {}).length,
          language: parsedResult.language
        });

        return parsedResult;
    } catch (parseError: any) {
      console.error('[callLLMForPodcastValidation] JSON parsing error:', parseError.message);
      console.error('[callLLMForPodcastValidation] Raw content preview:', result?.choices?.[0]?.message?.content?.substring(0, 100) + '...');
      console.log('Raw LLM API Response:', result?.choices?.[0]?.message?.content);
      throw new Error(`Cannot parse LLM response as JSON: ${parseError.message}`);
    }

  } catch (error: any) {
    console.error('[callLLMForPodcastValidation] API call error:', error.message);
    console.error('[callLLMForPodcastValidation] Error stack:', error.stack);
    // Ensure the function still returns or throws as per its signature, even in catch.
    // If the intention is to re-throw, ensure it's an Error object.
    if (error instanceof Error) {
      throw error;
    } else {
      // If it's not an error object, wrap it or handle appropriately
      throw new Error(String(error));
    }
  }
}
// Validate LLM-generated structured data - simplified version, and attempt to auto-fix missing fields
export function validateStructuredData(data: any): { valid: boolean; error?: string } { // data is 'any' as it's from LLM
  console.log('[validateStructuredData] Starting data validation');
  
  // Basic structure validation
  if (!data) {
    console.error('[validateStructuredData] Data is empty');
    return { valid: false, error: 'Returned data is empty' };
  }
  
  console.log('[validateStructuredData] Checking fields:', {
    hasPodcastTitle: !!data.podcastTitle,
    hasScript: !!data.script,
    scriptIsArray: Array.isArray(data.script),
    scriptLength: data.script?.length || 0,
    hasVoiceMap: !!data.voiceMap,
    voiceMapType: typeof data.voiceMap,
    hasLanguage: !!data.language
  });
  
  // Attempt to auto-fix missing fields
  let modified = false;
  
  // Ensure podcastTitle exists
  if (!data.podcastTitle) {
    data.podcastTitle = "Untitled Podcast";
    modified = true;
    console.log('[validateStructuredData] Auto-added missing podcastTitle field');
  }
  
  // Ensure script array exists
  if (!data.script || !Array.isArray(data.script)) {
    data.script = [];
    modified = true;
    console.log('[validateStructuredData] Auto-added missing script field as empty array');
  }
  
  // Ensure voiceMap object exists
  if (!data.voiceMap || typeof data.voiceMap !== 'object') {
    data.voiceMap = {}; // Changed to initialize as an empty object
    modified = true;
    console.log('[validateStructuredData] Auto-added missing voiceMap field as empty object');
  }
  
  // Ensure language exists
  if (!data.language) {
    data.language = "en-US";
    modified = true;
    console.log('[validateStructuredData] Auto-added missing language field');
  }
  
  if (modified) {
    console.log('[validateStructuredData] Auto-fixed missing fields');
  }
  
  // Recheck necessary fields
  const requiredFields = ['podcastTitle', 'script', 'voiceMap', 'language'];
  const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null); // Check for undefined or null
  
  if (missingFields.length > 0) {
    console.error('[validateStructuredData] Still missing required fields:', missingFields.join(', '));
    return {
      valid: false,
      error: `Structured data still missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  // Check script array
  if (!Array.isArray(data.script) || data.script.length === 0) {
    // Allow empty script if it was auto-fixed, but log a warning.
    // The main handler might decide if an empty script is truly an error.
    if (modified && data.script.length === 0) {
        console.warn('[validateStructuredData] Script is an empty array after auto-fixing. This might be acceptable depending on context.');
    } else {
        console.error('[validateStructuredData] Script must be a non-empty array');
        return { 
          valid: false, 
          error: 'Script must be a non-empty array' 
        };
    }
  }
  
  // Simple validation of each item in the script
  for (let i = 0; i < data.script.length; i++) {
    const segment = data.script[i];
    if (!segment.role || !segment.name || !segment.text) {
      console.error('[validateStructuredData] Script segment', i+1, 'missing required fields');
      return { 
        valid: false, 
        error: `Script segment ${i+1} missing required fields: role, name, or text` 
      };
    }
    
    if (segment.role !== 'host' && segment.role !== 'guest') {
      console.error('[validateStructuredData] Script segment', i+1, 'has invalid role:', segment.role);
      return { 
        valid: false, 
        error: `Script segment ${i+1} has invalid role: '${segment.role}', must be 'host' or 'guest'` 
      };
    }
  }
  
  // Check voiceMap
  if (typeof data.voiceMap !== 'object' || data.voiceMap === null) {
    console.error('[validateStructuredData] VoiceMap must be an object');
    return { 
      valid: false, 
      error: 'VoiceMap must be an object' 
    };
  }
  
  console.log('[validateStructuredData] Validation successful');
  return { valid: true };
}