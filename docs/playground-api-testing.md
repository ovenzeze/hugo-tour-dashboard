# Playground API 测试指南

本文档提供了使用 curl 命令测试 Playground 重构后 API 的完整流程。这些测试可以确保 API 在重构后继续正常工作。

## 测试环境设置

在开始测试之前，请确保：

1. 开发服务器已运行（执行 `npm run dev`）
2. 已设置所有必要的环境变量（参考 `.env.example`）
3. 测试数据库可用且已配置
4. 对于语音合成，确保 ElevenLabs 和 Volcengine API 密钥已配置

### 环境变量导出

为简化测试，您可以设置以下环境变量：

```bash
# 设置API基础URL
export API_BASE="http://localhost:3000"

# 设置测试的身份验证Token（如果需要）
export AUTH_TOKEN="your-auth-token"
```

## API 测试流程

下面我们将按照用户流程的顺序测试各个 API 端点。

### 1. 获取可用角色（Personas）

首先，我们需要获取可用的角色列表，用于后续的脚本生成和语音合成。

```bash
curl -X GET "$API_BASE/api/personas?active=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN"
```

**预期响应**：HTTP 200，包含角色列表

```json
[
  {
    "persona_id": 1,
    "name": "Elliot",
    "avatar_url": "https://example.com/avatar/elliot.png",
    "voice_model_identifier": "voice_model_123",
    "description": "Tech expert"
  },
  {
    "persona_id": 2,
    "name": "Sarah",
    "avatar_url": "https://example.com/avatar/sarah.png",
    "voice_model_identifier": "voice_model_456",
    "description": "Science enthusiast"
  }
]
```

### 2. 处理播客脚本

使用获取的角色信息，创建并处理播客脚本。注意，我们现在直接使用 Persona ID 而不是 VoiceMapping。

```bash
curl -X POST "$API_BASE/api/podcast/process/script" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastTitle": "AI的未来发展",
    "language": "zh-CN",
    "topic": "探讨人工智能的未来发展方向和可能的应用场景",
    "hostPersonaId": 1,
    "guestPersonaIds": [2],
    "script": [
      {
        "speaker": "Elliot",
        "speakerPersonaId": 1,
        "text": "大家好，欢迎收听今天的播客。我是Elliot，今天我们将讨论AI的未来发展。"
      },
      {
        "speaker": "Sarah",
        "speakerPersonaId": 2,
        "text": "你好Elliot，我是Sarah。我认为AI在未来几年将有巨大的突破。"
      },
      {
        "speaker": "Elliot",
        "speakerPersonaId": 1,
        "text": "没错，尤其是在自然语言处理和计算机视觉领域。"
      }
    ],
    "ttsProvider": "elevenlabs",
    "synthesisParams": {
      "temperature": 0.7,
      "speed": 1.0
    },
    "keywords": ["AI", "机器学习", "未来技术"]
  }'
```

**预期响应**：HTTP 200，包含处理后的脚本信息

```json
{
  "success": true,
  "podcastId": "ai_future_development_123",
  "preparedSegments": [
    {
      "segmentIndex": 0,
      "text": "大家好，欢迎收听今天的播客。我是Elliot，今天我们将讨论AI的未来发展。",
      "speakerPersonaId": 1,
      "speakerName": "Elliot"
    },
    {
      "segmentIndex": 1,
      "text": "你好Elliot，我是Sarah。我认为AI在未来几年将有巨大的突破。",
      "speakerPersonaId": 2,
      "speakerName": "Sarah"
    },
    {
      "segmentIndex": 2,
      "text": "没错，尤其是在自然语言处理和计算机视觉领域。",
      "speakerPersonaId": 1,
      "speakerName": "Elliot"
    }
  ],
  "message": "Script processed successfully for podcast \"AI的未来发展\"."
}
```

### 3. 合成语音

使用处理后的脚本信息，合成语音片段。

```bash
curl -X POST "$API_BASE/api/podcast/process/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "ai_future_development_123",
    "segments": [
      {
        "segmentIndex": 0,
        "text": "大家好，欢迎收听今天的播客。我是Elliot，今天我们将讨论AI的未来发展。",
        "speakerPersonaId": 1,
        "speakerName": "Elliot"
      },
      {
        "segmentIndex": 1,
        "text": "你好Elliot，我是Sarah。我认为AI在未来几年将有巨大的突破。",
        "speakerPersonaId": 2,
        "speakerName": "Sarah"
      },
      {
        "segmentIndex": 2,
        "text": "没错，尤其是在自然语言处理和计算机视觉领域。",
        "speakerPersonaId": 1,
        "speakerName": "Elliot"
      }
    ],
    "ttsProvider": "elevenlabs",
    "synthesisParams": {
      "temperature": 0.7,
      "speed": 1.0
    }
  }'
```

