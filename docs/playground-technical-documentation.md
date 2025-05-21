# Playground 技术文档（进阶版）

## 1. 系统架构与定位

Playground 是 Hugo Tour Dashboard 的核心播客生产工具，采用前后端分离、模块化、强交互设计，旨在为用户和开发者提供一站式播客脚本生成、角色分配、语音合成、最终音频输出的完整流水线。

- **前端**：Nuxt 3 + Vue 3 + shadcn/vue，组件化分步引导，强类型 TypeScript 支持。
- **后端**：Nuxt server API，Supabase/PostgreSQL 持久化，TTS 服务（ElevenLabs/Google Cloud TTS）。
- **状态管理**：Pinia，分 Store 维护脚本、角色、合成、流程状态。

## 2. 组件与交互流程

### 2.1 主要组件与职责

| 组件名                       | 主要职责                                                         |
|------------------------------|------------------------------------------------------------------|
| PlaygroundStepper.vue        | 步骤导航，控制流程进度，状态切换                                  |
| PlaygroundStep1Panel.vue     | 播客设置、脚本生成与编辑，角色选择                                |
| PodcastSettingsForm.vue      | 语言、段落数、主持人/嘉宾选择，表单校验                          |
| PlaygroundStep2Panel.vue     | 语音参数设置、分段语音合成、角色分配、音频预览                    |
| VoicePerformanceSettings.vue | 语音合成参数（温度、速度）、角色与段落映射、分段试听              |
| PlaygroundStep3Panel.vue     | 最终音频展示、下载、合成状态提示                                  |
| PlaygroundFooterActions.vue  | 步骤底部操作按钮（上一步/下一步/生成/重试等）                    |

### 2.2 端到端用户流程

1. **Step 1：播客设置与脚本生成**
   - 选择语言、段落数、主持人/嘉宾（支持按语言过滤）
   - 编辑或自动生成脚本（可集成 LLM）
   - 校验脚本结构，自动分段
   - 数据流：表单数据 → Pinia Store → `/api/podcast/process/validate` → 结构化脚本

2. **Step 2：语音参数与分段合成**
   - 设置全局/分段语音参数（温度、速度等）
   - 分配每段发言人对应的 persona（支持拖拽/下拉）
   - 逐段调用 `/api/podcast/process/synthesize-segments` 合成音频
   - 实时进度与试听，失败可重试
   - 数据流：结构化脚本+参数 → Pinia Store → API → 音频 URL 存储

3. **Step 3：音频合成与输出**
   - 调用 `/api/podcast/process/timeline` 生成时间线
   - `/api/podcast/process/merge` 合并所有片段为完整音频
   - 展示最终音频，支持下载/分享

### 2.3 组件与 API 调用关系

- 所有表单/参数变更均通过 Pinia Store 统一流转
- 组件间通过 props/emits 及 Store 响应式联动
- 关键 API 端点：
  - `/api/podcast/process/validate`（脚本结构化）
  - `/api/podcast/process/script`（脚本入库+段落分配）
  - `/api/podcast/process/synthesize-segments`（分段音频合成）
  - `/api/podcast/process/timeline`（生成合成时间线）
  - `/api/podcast/process/merge`（最终音频合成）

## 3. 状态管理与类型设计

### 3.1 Pinia Store 设计

- **podcastScriptStore**：管理原始脚本、结构化片段、验证状态、错误信息
- **personaStore**：管理所有 personas 列表、选中 persona、按语言过滤
- **audioSynthesisStore**：管理语音参数、合成进度、音频 URL、失败重试
- **uiFlowStore**：管理当前步骤、流程状态、全局 loading/error

### 3.2 关键类型定义（TypeScript）

```ts
export interface Persona {
  persona_id: number;
  name: string;
  voice_model_identifier: string;
  language_support?: string[];
  avatar_url?: string;
}

export interface ScriptSegment {
  speaker: string;
  text: string;
}

export interface PreparedSegmentForSynthesis {
  segmentIndex: number;
  text: string;
  voiceId: string;
  speakerName: string;
  error?: string;
}

export interface SynthesizeRequestBody {
  podcastId: string;
  segments: Array<{
    segmentIndex: number;
    text: string;
    voiceId: string;
    speakerName: string;
  }>;
  synthesisParams?: Record<string, any>;
}
```

## 4. 典型开发场景与端到端集成

### 4.1 新增支持的 TTS 提供商

1. 在 `server/services/tts/factory.ts` 注册新 provider
2. 实现 `TextToSpeechProvider` 接口（见 types.ts）
3. 在前端 VoicePerformanceSettings.vue 增加 provider 切换与参数配置

### 4.2 自定义脚本生成/编辑

- 在 Step1 支持 LLM 生成脚本（如 OpenAI/Gemini）
- 支持用户手动编辑，自动分段与角色标注
- 可扩展脚本模板与批量导入

### 4.3 角色与语音模型扩展

- 支持多语言 persona 过滤与优先级
- 支持自定义 persona 上传与语音模型绑定
- 支持 persona 头像与描述扩展

### 4.4 端到端开发流程（伪代码）

