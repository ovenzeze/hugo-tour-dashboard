import { createError, defineEventHandler, readBody } from 'h3';
import { serverSupabaseClient } from '#supabase/server';
import type { Database } from '~/types/supabase';

// 定义请求体接口
interface RequestBody {
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
  language?: string; // 向后兼容
}

// 定义结构化脚本段落接口
interface ScriptSegment {
  role: 'host' | 'guest';
  name?: string;
  text: string;
}

// 定义响应接口
interface ValidateResponse {
  success: boolean;
  structuredData?: {
    podcastTitle: string;
    script: ScriptSegment[];
    voiceMap: Record<string, {
      personaId: number;
      voice_model_identifier: string;
    }>;
    language: string;
  };
  message?: string;
  error?: string;
}

export default defineEventHandler(async (event) => {
  try {
    console.log('[validate.post] Starting script validation process');
    
    // 1. 读取请求体
    const body = await readBody(event) as RequestBody;
    console.log('[validate.post] Received request body:', { 
      title: body.title, 
      scriptLength: body.rawScript?.length,
      hasPersonas: !!body.personas,
      hostPersonaPresent: !!body.personas?.hostPersona,
      guestPersonasCount: body.personas?.guestPersonas?.length || 0,
      preferences: body.preferences ? Object.keys(body.preferences) : 'none'
    });
    
    // 2. 验证必要参数
    if (!body.rawScript || !body.title) {
      console.warn('[validate.post] Missing required fields: rawScript or title');
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing required fields: rawScript and title'
      });
    }
    
    if (!body.personas || !body.personas.hostPersona) {
      console.warn('[validate.post] Missing host persona information');
      throw createError({
        statusCode: 400,
        statusMessage: 'Missing host persona information'
      });
    }

    // Log host and guest details
    console.log('[validate.post] Host persona details:', {
      id: body.personas.hostPersona.id,
      name: body.personas.hostPersona.name,
      hasVoiceModel: !!body.personas.hostPersona.voice_model_identifier
    });

    if (body.personas.guestPersonas && body.personas.guestPersonas.length > 0) {
      console.log('[validate.post] Guest personas details:', body.personas.guestPersonas.map(guest => ({
        id: guest.id,
        name: guest.name,
        hasVoiceModel: !!guest.voice_model_identifier
      })));
    } else {
      console.warn('[validate.post] No guest personas provided');
    }
    
    // 3. 准备LLM提示
    console.log('[validate.post] Generating LLM prompt');
    const prompt = generateLLMPrompt(body);
    console.log('[validate.post] Generated prompt length:', prompt.length);
    
    // 4. 调用OpenRouter API (或其他LLM服务)
    console.log('[validate.post] Calling LLM service');
    
    // 实际调用LLM API
    const structuredData = await callLLM(prompt, event);
    
    console.log('[validate.post] Received LLM response:', JSON.stringify(structuredData).substring(0, 200) + '...');
    
    // 5. 简单验证LLM返回的结构
    console.log('[validate.post] Validating structured data');
    const validationResult = validateStructuredData(structuredData);
    
    if (!validationResult.valid) {
      console.error('[validate.post] Validation failed:', validationResult.error);
      return {
        success: false,
        error: validationResult.error
      };
    }
    
    console.log('[validate.post] Validation successful');
    
    // Log script segments count and voice mapping
    console.log('[validate.post] Script segments count:', structuredData.script?.length || 0);
    console.log('[validate.post] Voice mapping keys:', Object.keys(structuredData.voiceMap || {}));
    
    // 6. 返回成功结果
    return {
      success: true,
      structuredData: structuredData,
      message: 'Script validation and structuring successful'
    };
    
  } catch (error: any) {
    console.error('[validate.post] Error during script validation:', error);
    console.error('[validate.post] Error details:', {
      statusCode: error.statusCode || 500,
      message: error.message || 'Unknown error',
      stack: error.stack
    });
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Script validation failed: ${error.message || 'Unknown error'}`
    });
  }
});

// 生成测试用的模拟响应
function generateMockResponse(body: RequestBody): any {
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
  
  // 从原始脚本中提取对话
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
      // 如果没有明确的角色标识，默认为上一个角色继续说话
      // 如果是第一行，则默认为主持人
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
  
  // 构建模拟响应
  const hostName = hostPersona.name.replace(/\s+/g, '_');
  const guestName = guestPersona.name.replace(/\s+/g, '_');
  
  // 确保所有必要字段都存在
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

// 生成LLM提示 - 更新版本
function generateLLMPrompt(body: RequestBody): string {
  console.log('[generateLLMPrompt] Starting prompt generation');
  
  const hostPersona = body.personas.hostPersona;
  const guestPersonas = body.personas.guestPersonas;
  const language = body.preferences?.language || body.language || 'en-US';
  const style = body.preferences?.style || 'conversational';
  const keywords = body.preferences?.keywords || '';

  console.log('[generateLLMPrompt] Using language:', language);
  console.log('[generateLLMPrompt] Using style:', style);
  console.log('[generateLLMPrompt] Using keywords:', keywords || 'none');

  // 准备主持人信息
  const hostInfo = hostPersona 
    ? `Host: ${hostPersona.name} (ID: ${hostPersona.id}, Voice Model: ${hostPersona.voice_model_identifier})`
    : 'No host information provided. Use default values: personaId: 0, voice_model_identifier: "UNKNOWN_HOST_VOICE_ID"';

  // 准备嘉宾信息
  const guestInfo = guestPersonas && guestPersonas.length > 0
    ? `Guests: ${guestPersonas.map(g => `${g.name} (ID: ${g.id}, Voice Model: ${g.voice_model_identifier})`).join(', ')}`
    : 'No guest information provided. If there are guests in the script, use default values: personaId: -1, voice_model_identifier: "UNKNOWN_GUEST_VOICE_ID"';

  // 添加风格和关键词信息
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
`;

  console.log('[generateLLMPrompt] Prompt generation completed, length:', prompt.length);
  return prompt;
}

