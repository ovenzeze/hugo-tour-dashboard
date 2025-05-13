---
title: 播客处理流程API文档
description: 详细说明用于分步骤处理和生成播客的API端点。
author: Zhen Zhang@Hugo
date: 2024-05-13
updatedAt: 2024-05-13
tags: ["api", "podcast", "process", "audio", "tts"]
---

## 概述

播客处理流程 API 提供了一系列分步骤的端点，用于将原始播客稿件和角色信息转换为最终的音频播客文件。这个流程包括稿件处理、单个音频片段的合成（带有时间戳）、时间线生成以及最终的音频合并。

这些 API 设计为按顺序调用，每个步骤的输出作为后续步骤的输入。

## API 端点详情

### 1. 稿件处理 (`/script`)

此端点负责预处理播客稿件，提取各个语音片段，并为每个片段匹配相应的角色（Persona）和声音 ID（Voice ID）。它为后续的音频合成步骤准备必要的数据。

- **Endpoint**: `POST /api/podcast/process/script`
- **Content-Type**: `application/json`

#### 请求体 (Request Body)

| 参数           | 类型                                 | 是否必需 | 描述                                                 |
| -------------- | ------------------------------------ | -------- | ---------------------------------------------------- |
| `podcastTitle` | `string`                             | 是       | 播客的标题，用于生成 `podcastId`。                   |
| `script`       | `ScriptSegment[]`                    | 是       | 播客稿件片段数组。                                   |
|                | `└ speaker: string`                  | 是       | 该片段的发言人名称。                                 |
|                | `└ text: string`                     | 是       | 该片段的文本内容。                                   |
| `personas`     | `object`                             | 是       | 包含主持人（host）和嘉宾（guest）角色信息的对象。    |
|                | `└ hostPersona?: Persona`            | 否       | 主持人角色信息。                                     |
|                | `  └ name: string`                   | 是       | 角色名称（应与稿件中的 `speaker` 对应）。            |
|                | `  └ voice_model_identifier: string` | 是       | 用于该角色的语音模型 ID (例如 ElevenLabs Voice ID)。 |
|                | `└ guestPersonas?: Persona[]`        | 否       | 嘉宾角色信息数组。                                   |
|                | `  └ name: string`                   | 是       | 角色名称。                                           |
|                | `  └ voice_model_identifier: string` | 是       | 语音模型 ID。                                        |

**请求体示例:**

```json
{
  "podcastTitle": "AI访谈录",
  "script": [
    {
      "speaker": "主持人小明",
      "text": "欢迎收听本期节目。"
    },
    {
      "speaker": "嘉宾小红",
      "text": "大家好，我是小红。"
    }
  ],
  "personas": {
    "hostPersona": {
      "name": "主持人小明",
      "voice_model_identifier": "voice_id_ming"
    },
    "guestPersonas": [
      {
        "name": "嘉宾小红",
        "voice_model_identifier": "voice_id_hong"
      }
    ]
  }
}
```

#### 响应体 (Success 200 OK)

| 参数               | 类型                            | 描述                                                       |
| ------------------ | ------------------------------- | ---------------------------------------------------------- |
| `success`          | `boolean`                       | 操作是否成功。                                             |
| `podcastId`        | `string`                        | 根据 `podcastTitle` 生成的唯一播客 ID。                    |
| `preparedSegments` | `PreparedSegmentForSynthesis[]` | 处理后的稿件片段数组，为下一步合成准备。                   |
|                    | `└ segmentIndex: number`        | 片段索引（从 1 开始）。                                    |
|                    | `└ text: string`                | 片段文本。                                                 |
|                    | `└ voiceId: string`             | 匹配到的语音模型 ID。                                      |
|                    | `└ speakerName: string`         | 发言人名称。                                               |
|                    | `└ error?: string`              | 如果处理此片段出错（例如未找到 voiceId），则包含错误信息。 |
| `message`          | `string`                        | 描述操作结果的消息。                                       |

**响应体示例 (Success):**

```json
{
  "success": true,
  "podcastId": "ai_访谈录",
  "preparedSegments": [
    {
      "segmentIndex": 1,
      "text": "欢迎收听本期节目。",
      "voiceId": "voice_id_ming",
      "speakerName": "主持人小明"
    },
    {
      "segmentIndex": 2,
      "text": "大家好，我是小红。",
      "voiceId": "voice_id_hong",
      "speakerName": "嘉宾小红"
    }
  ],
  "message": "Script processed and segments prepared for podcast ai_访谈录. Next step: synthesize segments."
}
```

