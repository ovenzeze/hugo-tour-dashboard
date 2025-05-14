import { ref } from 'vue';
import { toast } from 'vue-sonner';
import { usePlaygroundStore } from '~/stores/playground';

export interface ValidateScriptRequest {
  // 必要字段
  rawScript: string;                // 编辑器中填写的原始脚本内容
  title: string;                    // 播客标题
  
  // 角色信息
  personas: {
    hostPersona: {                  // 主持人信息
      id: number;                   // persona_id
      name: string;                 // 角色名称
      voice_model_identifier: string; // 语音模型标识符
    },
    guestPersonas: Array<{          // 嘉宾信息列表
      id: number;                   // persona_id
      name: string;                 // 角色名称
      voice_model_identifier: string; // 语音模型标识符
    }>
  };
  
  // 风格偏好
  preferences: {
    style: string;                  // 播客风格，如"对话式"、"访谈式"等
    language: string;               // 语言，默认"en-US"
    keywords: string;               // 关键词
    numberOfSegments?: number;      // 分段数量
    backgroundMusic?: string;       // 背景音乐类型
  };
}

export interface ValidateScriptResponse {
  success: boolean;                 // 是否验证成功
  message?: string;                 // 成功/失败消息
  structuredData?: {
    podcastTitle: string;           // 播客标题
    script: Array<{                 // 结构化脚本
      role: 'host' | 'guest';       // 角色类型
      name: string;                 // 角色名称
      text: string;                 // 对话内容
    }>;
    voiceMap: Record<string, {      // 角色名称到语音的映射
      personaId: number;            // persona ID
      voice_model_identifier: string; // 语音模型标识符
    }>;
    language: string;               // 语言
  };
  error?: string;                   // 错误信息
}

export interface ScriptSegment {
  speaker: string;
  text: string;
}

export function useScriptValidator() {
  const playgroundStore = usePlaygroundStore();
  const isValidating = ref(false);
  const validationResult = ref<ValidateScriptResponse | null>(null);
  const validationError = ref<string | null>(null);

  /**
   * 解析脚本内容为段落
   */
  function parseScriptToSegments(content: string): ScriptSegment[] {
    if (!content) return [];
    
    return content
      .split('\n')
      .map(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex <= 0) return null; // 无效行
        
        const speaker = line.substring(0, colonIndex).trim();
        const text = line.substring(colonIndex + 1).trim();
        
        return { speaker, text };
      })
      .filter(segment => segment && segment.speaker && segment.text) as ScriptSegment[];
  }

  /**
   * 验证脚本内容
   */
  async function validateScript() {
    if (isValidating.value) {
      return { success: false, error: '验证已在进行中' };
    }
    
    isValidating.value = true;
    validationResult.value = null;
    validationError.value = null;

    try {
      // 验证基本设置
      const podcastSettings = playgroundStore.podcastSettings;
      
      if (!podcastSettings?.title) {
        toast.error('请设置播客标题');
        return { success: false, error: '请设置播客标题' };
      }
      
      if (!podcastSettings?.hostPersonaId) {
        toast.error('请选择主持人');
        return { success: false, error: '请选择主持人' };
      }
      
      if (!playgroundStore.textToSynthesize) {
        toast.error('脚本内容为空');
        return { success: false, error: '脚本内容为空' };
      }
      
      // 获取主持人信息
      const hostPersona = playgroundStore.personas.find(
        (p) => p.persona_id === Number(podcastSettings.hostPersonaId)
      );
      
      if (!hostPersona) {
        toast.error('所选主持人未找到');
        return { success: false, error: '所选主持人未找到' };
      }
      
      // 获取嘉宾信息
      const guestPersonas = podcastSettings.guestPersonaIds
        .map(id => Number(id))
        .filter(id => !isNaN(id) && id > 0)
        .map(id => playgroundStore.personas.find(p => p.persona_id === id))
        .filter(p => p !== undefined) as any[];
      
      if (guestPersonas.length === 0) {
        toast.error('请至少选择一位嘉宾');
        return { success: false, error: '请至少选择一位嘉宾' };
      }
      
      // 解析脚本
      const scriptSegments = parseScriptToSegments(playgroundStore.textToSynthesize);
      
      if (scriptSegments.length === 0) {
        toast.error('无法解析脚本。请确保格式为"说话者: 文本内容"');
        return { success: false, error: '无法解析脚本' };
      }
      
      // 构建请求体
      const requestBody: ValidateScriptRequest = {
        title: podcastSettings.title,
        rawScript: playgroundStore.textToSynthesize,
        personas: {
          hostPersona: {
            id: hostPersona.persona_id,
            name: hostPersona.name,
            voice_model_identifier: hostPersona.voice_model_identifier || ''
          },
          guestPersonas: guestPersonas.map(persona => ({
            id: persona.persona_id,
            name: persona.name,
            voice_model_identifier: persona.voice_model_identifier || ''
          }))
        },
        preferences: {
          style: podcastSettings.style || '对话式',
          language: 'en-US',
          keywords: podcastSettings.keywords || '',
          numberOfSegments: podcastSettings.numberOfSegments || 3,
          backgroundMusic: podcastSettings.backgroundMusic
        }
      };
      
      console.log('[DEBUG] API request body (standalone validation):', JSON.stringify(requestBody, null, 2));
      
      // 调用API
      const response = await $fetch<ValidateScriptResponse>('/api/podcast/process/validate', {
        method: 'POST',
        body: requestBody
      });
      
      console.log('[DEBUG] API response (standalone validation):', response);
      
      validationResult.value = response;
      
      if (response.success) {
        toast.success('脚本验证通过');
        return { success: true, data: response.structuredData };
      } else {
        toast.error(`验证失败: ${response.message || response.error || '未知错误'}`);
        validationError.value = response.error || response.message || '验证失败';
        return { success: false, error: validationError.value };
      }
    } catch (err: any) {
      console.error('[ERROR] API request failed (standalone validation):', err);
      const errorMessage = err.data?.message || err.message || '服务器错误';
      toast.error(`请求错误: ${errorMessage}`);
      validationError.value = errorMessage;
      return { success: false, error: errorMessage };
    } finally {
      isValidating.value = false;
    }
  }

  return {
    isValidating,
    validationResult,
    validationError,
    validateScript,
    parseScriptToSegments
  };
} 