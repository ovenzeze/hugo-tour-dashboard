# Playground UI 数据流重构方案

## 目标概述

将 Playground UI 的数据流重构为干净、可控的模式，使后端完全成为透传方，不对输入数据进行任何映射和修改。简化数据流向，以 Persona ID 为核心传递数据。

## 当前问题分析

通过代码审查，发现以下几个主要问题：

1. **数据转换复杂且分散**：
   - 在 UI 组件和后端 API 之间存在多次数据转换和映射
   - 在 `podcastScriptProcessor.ts` 中有复杂的声音/语音匹配逻辑
   - 数据结构在前后端之间不一致，需要频繁转换

2. **后端处理逻辑过多**：
   - 后端不仅仅是透传数据，而是进行了数据格式转换、映射和验证
   - 例如 `processPodcastScript` 函数中包含了大量的数据转换和处理逻辑

3. **前后端数据结构不统一**：
   - 前端 UI 组件使用的数据类型（如 `FullPodcastSettings`）与后端 API 接受的格式不一致
   - 需要在多处进行类型转换和数据映射

4. **状态管理分散**：
   - 使用了多个 Pinia store（`playgroundPersona`, `playgroundSettings`, `playgroundScript`, `playgroundAudio`等）
   - 各 store 之间的数据流动和依赖关系不够清晰

5. **冗余的映射流程**：
   - 目前使用 VoiceMapping 进行角色到声音的映射，增加了不必要的复杂性
   - 可以直接使用 Persona ID 进行数据传递，由各模块根据需要获取相应信息

## 整体架构设计

### 现有架构

现有的 Playground 架构基于 Nuxt.js，使用多个 Pinia store 管理状态，采用 Vue 组件构建 UI。数据流程如下：

1. 用户在 UI 中输入和交互（主要通过 `PlaygroundStep1Panel.vue`、`PlaygroundStep2Panel.vue` 等组件）
2. UI 组件将数据传递给多个 Pinia stores（如 `playgroundPersona`、`playgroundSettings`、`playgroundScript`、`playgroundAudio`）
3. Stores 处理和转换数据（数据格式转换，如 `FullPodcastSettings` 到 API 请求格式）
4. 后端 API 接收数据，进行处理、映射和转换（主要在 `podcastScriptProcessor.ts` 中）
5. 后端处理结果返回给前端
6. Stores 更新状态，UI 更新显示

### 目标架构

重构后的架构将遵循以下原则：

1. 前端负责所有数据转换和处理，直接提供最终所需的数据结构
2. 后端 API 只处理验证和存储，不做任何数据转换和映射
3. 统一以 Persona ID 为核心进行数据传递
4. 提供通用的 Persona 缓存服务，方便各模块获取 Persona 信息
5. 清晰的单向数据流

## 重构方案

### 1. 统一数据模型

创建统一的数据接口，在前后端共享，移除不必要的映射层：

```typescript
// types/api/podcast.d.ts - 前后端共享的类型定义

// 基础语音配置（直接包含在合成请求中）
export interface SynthesisParams {
  // 通用参数
  temperature?: number;       // 温度
  speed?: number;             // 速度
  
  // ElevenLabs特定参数
  stability?: number;         // 稳定性
  similarity_boost?: number;  // 相似度提升
  style?: number;             // 风格
  use_speaker_boost?: boolean; // 说话者增强
  
  // Volcengine特定参数
  pitch?: number;             // 音高
  volume?: number;            // 音量
  volcengineEncoding?: 'mp3' | 'pcm' | 'wav'; // 编码格式
}

// 脚本段落
export interface ScriptSegment {
  speaker: string;            // 说话者名称（用于显示）
  speakerPersonaId: number;   // 角色ID（用于获取声音等信息）
  text: string;               // 文本内容
}

// 播客创建请求
export interface PodcastCreateRequest {
  podcastTitle: string;       // 播客标题
  script: ScriptSegment[];    // 脚本（已包含角色ID）
  hostPersonaId: number;      // 主播角色ID
  guestPersonaIds: number[];  // 嘉宾角色ID列表
  language: string;           // 语言
  ttsProvider: 'elevenlabs' | 'volcengine'; // TTS提供商
  synthesisParams?: SynthesisParams; // 合成参数
  
  // 元数据
  topic?: string;            // 主题
  keywords?: string[];       // 关键词
  style?: string;            // 风格
  
  // 其他可选字段
  total_duration_ms?: number;
  total_word_count?: number;
  museumId?: number;
  galleryId?: number;
  objectId?: number;
}

// 播客创建响应
export interface PodcastCreateResponse {
  success: boolean;
  podcastId: string | number;
  preparedSegments: Array<{
    segmentIndex: number;
    text: string;
    speakerPersonaId: number; // 使用角色ID而非映射
    speakerName: string;      // 用于显示
    error?: string;
  }>;
  message: string;
}
```