```ts
// Step1: 结构化脚本
const { structuredData } = await $fetch('/api/podcast/process/validate', { body: ... });

// Step2: 逐段合成
const { generatedSegments } = await $fetch('/api/podcast/process/synthesize-segments', { body: ... });

// Step3: 合成时间线与最终音频
await $fetch('/api/podcast/process/timeline', { body: { podcastId } });
await $fetch('/api/podcast/process/merge', { body: { podcastId } });
```

## 5. 常见问题与调试建议

### 5.1 角色/发言人匹配失败
- 检查脚本中的 speaker 字段与 persona.name 是否一致（支持 Unicode 解码、标准化）
- 查看 voiceMap 映射与 API 日志

### 5.2 合成失败/进度卡死
- 检查 TTS provider 配置与网络
- 检查 segment 字数、参数是否合法
- 查看后端 consola 日志

### 5.3 状态同步/组件通信异常
- 优先用 Pinia Store 作为单一数据源
- 组件间只传递必要 props，避免多向依赖
- 用 Vue DevTools 检查响应式依赖链

## 6. 最佳实践与扩展建议

- 单一职责组件，文件不超过 400 行，复杂逻辑抽出 composable
- 所有 API 调用必须有 loading/error 状态反馈
- 支持分段重试与失败提示，提升用户体验
- 关键流程与接口建议补充单元测试
- 持续完善类型定义，避免 any，提升可维护性

## 7. 未来规划

- 支持多用户协作与草稿保存
- 支持更丰富的播客模板与批量生产
- 支持音频后期处理与自动配乐
- 支持 AI 驱动的内容优化与自动 QA

---

如需进一步集成或遇到具体开发问题，建议先查阅本文件和 `/content/docs/podcast-process-api-docs.md`，如仍有疑问可联系核心开发者或提交 issue。
#### 2.2.3 PlaygroundStep2Panel.vue

负责第二步的用户界面，专注于语音合成和音频预览功能。

**关键特性**:
- 语音表现设置
- 音频预览控制
- 合成进度显示

#### 2.2.4 PlaygroundStep3Panel.vue

负责第三步的用户界面，展示最终合成的播客音频。

**关键特性**:
- 最终音频播放器
- 合成状态显示
- 播客元数据展示

#### 2.2.5 PodcastSettingsForm.vue

提供播客基本设置的表单界面，包括语言选择、主持人/嘉宾选择等。

**关键特性**:
- 语言选择与过滤
- Persona（角色）选择
- 根据语言筛选可用角色

#### 2.2.6 VoicePerformanceSettings.vue

提供语音合成的高级设置，如语速、音调等参数控制。

**关键特性**:
- 语音参数调整（温度、速度）
- 脚本段落与角色匹配
- 分段音频预览

## 3. 数据流与状态管理

### 3.1 状态管理架构

Playground 模块使用 Pinia Store 进行状态管理，主要包含以下几个 Store：

#### 3.1.1 脚本管理 Store

负责管理脚本内容、验证状态和处理结果。

**主要状态**:
- 原始脚本内容
- 结构化脚本数据
- 验证状态与结果

#### 3.1.2 音频合成 Store

负责管理音频合成参数、进度和结果。

**主要状态**:
- 合成参数（温度、速度等）
- 合成进度
- 音频文件 URL

#### 3.1.3 Persona Store

负责管理角色数据和选择状态。

**主要状态**:
- 可用角色列表
- 选中的主持人/嘉宾
- 角色加载状态

### 3.2 数据流向

1. **用户输入** → PodcastSettingsForm.vue → 脚本管理 Store
2. **脚本验证** → API 请求 → 脚本管理 Store → PlaygroundStep1Panel.vue
3. **语音设置** → VoicePerformanceSettings.vue → 音频合成 Store
4. **音频合成** → API 请求 → 音频合成 Store → PlaygroundStep2Panel.vue
5. **最终音频** → 音频合成 Store → PlaygroundStep3Panel.vue

## 4. API 集成

### 4.1 脚本处理 API

#### 4.1.1 脚本验证 API

```typescript
// 验证脚本内容并结构化
const validateScript = async (data: {
  title: string;
  rawScript: string;
  personas: {
    hostPersona: Persona;
    guestPersonas?: Persona[];
  };
}) => {
  return await $fetch('/api/podcast/process/validate', {
    method: 'POST',
    body: data
  });
};
```

#### 4.1.2 脚本处理 API

```typescript
// 处理脚本并创建数据库记录
const processScript = async (data: {
  podcastTitle: string;
  script: ScriptSegment[];
  personas: {
    hostPersona?: Persona;
    guestPersonas?: Persona[];
  };
  language: string;
}) => {
  return await $fetch('/api/podcast/process/script', {
    method: 'POST',
    body: data
  });
};
```

### 4.2 音频合成 API

#### 4.2.1 段落合成 API

```typescript
// 合成单个或多个段落的音频
const synthesizeSegments = async (data: {
  podcastId: string;
  segments: {
    segmentIndex: number;
    text: string;
    voiceId: string;
    speakerName: string;
  }[];
  synthesisParams?: {
    temperature?: number;
    speed?: number;
  };
}) => {
  return await $fetch('/api/podcast/process/synthesize-segments', {
    method: 'POST',
    body: data
  });
};
```

