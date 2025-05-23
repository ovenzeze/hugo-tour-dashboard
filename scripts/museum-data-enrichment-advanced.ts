#!/usr/bin/env tsx

/**
 * Advanced Museum Data Enrichment Script
 * 高级博物馆数据分阶段收集和验证系统
 * 
 * 功能：
 * 1. 分阶段数据收集策略
 * 2. 不同数据类型的专门化处理
 * 3. 数据质量验证和确认机制
 * 4. 增量更新和补充策略
 */

import { createClient } from '@supabase/supabase-js'
import { consola } from 'consola'
import type { Database } from '../types/supabase'

// 数据收集阶段枚举
enum CollectionPhase {
  BASIC_INFO = 'basic_info',
  GALLERY_MAPPING = 'gallery_mapping', 
  OBJECT_INVENTORY = 'object_inventory',
  DETAILED_ENRICHMENT = 'detailed_enrichment',
  VALIDATION = 'validation'
}

// 数据质量等级
enum DataQuality {
  DRAFT = 'draft',
  VERIFIED = 'verified',
  EXPERT_REVIEWED = 'expert_reviewed'
}

// 收集策略配置
interface CollectionStrategy {
  phase: CollectionPhase
  maxRetries: number
  delayBetweenRequests: number
  validationRequired: boolean
  confidenceThreshold: number
}

// 扩展的数据接口
interface MuseumBasicInfo {
  name: string
  description?: string
  address?: string
  city?: string
  country?: string
  website?: string
  opening_hours?: Record<string, string>
  phone?: string
  email?: string
  founded_year?: number
  museum_type?: string
  collection_size?: number
  annual_visitors?: number
  architecture_style?: string
  notable_features?: string[]
}

interface GalleryDetailedInfo {
  name: string
  gallery_number?: string
  description?: string
  theme?: string
  location_description?: string
  floor_level?: number
  area_sqm?: number
  capacity?: number
  special_features?: string[]
  accessibility?: string[]
  lighting_type?: string
  climate_control?: boolean
}

interface ObjectDetailedInfo {
  title: string
  object_number?: string
  artist_display_name?: string
  culture?: string
  period?: string
  object_date?: string
  medium?: string
  description?: string
  classification?: string
  department?: string
  tags?: string[]
  dimensions?: string
  weight?: string
  condition?: string
  provenance?: string
  exhibition_history?: string[]
  significance?: string
  conservation_notes?: string
}

interface CollectionResult {
  phase: CollectionPhase
  success: boolean
  data: any
  confidence: number
  sources: string[]
  validation_notes?: string[]
  next_phase?: CollectionPhase
}