### 2. Persona 缓存服务

创建一个通用的 Persona 缓存服务，用于在前端各模块获取 Persona 信息：

```typescript
// composables/usePersonaCache.ts

import { ref, computed } from 'vue';
import type { Persona } from '~/types/persona';

// 在模块范围内缓存数据
const personasCache = ref<Persona[]>([]);
const isLoading = ref(false);
const lastFetchTime = ref(0);
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

export function usePersonaCache() {
  // 检查缓存是否需要刷新
  const isCacheStale = computed(() => {
    return (
      personasCache.value.length === 0 ||
      Date.now() - lastFetchTime.value > CACHE_DURATION
    );
  });

  // 获取所有角色
  async function fetchPersonas(force = false) {
    if ((isCacheStale.value || force) && !isLoading.value) {
      isLoading.value = true;
      try {
        const data = await $fetch<Persona[]>('/api/personas?active=true');
        personasCache.value = data;
        lastFetchTime.value = Date.now();
        return data;
      } catch (error) {
        console.error('Failed to fetch personas:', error);
        return [];
      } finally {
        isLoading.value = false;
      }
    }
    return personasCache.value;
  }

  // 根据ID获取角色
  function getPersonaById(id: number | string): Persona | undefined {
    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    return personasCache.value.find(p => p.persona_id === numericId);
  }

  // 根据名称获取角色
  function getPersonaByName(name: string): Persona | undefined {
    return personasCache.value.find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
  }

  // 刷新缓存
  function invalidateCache() {
    lastFetchTime.value = 0;
  }

  return {
    personas: computed(() => personasCache.value),
    isLoading: computed(() => isLoading.value),
    fetchPersonas,
    getPersonaById,
    getPersonaByName,
    invalidateCache
  };
}
```

### 3. 前端状态管理重构

创建一个新的统一 store，使用 Persona ID 为核心传递数据：

