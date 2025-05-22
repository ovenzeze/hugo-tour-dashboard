# Playground MVP 测试指南

## 🎯 MVP版本目标

简化Playground的数据流，实现**最小可用版本**，专注核心功能：
1. **AI脚本生成** → 2. **脚本验证** → 3. **音频合成**

## 🔧 最新更新：智能语言检测功能

现在系统会**自动根据选择的主播角色检测播客语言**，解决了语言设置与主播不匹配的问题：

- **中文主播**（如"瑶音"、voice_model_identifier 包含 "zh"）→ 自动设置为 `zh-CN`
- **英文主播**（voice_model_identifier 包含 "en"）→ 自动设置为 `en-US`
- **其他语言**：支持日语(`ja-JP`)、韩语(`ko-KR`)

## 📋 测试检查清单

### 阶段1：基础功能验证

#### ✅ 1. Personas 加载测试
```bash
# 确保角色数据正常加载
curl -s -X GET http://localhost:4000/api/personas | jq .
```
**期望结果**: 返回角色列表，包含 `persona_id`, `name`, `voice_model_identifier` 等字段。

#### ✅ 2. 页面加载测试
- [ ] 访问 `/playground` 页面正常加载
- [ ] 默认显示步骤1 (Settings)
- [ ] 可以看到 **AI Script**, **Use Preset**, **Next** 按钮
- [ ] 主播和嘉宾选择组件正常显示
- [ ] 按钮有正确的加载状态和动画效果

### 阶段2：AI脚本生成测试

#### ✅ 3. 预设脚本测试
- [ ] 点击 **Use Preset** 按钮
- [ ] 脚本编辑器中出现预设内容（中文对话）
- [ ] **Next** 按钮变为可点击状态
- [ ] 显示成功提示："预设脚本已加载"

#### ✅ 4. AI脚本生成测试（中文主播）
**前置条件**: 已选择中文主播（如"瑶音"）

- [ ] 点击 **AI Script** 按钮
- [ ] 按钮显示加载状态："AI Creating..." 并有 spinner 动画
- [ ] 脚本编辑器中更新为AI生成的内容
- [ ] 显示成功提示："AI脚本生成成功"
- [ ] **验证语言检测**: 生成的脚本应该是中文内容

**调试命令**（如果UI失败）:
```bash
curl -s -X POST http://localhost:4000/api/generate-script \
-H "Content-Type: application/json" \
-d '{
  "podcastSettings": {
    "title": "测试语言检测",
    "topic": "人工智能技术",
    "language": "zh-CN"
  },
  "hostPersona": {
    "persona_id": 4,
    "name": "瑶音",
    "voice_model_identifier": "zh_female_meilinvyou_emo_v2_mars_bigtts"
  }
}' | jq .
```

**期望响应**: 
- `language` 字段应该是 `"zh-CN"`
- 脚本内容是中文对话
- 包含 `voiceMap` 映射信息

#### ✅ 5. AI脚本生成测试（英文主播）
**前置条件**: 已选择英文主播

- [ ] 选择英文主播（voice_model_identifier 包含 "en"）
- [ ] 点击 **AI Script** 按钮
- [ ] 验证生成的脚本是英文内容
- [ ] 验证语言设置自动调整为 `en-US`

### 阶段3：脚本验证和数据库存储测试

#### ✅ 6. 脚本验证测试
- [ ] 有脚本内容的情况下，点击 **Next** 按钮
- [ ] 按钮显示加载状态："Validating..." 并有 spinner 动画
- [ ] 成功后自动跳转到步骤2（Synthesis）
- [ ] 显示成功提示："脚本验证成功"

**调试命令**:
```bash
curl -s -X POST http://localhost:4000/api/podcast/process/script \
-H "Content-Type: application/json" \
-d '{
  "podcastTitle": "测试数据库写入",
  "script": [
    {
      "speaker": "瑶音",
      "speakerPersonaId": 4,
      "text": "欢迎收听今天的节目，我是主播瑶音。"
    },
    {
      "speaker": "嘉宾",
      "speakerPersonaId": 5,
      "text": "大家好，我是嘉宾，很高兴来到这里。"
    }
  ],
  "hostPersonaId": 4,
  "guestPersonaIds": [5],
  "language": "zh-CN",
  "ttsProvider": "volcengine"
}' | jq .
```

**期望响应**: 
- `success: true`
- 返回真实的 `podcastId`（UUID格式）
- `preparedSegments` 包含处理好的段落信息

