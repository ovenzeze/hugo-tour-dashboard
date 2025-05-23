# 博物馆数据自动收集系统

## 🎯 项目概述

这是一个基于 AI/LLM 技术的高级博物馆数据自动收集和补充系统。它能够：

- 🔍 **智能搜集**：从网络智能搜集博物馆、展厅、展品信息
- 🏛️ **结构化存储**：将数据规范化存入 Supabase 数据库
- 🤖 **AI 驱动**：使用项目现有的 LLM API（OpenRouter/Groq）
- 📊 **分阶段收集**：采用科学的多阶段数据收集策略
- 🌍 **国际化标准**：所有博物馆数据以英文存储，符合国际标准
- 🔄 **多轮验证**：通过多轮验证确保数据质量和准确性

## 📁 文件结构

```
scripts/
├── museum-data-enrichment-advanced.ts # 博物馆数据收集脚本
└── quick-start-museums.sh             # 快速启动脚本

docs/
├── museum-data-enrichment-guide.md    # 详细使用指南
└── museum-data-collection-strategies.md # 收集策略和最佳实践

package.json                            # 添加了脚本命令
```

## 🌟 核心特性

### 分阶段数据收集
- **阶段1**: 基础信息收集 - 博物馆基本信息和联系方式
- **阶段2**: 展厅布局映射 - 空间结构和展厅分布
- **阶段3**: 展品库存收集 - 重要展品详细信息
- **阶段4**: 详细信息补充 - 数据验证和质量提升

### 英文数据标准
- 所有博物馆数据内容以英文存储
- 中文博物馆使用标准英文名称（如"Palace Museum"代替"故宫博物院"）
- 文化术语使用国际博物馆学标准
- 确保数据的国际化兼容性

### 智能质量控制
- 基于置信度的自动重试机制
- 多源信息交叉验证
- 专业术语标准化
- 数据完整性评估

## 🚀 快速开始

### 1. 环境配置

在 `.env` 文件中配置：

```bash
# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# LLM API 配置 (选择其一)
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_API_KEY=your_groq_api_key
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 基础使用

```bash
# 查看数据库统计
pnpm run museum-enrichment stats

# 收集博物馆基本信息（预览模式，英文数据）
pnpm run museum-enrichment basic "故宫博物院"

# 收集其他博物馆信息
pnpm run museum-enrichment basic "大英博物馆"
pnpm run museum-enrichment basic "卢浮宫"
```

### 4. 高级功能（待实现）

```bash
# 完整的多阶段数据收集工作流（计划功能）
pnpm run museum-enrichment workflow "故宫博物院" "北京" "中国"

# 验证和补充现有数据（计划功能）
pnpm run museum-enrichment validate
```

### 5. 快速批量导入

```bash
# 使用预设的知名博物馆列表
./scripts/quick-start-museums.sh
```

## 🏗️ 技术架构

### 核心组件

1. **MuseumDataEnrichment 类**
   - 数据库操作封装
   - LLM API 调用管理
   - 批量处理逻辑

2. **LLM 集成**
   - 复用项目现有的 `callLLM` 函数
   - 支持 OpenRouter 和 Groq 提供商
   - 智能 JSON 格式化和解析

3. **数据库集成**
   - 基于 Supabase TypeScript 类型
   - 自动处理关联关系
   - 重复数据检测和更新

### 数据流程

```
用户输入博物馆名称
    ↓
LLM 搜索和分析网络信息
    ↓
结构化 JSON 数据输出
    ↓
数据验证和清理
    ↓
写入 Supabase 数据库
    ↓
返回结果统计
```

## 📊 数据结构

### 支持的数据表

- **museums**: 博物馆基本信息
- **galleries**: 展厅信息
- **objects**: 展品详情

### 自动收集的字段

| 表名 | 主要字段 | 数据来源 |
|------|----------|----------|
| museums | name, description, address, website, opening_hours | LLM 网络搜索 |
| galleries | name, description, theme, location_description | LLM 分析 |
| objects | title, artist_display_name, culture, period, tags | LLM 提取 |

## 🔧 配置和自定义

### LLM 提示词优化

在 `museum-data-enrichment.ts` 中的 `prompt` 变量可以自定义：

```typescript
const prompt = `
你是一个专业的博物馆数据收集专家...
// 可以根据需要调整搜索重点和输出格式
`
```

### 支持的 LLM 模型

- **OpenRouter**: `openai/gpt-4o-mini` (推荐，性价比高)
- **Groq**: `mixtral-8x7b-32768` (速度快)

### 批量处理配置

- 自动添加 2 秒延迟避免 API 限制
- 错误容忍：单个失败不影响整体处理
- 进度显示和详细日志

## 📈 使用场景

### 1. 新项目初始化
```bash
# 快速建立基础数据
./scripts/quick-start-museums.sh
```

### 2. 现有数据补充
```bash
# 为已有博物馆添加详细信息
pnpm run museum-enrichment enrich 1
```

### 3. 数据质量检查
```bash
# 预览搜索结果，验证数据质量
pnpm run museum-enrichment search "博物馆名称"
```

### 4. 自定义批量导入
```bash
# 根据特定需求创建博物馆列表
pnpm run museum-enrichment create "博物馆1" "博物馆2" "博物馆3"
```

## ⚠️ 注意事项

### 数据质量
- AI 生成的数据需要人工验证
- 建议先用 `search` 命令预览质量
- 重要数据可手动校验和补充

### API 使用
- 注意 LLM API 的使用配额
- 大批量处理建议分批进行
- 网络连接稳定性影响成功率

### 数据库操作
- 避免重复创建相同博物馆
- 大量数据建议在测试环境先验证
- 定期备份数据库

## 🔍 故障排除

### 常见错误

1. **环境变量未配置**
   ```
   解决：检查 .env 文件中的必要配置
   ```

2. **API 配额超限**
   ```
   解决：等待配额重置或升级 API 计划
   ```

3. **网络连接问题**
   ```
   解决：检查网络连接，重试失败的操作
   ```

4. **JSON 解析错误**
   ```
   解决：LLM 输出格式异常，可重试或调整提示词
   ```

## 📚 扩展功能

### 可能的改进方向

1. **多语言支持**：为不同语言的博物馆优化搜索
2. **图片收集**：自动下载和存储博物馆/展品图片
3. **数据验证**：添加更严格的数据验证规则
4. **增量更新**：定期自动更新现有数据
5. **API 集成**：对接官方博物馆 API

### 集成可能性

- 与现有的语音导览系统集成
- 为 Playground 功能提供丰富的示例数据
- 支持用户生成内容（UGC）的数据收集

## 🤝 贡献指南

欢迎通过以下方式贡献：

1. **问题反馈**：提交 issue 报告 bug 或建议
2. **代码改进**：提交 PR 优化功能
3. **文档完善**：改进使用文档和示例
4. **测试反馈**：分享使用体验和最佳实践

## 📄 许可证

遵循项目整体许可证 