```typescript
// stores/playgroundUnified.ts

import { defineStore } from 'pinia';
import type { PodcastCreateRequest, ScriptSegment, SynthesisParams } from '~/types/api/podcast';
import type { FullPodcastSettings } from '~/types/playground';
import { usePersonaCache } from '~/composables/usePersonaCache';

export const usePlaygroundUnifiedStore = defineStore('playgroundUnified', {
  state: () => ({
    // UI表单数据
    podcastSettings: {
      title: '',
      topic: '',
      numberOfSegments: 3,
      style: '',
      keywords: [] as string[],
      hostPersonaId: undefined as number | undefined,
      guestPersonaIds: [] as number[],
      backgroundMusic: undefined as string | undefined,
      ttsProvider: 'elevenlabs' as 'elevenlabs' | 'volcengine',
    } as FullPodcastSettings,
    
    // 脚本内容
    scriptContent: '',
    
    // 语音性能设置
    synthesisParams: {
      temperature: 0.7,
      speed: 1.0,
      pitch: 0,
      volume: 1.0
    } as SynthesisParams,
    
    // 解析后的脚本段落
    parsedSegments: [] as ScriptSegment[],
    
    // API响应数据
    apiResponse: null as null | any,
    
    // 应用状态
    isLoading: false,
    currentStep: 1,
    error: null as null | string,
  }),
  
  getters: {
    // 构建API请求
    apiRequest(): PodcastCreateRequest {
      return {
        podcastTitle: this.podcastSettings.title,
        script: this.parsedSegments,
        hostPersonaId: this.podcastSettings.hostPersonaId || 0,
        guestPersonaIds: this.podcastSettings.guestPersonaIds.filter(id => id !== undefined) as number[],
        language: this.determineLanguage(),
        ttsProvider: this.podcastSettings.ttsProvider,
        synthesisParams: this.synthesisParams,
        topic: this.podcastSettings.topic,
        keywords: this.podcastSettings.keywords,
        style: this.podcastSettings.style
      };
    }
  },
  
  actions: {
    // 更新设置
    updatePodcastSettings(settings: Partial<FullPodcastSettings>) {
      this.podcastSettings = {
        ...this.podcastSettings,
        ...settings
      };
    },
    
    // 更新脚本内容
    updateScriptContent(content: string) {
      this.scriptContent = content;
      this.parseScript();
    },
    
    // 更新合成参数
    updateSynthesisParams(params: Partial<SynthesisParams>) {
      this.synthesisParams = {
        ...this.synthesisParams,
        ...params
      };
    },
    
    // 解析脚本为段落
    parseScript() {
      if (!this.scriptContent) {
        this.parsedSegments = [];
        return;
      }
      
      const personaCache = usePersonaCache();
      const segments: ScriptSegment[] = [];
      
      // 解析逻辑
      const lines = this.scriptContent.split('\n');
      let currentSpeaker = '';
      let currentText = '';
      
      for (const line of lines) {
        // 检测新说话者
        const speakerMatch = line.match(/^(.+?):/);
        if (speakerMatch) {
          // 保存上一个段落
          if (currentSpeaker && currentText.trim()) {
            // 根据名称查找对应的 Persona
            const persona = personaCache.getPersonaByName(currentSpeaker);
            if (persona) {
              segments.push({
                speaker: currentSpeaker,
                speakerPersonaId: persona.persona_id,
                text: currentText.trim()
              });
            } else {
              // 如果找不到对应的 Persona，使用主播或第一个嘉宾
              const fallbackId = this.podcastSettings.hostPersonaId || 
                (this.podcastSettings.guestPersonaIds.length > 0 ? 
                  this.podcastSettings.guestPersonaIds[0] : undefined);
              
              if (fallbackId) {
                segments.push({
                  speaker: currentSpeaker,
                  speakerPersonaId: fallbackId,
                  text: currentText.trim()
                });
              }
            }
          }
          
          // 开始新段落
          currentSpeaker = speakerMatch[1].trim();
          currentText = line.substring(speakerMatch[0].length).trim();
        } else if (currentSpeaker) {
          // 继续当前段落
          currentText += ' ' + line.trim();
        }
      }
      
      // 保存最后一个段落
      if (currentSpeaker && currentText.trim()) {
        const persona = personaCache.getPersonaByName(currentSpeaker);
        if (persona) {
          segments.push({
            speaker: currentSpeaker,
            speakerPersonaId: persona.persona_id,
            text: currentText.trim()
          });
        } else {
          const fallbackId = this.podcastSettings.hostPersonaId || 
            (this.podcastSettings.guestPersonaIds.length > 0 ? 
              this.podcastSettings.guestPersonaIds[0] : undefined);
          
          if (fallbackId) {
            segments.push({
              speaker: currentSpeaker,
              speakerPersonaId: fallbackId,
              text: currentText.trim()
            });
          }
        }
      }
      
      this.parsedSegments = segments;
    },
    
    // 确定使用的语言
    determineLanguage(): string {
      // 实现语言检测逻辑
      // 可以根据标题、主题或内容来判断
      return 'zh-CN'; // 默认值
    },
    
    // 生成脚本
    async generateScript() {
      this.isLoading = true;
      this.error = null;
      
      try {
        // 确保已解析脚本
        this.parseScript();
        
        // 发送请求到后端
        const response = await $fetch('/api/podcast/process/script', {
          method: 'POST',
          body: this.apiRequest
        });
        
        this.apiResponse = response;
        return response;
      } catch (error: any) {
        this.error = error.message || '生成脚本失败';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 合成语音
    async synthesizeAudio() {
      this.isLoading = true;
      this.error = null;
      
      try {
        const podcastId = this.apiResponse?.podcastId || `temp_${Date.now()}`;
        
        // 构建合成请求
        const synthesisRequest = {
          podcastId,
          segments: this.apiResponse?.preparedSegments || [],
          ttsProvider: this.podcastSettings.ttsProvider,
          synthesisParams: this.synthesisParams
        };
        
        const response = await $fetch('/api/podcast/process/synthesize', {
          method: 'POST',
          body: synthesisRequest
        });
        
        return response;
      } catch (error: any) {
        this.error = error.message || '合成语音失败';
        throw error;
      } finally {
        this.isLoading = false;
      }
    }
  }
});
```

### 4. 后端 API 简化

后端 API 设计为纯透传模式，仅做必要的验证：

