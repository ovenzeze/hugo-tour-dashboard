# API 文档

## 概述

Hugo Tour Dashboard 提供了一套完整的 RESTful API，用于管理旅游指南内容、AI 服务集成和用户数据。所有 API 端点都位于 `/api/` 路径下。

## 认证

### Supabase 认证
大部分 API 端点需要 Supabase 认证。在请求头中包含认证令牌：

```http
Authorization: Bearer <supabase_access_token>
```

### API 密钥认证
某些 AI 服务端点使用服务端 API 密钥，无需客户端认证。

## 核心 API 端点

### 内容管理

#### 获取内容列表
```http
GET /api/content
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "guide-1",
      "title": "巴黎旅游指南",
      "slug": "paris-guide",
      "description": "探索浪漫之都的完整指南",
      "created_at": "2025-05-22T10:00:00Z",
      "updated_at": "2025-05-22T12:00:00Z"
    }
  ]
}
```

#### 获取单个内容
```http
GET /api/content/:id
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "guide-1",
    "title": "巴黎旅游指南",
    "content": "# 巴黎旅游指南\n\n巴黎是...",
    "metadata": {
      "tags": ["欧洲", "文化", "美食"],
      "duration": "3-5天",
      "difficulty": "简单"
    }
  }
}
```

#### 创建内容
```http
POST /api/content
Content-Type: application/json

{
  "title": "新旅游指南",
  "content": "指南内容...",
  "metadata": {
    "tags": ["标签1", "标签2"]
  }
}
```

#### 更新内容
```http
PUT /api/content/:id
Content-Type: application/json

{
  "title": "更新的标题",
  "content": "更新的内容..."
}
```

#### 删除内容
```http
DELETE /api/content/:id
```

### AI 服务集成

#### 文本生成 (OpenRouter)
```http
POST /api/ai/generate-text
Content-Type: application/json

{
  "prompt": "为巴黎旅游写一个简介",
  "model": "openai/gpt-4",
  "max_tokens": 500,
  "temperature": 0.7
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "text": "巴黎，被誉为光之城...",
    "model": "openai/gpt-4",
    "usage": {
      "prompt_tokens": 15,
      "completion_tokens": 120,
      "total_tokens": 135
    }
  }
}
```

#### 语音合成 (ElevenLabs)
```http
POST /api/ai/text-to-speech
Content-Type: application/json

{
  "text": "欢迎来到巴黎旅游指南",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "model_id": "eleven_flash_v2_5",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.8
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "audio_url": "https://storage.supabase.co/...",
    "duration": 3.2,
    "file_size": 51200
  }
}
```

#### 火山引擎 TTS
```http
POST /api/ai/volcengine-tts
Content-Type: application/json

{
  "text": "欢迎来到巴黎旅游指南",
  "voice_type": "zh_female_qingxin",
  "speed": 1.0,
  "volume": 1.0
}
```

#### 图像生成 (Gemini)
```http
POST /api/ai/generate-image
Content-Type: application/json

{
  "prompt": "巴黎埃菲尔铁塔日落景色",
  "model": "gemini-2.0-flash-preview-image-generation",
  "aspect_ratio": "16:9"
}
```

### 文件管理

#### 上传文件
```http
POST /api/upload
Content-Type: multipart/form-data

file: <文件数据>
bucket: guide-voices
folder: audio
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "url": "https://storage.supabase.co/...",
    "path": "audio/filename.mp3",
    "size": 1024000,
    "type": "audio/mpeg"
  }
}
```

#### 获取文件列表
```http
GET /api/files?bucket=guide-voices&folder=audio
```

#### 删除文件
```http
DELETE /api/files/:path
```

### 用户管理

#### 获取用户信息
```http
GET /api/user/profile
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "user-123",
    "email": "user@example.com",
    "name": "用户名",
    "avatar_url": "https://...",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### 更新用户信息
```http
PUT /api/user/profile
Content-Type: application/json

{
  "name": "新用户名",
  "avatar_url": "https://..."
}
```

### 设置管理

#### 获取应用设置
```http
GET /api/settings
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "ai_models": {
      "default_text_model": "openai/gpt-4",
      "default_voice_model": "eleven_flash_v2_5"
    },
    "storage": {
      "provider": "supabase",
      "bucket": "guide-voices"
    }
  }
}
```

#### 更新设置
```http
PUT /api/settings
Content-Type: application/json

{
  "ai_models": {
    "default_text_model": "anthropic/claude-3"
  }
}
```

## 错误处理

### 标准错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数无效",
    "details": {
      "field": "title",
      "issue": "标题不能为空"
    }
  }
}
```

### 常见错误代码

| 错误代码 | HTTP 状态码 | 描述 |
|---------|------------|------|
| `VALIDATION_ERROR` | 400 | 请求参数验证失败 |
| `UNAUTHORIZED` | 401 | 未授权访问 |
| `FORBIDDEN` | 403 | 权限不足 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `RATE_LIMIT_EXCEEDED` | 429 | 请求频率超限 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 外部服务不可用 |

## 速率限制

### 默认限制
- 认证用户：每分钟 100 请求
- 未认证用户：每分钟 20 请求
- AI 服务：每分钟 10 请求

### 限制头部
响应中包含速率限制信息：
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket API

### 实时内容更新
```javascript
const ws = new WebSocket('ws://localhost:3000/api/ws/content')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('内容更新:', data)
}
```

### 事件类型
- `content:created` - 新内容创建
- `content:updated` - 内容更新
- `content:deleted` - 内容删除
- `user:online` - 用户上线
- `user:offline` - 用户下线

## SDK 和客户端库

### JavaScript/TypeScript
```typescript
import { HugoTourClient } from '@hugo-tour/client'

const client = new HugoTourClient({
  baseURL: 'https://your-domain.com/api',
  apiKey: 'your-api-key'
})

// 获取内容
const content = await client.content.get('guide-1')

// 生成语音
const audio = await client.ai.textToSpeech({
  text: '欢迎来到巴黎',
  voice: 'zh_female_qingxin'
})
```

### Python
```python
from hugo_tour import Client

client = Client(
    base_url='https://your-domain.com/api',
    api_key='your-api-key'
)

# 获取内容
content = client.content.get('guide-1')

# 生成文本
text = client.ai.generate_text(
    prompt='为巴黎旅游写一个简介',
    model='openai/gpt-4'
)
```

## 测试

### API 测试集合
项目包含完整的 Postman/Insomnia 测试集合：
- `tests/api/postman-collection.json`
- `tests/api/insomnia-collection.json`

### 测试环境
- 开发环境：`http://localhost:3000/api`
- 测试环境：`https://test.your-domain.com/api`
- 生产环境：`https://your-domain.com/api`

## 版本控制

### API 版本
当前 API 版本：`v1`

### 版本化端点
```http
GET /api/v1/content
GET /api/v2/content  # 未来版本
```

### 向后兼容性
- 主版本更新可能包含破坏性变更
- 次版本更新保持向后兼容
- 修订版本仅包含错误修复

---

*API 文档版本：1.0.0*  
*最后更新：2025-05-22*