// 调用LLM API
async function callLLM(prompt: string, event: any): Promise<any> {
  console.log('[callLLM] Starting LLM API call');
  
  // 获取运行时配置
  const config = useRuntimeConfig();
  
  try {
    // 获取OpenRouter API密钥
    const apiKey = config.openrouter.apiKey;
    const model = config.openrouter.model || 'openai/gpt-4-turbo-preview';
    const referer = config.openrouter.referer || 'http://localhost:3000';
    
    console.log('[callLLM] Configuration:', { 
      model, 
      referer, 
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey ? apiKey.length : 0
    });
    
    if (!apiKey) {
      console.error('[callLLM] OpenRouter API key not configured');
      throw new Error('OpenRouter API key not configured');
    }
    
    // 调用OpenRouter API
    console.log('[callLLM] Sending request to OpenRouter API');
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
    console.log('[callLLM] API request completed in', (endTime - startTime), 'ms');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[callLLM] API response error:', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText 
      });
      throw new Error(`OpenRouter API error: ${response.status} ${errorText}`);
    }
    
    console.log('[callLLM] Received successful response');
    const result = await response.json();
    console.log('[callLLM] Response JSON parsed successfully');
    
    // 解析返回的JSON字符串
    try {
      // 添加更严格的检查，确保result.choices存在且有值
      if (!result || !result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
        console.error('[callLLM] API result format incorrect:', JSON.stringify(result));
        throw new Error('API result format incorrect, choices array missing or empty');
      }
      
      // 检查message和content是否存在
      if (!result.choices[0].message || !result.choices[0].message.content) {
        console.error('[callLLM] Missing message or content in API result:', JSON.stringify(result.choices[0]));
        throw new Error('Missing message or content in API result');
      }
      
      const content = result.choices[0].message.content;
      console.log('[callLLM] Parsing LLM response content, length:', content.length);
      
      // 提取JSON部分（去除可能的markdown代码块标记）
      const jsonStr = content.replace(/```json|```/g, '').trim();
      console.log('[callLLM] Extracted JSON string, length:', jsonStr.length);
      
      if (!jsonStr) {
        throw new Error('LLM response content empty or invalid');
      }
      
      const parsedResult = JSON.parse(jsonStr);
      console.log('[callLLM] Successfully parsed JSON response with fields:', Object.keys(parsedResult).join(', '));
      
      // Log key statistics about the parsed result
      console.log('[callLLM] Parsed result statistics:', {
        podcastTitle: parsedResult.podcastTitle?.substring(0, 30) + '...',
        scriptSegmentsCount: parsedResult.script?.length || 0,
        voiceMapKeysCount: Object.keys(parsedResult.voiceMap || {}).length,
        language: parsedResult.language
      });
      
      return parsedResult;
    } catch (parseError: any) {
      console.error('[callLLM] JSON parsing error:', parseError.message);
      console.error('[callLLM] Raw content preview:', result?.choices?.[0]?.message?.content?.substring(0, 100) + '...');
      throw new Error(`Cannot parse LLM response as JSON: ${parseError.message}`);
    }
    
  } catch (error: any) {
    console.error('[callLLM] API call error:', error.message);
    console.error('[callLLM] Error stack:', error.stack);
    throw error;
  }
}

// 验证LLM生成的结构化数据 - 简化版本，并尝试自动修复缺失字段
function validateStructuredData(data: any): { valid: boolean; error?: string } {
  console.log('[validateStructuredData] Starting data validation');
  
  // 基本结构验证
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
  
  // 尝试自动修复缺失字段
  let modified = false;
  
  // 确保podcastTitle存在
  if (!data.podcastTitle) {
    data.podcastTitle = "Untitled Podcast";
    modified = true;
    console.log('[validateStructuredData] Auto-added missing podcastTitle field');
  }
  
  // 确保script数组存在
  if (!data.script || !Array.isArray(data.script)) {
    data.script = [];
    modified = true;
    console.log('[validateStructuredData] Auto-added missing script field as empty array');
  }
  
  // 确保voiceMap对象存在
  if (!data.voiceMap || typeof data.voiceMap !== 'object') {
    data.voiceMap = {}; // Changed to initialize as an empty object
    modified = true;
    console.log('[validateStructuredData] Auto-added missing voiceMap field as empty object');
  }
  
  // 确保language存在
  if (!data.language) {
    data.language = "en-US";
    modified = true;
    console.log('[validateStructuredData] Auto-added missing language field');
  }
  
  if (modified) {
    console.log('[validateStructuredData] Auto-fixed missing fields');
  }
  
  // 再次检查必要字段
  const requiredFields = ['podcastTitle', 'script', 'voiceMap', 'language'];
  const missingFields = requiredFields.filter(field => data[field] === undefined || data[field] === null); // Check for undefined or null
  
  if (missingFields.length > 0) {
    console.error('[validateStructuredData] Still missing required fields:', missingFields.join(', '));
    return {
      valid: false,
      error: `Structured data still missing required fields: ${missingFields.join(', ')}`
    };
  }
  
  // 检查script数组
  if (!Array.isArray(data.script) || data.script.length === 0) {
    console.error('[validateStructuredData] Script must be a non-empty array');
    return { 
      valid: false, 
      error: 'Script must be a non-empty array' 
    };
  }
  
  // 简单验证script中的每个项目
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
  
  // 检查voiceMap
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