class AdvancedMuseumDataEnrichment {
  private supabase: ReturnType<typeof createClient<Database>> | null = null
  private strategies: Map<CollectionPhase, CollectionStrategy> = new Map()
  
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      // 在测试模式下，只记录警告而不抛出错误
      consola.warn('⚠️  Supabase配置未找到，请检查环境变量：')
      consola.warn('   - SUPABASE_URL')
      consola.warn('   - SUPABASE_KEY')
      consola.warn('📝  您可以在 .env 文件中设置这些环境变量')
      // 不初始化数据库连接
      this.initializeStrategies()
      return
    }
    
    this.supabase = createClient<Database>(supabaseUrl, supabaseKey)
    this.initializeStrategies()
  }

  private initializeStrategies() {
    this.strategies.set(CollectionPhase.BASIC_INFO, {
      phase: CollectionPhase.BASIC_INFO,
      maxRetries: 3,
      delayBetweenRequests: 2000,
      validationRequired: true,
      confidenceThreshold: 0.8
    })
    
    this.strategies.set(CollectionPhase.GALLERY_MAPPING, {
      phase: CollectionPhase.GALLERY_MAPPING,
      maxRetries: 2,
      delayBetweenRequests: 3000,
      validationRequired: true,
      confidenceThreshold: 0.7
    })
    
    this.strategies.set(CollectionPhase.OBJECT_INVENTORY, {
      phase: CollectionPhase.OBJECT_INVENTORY,
      maxRetries: 2,
      delayBetweenRequests: 5000,
      validationRequired: false,
      confidenceThreshold: 0.6
    })
    
    this.strategies.set(CollectionPhase.DETAILED_ENRICHMENT, {
      phase: CollectionPhase.DETAILED_ENRICHMENT,
      maxRetries: 1,
      delayBetweenRequests: 3000,
      validationRequired: true,
      confidenceThreshold: 0.8
    })
  }

  /**
   * 阶段1：收集博物馆基本信息
   */
  async collectBasicMuseumInfo(museumName: string, city?: string, country?: string): Promise<CollectionResult> {
    consola.info(`🏛️ 阶段1: 收集博物馆基本信息 - ${museumName}`)
    
    const prompt = `
You are a professional museum research specialist. Please collect basic information about "${museumName}".

Search criteria:
- Museum name: ${museumName}
- City: ${city || 'Not specified'}
- Country: ${country || 'Not specified'}

Please provide the following basic information in JSON format with ALL content in ENGLISH:

{
  "museum": {
    "name": "Complete official museum name in English",
    "description": "Brief description of the museum in English (2-3 sentences)",
    "address": "Complete official address in English",
    "city": "City name in English",
    "country": "Country name in English",
    "website": "Official website URL",
    "phone": "Official phone number",
    "email": "Official email address",
    "opening_hours": {
      "monday": "Opening hours or 'Closed'",
      "tuesday": "Opening hours",
      "wednesday": "Opening hours", 
      "thursday": "Opening hours",
      "friday": "Opening hours",
      "saturday": "Opening hours",
      "sunday": "Opening hours"
    },
    "founded_year": year_established_as_number,
    "museum_type": "Museum type in English (e.g: Art Museum, History Museum, Science Museum, etc.)",
    "collection_size": estimated_collection_count_as_number,
    "annual_visitors": estimated_annual_visitors_as_number,
    "architecture_style": "Architectural style in English",
    "notable_features": ["Feature 1 in English", "Feature 2 in English", "Feature 3 in English"]
  },
  "confidence": 0.95,
  "sources": ["Source 1", "Source 2", "Source 3"],
  "validation_notes": ["Information to verify 1", "Information to verify 2"]
}

Requirements:
1. Focus on accurate basic information, do not fabricate data
2. If certain information is uncertain, note it in validation_notes
3. Confidence should be based on the reliability of information sources
4. Prioritize official websites and authoritative institutions
5. ALL museum data content must be in English
6. Use proper English names for the museum (e.g., "Palace Museum" for 故宫博物院)
`

    return await this.executeCollectionPhase(CollectionPhase.BASIC_INFO, prompt)
  }

  /**
   * 执行收集阶段的通用方法
   */
  private async executeCollectionPhase(phase: CollectionPhase, prompt: string): Promise<CollectionResult> {
    const strategy = this.strategies.get(phase)!
    let lastError: any
    
    for (let attempt = 1; attempt <= strategy.maxRetries; attempt++) {
      try {
        consola.info(`尝试 ${attempt}/${strategy.maxRetries}`)
        
        const response = await callLLMForScript({
          prompt,
          responseFormat: { type: 'json_object' }
        })

        const result = JSON.parse(response)
        
        // 验证置信度阈值
        if (result.confidence < strategy.confidenceThreshold) {
          consola.warn(`置信度 ${result.confidence} 低于阈值 ${strategy.confidenceThreshold}`)
          if (attempt < strategy.maxRetries) {
            await this.delay(strategy.delayBetweenRequests)
            continue
          }
        }

        return {
          phase,
          success: true,
          data: result,
          confidence: result.confidence,
          sources: result.sources || [],
          validation_notes: result.validation_notes || []
        }

      } catch (error) {
        lastError = error
        consola.error(`阶段 ${phase} 尝试 ${attempt} 失败:`, error)
        
        if (attempt < strategy.maxRetries) {
          await this.delay(strategy.delayBetweenRequests)
        }
      }
    }

    return {
      phase,
      success: false,
      data: null,
      confidence: 0,
      sources: [],
      validation_notes: [`所有尝试失败: ${lastError?.message}`]
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 获取数据库统计信息
   */
  async getDetailedStats(): Promise<void> {
    if (!this.supabase) {
      consola.info('📊 数据库统计信息:')
      consola.info('   ❌ 无法连接到数据库 - 请配置环境变量')
      return
    }

    const [museumsResult, galleriesResult, objectsResult] = await Promise.all([
      this.supabase.from('museums').select('museum_id, name, city, country'),
      this.supabase.from('galleries').select('gallery_id, museum_id'),
      this.supabase.from('objects').select('object_id, museum_id')
    ])

    consola.info('📊 详细数据库统计信息:')
    consola.info(`   博物馆总数: ${museumsResult.data?.length || 0} 个`)
    consola.info(`   展厅总数: ${galleriesResult.data?.length || 0} 个`)
    consola.info(`   展品总数: ${objectsResult.data?.length || 0} 个`)

    // 按博物馆分组统计
    if (museumsResult.data) {
      for (const museum of museumsResult.data) {
        const galleries = galleriesResult.data?.filter(g => g.museum_id === museum.museum_id).length || 0
        const objects = objectsResult.data?.filter(o => o.museum_id === museum.museum_id).length || 0
        consola.info(`   ${museum.name}: ${galleries} 展厅, ${objects} 展品`)
      }
    }
  }
}

// 主函数
async function main() {
  const enrichment = new AdvancedMuseumDataEnrichment()

  // 显示当前统计
  await enrichment.getDetailedStats()

  // 获取命令行参数
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case 'basic':
      // 仅收集基本信息
      const basicMuseumName = args[1]
      if (!basicMuseumName) {
        consola.error('请提供博物馆名称')
        process.exit(1)
      }
      const result = await enrichment.collectBasicMuseumInfo(basicMuseumName)
      console.log(JSON.stringify(result, null, 2))
      break

    case 'stats':
      // 显示详细统计信息
      break

    default:
      consola.info('📖 博物馆数据收集使用方法:')
      consola.info('  pnpm run museum-enrichment basic "博物馆名称"    # 收集基本信息')
      consola.info('  pnpm run museum-enrichment stats              # 显示统计信息')
      consola.info('')
      consola.info('💡 示例用法:')
      consola.info('  pnpm run museum-enrichment basic "故宫博物院"')
      consola.info('  pnpm run museum-enrichment basic "大英博物馆"')
      consola.info('  pnpm run museum-enrichment basic "卢浮宫"')
      break
  }

  // 显示最终统计
  await enrichment.getDetailedStats()
}