**预期响应**：HTTP 200，包含合成结果

```json
{
  "success": true,
  "message": "Audio segments synthesized successfully",
  "segmentResults": [
    {
      "segmentIndex": 0,
      "audioUrl": "/podcasts/ai_future_development_123/segments/segment_0.mp3",
      "duration": 8.5
    },
    {
      "segmentIndex": 1,
      "audioUrl": "/podcasts/ai_future_development_123/segments/segment_1.mp3",
      "duration": 7.2
    },
    {
      "segmentIndex": 2,
      "audioUrl": "/podcasts/ai_future_development_123/segments/segment_2.mp3",
      "duration": 5.1
    }
  ],
  "totalDuration": 20.8
}
```

### 4. 创建时间轴

生成播客的时间轴信息。

```bash
curl -X POST "$API_BASE/api/podcast/process/timeline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "ai_future_development_123"
  }'
```

**预期响应**：HTTP 200，包含时间轴信息

```json
{
  "success": true,
  "message": "Timeline generated successfully",
  "timelineUrl": "/podcasts/ai_future_development_123/merged_timeline.json"
}
```

### 5. 合并音频段落

将所有音频段落合并为完整播客。

```bash
curl -X POST "$API_BASE/api/podcast/process/merge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "ai_future_development_123"
  }'
```

**预期响应**：HTTP 200，包含合并结果

```json
{
  "success": true,
  "message": "Audio segments merged successfully",
  "podcastUrl": "/podcasts/ai_future_development_123/podcast.mp3",
  "duration": 21.5
}
```

## 故障排除和验证

### 验证生成的文件

合成完成后，您可以检查以下路径确认文件是否已正确生成：

1. 单个音频段落：`/public/podcasts/{podcastId}/segments/`
2. 合并的播客：`/public/podcasts/{podcastId}/podcast.mp3`
3. 时间轴信息：`/public/podcasts/{podcastId}/merged_timeline.json`

### 常见错误排除

1. **401 Unauthorized**：检查身份验证令牌是否有效和正确配置
2. **400 Bad Request**：检查请求体格式是否正确，特别是确保每个脚本段落都包含 speakerPersonaId
3. **500 Internal Server Error**：
   - 检查服务器日志
   - 验证 TTS 提供商 API 密钥是否有效
   - 确保存储路径可写

## 多语言测试

为了确保多语言支持正常工作，以下是不同语言的测试示例：

### 英文测试

```bash
curl -X POST "$API_BASE/api/podcast/process/script" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastTitle": "The Future of AI",
    "language": "en-US",
    "topic": "Discussing the future developments in artificial intelligence",
    "hostPersonaId": 1,
    "guestPersonaIds": [2],
    "script": [
      {
        "speaker": "Elliot",
        "speakerPersonaId": 1,
        "text": "Hello everyone, welcome to today's podcast. I'm Elliot, and today we'll be discussing the future of AI."
      },
      {
        "speaker": "Sarah",
        "speakerPersonaId": 2,
        "text": "Hi Elliot, I'm Sarah. I believe AI will see tremendous breakthroughs in the coming years."
      }
    ],
    "ttsProvider": "elevenlabs"
  }'
```

### 中文测试

```bash
curl -X POST "$API_BASE/api/podcast/process/script" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastTitle": "AI的未来",
    "language": "zh-CN",
    "topic": "探讨人工智能的未来发展方向",
    "hostPersonaId": 1,
    "guestPersonaIds": [2],
    "script": [
      {
        "speaker": "Elliot",
        "speakerPersonaId": 1,
        "text": "大家好，欢迎收听今天的播客。我是Elliot，今天我们将讨论AI的未来。"
      },
      {
        "speaker": "Sarah",
        "speakerPersonaId": 2,
        "text": "你好Elliot，我是Sarah。我相信AI在未来几年会有巨大突破。"
      }
    ],
    "ttsProvider": "volcengine"
  }'
```

## 测试 TTS 提供商切换

### 使用 ElevenLabs

```bash
curl -X POST "$API_BASE/api/podcast/process/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "test_elevenlabs_123",
    "segments": [
      {
        "segmentIndex": 0,
        "text": "This is a test for ElevenLabs TTS.",
        "speakerPersonaId": 1,
        "speakerName": "Elliot"
      }
    ],
    "ttsProvider": "elevenlabs",
    "synthesisParams": {
      "temperature": 0.7,
      "speed": 1.0,
      "similarity_boost": 0.5
    }
  }'
```

### 使用 Volcengine

```bash
curl -X POST "$API_BASE/api/podcast/process/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "test_volcengine_123",
    "segments": [
      {
        "segmentIndex": 0,
        "text": "这是火山引擎TTS的测试。",
        "speakerPersonaId": 2,
        "speakerName": "Sarah"
      }
    ],
    "ttsProvider": "volcengine",
    "synthesisParams": {
      "speed": 1.0,
      "pitch": 0,
      "volume": 1.0,
      "volcengineEncoding": "mp3"
    }
  }'
```

