# Playground 语言过滤功能优化

## 问题描述

之前在Playground中存在语言不匹配的问题：
- 用户选择了中文主播"渊博"（`voice_model_identifier: "zh_male_yuanboxiaoshu_moon_bigtts"`）
- 但设置中默认语言是 `'en-US'`
- AI脚本生成时使用了英语，导致语言和主播不匹配

## 解决方案

### 1. 增强 `usePersonaCache` 功能

新增了三个函数：
- `getPersonasByLanguage(languageCode)`: 按语言过滤personas
- `getRandomPersonaByLanguage(languageCode)`: 按语言随机选择persona
- `getSupportedLanguages()`: 获取所有支持的语言列表

### 2. 改进智能语言检测

在 `playgroundUnified.ts` 中：
- 优先从主播的 `language_support` 字段检测语言
- 备用方法：从 `voice_model_identifier` 推断语言  
- 语言检测优先级：主播语言检测 > 用户设置 > 默认值

### 3. 随机选择考虑语言匹配

在 `playgroundSettingsStore.ts` 中：
- `getHostPersonaIdNumeric` 现在优先选择匹配当前语言的personas
- 如果没有匹配的，再回退到所有personas

### 4. UI层面的语言过滤

在 `PodcastSettingsForm.vue` 中：
- `availableHostPersonas` 和 `availableGuestPersonas` 现在根据当前选择的语言过滤
- 用户只能看到和选择支持当前语言的personas

## 测试要点

### 场景1: 语言智能检测
1. 不设置语言（或设置为默认英语）
2. 选择中文主播"渊博" 
3. 点击"AI Script"生成脚本
4. ✅ 预期：系统检测到中文并生成中文脚本

### 场景2: 语言过滤选择
1. 在语言下拉框选择"Chinese (Simplified)"
2. 打开主播选择器
3. ✅ 预期：只显示支持中文的主播
4. 打开嘉宾选择器  
5. ✅ 预期：只显示支持中文的嘉宾（排除已选主播）

### 场景3: 语言切换清理
1. 选择中文语言和中文主播/嘉宾
2. 切换语言为"English"
3. ✅ 预期：不支持英语的主播/嘉宾被自动清除
4. ✅ 预期：选择器只显示支持英语的personas

### 场景4: 随机选择优化
1. 设置语言为中文但不选择主播
2. 系统需要随机选择时（如在某些流程中）
3. ✅ 预期：优先从支持中文的personas中随机选择

## 日志输出示例

语言检测日志：
```
[playgroundUnified] Language detection: {
  detected: "zh-CN", 
  userSetting: "en-US", 
  final: "zh-CN"
}
[playgroundUnified] Detected language from persona language_support: zh-CN for persona: 渊博
```

随机选择日志：
```
[getHostPersonaIdNumeric] Randomly selected persona for language zh-CN: 渊博
```

## 技术细节

### 语言代码规范化
- 系统支持常见的语言代码变体
- `en` → `en-US`
- `zh` → `zh-CN`  
- `zh-hans` → `zh-CN`

### Persona数据结构要求
```typescript
interface Persona {
  persona_id: number;
  name: string;
  language_support: string[]; // 必须包含支持的语言列表
  voice_model_identifier?: string;
  // ... 其他字段
}
```

### 兼容性保证
- 如果personas没有 `language_support` 字段，则不会出现在过滤结果中
- 如果用户没有选择语言，仍显示所有personas（向后兼容）
- 保持现有的API接口不变

## 未来改进方向

1. **语言检测增强**: 可以考虑从脚本内容、标题等更多维度检测语言
2. **多语言支持**: 支持混合语言的播客（例如中英双语）
3. **智能推荐**: 根据内容主题推荐最合适的语言和personas
4. **用户偏好**: 记住用户的语言偏好设置 