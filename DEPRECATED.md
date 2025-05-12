# 待删除组件清单

以下组件将在下一个版本中删除。请相关开发者注意更新代码，使用新版本组件。

## Playground 相关组件

### 已弃用组件

1. `components/playground/PodcastSettingsForm.vue`
   - 状态：已弃用
   - 替代组件：`components/playground/PodcastSettings.vue`
   - 原因：新版本提供了更完整的功能，包括分段设置、背景音乐等
   - 使用位置：`pages/playgroundv2.vue`
   - 迁移说明：
     - 更新组件引用
     - 更新事件处理（从 `@update:settings` 改为 `@update:podcastSettings`）
     - 更新 props（检查 `initialSettings` 的数据结构）

2. `components/playground/AudioSynthesis.vue`
   - 状态：待确认是否弃用
   - 相关组件：`components/playground/AudioSynthesisPanel.vue`
   - 使用位置：`components/playground/PodcastWizard.vue`
   - 待确认：是否合并这两个组件或保留其中之一

### 新版本组件

1. `components/playground/PodcastSettings.vue`
   - 状态：当前使用的版本
   - 功能：
     - 内容和结构设置（标题、主题、分段数量、风格）
     - 语音和角色设置（主持人、嘉宾）
     - 音频效果设置（背景音乐）
   - 使用位置：
     - `pages/playground/index.vue`
     - `components/playground/PodcastWizard.vue`

2. `components/playground/StandardSynthesisSettingsForm.vue`
   - 状态：当前使用的版本
   - 功能：标准语音合成设置
   - 使用位置：`pages/playgroundv2.vue`

## 迁移计划

1. 第一阶段：
   - 将 `playgroundv2.vue` 中的 `PodcastSettingsForm` 替换为 `PodcastSettings`
   - 更新相关的事件处理和数据结构

2. 第二阶段：
   - 确认 `AudioSynthesis` 和 `AudioSynthesisPanel` 的关系
   - 决定是否合并或删除其中之一

3. 第三阶段：
   - 删除已弃用的组件
   - 更新文档和测试用例

## 注意事项

1. 在删除组件之前，确保：
   - 所有使用旧组件的地方都已更新
   - 新组件已经过充分测试
   - 文档已更新

2. 数据结构变化：
   - 检查 `FullPodcastSettings` 类型的使用
   - 确保数据迁移的完整性

3. 性能考虑：
   - 新组件提供了更多功能，确保性能没有显著影响
   - 考虑是否需要优化组件渲染 