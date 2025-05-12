#!/bin/bash

# 设置API密钥和参数
API_KEY="your_actual_api_key_here"
TEXT="这是一个测试文本，用于验证时间戳API功能。"
VOICE_ID="JBFqnCBsd6RMkjVDRZzb"
MODEL_ID="eleven_multilingual_v2"

# 执行curl请求
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID/with-timestamps" \
  -H "Content-Type: application/json" \
  -H "xi-api-key: $API_KEY" \
  -d '{
    "text": "'"$TEXT"'",
    "model_id": "'"$MODEL_ID"'",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75
    },
    "output_format": "mp3_44100_128"
  }'
