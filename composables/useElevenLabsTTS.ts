import { ref, computed } from 'vue'
import type { Voice } from '~/types/voice'
import { getDefaultVoice, findVoiceById } from '~/config/elevenlabs'

interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  voiceSettings?: {
    stability: number;
    similarity_boost: number;
    style?: number;
    use_speaker_boost?: boolean;
  };
  optimizeStreamingLatency?: number; // 0-4
  enableTimestamps?: boolean; // 是否启用时间戳
}

export interface TimestampChunk {
  audio: string; // Base64编码的音频数据
  timestamps: {
    char: string; // 字符
    start: number; // 开始时间(秒)
    end: number; // 结束时间(秒)
  }[];
}

export function useElevenLabsTTS() {
  const audioUrl = ref<string | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const audioData = ref<Blob | null>(null)
  const currentVoiceConfig = ref<Voice.Config | null>(null)
  const timestamps = ref<TimestampChunk[]>([]) // 存储时间戳数据

  // 使用预设配置生成声音
  const generateWithVoiceConfig = async (text: string, voiceConfig: Voice.Config) => {
    currentVoiceConfig.value = voiceConfig
    
    return generateTTS(text, {
      voiceId: voiceConfig.id,
      modelId: voiceConfig.modelId,
      voiceSettings: voiceConfig.settings ? {
        ...voiceConfig.settings,
        stability: voiceConfig.settings.stability ?? 0.5,
        similarity_boost: voiceConfig.settings.similarity_boost ?? 0.75
      } : undefined
    })
  }
  
  // 使用声音ID生成，自动加载预设配置
  const generateWithVoiceId = async (text: string, voiceId: string) => {
    const voiceConfig = findVoiceById(voiceId)
    
    if (voiceConfig) {
      return generateWithVoiceConfig(text, voiceConfig)
    } else {
      // 如果没找到预设配置，则使用基本的ID调用
      return generateTTS(text, { voiceId })
    }
  }
  
  // 默认声音生成
  const generateWithDefaultVoice = async (text: string) => {
    const defaultVoice = getDefaultVoice()
    return generateWithVoiceConfig(text, defaultVoice)
  }

  const generateTTS = async (text: string, options: TTSOptions = {}) => {
    isLoading.value = true
    error.value = null
    timestamps.value = []
    
    // 清理旧的资源
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = null
    }
    audioData.value = null

    if (!text) {
      error.value = '文本不能为空'
      isLoading.value = false
      return
    }

    try {
      console.log(`[useElevenLabsTTS] 发送 TTS 请求，文本长度: ${text.length}`)
      
      // 调用服务端API
      const endpoint = options.enableTimestamps 
        ? '/api/elevenlabs/tts-with-timestamps' 
        : '/api/elevenlabs/tts'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...options,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => null)
        const errorData = errorText ? JSON.parse(errorText) : null
        throw new Error(errorData?.statusMessage || `语音生成失败: ${response.statusText} (状态码: ${response.status})`)
      }

      console.log('[useElevenLabsTTS] 响应头:', {
        type: response.headers.get('Content-Type'),
        size: response.headers.get('Content-Length') || '未知'
      })

      try {
        if (options.enableTimestamps) {
          // 处理带时间戳的响应
          const data = await response.json()
          
          if (!data.audio || !data.timestamps) {
            throw new Error('无效的时间戳API响应格式')
          }
          
          // 保存时间戳数据
          timestamps.value = data.timestamps
          
          // 处理音频数据
          const audioBlob = base64ToBlob(data.audio, 'audio/mpeg')
          audioData.value = audioBlob
          audioUrl.value = URL.createObjectURL(audioBlob)
        } else {
          // 普通音频处理
          const audioBlob = await response.blob()
          
          if (audioBlob.size < 100) {
            throw new Error(`收到的音频数据过小 (${audioBlob.size} 字节)，可能不是有效的音频文件`)
          }
          
          audioData.value = audioBlob
          const blobType = audioBlob.type || 'audio/mpeg'
          const blobWithType = new Blob([audioBlob], { type: blobType })
          audioUrl.value = URL.createObjectURL(blobWithType)
        }
        
        console.log('[useElevenLabsTTS] 创建 Blob URL:', audioUrl.value)
      } catch (blobError: any) {
        console.error('[useElevenLabsTTS] Blob 处理错误:', blobError)
        throw new Error(`音频数据处理失败: ${blobError.message}`)
      }

    } catch (err: any) {
      console.error('[useElevenLabsTTS] 错误:', err)
      error.value = err.message || '生成语音时发生未知错误'
      audioUrl.value = null
    } finally {
      isLoading.value = false
    }
  }
  
  // 清理函数，用于在不需要时释放 Blob URL
  const clearAudio = () => {
    if (audioUrl.value) {
      URL.revokeObjectURL(audioUrl.value)
      audioUrl.value = null
    }
    audioData.value = null
    currentVoiceConfig.value = null
  }

  // Base64转Blob的辅助函数
  const base64ToBlob = (base64: string, mimeType: string) => {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }

  // 流式生成方法
  const streamTTSWithTimestamps = async (
    text: string, 
    options: TTSOptions,
    onChunk: (chunk: TimestampChunk) => void
  ) => {
    if (!options.enableTimestamps) {
      throw new Error('流式时间戳需要启用enableTimestamps选项')
    }

    try {
      const response = await fetch('/api/elevenlabs/stream-with-timestamps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          ...options,
        }),
      })

      if (!response.ok) {
        throw new Error(`流式请求失败: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('无法获取可读流')
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = new TextDecoder().decode(value)
        try {
          const chunk = JSON.parse(text) as TimestampChunk
          onChunk(chunk)
        } catch (e) {
          console.error('解析流式数据失败:', e)
        }
      }
    } catch (err: any) {
      console.error('流式TTS错误:', err)
      throw err
    }
  }

  return {
    audioUrl,
    audioData,
    isLoading,
    error,
    currentVoiceConfig,
    timestamps,
    
    generateTTS,
    generateWithVoiceConfig,
    generateWithVoiceId,
    generateWithDefaultVoice,
    streamTTSWithTimestamps,
    
    clearAudio: () => {
      if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value)
        audioUrl.value = null
      }
      audioData.value = null
      currentVoiceConfig.value = null
      timestamps.value = []
    }
  }
}
