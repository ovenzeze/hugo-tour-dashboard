export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { scriptContent } = body;

    if (!scriptContent || typeof scriptContent !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Script content is required and must be a string'
      });
    }

    const config = useRuntimeConfig();
    const groqApiKey = config.groqApiKey;

    if (!groqApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'GROQ API key not configured'
      });
    }

    // 构建GROQ API请求
    const groqResponse = await $fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的播客脚本分析助手。请分析用户提供的脚本内容，提取以下信息：

1. 语言识别：识别脚本的主要语言（中文、英文等）
2. 说话者提取：识别脚本中的所有说话者/角色
3. 脚本格式化：将脚本格式化为标准的对话格式
4. 元信息生成：根据内容生成合适的标题、主题、描述

请以JSON格式返回结果，包含以下字段：
{
  "success": boolean,
  "language": "zh" | "en" | "other",
  "detectedLanguageName": string,
  "speakers": [
    {
      "name": string,
      "role": string, // 如 "Host", "Guest", "Narrator" 等
      "segments": number // 该说话者的对话段数
    }
  ],
  "formattedScript": string, // 格式化后的脚本，每行格式：说话者: 内容
  "metadata": {
    "suggestedTitle": string,
    "suggestedTopic": string,
    "suggestedDescription": string,
    "estimatedDuration": string, // 如 "5-10 minutes"
    "scriptType": string // 如 "interview", "monologue", "dialogue", "education"
  },
  "segments": [
    {
      "speaker": string,
      "text": string,
      "order": number
    }
  ]
}

如果脚本格式不规范或无法解析，请在formattedScript中提供修正建议。`
          },
          {
            role: 'user',
            content: `请分析以下脚本内容：\n\n${scriptContent}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2048
      }
    });

    let analysisResult;
    try {
      const responseContent = groqResponse.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response content from GROQ API');
      }

      // 尝试解析JSON响应
      analysisResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error('Failed to parse GROQ response:', parseError);
      
      // 如果JSON解析失败，提供一个基本的分析结果
      const basicAnalysis = analyzeScriptBasic(scriptContent);
      analysisResult = {
        success: true,
        language: basicAnalysis.language,
        detectedLanguageName: basicAnalysis.languageName,
        speakers: basicAnalysis.speakers,
        formattedScript: basicAnalysis.formattedScript,
        metadata: basicAnalysis.metadata,
        segments: basicAnalysis.segments,
        fallback: true,
        note: 'AI分析失败，使用基础解析结果'
      };
    }

    // 验证和补充分析结果
    if (!analysisResult.success) {
      analysisResult.success = true;
    }

    // 确保有speakers数据
    if (!analysisResult.speakers || analysisResult.speakers.length === 0) {
      const fallbackAnalysis = analyzeScriptBasic(scriptContent);
      analysisResult.speakers = fallbackAnalysis.speakers;
      analysisResult.segments = fallbackAnalysis.segments;
    }

    return {
      success: true,
      data: analysisResult
    };

  } catch (error: any) {
    console.error('Script analysis error:', error);
    
    // 如果API调用完全失败，返回基础分析
    const body = await readBody(event);
    const { scriptContent } = body;
    
    if (scriptContent) {
      const basicAnalysis = analyzeScriptBasic(scriptContent);
      return {
        success: true,
        data: {
          ...basicAnalysis,
          fallback: true,
          note: 'AI分析服务暂时不可用，使用基础解析结果'
        }
      };
    }

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to analyze script'
    });
  }
});

// 基础脚本分析函数（备用）
function analyzeScriptBasic(scriptContent: string) {
  const lines = scriptContent.split('\n').filter(line => line.trim());
  const speakers = new Set<string>();
  const segments: Array<{ speaker: string; text: string; order: number }> = [];
  
  let order = 0;
  const formattedLines: string[] = [];
  
  // 检测语言（简单判断）
  const chineseCharRegex = /[\u4e00-\u9fff]/;
  const hasChinese = chineseCharRegex.test(scriptContent);
  const language = hasChinese ? 'zh' : 'en';
  const languageName = hasChinese ? '中文' : 'English';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // 尝试匹配 "说话者: 内容" 格式
    const speakerMatch = trimmedLine.match(/^([^:：]+)[：:](.+)$/);
    
    if (speakerMatch) {
      const speaker = speakerMatch[1].trim();
      const text = speakerMatch[2].trim();
      
      speakers.add(speaker);
      segments.push({ speaker, text, order });
      formattedLines.push(`${speaker}: ${text}`);
      order++;
    } else {
      // 如果没有明确的说话者格式，假设是默认说话者
      const defaultSpeaker = language === 'zh' ? '主持人' : 'Host';
      speakers.add(defaultSpeaker);
      segments.push({ speaker: defaultSpeaker, text: trimmedLine, order });
      formattedLines.push(`${defaultSpeaker}: ${trimmedLine}`);
      order++;
    }
  }
  
  // 生成说话者信息
  const speakerArray = Array.from(speakers).map(name => {
    const segmentCount = segments.filter(s => s.speaker === name).length;
    const role = inferSpeakerRole(name, language);
    return { name, role, segments: segmentCount };
  });
  
  // 生成元信息
  const firstLine = segments[0]?.text || '';
  const suggestedTitle = firstLine.length > 50 ? 
    firstLine.substring(0, 47) + '...' : 
    firstLine || (language === 'zh' ? '新播客节目' : 'New Podcast Episode');
  
  return {
    success: true,
    language,
    detectedLanguageName: languageName,
    speakers: speakerArray,
    formattedScript: formattedLines.join('\n'),
    metadata: {
      suggestedTitle,
      suggestedTopic: language === 'zh' ? '一般讨论' : 'General Discussion',
      suggestedDescription: language === 'zh' ? 
        '这是一个根据用户脚本生成的播客节目。' : 
        'This is a podcast episode generated from user script.',
      estimatedDuration: `${Math.ceil(segments.length / 2)}-${Math.ceil(segments.length / 1.5)} minutes`,
      scriptType: speakerArray.length > 1 ? 'dialogue' : 'monologue'
    },
    segments
  };
}

// 推断说话者角色
function inferSpeakerRole(name: string, language: string): string {
  const nameLower = name.toLowerCase();
  
  if (language === 'zh') {
    if (nameLower.includes('主持') || nameLower.includes('host')) return '主持人';
    if (nameLower.includes('嘉宾') || nameLower.includes('guest')) return '嘉宾';
    if (nameLower.includes('旁白') || nameLower.includes('narrator')) return '旁白';
    if (nameLower.includes('记者') || nameLower.includes('reporter')) return '记者';
    return '参与者';
  } else {
    if (nameLower.includes('host') || nameLower.includes('anchor')) return 'Host';
    if (nameLower.includes('guest') || nameLower.includes('interview')) return 'Guest';
    if (nameLower.includes('narrator') || nameLower.includes('voice')) return 'Narrator';
    if (nameLower.includes('reporter') || nameLower.includes('journalist')) return 'Reporter';
    return 'Participant';
  }
} 