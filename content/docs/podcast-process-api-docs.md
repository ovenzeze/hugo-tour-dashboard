---
title: 播客处理流程与相关API文档
description: 详细说明用于分步骤处理、生成、管理和预览播客的API端点。
author: Zhen Zhang@Hugo (Updated by Roo)
date: 2024-05-13
updatedAt: 2025-05-17
tags: ["api", "podcast", "process", "audio", "tts", "preview", "status", "files"]
---

## 概述

播客处理与相关 API 提供了一系列端点，用于将原始播客稿件和角色信息转换为最终的音频播客文件，并支持播客的预览、状态查询和文件管理。核心流程包括稿件的验证与准备、单个音频片段的合成（带有时间戳）、时间线生成、最终的音频合并，以及对这些过程的管理和辅助功能。

这些 API 通常设计为按顺序调用或根据需求独立调用，某些步骤的输出可作为后续步骤的输入。

## API 端点详情

### 播客处理核心流程 (`/api/podcast/process/`)

这组端点构成了播客从无到有逐步生成的核心步骤。

#### 1. 稿件验证与结构化 (`/validate`)

此端点负责接收原始播客稿件、标题和角色信息，通过大语言模型（LLM）服务进行分析、验证和结构化处理。它会返回一个结构化的脚本，其中包含分段的文本、发言人角色，以及发言人到语音模型的映射。

- **Endpoint**: `POST /api/podcast/process/validate`
- **Content-Type**: `application/json`

##### 请求体 (Request Body)

| 参数          | 类型                                                                 | 是否必需 | 描述                                                                 |
| ------------- | -------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `title`       | `string`                                                             | 是       | 播客的标题。                                                         |
| `rawScript`   | `string`                                                             | 是       | 原始的、未经处理的播客稿件文本。                                     |
| `personas`    | `object`                                                             | 是       | 包含主持人（host）和可选的嘉宾（guest）角色信息的对象。                |
|               | `└ hostPersona: Persona`                                             | 是       | 主持人角色信息。                                                     |
|               | `  └ id: number \| string`                                           | 是       | 角色唯一标识符。                                                     |
|               | `  └ name: string`                                                   | 是       | 角色名称。                                                           |
|               | `  └ voice_model_identifier: string`                                 | 是       | 用于该角色的语音模型 ID。                                            |
|               | `└ guestPersonas?: Persona[]`                                        | 否       | 嘉宾角色信息数组。                                                   |
|               | `  └ id: number \| string`                                           | 是       | 角色唯一标识符。                                                     |
|               | `  └ name: string`                                                   | 是       | 角色名称。                                                           |
|               | `  └ voice_model_identifier: string`                                 | 是       | 语音模型 ID。                                                        |
| `preferences` | `object`                                                             | 否       | （可选）用于指导LLM处理的偏好设置，例如语气、风格等。                  |

