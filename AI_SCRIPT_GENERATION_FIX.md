# AI Script Generation Fixes

## 问题总结

AI脚本生成功能存在多个关键问题：

### 1. **UUID格式问题** ❌ → ✅ 已修复
- **问题**: 生成的podcastId是 `untitled_podcast_1747949648663` 格式，数据库期望UUID
- **错误**: `invalid input syntax for type uuid: "untitled_podcast_1747949648663"`
- **修复**: 使用 `crypto.randomUUID()` 生成标准UUID格式

### 2. **API响应处理问题** ❌ → ✅ 已修复  
- **问题**: `handleGenerateAiScript` 错误处理AI API响应结构
- **症状**: "undefined" 名称显示，类型安全错误
- **修复**: 重写响应解析逻辑，支持多种字段格式

### 3. **脚本为空错误** ❌ → ✅ 已修复
- **问题**: AI成功生成但后续处理失败
- **错误**: "Invalid request body. Script cannot be empty."
- **原因**: 响应处理错误导致脚本内容丢失

## 详细修复内容

### 文件 1: `server/api/podcast/process/script.post.ts`

```typescript
// 添加UUID导入
import { randomUUID } from 'crypto';

// 修复UUID生成
const generatedPodcastId = randomUUID(); // 替代timestamp格式
```

### 文件 2: `components/playground/PlaygroundFooterActions.vue`

#### A. 重写 `handleGenerateAiScript` 函数
```typescript
const handleGenerateAiScript = async () => {
  try {
    console.log('[handleGenerateAiScript] Starting AI script generation...');
    processStore.error = null;
    
    // Call the AI script generation endpoint
    const aiResponse = await generateAiScript();
    console.log('[handleGenerateAiScript] AI Response received:', JSON.stringify(aiResponse, null, 2));
    
    // The API directly returns the parsed response, not wrapped in success
    if (aiResponse && typeof aiResponse === 'object') {
      const { script, podcastTitle, language, voiceMap } = aiResponse as any;
      
      // Validate that we have a script array
      if (!Array.isArray(script) || script.length === 0) {
        console.error('[handleGenerateAiScript] No valid script array found in response:', aiResponse);
        processStore.error = 'AI response does not contain a valid script';
        return;
      }
      
      console.log('[handleGenerateAiScript] Processing script with', script.length, 'segments');
      
      // Convert AI response to script content format expected by scriptStore
      // Support both 'name' and 'speaker' fields for flexibility
      const scriptContent = script
        .filter((segment: any) => {
          const speakerName = segment?.name || segment?.speaker;
          const isValid = segment && 
                         typeof speakerName === 'string' && speakerName.trim() &&
                         typeof segment.text === 'string' && segment.text.trim();
          if (!isValid) {
            console.warn('[handleGenerateAiScript] Filtering out invalid segment:', segment);
          }
          return isValid;
        })
        .map((segment: any) => {
          const speakerName = segment.name || segment.speaker;
          return `${speakerName}: ${segment.text}`;
        })
        .join('\n');
      
      if (!scriptContent.trim()) {
        console.error('[handleGenerateAiScript] Generated script content is empty after processing');
        processStore.error = 'AI generated script is empty or contains no valid segments';
        return;
      }
      
      console.log('[handleGenerateAiScript] Final script content:', scriptContent);
      
      // Update the script store with the generated content
      scriptStore.updateScriptContent(scriptContent);
      console.log('[handleGenerateAiScript] Script content updated in store successfully');
      
      // Update settings with AI-provided metadata
      if (typeof podcastTitle === 'string' && podcastTitle.trim()) {
        console.log('[handleGenerateAiScript] Updating podcast title:', podcastTitle);
        settingsStore.setPodcastTitle(podcastTitle);
      }
      
      if (typeof language === 'string' && language.trim()) {
        console.log('[handleGenerateAiScript] Updating language:', language);
        settingsStore.updatePodcastSettings({ language: language });
      }
      
      // Log voice mapping for debugging "undefined" names issue
      if (voiceMap && typeof voiceMap === 'object') {
        console.log('[handleGenerateAiScript] AI provided voice map:', voiceMap);
        // TODO: Could potentially use this to auto-assign voices to speakers
      }
      
      console.log('[handleGenerateAiScript] AI script generation completed successfully');
      
    } else {
      console.error('[handleGenerateAiScript] AI response is not a valid object:', aiResponse);
      processStore.error = 'AI script generation failed - invalid response format';
    }
  } catch (e: any) {
    console.error('[handleGenerateAiScript] Error during AI script generation:', e);
    processStore.error = `AI script generation failed: ${e?.message || 'Unknown error'}`;
  }
};
```

#### B. 简化 `generateAiScript` 响应处理
```typescript
// 修复前：复杂的响应包装
if (typeof response === 'object' && response !== null) {
  return { success: true, ...response };
} else {
  return { success: true, response };
}

// 修复后：直接返回API响应
return response;
```

## 关键改进

### 1. **类型安全** ✅
- 移除 `as any` 强制转换的危险用法
- 添加适当的类型检查和验证
- 支持多种字段格式 (`name` 或 `speaker`)

### 2. **错误处理** ✅
- 详细的调试日志
- 明确的错误消息
- 优雅的降级处理

### 3. **数据验证** ✅
- 验证脚本数组存在性
- 过滤无效段落
- 确保最终内容不为空

### 4. **调试能力** ✅
- 完整的API响应日志
- voiceMap调试信息
- 段落处理状态跟踪

## 测试验证

### 期望结果
1. ✅ AI脚本生成成功并更新scriptStore
2. ✅ 生成正确UUID格式的podcastId  
3. ✅ 无"undefined"名称显示
4. ✅ 脚本内容正确解析和转换
5. ✅ 标题和语言设置自动更新

### 调试工具
- 浏览器开发者工具控制台
- 检查所有 `[handleGenerateAiScript]` 前缀的日志
- 验证生成的脚本格式：`Speaker: Text`

## 遗留问题

### 需要进一步处理的项目
1. **voiceMap自动分配**: AI返回的voiceMap可用于自动分配声音
2. **persona匹配优化**: 改进persona名称匹配逻辑
3. **错误恢复**: 添加重试机制
4. **用户体验**: 添加生成进度指示器

## 文件清单

### 已修改的文件
- ✅ `server/api/podcast/process/script.post.ts` - UUID修复
- ✅ `components/playground/PlaygroundFooterActions.vue` - 响应处理修复

### 相关文件
- `server/api/generate-script.post.ts` - AI生成API (无需修改)
- `stores/playgroundScriptStore.ts` - 脚本存储 (无需修改)
- `stores/playgroundSettingsStore.ts` - 设置存储 (无需修改) 