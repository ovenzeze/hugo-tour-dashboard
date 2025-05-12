import { useRuntimeConfig } from '#imports'
import { createError } from 'h3'

interface ApiOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  responseType?: 'json' | 'arraybuffer' | 'blob' | 'text';
  headers?: Record<string, string>;
}

export async function fetchElevenLabsAPI(options: ApiOptions) {
  const config = useRuntimeConfig()
  console.log('[fetchElevenLabsAPI] Runtime Config:', config)
  console.log('[fetchElevenLabsAPI] Options:', {
    endpoint: options.endpoint,
    method: options.method,
    responseType: options.responseType,
    // 不打印 body 内容，可能包含较长的文本
    bodyProvided: !!options.body
  })
  
  const {
    endpoint,
    method = 'GET',
    body,
    responseType = 'json',
    headers = {}
  } = options
  
  // 构建完整 URL
  const baseUrl = config.elevenlabs?.baseUrl
  const url = `${baseUrl}${endpoint}`
  
  // 检查 API Key 是否存在
  if (!config.elevenlabs?.apiKey) {
    console.error('[fetchElevenLabsAPI] Error: elevenlabs.apiKey is missing in runtime config!')
    throw createError({
      statusCode: 500,
      statusMessage: 'ElevenLabs API Key 未配置'
    })
  }

  // 设置通用请求头
  const requestHeaders: Record<string, string> = {
    'xi-api-key': config.elevenlabs.apiKey,
    ...headers
  }
  
  if (body && method !== 'GET' && !headers['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json'
  }
  
  try {
    console.log(`[fetchElevenLabsAPI] 发送请求到 ${url}`)
    
    // 发送请求
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body && typeof body === 'object' ? JSON.stringify(body) : body
    })
    
    // 记录响应状态和头部
    console.log(`[fetchElevenLabsAPI] 收到响应:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()]),
    })
    
    // 检查响应状态
    if (!response.ok) {
      let errorText = `ElevenLabs API 错误 (${response.status})`
      let errorDetails = null
      
      try {
        // 尝试解析 JSON 错误信息
        const errorData = await response.json()
        console.error('[fetchElevenLabsAPI] 错误响应详情:', errorData)
        
        if (errorData?.detail?.message) {
          errorText = `ElevenLabs API 错误: ${errorData.detail.message}`
          errorDetails = errorData.detail
        } else if (errorData?.detail) {
          errorText = `ElevenLabs API 错误: ${JSON.stringify(errorData.detail)}`
          errorDetails = errorData.detail
        } else if (errorData?.error) {
          errorText = `ElevenLabs API 错误: ${errorData.error}`
          errorDetails = errorData
        }
      } catch (e) {
        // 获取文本错误
        const textError = await response.text()
        console.error('[fetchElevenLabsAPI] 非JSON错误响应:', textError)
        errorText = textError || errorText
      }
      
      throw createError({
        statusCode: response.status,
        statusMessage: errorText,
        data: errorDetails
      })
    }
    
    // 验证响应类型，特别是对音频数据
    if (responseType === 'arraybuffer') {
      const buffer = await response.arrayBuffer()
      console.log(`[fetchElevenLabsAPI] 接收到 ArrayBuffer 数据, 大小: ${buffer.byteLength} 字节`)
      
      // 检查数据大小是否太小 (这可能表明出现问题)
      if (buffer.byteLength < 100) { // 真实的音频文件不太可能小于 100 字节
        console.warn(`[fetchElevenLabsAPI] 警告: 接收到的音频数据非常小 (${buffer.byteLength} 字节)，可能不是有效的音频文件`)
      }
      
      return buffer
    } else if (responseType === 'blob') {
      const blob = await response.blob() 
      console.log(`[fetchElevenLabsAPI] 接收到 Blob 数据, 大小: ${blob.size} 字节, 类型: ${blob.type}`)
      return blob
    } else if (responseType === 'text') {
      const text = await response.text()
      console.log(`[fetchElevenLabsAPI] 接收到文本响应, 长度: ${text.length} 字符`)
      return text
    } else {
      // JSON
      const json = await response.json()
      console.log(`[fetchElevenLabsAPI] 接收到 JSON 响应`)
      return json
    }
  } catch (error: any) {
    console.error('[fetchElevenLabsAPI] 请求错误:', error)
    if (error.statusCode) {
      throw error // 重新抛出由 createError 创建的错误
    }
    throw createError({
      statusCode: 500,
      statusMessage: `ElevenLabs API 请求失败: ${error.message}`
    })
  }
} 