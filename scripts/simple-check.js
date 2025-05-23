#!/usr/bin/env node

/**
 * 简化的健康检查脚本
 */

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

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

async function main() {
  log('🚀 Hugo Tour Dashboard 快速检查', 'green')
  log('=' .repeat(40))
  
  let allGood = true
  
  // 检查关键文件
  const files = [
    'package.json',
    'nuxt.config.ts',
    '.env.local',
    'assets/css/tailwind.css'
  ]
  
  log('\n📁 检查关键文件...', 'blue')
  files.forEach(file => {
    if (existsSync(file)) {
      log(`  ${checkmark()} ${file}`)
    } else {
      log(`  ${crossmark()} ${file}`)
      allGood = false
    }
  })
  
  // 检查环境变量
  log('\n🔧 检查环境变量...', 'blue')
  if (existsSync('.env.local')) {
    const envContent = readFileSync('.env.local', 'utf-8')
    const requiredVars = ['SUPABASE_KEY', 'SUPABASE_SERVICE_KEY']
    
    requiredVars.forEach(varName => {
      if (envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=""`)) {
        log(`  ${checkmark()} ${varName}`)
      } else {
        log(`  ${crossmark()} ${varName}`)
        allGood = false
      }
    })
  } else {
    log(`  ${crossmark()} .env.local 文件不存在`)
    allGood = false
  }
  
  // 检查依赖
  log('\n📦 检查依赖...', 'blue')
  if (existsSync('node_modules')) {
    log(`  ${checkmark()} node_modules`)
  } else {
    log(`  ${crossmark()} node_modules (运行 pnpm install)`)
    allGood = false
  }
  
  // 检查微代理
  log('\n🤖 检查微代理...', 'blue')
  const microagentFiles = [
    '.openhands/microagents/repo.md',
    '.openhands/microagents/keywords/nuxt_project.md'
  ]
  
  microagentFiles.forEach(file => {
    if (existsSync(file)) {
      log(`  ${checkmark()} ${file}`)
    } else {
      log(`  ${crossmark()} ${file}`)
      allGood = false
    }
  })
  
  // 检查文档
  log('\n📚 检查文档...', 'blue')
  const docFiles = ['docs/README.md', 'docs/API.md', 'docs/DEPLOYMENT.md']
  
  docFiles.forEach(file => {
    if (existsSync(file)) {
      log(`  ${checkmark()} ${file}`)
    } else {
      log(`  ${crossmark()} ${file}`)
      allGood = false
    }
  })
  
  // 总结
  log('\n📊 检查结果', 'blue')
  if (allGood) {
    log('🎉 所有检查都通过了！', 'green')
    process.exit(0)
  } else {
    log('⚠️  部分检查未通过，请查看上述详情。', 'yellow')
    process.exit(1)
  }
}

main().catch(error => {
  log(`💥 检查失败: ${error.message}`, 'red')
  process.exit(1)
})