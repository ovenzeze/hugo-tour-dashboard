#!/usr/bin/env node

/**
 * Hugo Tour Dashboard Health Check Script
 * 验证应用程序的各个组件是否正常工作
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync, existsSync } from 'fs'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 颜色输出
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`
}

function warning() {
  return `${colors.yellow}⚠${colors.reset}`
}

// 检查项目结构
function checkProjectStructure() {
  log('\n📁 检查项目结构...', 'blue')
  
  const requiredDirs = [
    'components',
    'pages',
    'stores',
    'server',
    'public',
    'docs',
    '.openhands/microagents'
  ]
  
  const requiredFiles = [
    'package.json',
    'nuxt.config.ts',
    '.env',
    '.env.local'
  ]
  
  const optionalFiles = [
    'tailwind.config.js', // Optional for Tailwind v4
    'assets/css/tailwind.css'
  ]
  
  let allGood = true
  
  // 检查目录
  requiredDirs.forEach(dir => {
    const path = join(process.cwd(), dir)
    if (existsSync(path)) {
      log(`  ${checkmark()} ${dir}/`)
    } else {
      log(`  ${crossmark()} ${dir}/ (缺失)`)
      allGood = false
    }
  })
  
  
  
  return allGood
}

// 检查环境变量
function checkEnvironmentVariables() {
  log('\n🔧 检查环境变量...', 'blue')
  
  const envPath = join(process.cwd(), '.env.local')
  if (!existsSync(envPath)) {
    log(`  ${crossmark()} .env.local 文件不存在`)
    return false
  }
  
  const envContent = readFileSync(envPath, 'utf-8')
  
  const requiredVars = [
    'SUPABASE_KEY',
    'SUPABASE_SERVICE_KEY'
  ]
  
  const optionalVars = [
    'OPENROUTER_API_KEY',
    'GROQ_API_KEY',
    'ELEVENLABS_API_KEY',
    'GEMINI_API_KEY',
    'NUXT_VOLCENGINE_APPID'
  ]
  
  let allRequired = true
  let hasOptional = false
  
  // 检查必需变量
  requiredVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`)) {
      log(`  ${checkmark()} ${varName}`)
    } else {
      log(`  ${crossmark()} ${varName} (必需)`)
      allRequired = false
    }
  })
  
  // 检查可选变量
  optionalVars.forEach(varName => {
    if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`)) {
      log(`  ${checkmark()} ${varName} (可选)`)
      hasOptional = true
    } else {
      log(`  ${warning()} ${varName} (可选，未配置)`)
    }
  })
  
  if (!hasOptional) {
    log(`  ${warning()} 建议配置至少一个 AI 服务 API 密钥`)
  }
  
  return allRequired
}

// 检查依赖
function checkDependencies() {
  log('\n📦 检查依赖...', 'blue')
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
    const nodeModulesExists = existsSync('node_modules')
    
    if (nodeModulesExists) {
      log(`  ${checkmark()} node_modules 存在`)
    } else {
      log(`  ${crossmark()} node_modules 不存在，请运行 pnpm install`)
      return false
    }
    
    // 检查关键依赖
    const keyDeps = ['nuxt', 'vue', '@supabase/supabase-js', 'tailwindcss']
    const lockFileExists = existsSync('pnpm-lock.yaml')
    
    if (lockFileExists) {
      log(`  ${checkmark()} pnpm-lock.yaml 存在`)
    } else {
      log(`  ${warning()} pnpm-lock.yaml 不存在`)
    }
    
    keyDeps.forEach(dep => {
      if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
        log(`  ${checkmark()} ${dep}`)
      } else {
        log(`  ${crossmark()} ${dep} (缺失)`)
      }
    })
    
    return true
  } catch (error) {
    log(`  ${crossmark()} 无法读取 package.json: ${error.message}`)
    return false
  }
}

// 检查微代理配置
function checkMicroagents() {
  log('\n🤖 检查微代理配置...', 'blue')
  
  const microagentsDir = '.openhands/microagents'
  const requiredFiles = [
    'repo.md',
    'keywords/nuxt_project.md',
    'keywords/volcengine_tts.md',
    'keywords/environment_setup.md'
  ]
  
  let allGood = true
  
  requiredFiles.forEach(file => {
    const path = join(process.cwd(), microagentsDir, file)
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      if (content.length > 100) {
        log(`  ${checkmark()} ${file}`)
      } else {
        log(`  ${warning()} ${file} (内容过少)`)
      }
    } else {
      log(`  ${crossmark()} ${file} (缺失)`)
      allGood = false
    }
  })
  
  return allGood
}

// 检查文档
function checkDocumentation() {
  log('\n📚 检查文档...', 'blue')
  
  const docFiles = [
    'docs/README.md',
    'docs/API.md',
    'docs/DEPLOYMENT.md',
    'docs/MICROAGENTS.md'
  ]
  
  let allGood = true
  
  docFiles.forEach(file => {
    const path = join(process.cwd(), file)
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8')
      if (content.length > 500) {
        log(`  ${checkmark()} ${file}`)
      } else {
        log(`  ${warning()} ${file} (内容过少)`)
      }
    } else {
      log(`  ${crossmark()} ${file} (缺失)`)
      allGood = false
    }
  })
  
  return allGood
}

// 主函数
async function main() {
  log('🚀 Hugo Tour Dashboard 健康检查', 'green')
  log('=' .repeat(50))
  
  const checks = [
    { name: '项目结构', fn: checkProjectStructure },
    { name: '环境变量', fn: checkEnvironmentVariables },
    { name: '依赖包', fn: checkDependencies },
    { name: '微代理配置', fn: checkMicroagents },
    { name: '项目文档', fn: checkDocumentation }
  ]
  
  const results = []
  
  for (const check of checks) {
    try {
      const result = check.fn()
      results.push({ name: check.name, success: result })
    } catch (error) {
      log(`\n${crossmark()} ${check.name} 检查失败: ${error.message}`, 'red')
      results.push({ name: check.name, success: false })
    }
  }
  
  // 总结
  log('\n📊 检查总结', 'blue')
  log('=' .repeat(30))
  
  const passed = results.filter(r => r.success).length
  const total = results.length
  
  results.forEach(result => {
    const icon = result.success ? checkmark() : crossmark()
    log(`  ${icon} ${result.name}`)
  })
  
  log(`\n总计: ${passed}/${total} 项检查通过`)
  
  if (passed === total) {
    log('\n🎉 所有检查都通过了！项目配置正确。', 'green')
    process.exit(0)
  } else {
    log('\n⚠️  部分检查未通过，请查看上述详情。', 'yellow')
    process.exit(1)
  }
}

// 运行检查
main().catch(error => {
  log(`\n💥 健康检查失败: ${error.message}`, 'red')
  process.exit(1)
})