#### ✅ 7. 数据库存储验证
**验证数据是否正确写入数据库**:
- [ ] 脚本验证后，podcast记录应该存在于数据库中
- [ ] 每个脚本段落应该有对应的 segment 记录
- [ ] podcastId 应该是真实的UUID，不是模拟数据

### 阶段4：音频合成测试

#### ✅ 8. 同步音频合成测试（≤3个segments）
**前置条件**: 已完成脚本验证，当前在步骤2

- [ ] 点击 **Synthesize Podcast** 按钮
- [ ] 按钮显示加载状态："Synthesizing..." 并有 spinner 动画
- [ ] 少量段落的合成应该在1-2分钟内完成
- [ ] 成功后自动跳转到步骤3
- [ ] 显示成功提示："音频合成成功"

#### ✅ 9. 异步音频合成测试（>3个segments）
**前置条件**: 有超过3个段落的脚本

- [ ] 点击 **Synthesize Podcast** 按钮
- [ ] 按钮应该显示进度："合成中... X%"
- [ ] 有进度条动画显示合成进度
- [ ] 任务提交后显示："音频合成任务已提交"
- [ ] 系统自动监控异步任务状态
- [ ] 完成后自动跳转到步骤3

**调试命令**（测试异步任务状态查询）:
```bash
# 首先启动一个音频合成任务，获取 taskId
curl -s -X POST http://localhost:4000/api/podcast/process/synthesize \
-H "Content-Type: application/json" \
-d '{
  "podcastId": "YOUR_PODCAST_ID",
  "segments": [...],
  "globalTtsProvider": "volcengine",
  "async": true
}' | jq .

# 然后查询任务状态（替换 TASK_ID）
curl -s -X GET http://localhost:4000/api/podcast/synthesis-status/TASK_ID | jq .
```

#### ✅ 10. 音频文件验证
- [ ] 合成完成后，检查是否有可播放的音频URL
- [ ] 音频文件应该保存到正确的存储位置
- [ ] 数据库中的音频URL字段应该已更新

### 阶段5：用户体验测试

#### ✅ 11. 加载状态和动画
- [ ] 所有按钮都有正确的加载状态（spinner、文字变化）
- [ ] AI脚本生成有脉冲动画效果
- [ ] 音频合成有进度条显示
- [ ] toast 通知显示恰当的成功/错误信息

#### ✅ 12. 错误处理
- [ ] 网络错误时显示友好的错误提示
- [ ] API返回错误时显示具体的错误原因
- [ ] 用户可以重试失败的操作

#### ✅ 13. 导航和重置功能
- [ ] **Previous** 按钮正确回到上一步
- [ ] **Reset** 按钮清空所有状态并重置到步骤1
- [ ] 步骤之间的转换流畅自然

## 🐛 常见问题排查

### 语言检测问题
**症状**: 选择中文主播但生成英文内容，或语言设置不匹配

**解决方案**: 
1. 检查 `voice_model_identifier` 是否包含正确的语言标识
2. 查看 console 中的语言检测日志：`[playgroundUnified] Detected Chinese from host persona`
3. 确保 playgroundUnified store 中的 `detectLanguageFromPersona` 方法工作正常

### 音频合成失败
**症状**: 合成时返回错误或找不到 segment 记录

**解决方案**:
1. 确保脚本验证步骤成功执行并写入数据库
2. 检查 podcast 和 segment 记录是否存在
3. 验证 persona 的 voice_model_identifier 配置正确

### 按钮状态异常
**症状**: 按钮一直显示加载状态或无法点击

**解决方案**:
1. 检查 network 面板中的 API 请求状态
2. 查看 console 错误日志
3. 验证 store 状态是否正确更新

## 📈 性能验证

- [ ] AI脚本生成：< 10秒
- [ ] 脚本验证：< 3秒  
- [ ] 同步音频合成：< 2分钟（≤3个segments）
- [ ] 异步任务提交：< 5秒
- [ ] 页面响应性：所有交互 < 1秒

## 🎉 完成标准

当所有测试项目都通过时，MVP版本即达到发布标准：
- ✅ 智能语言检测正常工作
- ✅ 数据库正确存储podcast和segment记录  
- ✅ 音频合成支持同步和异步模式
- ✅ 用户界面响应迅速，加载状态清晰
- ✅ 错误处理友好，用户体验流畅 