#### 4.2.2 时间线生成 API

```typescript
// 生成播客时间线
const generateTimeline = async (data: {
  podcastId: string;
}) => {
  return await $fetch('/api/podcast/process/timeline', {
    method: 'POST',
    body: data
  });
};
```

#### 4.2.3 音频合并 API

```typescript
// 合并所有段落音频为完整播客
const mergeAudio = async (data: {
  podcastId: string;
}) => {
  return await $fetch('/api/podcast/process/merge', {
    method: 'POST',
    body: data
  });
};
```

## 5. 关键流程详解

### 5.1 播客创建流程

1. **设置与脚本生成**
   - 用户选择语言和角色
   - 系统根据选择的语言筛选可用角色
   - 用户编辑或生成脚本内容
   - 系统验证脚本格式和结构

2. **语音合成与预览**
   - 系统解析脚本，识别发言人
   - 将发言人匹配到选定的角色
   - 用户调整语音参数（温度、速度等）
   - 系统合成各段落音频并提供预览

3. **最终合成与展示**
   - 系统生成完整播客时间线
   - 合并所有段落音频为单个文件
   - 展示最终播客音频供用户播放和下载

### 5.2 角色匹配算法

Playground 使用多级匹配策略来将脚本中的发言人与系统角色匹配：

1. **精确匹配**: 直接匹配发言人名称与角色名称
2. **Unicode 解码匹配**: 解码可能的 Unicode 转义序列后再匹配
3. **标准化匹配**: 转小写并移除空格后匹配
4. **角色类型匹配**: 根据角色类型（主持人/嘉宾）进行智能匹配
5. **自动选择**: 如果无法匹配，则自动选择合适的角色

### 5.3 音频合成流程

1. **准备阶段**
   - 解析脚本，提取段落和发言人
   - 为每个发言人匹配语音模型 ID
   - 准备合成参数（温度、速度等）

2. **合成阶段**
   - 调用 TTS 服务 API（ElevenLabs 或 Google）
   - 接收音频数据和时间戳信息
   - 存储音频文件和时间戳文件

3. **后处理阶段**
   - 生成播客时间线
   - 合并所有段落音频
   - 更新数据库记录状态

## 6. 性能优化与最佳实践

### 6.1 性能优化策略

1. **懒加载组件**
   - 使用 Vue 的动态导入功能懒加载大型组件
   - 仅在需要时加载音频处理相关组件

2. **分批处理**
   - 大型脚本分批处理，避免一次性处理过多段落
   - 音频合成采用队列机制，控制并发请求数量

3. **缓存策略**
   - 缓存已合成的音频段落，避免重复合成
   - 使用 localStorage 存储临时编辑状态

### 6.2 开发最佳实践

1. **组件设计原则**
   - 单一职责原则：每个组件专注于特定功能
   - 组件文件不超过 400 行代码
   - 使用组合式 API 和组合式函数提高代码复用

2. **错误处理**
   - 全面的错误捕获和处理机制
   - 友好的错误提示和恢复选项
   - 详细的日志记录，便于调试

3. **可访问性**
   - 支持键盘导航
   - 适当的 ARIA 属性
   - 高对比度模式支持

## 7. 扩展与集成指南

### 7.1 添加新的 TTS 提供商

1. 创建新的 TTS 提供商类，实现 `TextToSpeechProvider` 接口
2. 在 `factory.ts` 中注册新的提供商
3. 更新 UI 组件，添加新提供商的选项和特定参数

### 7.2 自定义脚本生成

1. 实现自定义的脚本生成服务
2. 在 `PlaygroundStep1Panel.vue` 中添加新的生成选项
3. 连接到相应的 API 端点

### 7.3 集成新的音频处理功能

1. 创建新的音频处理组件
2. 在 `VoicePerformanceSettings.vue` 中添加新的控制选项
3. 更新音频合成 Store 以支持新参数

## 8. 故障排除与常见问题

### 8.1 常见问题

1. **角色匹配失败**
   - 检查脚本中的发言人名称格式
   - 确保已选择合适的主持人和嘉宾角色
   - 尝试使用更标准化的发言人标记

2. **音频合成失败**
   - 检查 TTS 服务 API 密钥和配额
   - 验证语音模型 ID 是否有效
   - 检查网络连接和服务状态

3. **性能问题**
   - 减少一次处理的段落数量
   - 优化脚本长度和复杂度
   - 检查浏览器内存使用情况

### 8.2 调试技巧

1. 使用浏览器开发者工具监控网络请求
2. 检查控制台日志中的警告和错误
3. 使用 Vue DevTools 检查组件状态和 Pinia Store

## 9. 未来发展路线图

1. **多语言支持增强**
   - 扩展支持更多语言
   - 改进跨语言角色匹配算法

2. **高级音频编辑**
   - 添加音频效果和后期处理
   - 支持背景音乐和音效

3. **批量处理功能**
   - 支持批量生成多个播客
   - 提供模板系统

4. **实时协作**
   - 多用户同时编辑支持
   - 变更历史和版本控制
