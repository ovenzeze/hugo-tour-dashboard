# API 测试指南：从脚本生成到播客合成

本文档旨在指导开发人员如何通过 `curl` 工具测试从生成播客脚本到最终合成播客音频的完整 API 流程。

## 前提条件

1.  **本地开发服务器已启动**: 确保您的 Nuxt.js 应用程序正在本地运行，并且 API 端点可访问。通常可以通过 `npm run dev` 命令启动，并监听在如 `http://localhost:4000` 这样的地址。请将文档中出现的 `PORT` 替换为您服务器实际监听的端口号。
2.  **`curl` 工具**: 确保您的系统中已安装 `curl` 命令行工具。
3.  **（可选）`jq` 工具**: 为了更方便地查看和格式化 JSON 输出，建议安装 `jq` 工具。本文档中的 `curl` 命令示例使用了 `jq`。如果您没有安装 `jq`，可以移除命令末尾的 `| jq .` 部分，但输出将是未格式化的 JSON。

## 测试流程

### 步骤 1: 获取可用角色 (Personas)

此步骤用于获取系统中可用的角色列表及其详细信息，特别是 `persona_id`，后续步骤将用到。

**命令:**

```bash
curl -s -X GET http://localhost:PORT/api/personas | jq .
```
*(将 `PORT` 替换为您的端口号，例如 4000)*

**预期输出:**

一个格式化的 JSON 数组，其中每个对象代表一个角色，包含 `persona_id`、`name`、`voice_model_identifier`、`tts_provider` 等字段。

**操作:**

从输出中选择一个或多个角色的 `persona_id`，用于后续的脚本生成。

### 步骤 2: 生成播客脚本

此步骤根据指定的主题和主持人角色 ID 生成播客脚本。

**命令:**

```bash
curl -s -X POST http://localhost:PORT/api/generate-script \
-H "Content-Type: application/json" \
-d '{
  "hostPersonaId": YOUR_CHOSEN_PERSONA_ID,
  "topic": "一个有趣的主题，例如：人工智能的最新进展"
}' | jq .
```
*(将 `PORT` 替换为您的端口号，并将 `YOUR_CHOSEN_PERSONA_ID` 替换为您在步骤 1 中选择的 `persona_id`)*

**预期输出:**

一个 JSON 对象，包含以下关键字段：
*   `podcastTitle`: 生成的播客标题。
*   `script`: 一个数组，每个元素代表脚本中的一个对话片段，包含 `name` (说话人名称) 和 `text` (对话内容)。
*   `voiceMap`: 一个对象，将脚本中的说话人名称映射到其 `personaId` 和 `voice_model_identifier`。

**操作:**

仔细记录此步骤的完整 JSON 响应，特别是 `script` 数组和 `voiceMap` 对象，它们是下一步合成音频所必需的。

### 步骤 3: 合成播客音频

此步骤根据上一步生成的脚本和角色映射来合成每个对话片段的音频。

#### 3.1: 准备请求体文件

根据步骤 2 的输出，创建一个名为 `synthesize_request_body.json` 的文件。该文件将包含发送到合成 API 的请求体。

**`synthesize_request_body.json` 文件内容示例:**

```json
{
  "podcastId": "your-test-podcast-id",
  "segments": [
    {
      "text": "Welcome to today's episode of *Timeless Tales*, where we delve into the fascinating world of museums and historical sites. I'm your host, Smith, and joining me are Adam, Dryw, Amanda, Anna, Sarah, and Jackson. Today, we're taking you on a journey to Africa, specifically to a site that holds the key to understanding human evolution. Let's explore the story of the Taung Child and the significance of the Taung Heritage Site in South Africa.",
      "speakerPersonaId": 30,
      "speakerName": "Smith",
      "segmentIndex": 0
    },
    {
      "text": "The Taung Heritage Site is indeed a treasure trove of history. Discovered in 1924 by quarryman James Drury, the site revealed the fossilized skull of a young Australopithecus africanus, later named the Taung Child. This discovery was groundbreaking as it provided crucial evidence for the 'Out of Africa' theory of human evolution.",
      "speakerPersonaId": 32,
      "speakerName": "Adam",
      "segmentIndex": 1
    },
    // ... 根据您在步骤 2 中生成的脚本和 voiceMap 添加更多片段 ...
    // 确保每个片段都有 text, speakerPersonaId, speakerName, 和从0开始递增的 segmentIndex
  ]
}
```