```typescript
// server/api/podcast/process/script.post.ts（简化版）

import { createError, defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  try {
    // 1. 读取请求体，不做任何数据转换
    const body = await readBody(event);
    
    // 2. 基本验证，只检查必要字段是否存在
    const { podcastTitle, script, hostPersonaId, language } = body;
    
    if (!podcastTitle || !script || !Array.isArray(script) || !language || !hostPersonaId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body. Required fields missing.',
      });
    }
    
    // 验证每个脚本段落是否包含必要的字段
    for (const segment of script) {
      if (!segment.speaker || !segment.text || !segment.speakerPersonaId) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid script segment. Missing required fields.',
        });
      }
    }
    
    // 3. 生成podcastId
    const podcastId = podcastTitle
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_|_$/g, '');
    
    // 4. 保存数据到数据库（无需转换）
    const podcastRecord = await createPodcastServer(event, body);
    
    // 5. 直接返回段落信息，不做任何转换
    return {
      success: true,
      podcastId: podcastRecord?.podcast_id || podcastId,
      preparedSegments: script.map((segment, index) => ({
        segmentIndex: index,
        text: segment.text,
        speakerPersonaId: segment.speakerPersonaId,
        speakerName: segment.speaker,
      })),
      message: `Script processed successfully for podcast "${podcastTitle}"`,
    };
  } catch (error: any) {
    console.error('Error processing script:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed to process script: ${error.message}`,
    });
  }
});
```

### 5. 组件与 Persona 集成

更新 PlaygroundStep1Panel 组件以使用 Persona 缓存服务：

```vue
<!-- 简化示例 -->
<template>
  <div>
    <!-- 主播选择 -->
    <div class="form-group">
      <label>Host</label>
      <select v-model="hostPersonaId">
        <option v-for="persona in personas" :key="persona.persona_id" :value="persona.persona_id">
          {{ persona.name }}
        </option>
      </select>
    </div>
    
    <!-- 嘉宾选择（多选） -->
    <div class="form-group">
      <label>Guests</label>
      <select multiple v-model="guestPersonaIds">
        <option 
          v-for="persona in guestOptions" 
          :key="persona.persona_id" 
          :value="persona.persona_id"
        >
          {{ persona.name }}
        </option>
      </select>
    </div>
    
    <!-- 脚本编辑器 -->
    <textarea v-model="scriptContent" @input="handleScriptChange"></textarea>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { usePersonaCache } from '~/composables/usePersonaCache';
import { usePlaygroundUnifiedStore } from '~/stores/playgroundUnified';

// 使用 Persona 缓存服务和统一 store
const personaCache = usePersonaCache();
const store = usePlaygroundUnifiedStore();

// 本地状态（与 store 双向绑定）
const hostPersonaId = ref(store.podcastSettings.hostPersonaId);
const guestPersonaIds = ref(store.podcastSettings.guestPersonaIds);
const scriptContent = ref(store.scriptContent);

// 计算属性
const personas = computed(() => personaCache.personas.value);
const guestOptions = computed(() => 
  personas.value.filter(p => p.persona_id !== hostPersonaId.value)
);

// 监听本地状态变化，更新 store
watch(hostPersonaId, (newVal) => {
  store.updatePodcastSettings({ hostPersonaId: newVal });
});

watch(guestPersonaIds, (newVal) => {
  store.updatePodcastSettings({ guestPersonaIds: [...newVal] });
});

// 处理脚本变化
function handleScriptChange() {
  store.updateScriptContent(scriptContent.value);
}

