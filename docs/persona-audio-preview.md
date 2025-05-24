# Persona Audio Preview Feature

## 概述

此功能为Persona卡片添加了语音试听功能。当Persona已生成过语音时，用户可以在卡片上直接试听最新的音频样本。

## 数据关联机制

### 层层关联的数据结构

```
1. Persona (人物档案)
   ↓ (通过name字段关联)
2. podcast_segments.speaker (片段发言人)
   ↓ (通过segment_text_id关联)
3. segment_audios.segment_id (音频片段)
   ↓ (包含实际的音频文件)
4. segment_audios.audio_url (音频文件URL)
```

### 关联查询逻辑

```sql
SELECT 
  personas.name,
  podcast_segments.*,
  segment_audios.*
FROM personas
JOIN podcast_segments ON personas.name = podcast_segments.speaker
JOIN segment_audios ON podcast_segments.segment_text_id = segment_audios.segment_id
WHERE personas.persona_id = ? 
  AND segment_audios.audio_url IS NOT NULL
ORDER BY segment_audios.created_at DESC
LIMIT 5
```

## 技术实现

### 1. 后端API

**文件**: `server/api/personas/[id]/audio-samples.get.ts`

- 获取指定Persona的音频样本
- 通过多表关联查询找到对应的音频文件
- 返回最多5个最新的音频样本

**响应格式**:
```typescript
interface AudioSamplesResponse {
  success: boolean
  persona_id: number
  persona_name: string
  samples: AudioSample[]
  message: string
}

interface AudioSample {
  audio_url: string
  segment_text: string
  created_at: string
  podcast_title?: string
  duration_ms?: number
}
```

### 2. 前端Composable

**文件**: `composables/usePersonaAudioPreview.ts`

核心功能：
- **缓存管理**: 避免重复请求相同Persona的音频数据
- **播放控制**: 支持播放/暂停，自动停止其他正在播放的音频
- **预加载**: 可批量预加载多个Persona的音频样本
- **状态跟踪**: 跟踪加载状态和播放状态

主要方法：
```typescript
// 检查是否有音频样本
hasAudioSamples(personaId: number): boolean

// 获取预览样本（最新的音频）
getPreviewSample(personaId: number): AudioSample | null

// 获取音频样本
fetchAudioSamples(personaId: number): Promise<AudioSample[]>

// 播放/暂停切换
toggleAudioPlayback(personaId: number): Promise<void>

// 批量预加载
preloadAudioSamples(personaIds: number[]): Promise<void>
```

### 3. UI组件更新

**文件**: `components/PersonaCard.vue`

**新增功能**:
- 音频试听按钮
- 播放状态指示
- 音频信息显示（时长、文本预览）
- 自动检测Persona是否配置了语音

**显示逻辑**:
```typescript
// 只有当Persona配置了语音且有音频样本时才显示试听区域
const shouldShowAudioSection = computed(() => {
  const hasVoiceConfig = persona.voice_model_identifier && persona.tts_provider
  return hasVoiceConfig && (hasAudioPreview || isLoadingAudio)
})
```

**UI元素**:
- 🔊 播放按钮（动态显示播放/暂停状态）
- 音频时长显示
- 片段文本预览（最多50字符）
- 播客标题（如果有）

## 用户体验

### 1. 自动行为
- **预加载**: 页面加载时自动为配置了语音的活跃Persona预加载音频样本
- **智能显示**: 只有真正有音频可用时才显示试听区域
- **状态反馈**: 加载时显示spinner，播放时显示停止按钮

### 2. 交互设计
- **一键试听**: 点击播放按钮即可试听最新音频样本
- **自动停止**: 播放新音频时自动停止其他正在播放的音频
- **时长限制**: 试听最长10秒，防止过长播放
- **错误处理**: 网络或音频错误时显示友好提示

### 3. 性能优化
- **按需加载**: 只为需要的Persona加载音频数据
- **缓存机制**: 避免重复请求相同数据
- **资源清理**: 组件卸载时清理音频资源

## 测试

### 测试页面
**文件**: `pages/test/persona-audio.vue`

提供完整的测试环境：
- 显示所有Persona及其语音配置状态
- 过滤器（状态、语音配置）
- 实时状态监控
- 调试信息显示

### 测试访问
```
http://localhost:3000/test/persona-audio
```

## 安全考虑

1. **API权限**: 需要适当的身份验证和权限检查
2. **文件访问**: 音频文件路径需要验证，防止路径遍历攻击
3. **资源限制**: 限制单次返回的音频样本数量
4. **错误处理**: 不暴露敏感的服务器错误信息

## 扩展可能

1. **音频格式支持**: 支持更多音频格式（目前主要支持常见Web音频格式）
2. **播放列表**: 支持播放Persona的多个音频样本
3. **音频可视化**: 添加音频波形或频谱显示
4. **分享功能**: 允许分享特定Persona的音频样本
5. **音质选择**: 支持不同音质的音频版本

## 故障排查

### 常见问题

1. **音频不显示**
   - 检查Persona是否配置了`voice_model_identifier`和`tts_provider`
   - 确认数据库中存在相关的音频记录
   - 检查API是否正常返回数据

2. **播放失败**
   - 检查音频文件URL是否可访问
   - 确认浏览器支持该音频格式
   - 检查网络连接和CORS设置

3. **性能问题**
   - 检查是否预加载了过多Persona的音频
   - 确认音频文件大小合理
   - 检查缓存是否正常工作

### 调试工具

使用测试页面的调试信息查看：
- 音频样本加载状态
- 当前播放状态
- 缓存数据情况
- 网络请求状态 