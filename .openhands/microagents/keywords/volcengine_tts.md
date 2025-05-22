---
keywords: [volcengine, tts, 语音合成, 火山引擎, 时间戳]
---

# 火山引擎语音合成 (VolcEngine TTS)

## 功能概述

火山引擎语音合成API是本项目的核心功能之一，它允许将文本转换为自然流畅的语音。主要特点包括：

- 支持多种音色选择（如通用女声、通用男声等）
- 支持时间戳功能，可以获取每个字的发音时间
- 支持调整语速、音量和音调

## 使用方法

### Python脚本直接调用

可以通过`volcengine_tts_demo.py`脚本直接测试火山引擎语音合成API：

```bash
python volcengine_tts_demo.py --text "要合成的文本" --voice female --output output.mp3
```

### 环境变量配置

使用火山引擎语音合成API需要配置以下环境变量：

- `NUXT_VOLCENGINE_APPID`: 火山引擎AppID
- `NUXT_VOLCENGINE_ACCESS_TOKEN`: 火山引擎Access Token
- `NUXT_VOLCENGINE_SECRET_KEY`: 火山引擎Secret Key
- `NUXT_VOLCENGINE_CLUSTER`: 火山引擎Cluster
- `VOLCENGINE_VOICE_TYPE`: 可选，默认使用"BV001_streaming"

## 时间戳功能

时间戳功能是火山引擎语音合成API的一个重要特性，它可以获取每个字的发音时间，格式如下：

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

要启用时间戳功能，请确保在API请求中设置`need_timestamps`参数为1。

## 常见问题

1. **API返回错误**：请检查环境变量是否正确配置，特别是AppID、Access Token和Cluster。
2. **没有时间戳信息**：请确认账号是否有权限使用时间戳功能，并且在请求中正确设置了`need_timestamps`参数。
3. **音频质量问题**：可以尝试调整语速、音量和音调参数，或者更换不同的音色。