#!/usr/bin/env node

/**
 * Persona Data Restoration Script
 * 
 * This script helps restore and populate persona data that may have been lost during database operations.
 * It includes a comprehensive set of personas for both Chinese and English languages.
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Comprehensive personas data
const personasData = [
  // Chinese Host Personas
  {
    name: '主持人',
    description: '专业播客主持人，声音温和友善，善于引导对话',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_female_shuangkuai_moon_bigtts',
    voice_description: '温和女声，吐字清晰',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 10
  },
  {
    name: '文化主播',
    description: '专注文化艺术节目的资深主持人，知识渊博',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_male_jingqiang_moon_bigtts',
    voice_description: '沉稳男声，富有磁性',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 20
  },
  {
    name: '科技主持',
    description: '专业科技节目主持人，擅长讲解复杂技术概念',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_female_tianmei_moon_bigtts',
    voice_description: '清晰女声，专业感强',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 30
  },

  // English Host Personas
  {
    name: 'Smith',
    description: 'Professional English podcast host with clear articulation and engaging presence',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_male_adam_streaming',
    voice_description: 'Clear male voice with professional tone',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 10
  },
  {
    name: 'Sarah Johnson',
    description: 'Experienced broadcast journalist and podcast host, specializing in interviews',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_female_bella_streaming',
    voice_description: 'Warm female voice, excellent for interviews',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 20
  },
  {
    name: 'David Chen',
    description: 'Technology podcast host with expertise in AI and emerging technologies',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_male_charlie_streaming',
    voice_description: 'Confident male voice, tech-savvy',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: false,
    recommended_priority: 30
  },

  // Chinese Guest Personas
  {
    name: '艺境述说者',
    description: '艺术领域专家，适合文化类节目嘉宾',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_female_shuangkuai_moon_bigtts',
    voice_description: '优雅女声，富有艺术气质',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 20
  },
  {
    name: '文博学者',
    description: '博物馆学者，知识渊博，擅长文物历史讲解',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_male_jingqiang_moon_bigtts',
    voice_description: '学者风范，声音沉稳',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 30
  },
  {
    name: '科技评论家',
    description: '资深科技评论员，对前沿技术有深刻见解',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_male_chunhou_moon_bigtts',
    voice_description: '理性男声，逻辑清晰',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 40
  },
  {
    name: '教育专家',
    description: '教育行业专家，擅长教育理念和方法的分享',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_female_tianmei_moon_bigtts',
    voice_description: '温和女声，亲和力强',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 50
  },

  // English Guest Personas
  {
    name: 'Guest',
    description: 'Professional English podcast guest with versatile expertise',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_female_bella_streaming',
    voice_description: 'Engaging female voice, great for discussions',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 20
  },
  {
    name: 'Dr. Michael Roberts',
    description: 'Research scientist and academic, expert in artificial intelligence',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_male_charlie_streaming',
    voice_description: 'Authoritative male voice, academic tone',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 30
  },
  {
    name: 'Emily Zhang',
    description: 'Tech entrepreneur and startup founder, business and innovation expert',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_female_sara_streaming',
    voice_description: 'Dynamic female voice, entrepreneurial spirit',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 40
  },
  {
    name: 'Professor Williams',
    description: 'University professor specializing in history and cultural studies',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_male_adam_streaming',
    voice_description: 'Scholarly male voice, thoughtful delivery',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: false,
    is_recommended_guest: true,
    recommended_priority: 50
  },

  // Specialized Personas
  {
    name: '新闻播报员',
    description: '专业新闻播报员，适合新闻类播客',
    tts_provider: 'volcengine',
    voice_model_identifier: 'zh_female_shuangkuai_moon_bigtts',
    voice_description: '标准普通话，播音腔调',
    language_support: ['zh-CN', 'zh'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: true,
    recommended_priority: 60
  },
  {
    name: 'News Anchor',
    description: 'Professional news broadcaster for current affairs podcasts',
    tts_provider: 'volcengine',
    voice_model_identifier: 'en_female_bella_streaming',
    voice_description: 'Professional broadcast voice',
    language_support: ['en', 'en-US'],
    status: 'active',
    is_recommended_host: true,
    is_recommended_guest: true,
    recommended_priority: 60
  }
]

async function insertPersonas() {
  console.log('🚀 Starting persona data restoration...')
  
  try {
    // Check current personas count
    const { count: currentCount, error: countError } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
    
    if (countError) {
      console.error('❌ Error checking current personas:', countError)
      return
    }
    
    console.log(`📊 Current personas count: ${currentCount}`)
    
    let insertCount = 0
    let updateCount = 0
    
    for (const personaData of personasData) {
      // Check if persona already exists
      const { data: existing, error: checkError } = await supabase
        .from('personas')
        .select('persona_id')
        .eq('name', personaData.name)
        .single()
      
      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking persona ${personaData.name}:`, checkError)
        continue
      }
      
      if (existing) {
        // Update existing persona
        const { error: updateError } = await supabase
          .from('personas')
          .update(personaData)
          .eq('persona_id', existing.persona_id)
        
        if (updateError) {
          console.error(`❌ Error updating persona ${personaData.name}:`, updateError)
        } else {
          console.log(`✅ Updated persona: ${personaData.name}`)
          updateCount++
        }
      } else {
        // Insert new persona
        const { error: insertError } = await supabase
          .from('personas')
          .insert([personaData])
        
        if (insertError) {
          console.error(`❌ Error inserting persona ${personaData.name}:`, insertError)
        } else {
          console.log(`✅ Inserted persona: ${personaData.name}`)
          insertCount++
        }
      }
    }
    
    console.log('\n🎉 Persona restoration completed!')
    console.log(`📈 Statistics:`)
    console.log(`   - New personas inserted: ${insertCount}`)
    console.log(`   - Existing personas updated: ${updateCount}`)
    console.log(`   - Total personas processed: ${insertCount + updateCount}`)
    
    // Final count check
    const { count: finalCount, error: finalCountError } = await supabase
      .from('personas')
      .select('*', { count: 'exact', head: true })
    
    if (!finalCountError) {
      console.log(`   - Final personas count: ${finalCount}`)
    }
    
  } catch (error) {
    console.error('❌ Fatal error during restoration:', error)
  }
}

// Run the restoration
insertPersonas().then(() => {
  console.log('\n✨ Script execution completed!')
  process.exit(0)
}).catch((error) => {
  console.error('❌ Script failed:', error)
  process.exit(1)
}) 