# Hugo Tour Dashboard

## 项目概述

Hugo Tour Dashboard 是一个基于 Nuxt 3 的现代化 Web 应用程序，专为创建和管理旅游指南而设计。该项目集成了多种 AI 服务和云存储解决方案，提供完整的内容创建和管理工作流。

## 技术栈

### 前端框架
- **Nuxt 3.17.3** - Vue.js 全栈框架
- **Vue 3.5.14** - 渐进式 JavaScript 框架
- **TypeScript** - 类型安全的 JavaScript 超集

### UI 组件库
- **Tailwind CSS 4.1.7** - 实用优先的 CSS 框架
- **shadcn/ui** - 现代化 UI 组件库
- **Nuxt Icon** - 图标系统

### 数据存储
- **Supabase** - 开源 Firebase 替代方案
  - 实时数据库
  - 身份验证
  - 文件存储
- **Nuxt Content** - 基于文件的内容管理

### AI 服务集成
- **OpenRouter** - AI 模型路由服务
- **Groq** - 高性能 AI 推理
- **ElevenLabs** - 语音合成服务
- **Google Gemini** - 多模态 AI 模型
- **火山引擎 TTS** - 中文语音合成

### 开发工具
- **pnpm** - 快速、节省磁盘空间的包管理器
- **Vite** - 下一代前端构建工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

## 项目结构

```
hugo-tour-dashboard/
├── .openhands/                 # OpenHands 微代理配置
│   └── microagents/           # 微代理定义文件
├── components/                # Vue 组件
├── content/                   # Nuxt Content 内容文件
├── docs/                      # 项目文档
├── pages/                     # 页面路由
├── plugins/                   # Nuxt 插件
├── public/                    # 静态资源
├── server/                    # 服务端 API
├── stores/                    # Pinia 状态管理
├── types/                     # TypeScript 类型定义
├── utils/                     # 工具函数
├── .env                       # 环境变量模板
├── .env.local                 # 本地环境变量（不提交）
├── nuxt.config.ts            # Nuxt 配置文件
├── package.json              # 项目依赖
└── tailwind.config.js        # Tailwind CSS 配置
```

## 快速开始

### 环境要求
- Node.js 18+ 
- pnpm 8+

### 安装依赖
```bash
pnpm install
```

### 环境配置
1. 复制环境变量模板：
```bash
cp .env .env.local
```

2. 在 `.env.local` 中配置必要的 API 密钥：
```bash
# Supabase
SUPABASE_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_KEY="your_supabase_service_key"

# AI 服务
OPENROUTER_API_KEY="your_openrouter_key"
GROQ_API_KEY="your_groq_key"
ELEVENLABS_API_KEY="your_elevenlabs_key"
GEMINI_API_KEY="your_gemini_key"

# 火山引擎 TTS
NUXT_VOLCENGINE_APPID="your_app_id"
NUXT_VOLCENGINE_ACCESS_TOKEN="your_access_token"
NUXT_VOLCENGINE_SECRET_KEY="your_secret_key"
```

### 启动开发服务器
```bash
pnpm dev
```

应用程序将在 http://localhost:3000 启动。

### 构建生产版本
```bash
pnpm build
```

### 预览生产版本
```bash
pnpm preview
```

## 核心功能

### 1. 内容管理
- 基于 Nuxt Content 的文件系统内容管理
- Markdown 支持，包含 MDC 组件
- 实时内容预览和编辑

### 2. AI 集成
- 多 AI 模型支持（OpenRouter、Groq、Gemini）
- 智能内容生成和优化
- 多语言语音合成（ElevenLabs、火山引擎）

### 3. 数据存储
- Supabase 实时数据库
- 文件上传和管理
- 用户身份验证

### 4. 响应式设计
- 移动优先的设计理念
- PWA 支持
- 现代化 UI 组件

## 开发指南

### 代码规范
- 使用 TypeScript 进行类型安全开发
- 遵循 Vue 3 Composition API 最佳实践
- 使用 Pinia 进行状态管理
- 组件采用 `<script setup>` 语法

### 组件开发
```vue
<template>
  <div class="component-wrapper">
    <!-- 组件内容 -->
  </div>
</template>

<script setup lang="ts">
// 组件逻辑
</script>

<style scoped>
/* 组件样式 */
</style>
```

### API 路由
服务端 API 位于 `server/api/` 目录，支持：
- RESTful API 设计
- 中间件支持
- 类型安全的请求/响应

### 状态管理
使用 Pinia 进行状态管理：
```typescript
export const useExampleStore = defineStore('example', () => {
  const state = ref(initialState)
  
  const actions = {
    // 状态操作
  }
  
  return { state, ...actions }
})
```

## 部署

### Vercel 部署
1. 连接 GitHub 仓库到 Vercel
2. 配置环境变量
3. 自动部署

### Docker 部署
```bash
# 构建镜像
docker build -t hugo-tour-dashboard .

# 运行容器
docker run -p 3000:3000 hugo-tour-dashboard
```

## 故障排除

### 常见问题

1. **Supabase 连接错误**
   - 检查 `SUPABASE_URL` 和 `SUPABASE_KEY` 配置
   - 确认 Supabase 项目状态

2. **AI 服务调用失败**
   - 验证 API 密钥有效性
   - 检查服务配额和限制

3. **构建错误**
   - 清除缓存：`pnpm clean`
   - 重新安装依赖：`rm -rf node_modules && pnpm install`

### 调试模式
```bash
# 启用详细日志
DEBUG=nuxt:* pnpm dev

# 分析构建包大小
pnpm build --analyze
```

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 联系方式

- 项目仓库：https://github.com/ovenzeze/hugo-tour-dashboard
- 问题反馈：https://github.com/ovenzeze/hugo-tour-dashboard/issues

---

*最后更新：2025-05-22*