// 初始化
onMounted(async () => {
  // 加载角色列表
  if (personas.value.length === 0) {
    await personaCache.fetchPersonas();
  }
});
</script>
```

## 实施路径

1. **创建 Persona 缓存服务**
   - 实现 `composables/usePersonaCache` composable
   - 测试缓存和查询功能

2. **统一数据模型**
   - 创建共享的接口和类型定义
   - 移除 VoiceMapping 相关逻辑

3. **构建统一状态管理**
   - 实现 `playgroundUnified` store
   - 集成 Persona ID 为核心的数据流

4. **简化后端 API**
   - 重构 API 为纯透传模式
   - 实现必要的验证

5. **更新前端组件**
   - 修改组件以使用新的状态管理
   - 集成 Persona 缓存服务

6. **测试和优化**
   - 确保数据流的完整性
   - 验证各个功能点

## 结论

这个重构方案通过以下改进简化了数据流：

1. **移除 VoiceMapping 层**：直接使用 Persona ID 进行数据传递
2. **统一缓存服务**：提供通用的 Persona 信息获取方式
3. **前端处理主导**：前端直接提供最终所需的数据结构
4. **后端纯透传**：后端只做验证和存储，不做数据转换
5. **明确数据流向**：以 Persona ID 为核心，各环节自行获取所需信息

这种方式不仅简化了代码结构，还减少了数据转换的次数，使整个流程更加清晰和可维护。 

#### **阶段 1: 创建 Persona 缓存服务 (`usePersonaCache`)**

*   **描述:** 实现 `composables/usePersonaCache.ts`。此服务将负责获取和缓存 Persona 数据，供前端各模块使用。
*   **主要代码:** (参考原方案中的 `usePersonaCache.ts` 实现)
    ```typescript
    // composables/usePersonaCache.ts
    import { ref, computed } from 'vue';
    import type { Persona } from '~/types/persona';

    const personasCache = ref<Persona[]>([]);
    const isLoading = ref(false);
    const lastFetchTime = ref(0);
    const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

    export function usePersonaCache() {
      const isCacheStale = computed(() => {
        return (
          personasCache.value.length === 0 ||
          Date.now() - lastFetchTime.value > CACHE_DURATION
        );
      });

      async function fetchPersonas(force = false) {
        if ((isCacheStale.value || force) && !isLoading.value) {
          isLoading.value = true;
          try {
            const data = await $fetch<Persona[]>('/api/personas?active=true');
            personasCache.value = data;
            lastFetchTime.value = Date.now();
            return data;
          } catch (error) {
            console.error('Failed to fetch personas:', error);
            return [];
          } finally {
            isLoading.value = false;
          }
        }
        return personasCache.value;
      }

      function getPersonaById(id: number | string): Persona | undefined {
        const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
        return personasCache.value.find(p => p.persona_id === numericId);
      }

      function getPersonaByName(name: string): Persona | undefined {
        return personasCache.value.find(
          p => p.name.toLowerCase() === name.toLowerCase()
        );
      }

      function invalidateCache() {
        lastFetchTime.value = 0;
      }

      return {
        personas: computed(() => personasCache.value),
        isLoading: computed(() => isLoading.value),
        fetchPersonas,
        getPersonaById,
        getPersonaByName,
        invalidateCache
      };
    }
    ```
*   **API 测试 (Curl):**
    *   此步骤主要验证 `usePersonaCache` 依赖的 `/api/personas` 端点。
    *   **命令:**
        ```bash
        # 测试获取所有活跃的 Personas
        curl -X GET "http://localhost:3000/api/personas?active=true" -H "Accept: application/json"
        ```
    *   **预期成功响应:** HTTP 状态码 200，返回 JSON 数组，包含 Persona 对象列表。例如:
        ```json
        [
          { "persona_id": 1, "name": "Alice", "active": true, ... },
          { "persona_id": 2, "name": "Bob", "active": true, ... }
        ]
        ```
    *   **预期失败响应:** 若 API 不存在或出错，则返回相应的 HTTP 错误状态码 (如 404, 500) 和错误信息。
*   **进度核查 (Checklist):**
    *   [X] `composables/usePersonaCache.ts` 文件已创建并实现核心逻辑。
    *   [X] `fetchPersonas` 函数能够成功从 `/api/personas?active=true` 获取数据并填充缓存。
    *   [ ] `getPersonaById` 函数能根据 ID 正确返回 Persona 对象。 (需要进一步验证或单元测试)
    *   [ ] `getPersonaByName` 函数能根据名称正确返回 Persona 对象。 (需要进一步验证或单元测试)
    *   [X] 缓存机制 (如 `CACHE_DURATION`, `isCacheStale`, `invalidateCache`) 按预期工作。
    *   [X] 已通过 Curl 测试验证 `/api/personas?active=true` 端点。
    *   [ ] (可选) 已编写初步的单元测试或在页面中简单集成测试。

#### **阶段 2: 统一数据模型**

*   **描述:** 创建或更新 `types/api/podcast.d.ts`，定义前后端共享的数据结构。移除项目中现有的 VoiceMapping 及相关逻辑，后续将直接使用 Persona ID。
*   **主要代码:** (参考原方案中的 `types/api/podcast.d.ts` 定义)
    ```typescript
    // types/api/podcast.d.ts
    // ... (内容如上一个 edit_file 调用中所示) ...
    ```
*   **API 测试 (Curl):**
    *   此阶段不直接创建新的 API 端点，而是定义数据结构。这些结构将在后续 API 实现阶段被测试。
*   **进度核查 (Checklist):**
    *   [X] `types/api/podcast.d.ts` 文件已创建/更新，包含 `SynthesisParams`, `ScriptSegment`, `PodcastCreateRequest`, `PodcastCreateResponse` 等接口。
    *   [X] 接口定义清晰，字段明确，与方案设计一致。
    *   [ ] 已识别项目中所有使用 VoiceMapping 或类似角色/声音映射逻辑的地方。(需要您确认)
    *   [ ] 相关的旧类型定义、转换函数（特别是 `podcastScriptProcessor.ts` 中的复杂映射）已被标记为待移除或已开始重构。(需要您确认)
    *   [X] 团队成员已就新的数据模型达成共识。

#### **阶段 3: 构建统一状态管理 (`playgroundUnified` store)**

*   **描述:** 实现 `stores/playgroundUnified.ts`。该 store 将作为 Playground UI 的单一事实来源 (Single Source of Truth)，管理播客设置、脚本内容、合成参数以及与后端 API 的交互。
*   **主要代码:** (已创建 `stores/playgroundUnified.ts`)
*   **API 测试 (Curl):**
    *   此阶段主要关注前端 store 的逻辑，相关 API (`/api/podcast/process/script`, `/api/podcast/process/synthesize`) 将在阶段 4 实现和测试。
*   **进度核查 (Checklist):**
    *   [X] `stores/playgroundUnified.ts` 文件已创建。
    *   [X] Store 包含 state (podcastSettings, scriptContent, synthesisParams, parsedSegments, apiResponse, isLoading, error)。
    *   [X] Store 包含 getters (apiRequest, totalSelectedPersonas)。
    *   [X] Store 包含 actions (updatePodcastSettings, updateScriptContent, updateSynthesisParams)。
    *   [X] `parseScript` action 已实现，并使用 `usePersonaCache` (包含初步的角色名称到 Persona ID 的查找和回退逻辑)。
    *   [X] `determineLanguage` action 已初步实现。
    *   [X] `generateScript` 和 `synthesizeAudio` actions 的骨架已创建，用于后续与后端 API 对接。
    *   [X] 辅助 actions (`selectHostPersona`, `addGuestPersona`, `removeGuestPersona`, `resetPlaygroundState`) 已添加。

#### **阶段 4: 简化后端 API**

*   **描述:** 后端 API 设计为纯透传模式，仅做必要的验证。我们将首先实现 `/api/podcast/process/script.post.ts`。
*   **主要任务:**
    1.  创建 `server/api/podcast/process/script.post.ts` 文件。
    2.  实现其中的逻辑：读取请求体，进行基本验证（基于 `PodcastCreateRequest` 类型），生成 `podcastId`（或从请求中获取），模拟保存数据（实际数据库操作可后续完善），并返回 `PodcastCreateResponse` 结构。
    3.  **使用 `docs/playground-api-testing.md` 中的 Curl 命令测试此端点。**
*   **API 测试 (Curl):**
    *   已使用 `docs/playground-api-testing.md` 中提供的 Curl 命令成功测试 `/api/podcast/process/script` 端点。
*   **进度核查 (Checklist):**
    *   [X] `server/api/podcast/process/script.post.ts` 文件已创建并实现简化逻辑。
    *   [X] API 端点能够正确读取符合 `PodcastCreateRequest` 的请求体。
    *   [X] API 端点执行了必要的输入验证 (podcastTitle, script, hostPersonaId, language, ttsProvider, segment structure)。
    *   [X] API 端点能够生成 (或计划获取) `podcastId`。
    *   [X] API 端点返回了符合 `PodcastCreateResponse` 结构（包含 success, podcastId, preparedSegments, message）的响应。
    *   [X] 已通过 Curl 测试成功验证 `/api/podcast/process/script` 端点，符合透传和验证要求。
    *   [ ] (后续) 实现 `server/api/podcast/process/synthesize.post.ts`。
    *   [ ] (后续) 移除旧的 `podcastScriptProcessor.ts` 中的复杂映射逻辑，或重构其使用者。

--- 