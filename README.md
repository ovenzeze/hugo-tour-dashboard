# 火山引擎语音合成API测试Demo

这是一个测试火山引擎语音合成API的示例程序，包含时间戳功能。

## 功能特点

- 调用火山引擎语音合成API生成语音
- 支持时间戳功能，可以获取每个字的发音时间
- 保存生成的音频文件和时间戳信息
- 详细的日志输出，包括请求和响应的详细信息

## 环境要求

- Python 3.6 或更高版本
- 安装依赖：`pip install requests python-dotenv`

## 使用方法

1. 配置.env文件

在项目根目录下创建一个名为`.env`的文件，并添加以下内容：

```
# 必需的环境变量
VOLCENGINE_APPID=你的AppID
VOLCENGINE_ACCESS_TOKEN=你的Access Token
VOLCENGINE_CLUSTER=你的Cluster

# 可选的环境变量
VOLCENGINE_VOICE_TYPE=zh_female_qingxin  # 可选，默认使用"zh_female_qingxin"
```

注意：已经为您创建了包含示例凭证的.env文件，您可以直接使用或根据需要修改。

2. 运行脚本

```bash
python volcengine_tts_demo.py
```

3. 查看结果

脚本会生成两个音频文件：
- `output_with_timestamps.mp3`：带时间戳的音频文件
- `output_without_timestamps.mp3`：不带时间戳的音频文件

同时，如果成功获取到时间戳信息，会生成一个JSON文件：
- `output_with_timestamps.mp3.timestamps.json`：包含时间戳信息的JSON文件

## 时间戳格式说明

时间戳信息通常包含以下内容：
- 每个字的开始时间和结束时间
- 时间单位通常为毫秒

示例：
```json
{
  "timestamps": [
    {
      "text": "这",
      "start_time": 0,
      "end_time": 250
    },
    {
      "text": "是",
      "start_time": 250,
      "end_time": 500
    },
    ...
  ]
}
```

## 注意事项

- 请确保已经在火山引擎平台申请了语音合成服务的访问权限
- 请妥善保管你的API凭证，不要将其提交到代码仓库中
- 时间戳功能可能需要特定的API权限，请确认你的账号是否有权限使用此功能

## 参考文档

- [火山引擎语音合成API文档](https://www.volcengine.com/docs/6561/79820)

# Hugo Tour Dashboard

Hugo智能导览系统的管理后台，提供播客内容管理、AI音频合成和实时预览功能。

## 主要功能

### 🎙️ 播客管理
- 播客创建和编辑
- AI脚本生成和优化  
- 多角色对话配置
- 封面图像生成

### 🎵 音频合成 
- **公共合成进度页面** - 新增功能！无论从播客继续合成还是直接链接访问都可查看进度
- 支持同步/异步音频合成
- 实时进度跟踪和状态更新
- 多种TTS引擎支持（Volcengine）
- 数据库持久化的任务状态管理

### 🔧 系统功能
- Supabase数据库集成
- 文件存储和管理
- 用户认证和权限控制
- 响应式设计

## 新功能：公共合成进度页面

现在用户可以通过以下方式查看合成进度：

### 🚀 从播客卡片启动合成
1. 在播客列表中点击"继续合成"按钮
2. 系统自动创建合成任务并跳转到进度页面
3. 实时显示合成进度和段落详情

### 🔗 直接链接访问
- 通过URL直接访问：`/synthesis-progress/[taskId]`
- 任务ID格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- 支持分享和书签功能

### 📊 进度页面功能
- **实时状态跟踪**：待处理、合成中、已完成、失败
- **详细进度显示**：总体进度条、段落级别进度
- **音频播放**：完成的段落可直接试听
- **自动轮询更新**：每3秒自动刷新进度
- **错误处理**：显示失败原因和重试选项
- **完成操作**：下载播客、查看结果

### 🛠️ 技术实现
- 数据库持久化的任务状态（不依赖内存）
- 适合Vercel无服务器环境
- 支持长时间异步处理
- 实时进度回调更新

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器  
npm run dev

# 构建生产版本
npm run build
```

## 环境配置

请确保在 `.env` 文件中配置以下环境变量：

```env
# Supabase配置
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# TTS服务配置  
NUXT_VOLCENGINE_APP_ID=your_volcengine_app_id
NUXT_VOLCENGINE_CLUSTER=your_volcengine_cluster
NUXT_VOLCENGINE_VOICE_TYPE=en_male_adam_mars_bigtts

# AI服务配置
GEMINI_API_KEY=your_gemini_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
```

## 技术栈

- **前端框架**: Nuxt 3 + Vue 3
- **UI组件**: Shadcn/Vue + Tailwind CSS  
- **数据库**: Supabase PostgreSQL
- **音频合成**: Volcengine TTS
- **部署**: Vercel

## 项目结构

```
├── components/          # Vue组件
│   ├── podcasts/       # 播客相关组件
│   ├── playground/     # 合成工作台组件  
│   └── ui/            # 通用UI组件
├── pages/              # 页面路由
│   ├── podcasts/      # 播客管理页面
│   ├── playground/    # 合成工作台
│   └── synthesis-progress/ # 合成进度页面（新增）
├── server/            # 服务端API
│   ├── api/          # API路由
│   └── services/     # 业务逻辑服务
└── stores/           # Pinia状态管理
```