---

### 2. 合成音频片段 (`/synthesize`)

此端点接收由上一步（`/script`）准备好的稿件片段，并为每个片段调用 TTS 服务（例如 ElevenLabs）以生成带时间戳的音频。生成的音频文件和时间戳 JSON 文件将被保存到服务器存储中。

- **Endpoint**: `POST /api/podcast/process/synthesize`
- **Content-Type**: `application/json`

#### 请求体 (Request Body)

| 参数             | 类型                     | 是否必需 | 描述                                                                            |
| ---------------- | ------------------------ | -------- | ------------------------------------------------------------------------------- |
| `podcastId`      | `string`                 | 是       | 播客 ID，用于确定文件存储路径。                                                 |
| `segments`       | `InputSegment[]`         | 是       | 需要合成的片段数组 (来自上一步的 `preparedSegments`)。                          |
|                  | `└ segmentIndex: number` | 是       | 片段索引。                                                                      |
|                  | `└ text: string`         | 是       | 要合成的文本。                                                                  |
|                  | `└ voiceId: string`      | 是       | 用于此片段的语音模型 ID。                                                       |
|                  | `└ speakerName: string`  | 是       | 发言人名称，用于生成文件名。                                                    |
| `defaultModelId` | `string`                 | 否       | （可选）全局默认的 TTS 模型 ID (例如 ElevenLabs 模型 ID)。                      |
| `voiceSettings`  | `object`                 | 否       | （可选）全局默认的语音设置 (例如 `{ stability: 0.7, similarity_boost: 0.7 }`)。 |

**请求体示例:**

```json
{
  "podcastId": "ai_访谈录",
  "segments": [
    {
      "segmentIndex": 1,
      "text": "欢迎收听本期节目。",
      "voiceId": "voice_id_ming",
      "speakerName": "主持人小明"
    },
    {
      "segmentIndex": 2,
      "text": "大家好，我是小红。",
      "voiceId": "voice_id_hong",
      "speakerName": "嘉宾小红"
    }
  ],
  "defaultModelId": "eleven_multilingual_v2"
}
```

#### 响应体 (Success 200 OK)

| 参数                | 类型                                                     | 描述                                           |
| ------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| `success`           | `boolean`                                                | 操作是否整体成功（可能部分片段失败）。         |
| `podcastId`         | `string`                                                 | 播客 ID。                                      |
| `generatedSegments` | `(TimedAudioSegmentResult & { segmentIndex: number })[]` | 已处理的片段结果数组。                         |
|                     | `└ segmentIndex: number`                                 | 片段索引。                                     |
|                     | `└ audioFileUrl?: string`                                | （如果成功）生成的音频文件的公共 URL。         |
|                     | `└ timestampFileUrl?: string`                            | （如果成功）生成的时间戳 JSON 文件的公共 URL。 |
|                     | `└ error?: string`                                       | （如果失败）此片段合成的错误信息。             |
| `message`           | `string`                                                 | 描述操作结果的消息。                           |

**响应体示例 (Success):**

```json
{
  "success": true,
  "podcastId": "ai_访谈录",
  "generatedSegments": [
    {
      "audioFileUrl": "/podcasts/ai_访谈录/segments/001_主持人小明.mp3",
      "timestampFileUrl": "/podcasts/ai_访谈录/segments/001_主持人小明.json",
      "segmentIndex": 1
    },
    {
      "audioFileUrl": "/podcasts/ai_访谈录/segments/002_嘉宾小红.mp3",
      "timestampFileUrl": "/podcasts/ai_访谈录/segments/002_嘉宾小红.json",
      "segmentIndex": 2
    }
  ],
  "message": "Segment synthesis process completed for podcast ai_访谈录. Check segment results for individual errors."
}
```

**响应体示例 (Partial Error):**

```json
{
  "success": false,
  "podcastId": "ai_访谈录",
  "generatedSegments": [
    {
      "audioFileUrl": "/podcasts/ai_访谈录/segments/001_主持人小明.mp3",
      "timestampFileUrl": "/podcasts/ai_访谈录/segments/001_主持人小明.json",
      "segmentIndex": 1
    },
    {
      "error": "TTS/Storage Error: ElevenLabs API error for segment 2.",
      "segmentIndex": 2
    }
  ],
  "message": "Segment synthesis process completed for podcast ai_访谈录. Check segment results for individual errors."
}
```

