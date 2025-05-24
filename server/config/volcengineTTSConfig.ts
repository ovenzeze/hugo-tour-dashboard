// 火山引擎TTS配置文件 - 基于官方文档优化

export interface EmotionConfig {
  emotion: string;
  emotionScale: number;
  loudnessRatio: number;
  description: string;
}

export interface TTSScenarioConfig {
  emotion: string;
  emotionScale: number;
  loudnessRatio: number;
  speedRatio: number;
  volumeRatio: number;
  pitchRatio: number;
}

// 基于官方文档的情感配置选项
export const EMOTION_PRESETS: Record<string, EmotionConfig> = {
  // 官方推荐的高表现力配置 - 考虑非线性增长特性
  energetic: {
    emotion: 'excited',       // 使用excited而非happy，更有表现力
    emotionScale: 4.0,        // 官方默认值，实际效果最平衡
    loudnessRatio: 1.5,       // 在官方范围[0.5,2]内的较高值
    description: '充满活力的表达，适合播客和解说'
  },
  
  // 专业播音配置
  professional: {
    emotion: 'neutral',
    emotionScale: 3.0,        // 中等情绪强度，避免过于平淡
    loudnessRatio: 1.2,       // 适中的音量提升
    description: '专业播音风格，适合新闻和正式内容'
  },
  
  // 温暖亲切配置
  warm: {
    emotion: 'happy',
    emotionScale: 3.5,        // 根据文档，3和5效果接近，选择中间值
    loudnessRatio: 1.3,
    description: '温暖亲切的语调，适合教育和解释性内容'
  },
  
  // 激动兴奋配置 - 基于官方文档的非线性特性
  excited: {
    emotion: 'excited',
    emotionScale: 4.5,        // 考虑非线性增长，不使用最大值5
    loudnessRatio: 1.8,       // 接近官方上限但不超过
    description: '激动兴奋的表达，适合体育解说和娱乐内容'
  },

  // 新增：悲伤情感配置
  sad: {
    emotion: 'sad',
    emotionScale: 3.5,
    loudnessRatio: 0.8,       // 悲伤情感通常音量较低
    description: '悲伤情感表达，适合感人故事和深度内容'
  },

  // 新增：愤怒情感配置
  angry: {
    emotion: 'angry',
    emotionScale: 4.0,
    loudnessRatio: 1.6,       // 愤怒情感需要较高音量
    description: '愤怒情感表达，适合激烈辩论和冲突场景'
  }
};

// 场景配置 - 根据官方文档优化
export const SCENARIO_CONFIGS: Record<string, TTSScenarioConfig> = {
  // 播客主持人配置 - 优化为最佳播客效果
  podcast_host: {
    emotion: 'excited',       // 使用excited而非happy，更适合播客
    emotionScale: 4.0,        // 官方默认值，避免非线性增长带来的问题
    loudnessRatio: 1.4,       // 在官方范围内的较高值
    speedRatio: 1.1,          // 稍快的语速，保持活力
    volumeRatio: 1.1,         // 官方范围[0.1,3]内的适中值
    pitchRatio: 1.05          // 稍高的音调，更有活力
  },
  
  // 播客嘉宾配置 - 相对温和
  podcast_guest: {
    emotion: 'happy',
    emotionScale: 3.5,        // 考虑非线性特性，选择中等值
    loudnessRatio: 1.2,       // 相对温和的音量
    speedRatio: 1.0,          // 正常语速
    volumeRatio: 1.0,         // 正常音量
    pitchRatio: 1.0           // 正常音调
  },
  
  // 新闻播报配置 - 专业稳重
  news_anchor: {
    emotion: 'neutral',
    emotionScale: 2.5,        // 较低的情绪强度，保持专业
    loudnessRatio: 1.1,       // 轻微音量提升，确保清晰
    speedRatio: 0.95,         // 稍慢的语速，确保清晰度
    volumeRatio: 1.0,
    pitchRatio: 0.98          // 稍低的音调，更权威
  },
  
  // 解说员配置 - 平衡表现力和稳重性
  narrator: {
    emotion: 'happy',
    emotionScale: 3.0,        // 适中的情绪强度
    loudnessRatio: 1.3,
    speedRatio: 1.0,
    volumeRatio: 1.0,
    pitchRatio: 0.98          // 稍低的音调，更稳重
  }
};