**请求体示例:**
\`\`\`json
{
  "title": "AI深度对话",
  "rawScript": "主持人：大家好，欢迎来到本期节目。\n嘉宾A：主持人好，听众朋友们好。",
  "personas": {
    "hostPersona": {
      "id": "host123",
      "name": "主持人",
      "voice_model_identifier": "voice_host_alpha"
    },
    "guestPersonas": [
      {
        "id": "guest456",
        "name": "嘉宾A",
        "voice_model_identifier": "voice_guest_beta"
      }
    ]
  },
  "preferences": {
    "style": "conversational"
  }
}
\`\`\`

##### 响应体 (Success 200 OK)

| 参数             | 类型                                                              | 描述                                                                 |
| ---------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `success`        | `boolean`                                                         | 操作是否成功。                                                       |
| `structuredData` | `object`                                                          | （如果成功）包含LLM处理后的结构化数据。                                |
|                  | `└ podcastTitle: string`                                          | 播客标题。                                                           |
|                  | `└ script: ScriptSegment[]`                                       | 结构化的稿件片段数组。                                               |
|                  | `  └ speaker: string`                                             | 该片段的发言人名称（与 `voiceMap` 中的键对应）。                     |
|                  | `  └ text: string`                                                | 该片段的文本内容。                                                   |
|                  | `└ voiceMap: Record<string, { personaId: string, voice_model_identifier: string }>` | 发言人名称到语音模型ID和角色ID的映射。                               |
| `message`        | `string`                                                          | 描述操作结果的消息。                                                 |
| `error`          | `string`                                                          | （如果失败）错误信息。                                               |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "structuredData": {
    "podcastTitle": "AI深度对话",
    "script": [
      { "speaker": "主持人", "text": "大家好，欢迎来到本期节目。" },
      { "speaker": "嘉宾A", "text": "主持人好，听众朋友们好。" }
    ],
    "voiceMap": {
      "主持人": { "personaId": "host123", "voice_model_identifier": "voice_host_alpha" },
      "嘉宾A": { "personaId": "guest456", "voice_model_identifier": "voice_guest_beta" }
    }
  },
  "message": "Script validation and structuring successful"
}
\`\`\`

#### 2. 稿件处理与数据库记录 (`/script`)

此端点负责预处理播客稿件（如果未经过 `/validate` 端点处理），提取各个语音片段，为每个片段匹配相应的角色和声音ID，并将播客元数据和稿件片段存入数据库。它为后续的音频合成步骤准备必要的数据，并创建持久化的播客记录。

- **Endpoint**: `POST /api/podcast/process/script`
- **Content-Type**: `application/json`

##### 请求体 (Request Body)

| 参数                 | 类型                                 | 是否必需 | 描述                                                                 |
| -------------------- | ------------------------------------ | -------- | -------------------------------------------------------------------- |
| `podcastTitle`       | `string`                             | 是       | 播客的标题。                                                         |
| `script`             | `ScriptSegmentInput[]`               | 是       | 播客稿件片段数组。                                                   |
|                      | `└ speaker: string`                  | 是       | 该片段的发言人名称。                                                 |
|                      | `└ text: string`                     | 是       | 该片段的文本内容。                                                   |
| `personas`           | `object`                             | 是       | 包含主持人（host）和嘉宾（guest）角色信息的对象。                    |
|                      | `└ hostPersona?: PersonaInput`       | 否       | 主持人角色信息。                                                     |
|                      | `  └ name: string`                   | 是       | 角色名称（应与稿件中的 `speaker` 对应）。            |
|                      | `  └ voice_model_identifier: string` | 是       | 用于该角色的语音模型 ID。                                            |
|                      | `└ guestPersonas?: PersonaInput[]`   | 否       | 嘉宾角色信息数组。                                                   |
|                      | `  └ name: string`                   | 是       | 角色名称。                                                           |
|                      | `  └ voice_model_identifier: string` | 是       | 语音模型 ID。                                                        |
| `language`           | `string`                             | 是       | 播客语言代码 (例如, 'en', 'zh')。                                    |
| `topic?`             | `string`                             | 否       | 播客主题。                                                           |
| `host_persona_id?`   | `number`                             | 否       | 数据库中主持人角色记录的ID。                                         |
| `guest_persona_id?`  | `number`                             | 否       | 数据库中嘉宾角色记录的ID。                                           |
| `creator_persona_id?`| `number`                             | 否       | 数据库中创建者角色记录的ID。                                         |
| `total_duration_ms?` | `number`                             | 否       | 预估总时长（毫秒）。                                                 |
| `total_word_count?`  | `number`                             | 否       | 总字数。                                                             |
| `museumId?`          | `number`                             | 否       | 关联的博物馆ID。                                                     |
| `galleryId?`         | `number`                             | 否       | 关联的画廊ID。                                                       |
| `objectId?`          | `number`                             | 否       | 关联的物品ID。                                                       |

**请求体示例:**
\`\`\`json
{
  "podcastTitle": "AI访谈录",
  "script": [
    { "speaker": "主持人小明", "text": "欢迎收听本期节目。" },
    { "speaker": "嘉宾小红", "text": "大家好，我是小红。" }
  ],
  "personas": {
    "hostPersona": { "name": "主持人小明", "voice_model_identifier": "voice_id_ming" },
    "guestPersonas": [{ "name": "嘉宾小红", "voice_model_identifier": "voice_id_hong" }]
  },
  "language": "zh",
  "topic": "人工智能"
}
\`\`\`

##### 响应体 (Success 200 OK)

| 参数               | 类型                            | 描述                                                                 |
| ------------------ | ------------------------------- | -------------------------------------------------------------------- |
| `success`          | `boolean`                       | 操作是否成功。                                                       |
| `podcastId`        | `string \| null`                | 数据库生成的播客唯一ID (UUID)。如果数据库操作失败，可能为 `null`。     |
| `preparedSegments` | `PreparedSegmentForSynthesis[]` | 处理后的稿件片段数组，为下一步合成准备。                               |
|                    | `└ segmentIndex: number`        | 片段索引（从 0 开始）。                                              |
|                    | `└ text: string`                | 片段文本。                                                           |
|                    | `└ voiceId: string`             | 匹配到的语音模型 ID。                                                |
|                    | `└ speakerName: string`         | 发言人名称。                                                         |
|                    | `└ error?: string`              | 如果处理此片段出错（例如未找到 voiceId），则包含错误信息。           |
| `message`          | `string`                        | 描述操作结果的消息。                                                 |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "preparedSegments": [
    { "segmentIndex": 0, "text": "欢迎收听本期节目。", "voiceId": "voice_id_ming", "speakerName": "主持人小明" },
    { "segmentIndex": 1, "text": "大家好，我是小红。", "voiceId": "voice_id_hong", "speakerName": "嘉宾小红" }
  ],
  "message": "Script processed and segments prepared for podcast \"AI访谈录\". Database records created: true. Next step: synthesize segments."
}
\`\`\`

#### 3. 合成音频片段 (`/synthesize` 或 `/synthesize-segments`)

这两个端点负责接收由上一步准备好的稿件片段（或从 `/validate` 结果转换而来，或从现有时间线指定），并为每个片段调用 TTS 服务以生成带时间戳的音频。生成的音频文件和时间戳 JSON 文件将被保存到服务器存储中，并且音频文件的引用会存入数据库。

这两个端点的功能相似，`/synthesize` 提供了更灵活的输入方式（包括从 `/validate` 的输出或根据 `segmentIndices` 从时间线重新合成特定片段），而 `/synthesize-segments` 则需要明确的 `segments` 数组输入。**在实际使用中，推荐优先考虑使用 `/synthesize` 端点，因为它功能更全面。**

为了支持未来的多 TTS 提供商，API 设计倾向于使用通用的 `synthesisParams` 来传递特定于提供商的设置。

- **Endpoint**: `POST /api/podcast/process/synthesize`
- **Endpoint**: `POST /api/podcast/process/synthesize-segments`
- **Content-Type**: `application/json`

##### 请求体 (Request Body for `/synthesize`)

| 参数              | 类型                                                                 | 是否必需 | 描述                                                                                                |
| ----------------- | -------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `podcastId`       | `string`                                                             | 是       | 播客的数据库 ID (UUID)，用于确定文件存储路径和数据库记录。                                           |
| `segments?`       | `InputSegmentForSynthesis[]`                                         | 否       | 需要合成的片段数组 (来自 `/script` 的 `preparedSegments` 或手动构造)。                                |
|                   | `└ segmentIndex: number`                                             | 是       | 片段索引。                                                                                          |
|                   | `└ text: string`                                                     | 是       | 要合成的文本。                                                                                      |
|                   | `└ voiceId: string`                                                  | 是       | 用于此片段的语音模型 ID。                                                                           |
|                   | `└ speakerName: string`                                              | 是       | 发言人名称，用于生成文件名。                                                                        |
| `segmentIndices?` | `number[] \| 'all'`                                                  | 否       | （可选）指定要从现有时间线重新合成的片段索引列表，或 `'all'` 表示全部。如果提供此项，则忽略 `segments`。 |
| `synthesisParams?`| `object`                                                             | 否       | （可选）通用的TTS合成参数，可包含提供商特定的设置 (例如 `{ "provider": "elevenlabs", "model_id": "eleven_multilingual_v2", "stability": 0.7, "speed": 1.0 }`)。 |
| `podcastTitle?`   | `string`                                                             | 否       | 如果直接使用 `/validate` 的输出，提供此项以帮助内部查找或关联 `podcastId`。                           |
| `script?`         | `Array<{ role: string; name?: string; text: string }>`                | 否       | （可选，与 `voiceMap` 一起使用）来自 `/validate` 的结构化脚本。                                       |
| `voiceMap?`       | `Record<string, { personaId: number; voice_model_identifier: string }>` | 否       | （可选，与 `script` 一起使用）来自 `/validate` 的语音映射。                                           |

##### 请求体 (Request Body for `/synthesize-segments`)

| 参数              | 类型                         | 是否必需 | 描述                                                                                                |
| ----------------- | ---------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| `podcastId`       | `string`                     | 是       | 播客的数据库 ID (UUID)。                                                                             |
| `segments`        | `InputSegmentForSynthesis[]` | 是       | 需要合成的片段数组。                                                                                |
|                   | `└ segmentIndex: number`     | 是       | 片段索引。                                                                                          |
|                   | `└ text: string`             | 是       | 要合成的文本。                                                                                      |
|                   | `└ voiceId: string`          | 是       | 用于此片段的语音模型 ID。                                                                           |
|                   | `└ speakerName: string`      | 是       | 发言人名称。                                                                                        |
| `synthesisParams?`| `object`                     | 否       | （可选）通用的TTS合成参数。                                                                         |


**请求体示例 (`/synthesize`):**
\`\`\`json
{
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "segments": [
    { "segmentIndex": 0, "text": "欢迎收听本期节目。", "voiceId": "voice_id_ming", "speakerName": "主持人小明" },
    { "segmentIndex": 1, "text": "大家好，我是小红。", "voiceId": "voice_id_hong", "speakerName": "嘉宾小红" }
  ],
  "synthesisParams": {
    "provider": "elevenlabs",
    "model_id": "eleven_multilingual_v2",
    "stability": 0.75,
    "similarity_boost": 0.75
  }
}
\`\`\`

##### 响应体 (Success 200 OK - 对两个端点通用)

| 参数                | 类型                                                     | 描述                                                                 |
| ------------------- | -------------------------------------------------------- | -------------------------------------------------------------------- |
| `success`           | `boolean`                                                | 操作是否整体成功（可能部分片段失败）。                                 |
| `podcastId`         | `string`                                                 | 播客 ID。                                                              |
| `generatedSegments` | `(TimedAudioSegmentResult & { segmentIndex: number })[]` | 已处理的片段结果数组。                                               |
|                     | `└ segmentIndex: number`                                 | 片段索引。                                                           |
|                     | `└ audioFileUrl?: string`                                | （如果成功）生成的音频文件的公共 URL (例如 `/podcasts/{podcastId}/segments/000_speaker.mp3`)。 |
|                     | `└ timestampFileUrl?: string`                            | （如果成功）生成的时间戳 JSON 文件的公共 URL (例如 `/podcasts/{podcastId}/segments/000_speaker.json`)。 |
|                     | `└ error?: string`                                       | （如果失败）此片段合成的错误信息。                                     |
| `message`           | `string`                                                 | 描述操作结果的消息。                                                 |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "generatedSegments": [
    {
      "audioFileUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.mp3",
      "timestampFileUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.json",
      "segmentIndex": 0
    },
    {
      "audioFileUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/001_嘉宾小红.mp3",
      "timestampFileUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/001_嘉宾小红.json",
      "segmentIndex": 1
    }
  ],
  "message": "Segment synthesis process completed for podcast a1b2c3d4-e5f6-7890-1234-567890abcdef. Check segment results for individual errors."
}
\`\`\`

#### 4. 生成时间线 (`/timeline`)

此端点根据上一步（`/synthesize` 或 `/synthesize-segments`）生成的各个音频片段及其时间戳文件，计算并生成一个完整的时间线文件（`merged_timeline.json`）。这个时间线描述了每个片段在最终播客中的开始和结束时间，以及其他相关元数据。

- **Endpoint**: `POST /api/podcast/process/timeline`
- **Content-Type**: `application/json`

##### 请求体 (Request Body)

| 参数        | 类型     | 是否必需 | 描述                                                                 |
| ----------- | -------- | -------- | -------------------------------------------------------------------- |
| `podcastId` | `string` | 是       | 播客的数据库 ID (UUID)，用于定位相关的音频和时间戳文件。                |

**请求体示例:**
\`\`\`json
{
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
\`\`\`

##### 响应体 (Success 200 OK)

| 参数           | 类型                      | 描述                                                                                     |
| -------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| `success`      | `boolean`                 | 操作是否成功。                                                                           |
| `podcastId`    | `string`                  | 播客 ID。                                                                                |
| `timelineUrl`  | `string`                  | 生成的时间线文件 (`merged_timeline.json`) 的公共 URL (例如 `/podcasts/{podcastId}/merged_timeline.json`)。 |
| `timelineData` | `TimelineSegmentData[]`   | 时间线数据数组。                                                                         |
|                | `└ speaker: string`       | 发言人。                                                                                 |
|                | `└ text?: string`         | （可选）片段文本。                                                                       |
|                | `└ audioFile: string`     | 该片段对应的音频文件相对路径。                                                           |
|                | `└ timestampFile: string` | 该片段对应的时间戳文件相对路径。                                                         |
|                | `└ duration: number`      | 音频片段时长（秒）。                                                                     |
|                | `└ startTime: number`     | 片段在播客中的开始时间（秒）。                                                           |
|                | `└ endTime: number`       | 片段在播客中的结束时间（秒）。                                                           |
| `message`      | `string`                  | 描述操作结果的消息。                                                                     |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "timelineUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/merged_timeline.json",
  "timelineData": [
    {
      "speaker": "主持人小明",
      "text": "欢迎收听本期节目。",
      "audioFile": "podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.mp3",
      "timestampFile": "podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.json",
      "duration": 10.5,
      "startTime": 0,
      "endTime": 10.5
    }
    // ... more segments
  ],
  "message": "Merged timeline created for podcast a1b2c3d4-e5f6-7890-1234-567890abcdef."
}
\`\`\`

#### 5. 合并音频 (`/merge`)

此端点是流程的最后一步。它使用上一步（`/timeline`）生成的时间线文件和之前（`/synthesize` 或 `/synthesize-segments`）生成的各个音频片段文件，将它们合并（通常使用`ffmpeg`）成一个单一的、最终的播客音频文件。

- **Endpoint**: `POST /api/podcast/process/merge`
- **Content-Type**: `application/json`

##### 请求体 (Request Body)

| 参数        | 类型     | 是否必需 | 描述                                                                                     |
| ----------- | -------- | -------- | ---------------------------------------------------------------------------------------- |
| `podcastId` | `string` | 是       | 播客的数据库 ID (UUID)，用于定位时间线文件和各个音频片段文件以进行合并。                  |

**请求体示例:**
\`\`\`json
{
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef"
}
\`\`\`

##### 响应体 (Success 200 OK)

| 参数              | 类型      | 描述                                                                                     |
| ----------------- | --------- | ---------------------------------------------------------------------------------------- |
| `success`         | `boolean` | 操作是否成功。                                                                           |
| `podcastId`       | `string`  | 播客 ID。                                                                                |
| `finalPodcastUrl` | `string`  | 最终合并生成的播客音频文件的公共 URL (例如 `/podcasts/{podcastId}/{podcastId}_final.mp3`)。 |
| `message`         | `string`  | 描述操作结果的消息。                                                                     |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "finalPodcastUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/a1b2c3d4-e5f6-7890-1234-567890abcdef_final.mp3",
  "message": "Final podcast audio merged successfully for a1b2c3d4-e5f6-7890-1234-567890abcdef."
}
\`\`\`

### 播客辅助 API

#### 获取片段处理状态 (`/segments-status`)

此端点用于查询特定播客的各个语音片段的处理状态（例如，是否已成功生成音频和时间戳文件）。

- **Endpoint**: `GET /api/podcast/segments-status`
- **Query Parameters**:
    - `podcastId` (string, required): 要查询的播客的数据库 ID (UUID)。

##### 响应体 (Success 200 OK)

| 参数        | 类型              | 描述                                     |
| ----------- | ----------------- | ---------------------------------------- |
| `success`   | `boolean`         | 操作是否成功。                           |
| `podcastId` | `string`          | 播客 ID。                                |
| `segments`  | `SegmentStatus[]` | 片段状态数组。                           |
|             | `└ id: number`    | 片段索引。                               |
|             | `└ text: string`  | 片段文本。                               |
|             | `└ speakerName: string` | 发言人名称。                           |
|             | `└ voiceId?: string`| （可选）使用的语音模型 ID。              |
|             | `└ status: 'pending' \| 'processing' \| 'success' \| 'failed'` | 片段处理状态。                       |
|             | `└ audioUrl?: string` | （如果成功）音频文件的公共 URL。         |
|             | `└ timestampUrl?: string` | （如果成功）时间戳文件的公共 URL。     |
| `message`   | `string`          | 描述操作结果的消息。                     |

**响应体示例 (Success):**
\`\`\`json
{
  "success": true,
  "podcastId": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
  "segments": [
    {
      "id": 0,
      "text": "欢迎收听本期节目。",
      "speakerName": "主持人小明",
      "status": "success",
      "audioUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.mp3",
      "timestampUrl": "/podcasts/a1b2c3d4-e5f6-7890-1234-567890abcdef/segments/000_主持人小明.json"
    },
    {
      "id": 1,
      "text": "大家好，我是小红。",
      "speakerName": "嘉宾小红",
      "status": "pending"
    }
  ],
  "message": "Retrieved 2 segment statuses for podcast a1b2c3d4-e5f6-7890-1234-567890abcdef."
}
\`\`\`

#### 获取播客文件 (`/files/{podcastId}/{fileName}`)

此端点用于提供对特定播客生成的各种文件的访问，例如单个音频片段、时间戳文件、合并后的时间线文件或最终的播客音频。
**注意：** 此端点当前实现中使用的文件路径 (`podcast_outputs/{podcastId}/{fileName}`) 与核心处理流程中使用的路径 (`public/podcasts/{podcastId}/...`) 不同。在实际使用中请注意此差异，或考虑统一路径结构。

- **Endpoint**: `GET /api/podcast/files/{podcastId}/{fileName}`
- **Path Parameters**:
    - `podcastId` (string, required): 播客的 ID (对应代码中的 `sessionId`，但路由为 `podcastId`)。
    - `fileName` (string, required): 要获取的文件名 (例如 `000_speaker.mp3`, `merged_timeline.json`, `podcast_final.mp3`)。

##### 响应体
- 如果文件是 JSON (例如 `merged_timeline.json`)，响应体是 `application/json` 内容。
- 如果文件是音频 (例如 `.mp3`)，响应是 `audio/mpeg` 的流式传输。
- 如果文件未找到，返回 404。
- 如果发生其他错误，返回 500。

#### 生成片段音频预览 (`/preview/segments`)

此端点用于为播客脚本的单个或多个片段生成带时间戳的音频预览。它直接返回 Base64 编码的音频数据和时间戳，而不将文件保存到持久存储。这对于在正式合成前快速试听片段效果非常有用。该端点支持多种 TTS 提供商和重试逻辑。

- **Endpoint**: `POST /api/podcast/preview/segments`
- **Content-Type**: `application/json`

##### 请求体 (Request Body)

| 参数              | 类型                                                                 | 是否必需 | 描述                                                                                                                               |
| ----------------- | -------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `script?`         | `Array<{ speaker: string; text: string }>`                           | 否       | （可选，旧格式）脚本片段数组。                                                                                                       |
| `personas?`       | `object`                                                             | 否       | （可选，旧格式）角色信息。                                                                                                           |
| `config?`         | `object`                                                             | 否       | （可选，新格式）包含TTS提供商、角色分配和片段的配置对象。                                                                              |
|                   | `└ ttsProvider: string`                                              | 是       | TTS 提供商名称 (例如 "elevenlabs")。                                                                                                 |
|                   | `└ speakerAssignments: Record<string, string>`                       | 是       | 发言人标签到语音模型 ID 的映射。                                                                                                     |
|                   | `└ segments: Array<{ speakerTag: string; text: string }>`            | 是       | 要预览的片段数组。                                                                                                                   |
| `synthesisParams?`| `object`                                                             | 否       | （可选）传递给 TTS 提供商的特定合成参数。                                                                                            |
| `retrySegments?`  | `number[]`                                                           | 否       | （可选）需要重试的片段索引列表 (基于 `config.segments` 或 `script` 数组的索引)。                                                      |
| `maxRetries?`     | `number`                                                             | 否       | （可选）单个片段的最大重试次数，默认为2。                                                                                            |

**请求体示例 (新格式):**
\`\`\`json
{
  "config": {
    "ttsProvider": "elevenlabs",
    "speakerAssignments": {
      "Host": "voice_host_alpha",
      "Guest": "voice_guest_beta"
    },
    "segments": [
      { "speakerTag": "Host", "text": "这是第一句预览。" },
      { "speakerTag": "Guest", "text": "这是第二句预览。" }
    ]
  },
  "synthesisParams": { "stability": 0.7 }
}
\`\`\`

##### 响应体 (Success 200 OK)

| 参数      | 类型                        | 描述                                                                 |
| --------- | --------------------------- | -------------------------------------------------------------------- |
| `segments`| `SegmentPreviewResult[]`    | 每个请求片段的处理结果数组。                                           |
|           | `└ speaker: string`         | 发言人。                                                             |
|           | `└ text: string`            | 片段文本。                                                           |
|           | `└ audio?: string`          | （如果成功）Base64 编码的音频数据。                                    |
|           | `└ timestamps?: any[]`      | （如果成功）时间戳数据。                                               |
|           | `└ contentType?: string`    | 音频内容的 MIME 类型。                                                 |
|           | `└ error?: string`          | （如果失败）错误信息。                                               |
|           | `└ retryCount?: number`     | 已尝试的重试次数。                                                   |
|           | `└ status: 'success' \| 'failed' \| 'skipped'` | 片段处理状态。                                       |
| `summary` | `object`                    | 处理结果的摘要信息。                                                 |
|           | `└ total: number`           | 请求的总片段数。                                                     |
|           | `└ success: number`         | 成功处理的片段数。                                                   |
|           | `└ failed: number`          | 处理失败的片段数。                                                   |
|           | `└ skipped: number`         | 跳过处理的片段数。                                                   |
|           | `└ canRetry: boolean`       | 是否有可以重试的失败片段。                                           |
|           | `└ segmentsToRetry: number[]` | 可以重试的失败片段的索引列表。                                       |

**响应体示例 (Success):**
\`\`\`json
{
  "segments": [
    {
      "speaker": "Host",
      "text": "这是第一句预览。",
      "audio": "UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=", // 示例 Base64 音频
      "timestamps": [ /* ...时间戳数据... */ ],
      "contentType": "audio/mpeg",
      "status": "success",
      "retryCount": 0
    },
    {
      "speaker": "Guest",
      "text": "这是第二句预览。",
      "error": "TTS provider error: Voice ID not found.",
      "status": "failed",
      "retryCount": 2
    }
  ],
  "summary": {
    "total": 2,
    "success": 1,
    "failed": 1,
    "skipped": 0,
    "canRetry": false,
    "segmentsToRetry": []
  }
}
\`\`\`

### 其他相关端点和说明

#### 播客生成总览 (`/generate`) - *可能已过时*

- **Endpoint**: `POST /api/podcast/generate`
- **描述**: 此端点最初设计为一步调用完成播客稿件处理、时间线生成和音频合并。然而，其当前实现可能存在缺陷，因为它在调用时间线生成和音频合并步骤之前，并未显式调用必要的音频片段合成步骤。
- **建议**: 推荐使用 `/api/podcast/process/` 下的各个细分端点按顺序调用，以获得更可靠和可控的播客生成流程。如果使用此端点，请注意其局限性。
- **请求体与 `/api/podcast/process/script` 类似**:
    - `podcastTitle` (string)
    - `script` (`ScriptSegmentInput[]`)
    - `personas` (object)
- **响应体**:
    - `success` (boolean)
    - `podcastId` (string) - 基于标题生成，非数据库ID
    - `message` (string)
    - `segments` (`PreparedSegmentForSynthesis[]`)
    - `timelineUrl?` (string)
    - `finalPodcastUrl?` (string)

#### TTS 流式预览 (`/api/tts/stream-preview`)

- **状态**: **当前无后端实现。**
- **预期功能 (如果实现)**: 此端点预期用于提供 TTS 音频的流式预览，允许用户在音频完全生成之前开始收听。

#### 通用播客处理状态端点 - *建议*

- **需求**: 当前 `/api/podcast/segments-status` 提供了片段级别的状态。建议增加一个更高级别的端点，用于查询整个播客（由 `podcastId` 标识）的总体处理状态（例如：`pending_script`, `pending_synthesis`, `pending_timeline`, `pending_merge`, `completed`, `failed`），并可能包含指向已完成步骤产物（如时间线文件URL，最终音频URL）的链接和任何错误信息。

---