---

### 3. 生成时间线 (`/timeline`)

此端点根据上一步（`/synthesize`）生成的各个音频片段及其时间戳文件，计算并生成一个完整的时间线文件（`merged_timeline.json`）。这个时间线描述了每个片段在最终播客中的开始和结束时间。

- **Endpoint**: `POST /api/podcast/process/timeline`
- **Content-Type**: `application/json`

#### 请求体 (Request Body)

| 参数        | 类型     | 是否必需 | 描述                                      |
| ----------- | -------- | -------- | ----------------------------------------- |
| `podcastId` | `string` | 是       | 播客 ID，用于定位相关的音频和时间戳文件。 |

**请求体示例:**

```json
{
  "podcastId": "ai_访谈录"
}
```

#### 响应体 (Success 200 OK)

| 参数           | 类型                      | 描述                                                   |
| -------------- | ------------------------- | ------------------------------------------------------ |
| `success`      | `boolean`                 | 操作是否成功。                                         |
| `podcastId`    | `string`                  | 播客 ID。                                              |
| `timelineUrl`  | `string`                  | 生成的时间线文件 (`merged_timeline.json`) 的公共 URL。 |
| `timelineData` | `TimelineSegment[]`       | 时间线数据数组。                                       |
|                | `└ speaker: string`       | 发言人。                                               |
|                | `└ audioFile: string`     | 该片段对应的音频文件 URL。                             |
|                | `└ timestampFile: string` | 该片段对应的时间戳文件 URL。                           |
|                | `└ duration: number`      | 音频片段时长（秒）。                                   |
|                | `└ startTime: number`     | 片段在播客中的开始时间（秒）。                         |
|                | `└ endTime: number`       | 片段在播客中的结束时间（秒）。                         |
| `message`      | `string`                  | 描述操作结果的消息。                                   |

**响应体示例 (Success):**

```json
{
  "success": true,
  "podcastId": "ai_访谈录",
  "timelineUrl": "/podcasts/ai_访谈录/merged_timeline.json",
  "timelineData": [
    {
      "speaker": "主持人小明",
      "audioFile": "/podcasts/ai_访谈录/segments/001_主持人小明.mp3",
      "timestampFile": "/podcasts/ai_访谈录/segments/001_主持人小明.json",
      "duration": 10.5,
      "startTime": 0,
      "endTime": 10.5
    },
    {
      "speaker": "嘉宾小红",
      "audioFile": "/podcasts/ai_访谈录/segments/002_嘉宾小红.mp3",
      "timestampFile": "/podcasts/ai_访谈录/segments/002_嘉宾小红.json",
      "duration": 8.2,
      "startTime": 10.5,
      "endTime": 18.7
    }
  ],
  "message": "Merged timeline created for podcast ai_访谈录."
}
```

---

### 4. 合并音频 (`/merge`)

此端点是流程的最后一步。它使用上一步（`/timeline`）生成的时间线文件和之前（`/synthesize`）生成的各个音频片段文件，将它们合并（通常使用`ffmpeg`）成一个单一的、最终的播客音频文件。

- **Endpoint**: `POST /api/podcast/process/merge`
- **Content-Type**: `application/json`

#### 请求体 (Request Body)

| 参数        | 类型     | 是否必需 | 描述                                                      |
| ----------- | -------- | -------- | --------------------------------------------------------- |
| `podcastId` | `string` | 是       | 播客 ID，用于定位时间线文件和各个音频片段文件以进行合并。 |

**请求体示例:**

```json
{
  "podcastId": "ai_访谈录"
}
```

#### 响应体 (Success 200 OK)

| 参数              | 类型      | 描述                                   |
| ----------------- | --------- | -------------------------------------- |
| `success`         | `boolean` | 操作是否成功。                         |
| `podcastId`       | `string`  | 播客 ID。                              |
| `finalPodcastUrl` | `string`  | 最终合并生成的播客音频文件的公共 URL。 |
| `message`         | `string`  | 描述操作结果的消息。                   |

**响应体示例 (Success):**

```json
{
  "success": true,
  "podcastId": "ai_访谈录",
  "finalPodcastUrl": "/podcasts/ai_访谈录/ai_访谈录_final.mp3",
  "message": "Final podcast audio merged successfully for ai_访谈录."
}
```

---