// 根据角色类型获取配置 - 增强匹配逻辑
export function getConfigByRole(role: string): TTSScenarioConfig {
  // 检查是否有精确匹配
  if (SCENARIO_CONFIGS[role]) {
    return SCENARIO_CONFIGS[role];
  }
  
  // 根据关键词匹配 - 扩展匹配规则
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('host') || roleLower.includes('主持') || 
      roleLower.includes('anchor') || roleLower.includes('播音')) {
    return SCENARIO_CONFIGS.podcast_host;
  }
  
  if (roleLower.includes('guest') || roleLower.includes('嘉宾') || 
      roleLower.includes('客人') || roleLower.includes('受访者')) {
    return SCENARIO_CONFIGS.podcast_guest;
  }
  
  if (roleLower.includes('news') || roleLower.includes('新闻') || 
      roleLower.includes('播报') || roleLower.includes('报道')) {
    return SCENARIO_CONFIGS.news_anchor;
  }
  
  if (roleLower.includes('narrator') || roleLower.includes('解说') || 
      roleLower.includes('旁白') || roleLower.includes('讲述者')) {
    return SCENARIO_CONFIGS.narrator;
  }
  
  // 默认返回播客主持人配置（经过优化的高表现力配置）
  return SCENARIO_CONFIGS.podcast_host;
}

// 默认配置 - 使用优化后的播客主持人配置
export const DEFAULT_TTS_CONFIG: TTSScenarioConfig = SCENARIO_CONFIGS.podcast_host;

// 支持的情感类型 - 基于官方文档音色列表
export const SUPPORTED_EMOTIONS = [
  'happy',        // 开心
  'sad',          // 悲伤
  'angry',        // 愤怒  
  'neutral',      // 中性
  'excited',      // 激动
  'surprised',    // 惊讶
  'fear',         // 恐惧
  'hate',         // 厌恶
  'coldness',     // 冷漠
  // 官方文档中还支持的其他情感
  'professional', // 专业
  'serious',      // 严肃
  'comfortable'   // 舒适
] as const;

export type SupportedEmotion = typeof SUPPORTED_EMOTIONS[number];

// 验证情感类型
export function validateEmotion(emotion: string): emotion is SupportedEmotion {
  return SUPPORTED_EMOTIONS.includes(emotion as SupportedEmotion);
}

// 获取推荐的情感设置 - 基于内容智能推荐
export function getRecommendedEmotionForText(text: string): SupportedEmotion {
  const textLower = text.toLowerCase();
  
  // 检查文本内容的情感倾向
  if (textLower.includes('好消息') || textLower.includes('恭喜') || 
      textLower.includes('成功') || textLower.includes('太棒了')) {
    return 'excited';  // 使用excited而非happy，更有表现力
  }
  
  if (textLower.includes('遗憾') || textLower.includes('抱歉') || 
      textLower.includes('失败') || textLower.includes('难过')) {
    return 'sad';
  }
  
  if (textLower.includes('重要') || textLower.includes('注意') || 
      textLower.includes('警告') || textLower.includes('严重')) {
    return 'serious';
  }
  
  if (textLower.includes('amazing') || textLower.includes('incredible') || 
      textLower.includes('fantastic') || textLower.includes('惊人')) {
    return 'surprised';
  }

  if (textLower.includes('愤怒') || textLower.includes('生气') || 
      textLower.includes('愤慨') || textLower.includes('激愤')) {
    return 'angry';
  }
  
  // 默认返回happy情感，适合大部分播客内容
  return 'happy';
}

// 新增：根据音色类型获取支持的情感列表
export function getSupportedEmotionsByVoiceType(voiceType: string): SupportedEmotion[] {
  // 根据官方文档，不同音色支持的情感不同
  // 这里提供一个基础映射，实际使用时应该根据具体音色调整
  
  if (voiceType.includes('emo_v2_mars_bigtts')) {
    // 多情感音色支持更多情感
    return ['happy', 'sad', 'angry', 'surprised', 'fear', 'excited', 'coldness', 'neutral'];
  }
  
  if (voiceType.includes('BV700') || voiceType.includes('BV701')) {
    // 通用音色支持基础情感
    return ['happy', 'sad', 'angry', 'surprised', 'neutral', 'excited'];
  }
  
  // 默认支持基础情感
  return ['happy', 'neutral', 'excited'];
}

