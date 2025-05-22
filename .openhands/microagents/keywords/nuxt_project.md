---
keywords: [nuxt, vue, frontend, dashboard, 前端, 仪表盘]
---

# Nuxt.js 项目结构与开发指南

## 项目概述

本项目使用Nuxt.js 3框架构建，是一个现代化的前端应用，集成了多种语音合成服务，包括火山引擎、ElevenLabs、Google等。项目采用了以下技术栈：

- Nuxt.js 3: Vue.js的全栈框架
- Tailwind CSS: 用于样式设计
- Pinia: 状态管理
- Supabase: 后端服务和存储
- TypeScript: 类型安全

## 项目结构

主要目录和文件：

- `components/`: Vue组件
- `composables/`: 可复用的组合式函数
- `pages/`: 应用的页面
- `stores/`: Pinia状态管理
- `public/`: 静态资源
- `server/`: 服务器端API
- `types/`: TypeScript类型定义
- `nuxt.config.ts`: Nuxt配置文件
- `app.vue`: 应用入口组件

## 开发指南

### 启动开发服务器

```bash
pnpm dev
```

这将在端口4000上启动开发服务器。

### 构建项目

```bash
pnpm build
```

用于生产环境的构建。

### 类型检查

```bash
pnpm lint
```

运行TypeScript类型检查。

### 生成Supabase类型

```bash
pnpm types:gen
```

从Supabase生成TypeScript类型定义。

## 环境变量

项目使用`.env`和`.env.local`文件管理环境变量。敏感信息应放在`.env.local`中，不要提交到版本控制系统。

主要环境变量包括：

- 各种API密钥（ElevenLabs、OpenRouter、Groq等）
- Supabase配置
- 存储提供商配置
- 语音合成服务配置

## 集成的服务

项目集成了多种语音合成服务：

1. 火山引擎语音合成
2. ElevenLabs
3. Google Gemini
4. 其他AI服务

## 最佳实践

1. 遵循Vue.js和Nuxt.js的最佳实践
2. 使用TypeScript进行类型安全开发
3. 使用Pinia进行状态管理
4. 敏感信息放在`.env.local`中，不要提交到版本控制
5. 使用组合式API和组合式函数进行逻辑复用