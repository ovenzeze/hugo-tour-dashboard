---
keywords: [环境变量, 配置, setup, env, .env, configuration]
---

# 环境配置指南

## 环境变量设置

本项目使用环境变量来配置各种服务和功能。环境变量分为两类：

1. **公共环境变量**：存储在`.env`文件中，可以提交到版本控制
2. **敏感环境变量**：存储在`.env.local`文件中，不应提交到版本控制

### 创建环境变量文件

1. 复制`.env.example`文件为`.env`
2. 创建一个新的`.env.local`文件用于敏感信息

```bash
cp .env.example .env
touch .env.local
```

### 必需的环境变量

#### 火山引擎语音合成

```
NUXT_VOLCENGINE_APPID=你的AppID
NUXT_VOLCENGINE_ACCESS_TOKEN=你的Access Token
NUXT_VOLCENGINE_SECRET_KEY=你的Secret Key
NUXT_VOLCENGINE_CLUSTER=你的Cluster
VOLCENGINE_VOICE_TYPE=BV001_streaming  # 可选，默认值
```

#### ElevenLabs

```
ELEVENLABS_API_KEY=你的API密钥
ELEVENLABS_DEFAULT_MODEL_ID=eleven_flash_v2_5
```

#### Supabase

```
SUPABASE_URL=https://jazocztbwzavmtyprhye.supabase.co
SUPABASE_KEY=你的Supabase密钥
SUPABASE_SERVICE_KEY=你的Supabase服务密钥
```

#### 其他AI服务

```
OPENROUTER_API_KEY=你的OpenRouter API密钥
GROQ_API_KEY=你的Groq API密钥
```

## 开发环境设置

### Node.js环境

项目使用pnpm作为包管理工具，需要安装Node.js环境：

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### Python环境

对于Python脚本部分，需要Python 3.6或更高版本：

```bash
# 安装依赖
pip install requests python-dotenv

# 运行示例脚本
python volcengine_tts_demo.py
```

## 生产环境部署

项目支持多种部署方式：

### Vercel部署

```bash
pnpm build:vercel
```

### Docker部署

项目包含Dockerfile和docker-compose.yml，可以使用Docker进行部署：

```bash
docker-compose up -d
```

## 常见问题

1. **环境变量未加载**：确保环境变量文件位于项目根目录，并且格式正确
2. **API密钥错误**：检查API密钥是否正确，是否有足够的权限
3. **依赖安装失败**：尝试清除缓存后重新安装 `pnpm store prune && pnpm install`