// 新增：根据官方文档的参数验证函数
export function validateTTSParams(params: {
  emotionScale?: number;
  loudnessRatio?: number;
  speedRatio?: number;
  volumeRatio?: number;
  pitchRatio?: number;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (params.emotionScale !== undefined) {
    if (params.emotionScale < 1 || params.emotionScale > 5) {
      errors.push('emotionScale 必须在 1-5 范围内');
    }
  }
  
  if (params.loudnessRatio !== undefined) {
    if (params.loudnessRatio < 0.5 || params.loudnessRatio > 2) {
      errors.push('loudnessRatio 必须在 0.5-2 范围内');
    }
  }
  
  if (params.speedRatio !== undefined) {
    if (params.speedRatio < 0.8 || params.speedRatio > 2) {
      errors.push('speedRatio 必须在 0.8-2 范围内');
    }
  }
  
  if (params.volumeRatio !== undefined) {
    if (params.volumeRatio < 0.1 || params.volumeRatio > 3) {
      errors.push('volumeRatio 必须在 0.1-3 范围内');
    }
  }
  
  if (params.pitchRatio !== undefined) {
    if (params.pitchRatio < 0.1 || params.pitchRatio > 3) {
      errors.push('pitchRatio 必须在 0.1-3 范围内');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// 新增：SSML配置和工具函数
export interface SSMLConfig {
  enabled: boolean;
  autoEnhance: boolean;  // 自动为播客内容添加SSML增强
  breakStrength: 'x-weak' | 'weak' | 'medium' | 'strong' | 'x-strong';
  sentencePause: string; // 句子间停顿时间，如 "300ms"
  paragraphPause: string; // 段落间停顿时间，如 "800ms"
}

// SSML默认配置
export const DEFAULT_SSML_CONFIG: SSMLConfig = {
  enabled: true,
  autoEnhance: true,
  breakStrength: 'medium',
  sentencePause: '300ms',
  paragraphPause: '800ms'
};

// 支持的SSML增强类型
export const SSML_ENHANCEMENTS = {
  // 自动为播客内容添加停顿
  ADD_BREAKS: 'add_breaks',
  // 强调重要内容
  ADD_EMPHASIS: 'add_emphasis', 
  // 优化数字和时间读法
  OPTIMIZE_NUMBERS: 'optimize_numbers',
  // 添加语调变化
  ADD_PROSODY: 'add_prosody'
} as const;

// 为播客内容自动生成SSML
export function enhanceTextWithSSML(
  text: string, 
  options: {
    enableBreaks?: boolean;
    enableEmphasis?: boolean;
    enableNumberOptimization?: boolean;
    speakerRole?: string;
  } = {}
): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let enhancedText = text;
  
  // 如果已经包含SSML标签，直接返回
  if (text.includes('<speak>') || text.includes('<break>') || text.includes('<prosody>')) {
    return enhancedText;
  }

  const {
    enableBreaks = true,
    enableEmphasis = true,
    enableNumberOptimization = true,
    speakerRole = 'podcast_host'
  } = options;

  // 1. 添加句子间停顿
  if (enableBreaks) {
    enhancedText = addSentenceBreaks(enhancedText);
  }

  // 2. 优化数字、时间、日期的读法
  if (enableNumberOptimization) {
    enhancedText = optimizeNumbersAndDates(enhancedText);
  }

  // 3. 为重要内容添加强调
  if (enableEmphasis) {
    enhancedText = addEmphasisToImportantContent(enhancedText);
  }

  // 4. 根据角色添加语调变化
  enhancedText = addRoleBasedProsody(enhancedText, speakerRole);

  // 5. 包装在speak标签中
  return `<speak>${enhancedText}</speak>`;
}

// 添加句子间停顿
function addSentenceBreaks(text: string): string {
  // 在句号、问号、感叹号后添加停顿
  return text
    .replace(/([.!?])\s+/g, '$1<break time="400ms"/> ')
    .replace(/([，；])\s*/g, '$1<break time="200ms"/> ')
    .replace(/([。！？])\s*/g, '$1<break time="500ms"/> ');
}

// 优化数字和日期的读法
function optimizeNumbersAndDates(text: string): string {
  return text
    // 时间格式 HH:MM
    .replace(/\b(\d{1,2}):(\d{2})\b/g, '<say-as interpret-as="time">$1:$2</say-as>')
    // 日期格式 YYYY年MM月DD日
    .replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, '<say-as interpret-as="date" format="ymd">$1-$2-$3</say-as>')
    // 电话号码
    .replace(/\b(\d{3})-(\d{4})-(\d{4})\b/g, '<say-as interpret-as="telephone">$1-$2-$3</say-as>')
    // 大数字（超过1000的整数）
    .replace(/\b(\d{4,})\b/g, '<say-as interpret-as="cardinal">$1</say-as>');
}

// 为重要内容添加强调
function addEmphasisToImportantContent(text: string): string {
  return text
    // 强调感叹句
    .replace(/(很重要|非常|特别|尤其|格外)(.*?[！!])/g, '<emphasis level="strong">$1$2</emphasis>')
    // 强调疑问句中的关键词
    .replace(/(什么|为什么|怎么|如何|哪里)(.*?[？?])/g, '<emphasis level="moderate">$1$2</emphasis>')
    // 强调引用内容
    .replace(/"([^"]+)"/g, '<emphasis level="moderate">"$1"</emphasis>');
}

// 根据角色添加语调变化
function addRoleBasedProsody(text: string, role: string): string {
  const roleConfig = getConfigByRole(role);
  
  // 为不同角色添加适当的语调
  if (role.includes('host') || role.includes('主持')) {
    // 主持人：稍快语速，较高音调
    return `<prosody rate="1.1" pitch="+2st">${text}</prosody>`;
  } else if (role.includes('guest') || role.includes('嘉宾')) {
    // 嘉宾：正常语速，温和音调
    return `<prosody rate="1.0" pitch="medium">${text}</prosody>`;
  } else if (role.includes('narrator') || role.includes('解说')) {
    // 解说员：稍慢语速，权威音调
    return `<prosody rate="0.95" pitch="-1st">${text}</prosody>`;
  }
  
  return text;
}

// 清理和验证SSML
export function validateAndCleanSSML(ssml: string): { isValid: boolean; cleanedSSML: string; errors: string[] } {
  const errors: string[] = [];
  let cleanedSSML = ssml;

  // 检查是否有speak根元素
  if (!ssml.includes('<speak>') || !ssml.includes('</speak>')) {
    errors.push('SSML必须包含speak根元素');
    cleanedSSML = `<speak>${ssml}</speak>`;
  }

  // 检查嵌套是否正确
  const tagRegex = /<(\/?[\w:-]+)[^>]*>/g;
  const stack: string[] = [];
  let match;
  
  while ((match = tagRegex.exec(ssml)) !== null) {
    const fullTag = match[0];
    const tagName = match[1];
    
    if (tagName.startsWith('/')) {
      // 结束标签
      const openTag = tagName.substring(1);
      if (stack.length === 0 || stack[stack.length - 1] !== openTag) {
        errors.push(`SSML标签未正确闭合: ${fullTag}`);
      } else {
        stack.pop();
      }
    } else if (!fullTag.endsWith('/>')) {
      // 开始标签（非自闭合）
      stack.push(tagName.split(' ')[0]); // 只取标签名，忽略属性
    }
  }

  // 检查字符长度（火山引擎限制）
  if (ssml.length > 2000) {
    errors.push(`SSML内容过长 (${ssml.length}字符)，建议控制在2000字符以内`);
  }

  return {
    isValid: errors.length === 0,
    cleanedSSML,
    errors
  };
}

// 为播客场景推荐SSML设置
export function getSSMLRecommendationForPodcast(textLength: number, speakerCount: number, text?: string): {
  shouldUseSSML: boolean;
  reasons: string[];
  recommendedFeatures: string[];
} {
  const reasons: string[] = [];
  const recommendedFeatures: string[] = [];
  
  // 推荐使用SSML的条件
  let shouldUseSSML = false;
  
  if (textLength > 100) {
    shouldUseSSML = true;
    reasons.push('文本较长，SSML可以改善停顿和节奏');
    recommendedFeatures.push('句子间停顿');
  }
  
  if (speakerCount > 1) {
    shouldUseSSML = true;
    reasons.push('多说话人场景，SSML可以区分不同角色的语调');
    recommendedFeatures.push('角色语调变化');
  }
  
  // 检查文本特征（如果提供了文本内容）
  if (text) {
    if (/\d{4}年|\d+月|\d+日|(\d{1,2}):(\d{2})/.test(text)) {
      shouldUseSSML = true;
      reasons.push('包含日期时间信息，SSML可以优化读法');
      recommendedFeatures.push('日期时间优化');
    }
    
    if (/[！!？?]{2,}|很重要|非常|特别/.test(text)) {
      shouldUseSSML = true;
      reasons.push('包含强调内容，SSML可以增强表达效果');
      recommendedFeatures.push('内容强调');
    }
  }

  return {
    shouldUseSSML,
    reasons,
    recommendedFeatures
  };
} 