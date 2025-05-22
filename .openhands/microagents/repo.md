---
agent: CodeActAgent
---

# 火山引擎语音合成API测试Demo

这是一个测试火山引擎语音合成API的项目，包含时间戳功能。该项目使用Nuxt.js框架构建，并集成了多种语音合成服务，包括火山引擎、ElevenLabs、Google等。

## 项目功能

- 调用火山引擎语音合成API生成语音
- 支持时间戳功能，可以获取每个字的发音时间
- 保存生成的音频文件和时间戳信息
- 详细的日志输出，包括请求和响应的详细信息
- 支持多种语音合成服务的集成

## 环境设置

### Python部分
- Python 3.6 或更高版本
- 安装依赖：`pip install requests python-dotenv`

### Nuxt.js部分
- Node.js 环境
- 使用pnpm作为包管理工具

## 环境变量配置

项目需要配置以下环境变量：
- `NUXT_VOLCENGINE_APPID`: 火山引擎AppID
- `NUXT_VOLCENGINE_ACCESS_TOKEN`: 火山引擎Access Token
- `NUXT_VOLCENGINE_SECRET_KEY`: 火山引擎Secret Key
- `NUXT_VOLCENGINE_CLUSTER`: 火山引擎Cluster
- `VOLCENGINE_VOICE_TYPE`: 可选，默认使用"BV001_streaming"

其他服务的环境变量可以在`.env.example`文件中查看。

## 项目命令

- `pnpm build`: 构建项目
- `pnpm dev`: 启动开发服务器（端口4000）
- `pnpm generate`: 生成静态网站
- `pnpm preview`: 预览构建后的项目
- `pnpm lint`: 运行类型检查

## Python脚本使用

可以直接运行Python脚本来测试火山引擎语音合成API：

```bash
python volcengine_tts_demo.py
```

脚本支持以下命令行参数：
- `--text`: 要合成的文本
- `--voice`: 选择音色（female或male）
- `--output`: 输出的音频文件名
- `--no-timestamps`: 禁用时间戳功能

## 注意事项

- 请确保已经在火山引擎平台申请了语音合成服务的访问权限
- 敏感信息和本地特定配置请移至`.env.local`（此文件不应提交到版本控制）
- 时间戳功能可能需要特定的API权限，请确认账号是否有权限使用此功能