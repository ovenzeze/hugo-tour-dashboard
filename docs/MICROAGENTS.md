# 微代理配置文档

## 概述

本项目使用 OpenHands 微代理系统来提供智能化的开发辅助。微代理配置位于 `.openhands/microagents/` 目录中，包含项目特定的知识和最佳实践。

## 微代理结构

```
.openhands/
└── microagents/
    ├── repo.md                    # 项目总体配置
    └── keywords/
        ├── nuxt_project.md        # Nuxt 项目开发指南
        ├── volcengine_tts.md      # 火山引擎 TTS 集成
        └── environment_setup.md   # 环境配置指南
```

## 配置文件详解

### 1. repo.md - 项目总体配置

这是主要的微代理配置文件，包含：

- **项目概述**：Hugo Tour Dashboard 的核心功能和目标
- **技术栈**：使用的主要技术和框架
- **开发规范**：代码风格和最佳实践
- **部署指南**：生产环境部署流程

**关键配置点：**
```markdown
# 项目类型
Type: Nuxt 3 Web Application

# 主要技术栈
- Frontend: Nuxt 3 + Vue 3 + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- Backend: Supabase + Nitro
- AI Services: OpenRouter, Groq, ElevenLabs, Gemini

# 开发环境
- Node.js 18+
- pnpm 8+
- TypeScript 5+
```

### 2. nuxt_project.md - Nuxt 项目开发指南

专门针对 Nuxt 3 项目的开发指南：

- **项目结构**：标准 Nuxt 3 目录结构
- **组件开发**：Vue 3 Composition API 最佳实践
- **路由配置**：文件系统路由和动态路由
- **状态管理**：Pinia 使用指南
- **API 开发**：Nitro 服务端 API

**核心规范：**
```typescript
// 组件开发规范
<script setup lang="ts">
// 使用 Composition API
// 类型安全的 props 定义
// 响应式数据管理
</script>

// 状态管理规范
export const useExampleStore = defineStore('example', () => {
  // 使用 setup 语法
  // 明确的类型定义
  // 清晰的状态结构
})
```

### 3. volcengine_tts.md - 火山引擎 TTS 集成

火山引擎语音合成服务的集成指南：

- **API 配置**：认证和端点设置
- **语音参数**：声音类型、语速、音量配置
- **错误处理**：常见错误和解决方案
- **最佳实践**：性能优化和缓存策略

**配置示例：**
```typescript
// 火山引擎 TTS 配置
export const volcengineConfig = {
  appId: process.env.NUXT_VOLCENGINE_APPID,
  accessToken: process.env.NUXT_VOLCENGINE_ACCESS_TOKEN,
  cluster: 'volcano_tts',
  voiceType: 'zh_female_qingxin'
}
```

### 4. environment_setup.md - 环境配置指南

开发环境设置和配置管理：

- **依赖安装**：Node.js、pnpm 安装指南
- **环境变量**：必需和可选的环境变量
- **开发工具**：推荐的 IDE 和扩展
- **调试配置**：开发和生产环境调试

**环境变量分类：**
```bash
# 必需变量
SUPABASE_URL=
SUPABASE_KEY=

# AI 服务（可选）
OPENROUTER_API_KEY=
GROQ_API_KEY=
ELEVENLABS_API_KEY=

# 火山引擎（可选）
NUXT_VOLCENGINE_APPID=
NUXT_VOLCENGINE_ACCESS_TOKEN=
```

## 微代理使用指南

### 1. 激活微代理

微代理在以下情况下自动激活：
- 项目根目录存在 `.openhands/microagents/` 目录
- 配置文件格式正确
- 关键词匹配触发

### 2. 关键词触发

每个微代理配置包含关键词，当用户输入包含这些关键词时会触发相应的微代理：

- `nuxt`, `vue`, `component` → nuxt_project.md
- `tts`, `volcengine`, `speech` → volcengine_tts.md
- `environment`, `setup`, `install` → environment_setup.md

### 3. 上下文感知

微代理会根据当前操作上下文提供相关建议：
- 文件编辑时提供代码规范
- 错误调试时提供解决方案
- 部署时提供配置指南

## 自定义微代理

### 1. 创建新的微代理

```bash
# 创建新的关键词微代理
touch .openhands/microagents/keywords/new_feature.md
```

### 2. 微代理模板

```markdown
# 新功能微代理

## 触发关键词
- new_feature
- custom_component
- special_integration

## 功能描述
描述这个微代理的用途和适用场景

## 配置指南
详细的配置步骤和代码示例

## 最佳实践
开发建议和注意事项

## 故障排除
常见问题和解决方案
```

### 3. 更新现有微代理

定期更新微代理配置以反映项目变化：
- 新增的依赖和工具
- 更新的最佳实践
- 新的错误处理方案

## 微代理最佳实践

### 1. 内容组织

- **模块化**：每个微代理专注特定领域
- **层次化**：从通用到具体的知识结构
- **实用性**：包含可执行的代码示例

### 2. 维护策略

- **版本控制**：微代理配置纳入版本控制
- **定期更新**：随项目发展更新配置
- **团队协作**：团队成员共同维护

### 3. 质量保证

- **准确性**：确保配置信息准确无误
- **完整性**：覆盖关键的开发场景
- **可读性**：清晰的文档结构和示例

## 故障排除

### 1. 微代理未激活

**可能原因：**
- 配置文件路径错误
- 文件格式不正确
- 关键词不匹配

**解决方案：**
```bash
# 检查文件结构
ls -la .openhands/microagents/

# 验证文件格式
cat .openhands/microagents/repo.md
```

### 2. 配置不生效

**可能原因：**
- 环境变量未设置
- 配置语法错误
- 缓存问题

**解决方案：**
```bash
# 重新加载配置
rm -rf .nuxt
pnpm dev
```

### 3. 性能问题

**优化建议：**
- 精简微代理内容
- 优化关键词匹配
- 定期清理无用配置

## 集成示例

### 1. 开发工作流集成

```bash
# 开发新功能时
# 1. 微代理提供代码模板
# 2. 自动应用最佳实践
# 3. 实时错误检查和建议
```

### 2. CI/CD 集成

```yaml
# .github/workflows/microagents.yml
name: Microagents Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Validate microagents config
        run: |
          # 验证微代理配置格式
          # 检查配置完整性
```

## 未来规划

### 1. 功能扩展

- **智能代码生成**：基于微代理配置自动生成代码
- **自动化测试**：集成测试用例生成
- **性能监控**：开发过程性能建议

### 2. 工具集成

- **IDE 插件**：VS Code 扩展支持
- **CLI 工具**：命令行微代理管理
- **Web 界面**：可视化配置管理

---

*微代理配置文档版本：1.0.0*  
*最后更新：2025-05-22*