## 测试完整流程

以下是一个自动化脚本，测试完整的 API 流程：

```bash
#!/bin/bash
set -e

# 设置环境变量
API_BASE="http://localhost:3000"
AUTH_TOKEN="your-auth-token"
PODCAST_TITLE="测试播客流程"
PODCAST_ID="test_podcast_workflow_$(date +%s)"

echo "===== 开始测试完整流程 ====="
echo "使用播客ID: $PODCAST_ID"

# 1. 获取可用角色
echo -e "\n1. 获取可用角色..."
PERSONAS=$(curl -s -X GET "$API_BASE/api/personas?active=true" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN")

# 提取第一个和第二个角色ID和名称
PERSONA1_ID=$(echo $PERSONAS | jq -r '.[0].persona_id')
PERSONA1_NAME=$(echo $PERSONAS | jq -r '.[0].name')

PERSONA2_ID=$(echo $PERSONAS | jq -r '.[1].persona_id')
PERSONA2_NAME=$(echo $PERSONAS | jq -r '.[1].name')

echo "角色1: ID=$PERSONA1_ID, 名称=$PERSONA1_NAME"
echo "角色2: ID=$PERSONA2_ID, 名称=$PERSONA2_NAME"

# 2. 处理播客脚本
echo -e "\n2. 处理播客脚本..."
SCRIPT_RESPONSE=$(curl -s -X POST "$API_BASE/api/podcast/process/script" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastTitle": "'"$PODCAST_TITLE"'",
    "language": "zh-CN",
    "topic": "测试完整API流程",
    "hostPersonaId": '"$PERSONA1_ID"',
    "guestPersonaIds": ['"$PERSONA2_ID"'],
    "script": [
      {
        "speaker": "'"$PERSONA1_NAME"'",
        "speakerPersonaId": '"$PERSONA1_ID"',
        "text": "大家好，这是一个测试播客。"
      },
      {
        "speaker": "'"$PERSONA2_NAME"'",
        "speakerPersonaId": '"$PERSONA2_ID"',
        "text": "这是第二个测试语音片段。"
      }
    ],
    "ttsProvider": "elevenlabs",
    "synthesisParams": {
      "temperature": 0.7,
      "speed": 1.0
    },
    "keywords": ["测试", "API流程"]
  }')

echo "$SCRIPT_RESPONSE" | jq

# 获取返回的podcastId
PODCAST_ID=$(echo $SCRIPT_RESPONSE | jq -r '.podcastId')
echo "获取到的播客ID: $PODCAST_ID"

# 3. 合成语音
echo -e "\n3. 合成语音..."
SEGMENTS=$(echo $SCRIPT_RESPONSE | jq '.preparedSegments')

SYNTH_RESPONSE=$(curl -s -X POST "$API_BASE/api/podcast/process/synthesize" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "'"$PODCAST_ID"'",
    "segments": '"$SEGMENTS"',
    "ttsProvider": "elevenlabs",
    "synthesisParams": {
      "temperature": 0.7,
      "speed": 1.0
    }
  }')

echo "$SYNTH_RESPONSE" | jq

# 4. 创建时间轴
echo -e "\n4. 创建时间轴..."
TIMELINE_RESPONSE=$(curl -s -X POST "$API_BASE/api/podcast/process/timeline" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "'"$PODCAST_ID"'"
  }')

echo "$TIMELINE_RESPONSE" | jq

# 5. 合并音频段落
echo -e "\n5. 合并音频段落..."
MERGE_RESPONSE=$(curl -s -X POST "$API_BASE/api/podcast/process/merge" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "podcastId": "'"$PODCAST_ID"'"
  }')

echo "$MERGE_RESPONSE" | jq

echo -e "\n===== 测试完成 ====="
echo "生成的播客URL: $(echo $MERGE_RESPONSE | jq -r '.podcastUrl')"
echo "总时长: $(echo $MERGE_RESPONSE | jq -r '.duration') 秒"
```

## 结论

本文档提供了使用 curl 命令测试重构后 Playground API 的完整指南。通过这些测试，可以确保 API 在重构后能够正常工作，并保持数据流的干净和可控。

关键点：

1. 前端负责数据转换和处理，直接提供最终所需的数据结构
2. 后端作为纯透传方式存在，只进行必要的验证
3. 使用 Persona ID 为核心进行数据传递，移除了不必要的 VoiceMapping 映射层
4. 支持多语言和多种 TTS 提供商
5. 完整流程测试确保端到端功能正常

如需进一步调试或自定义测试，可以根据需要修改请求参数和测试用例。 