// 运行主函数
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    consola.error('高级脚本执行失败:', error)
    process.exit(1)
  })
}

export { AdvancedMuseumDataEnrichment, CollectionPhase, DataQuality }

// 原生LLM调用函数，用于脚本环境
async function callLLMForScript(options: {
  prompt: string
  provider?: 'openrouter' | 'groq'
  model?: string
  temperature?: number
  responseFormat?: { type: string }
}): Promise<string> {
  const { prompt, provider = 'openrouter', model = 'openai/gpt-4o-mini', temperature = 0.3, responseFormat } = options
  
  let apiUrl: string
  let apiKey: string | undefined
  
  if (provider === 'openrouter') {
    apiUrl = "https://openrouter.ai/api/v1/chat/completions"
    apiKey = process.env.OPENROUTER_API_KEY
  } else if (provider === 'groq') {
    apiUrl = "https://api.groq.com/openai/v1/chat/completions"
    apiKey = process.env.GROQ_API_KEY
  } else {
    throw new Error(`Unsupported provider: ${provider}`)
  }
  
  if (!apiKey) {
    throw new Error(`API key for ${provider} is not configured`)
  }
  
  const requestBody: any = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature,
  }
  
  if (responseFormat) {
    requestBody.response_format = responseFormat
  }
  
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim()
    } else {
      throw new Error('Invalid response format from LLM API')
    }
  } catch (error) {
    consola.error(`LLM API call failed:`, error)
    throw error
  }
} 