**重要提示:**
*   `podcastId`: 可以使用任何字符串作为测试 ID，例如 `"test-podcast-123"`。
*   `segments` 数组:
    *   `text`: 直接从步骤 2 响应的 `script` 数组中对应片段的 `text` 字段获取。
    *   `speakerName`: 直接从步骤 2 响应的 `script` 数组中对应片段的 `name` 字段获取。
    *   `speakerPersonaId`: 使用步骤 2 响应的 `voiceMap`，根据片段的 `speakerName` 查找到对应的 `personaId`。
    *   `segmentIndex`: 从 `0` 开始，为每个片段顺序递增编号。

#### 3.2: 发送合成请求

使用 `curl` 命令发送 POST 请求到合成端点，并使用 `@` 操作符从上一步创建的 `synthesize_request_body.json` 文件中读取请求体。

**命令:**

```bash
curl -s -X POST http://localhost:PORT/api/podcast/process/synthesize \
-H "Content-Type: application/json" \
-d @synthesize_request_body.json | jq .
```
*(将 `PORT` 替换为您的端口号)*

**预期输出:**

一个 JSON 对象，包含合成操作的结果：
*   `success`: 一个布尔值。`true` 表示至少有一个片段成功合成。
*   `podcastId`: 与请求中发送的 `podcastId` 相同。
*   `generatedSegments`: 一个数组，包含每个片段的详细合成结果。
    *   对于成功合成的片段，会包含 `audioFileUrl` (音频文件的公共 URL)、`timestampFileUrl` (时间戳文件的 URL)、`durationMs` (音频时长) 等。
    *   如果某个片段合成失败，会包含一个 `error` 字段，描述失败的原因。
*   `message`: 关于整个合成过程的总结信息，例如 "Segment synthesis process completed for podcast your-test-podcast-id. Successful: X/Y."。

#### 故障排除

*   **"Invalid JSON body"**: 如果 API 返回此错误，请仔细检查 `synthesize_request_body.json` 文件的 JSON 语法是否完全正确。可以使用在线 JSON 验证工具进行检查。
*   **"Unsupported TTS provider: 'some_provider'"**:
    *   此错误表明后端代码无法识别或处理指定的 TTS provider。
    *   检查从 `/api/personas` 获取的 `tts_provider` 字段的值。有时，该值可能包含额外的引号（例如，`"'volcengine'"` 而不是期望的 `'volcengine'`）。
    *   如果存在此问题，需要修改后端处理 TTS provider 的逻辑（例如，在 [`server/api/podcast/process/synthesize.post.ts`](server/api/podcast/process/synthesize.post.ts) 文件中）。在比较 provider 名称之前，应先清理字符串，移除可能存在的包裹引号。
    *   示例修复逻辑 (在获取 `actualTtsProvider` 后添加):
        ```typescript
        let cleanedTtsProvider = actualTtsProvider;
        if (cleanedTtsProvider && cleanedTtsProvider.startsWith("'") && cleanedTtsProvider.endsWith("'")) {
          cleanedTtsProvider = cleanedTtsProvider.substring(1, cleanedTtsProvider.length - 1);
        }
        // 在后续逻辑中使用 cleanedTtsProvider
        ```

## 总结

通过以上步骤，您可以有效地测试从脚本生成到播客音频合成的整个 API 流程。仔细检查每一步的输出，并根据需要进行故障排除。生成的 `audioFileUrl` 可以用于验证音频是否已正确生成和存储。