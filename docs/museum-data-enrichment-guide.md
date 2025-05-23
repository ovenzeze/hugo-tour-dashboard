# 博物馆数据自动收集脚本使用指南

## 概述

这个脚本使用 AI/LLM 技术自动从网络搜集博物馆、展厅和展品信息，并将其结构化存储到数据库中。

## 功能特性

- 🔍 **智能搜索**：使用 LLM 从网络搜集博物馆相关信息
- 🏛️ **完整数据**：自动收集博物馆基本信息、展厅布局、重要展品
- 🔄 **批量处理**：支持批量创建多个博物馆记录
- 📊 **数据补充**：为现有博物馆补充详细信息
- 🎯 **结构化输出**：确保数据符合数据库结构要求

## 环境要求

### 必需的环境变量

在 `.env` 文件中配置以下变量：

```bash
# Supabase 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key

# LLM API 配置（至少需要其中一个）
OPENROUTER_API_KEY=your_openrouter_api_key
GROQ_API_KEY=your_groq_api_key

# 可选：指定默认模型
OPENROUTER_MODEL=openai/gpt-4o-mini
GROQ_MODEL_NAME=mixtral-8x7b-32768
```

### 安装依赖

```bash
# 安装依赖
pnpm install

# 或者单独安装 tsx（如果未安装）
pnpm add -D tsx
```

## 使用方法

### 1. 查看数据库统计信息

```bash
pnpm run museum-enrichment stats
```

显示当前数据库中博物馆、展厅、展品的统计信息。

### 2. 搜索博物馆信息（仅查看，不保存）

```bash
pnpm run museum-enrichment search "故宫博物院"
```

返回格式化的 JSON 数据，包含：
- 博物馆基本信息
- 主要展厅列表
- 重要展品信息
- 数据置信度和来源

### 3. 批量创建新博物馆

```bash
# 创建单个博物馆
pnpm run museum-enrichment create "故宫博物院"

# 批量创建多个博物馆
pnpm run museum-enrichment create "故宫博物院" "大英博物馆" "卢浮宫" "纽约大都会艺术博物馆"
```

脚本会自动：
1. 搜索每个博物馆的详细信息
2. 创建博物馆记录
3. 创建相关的展厅和展品记录
4. 在每个请求间添加延迟以避免 API 限制

### 4. 补充现有博物馆信息

```bash
# 根据博物馆 ID 补充信息
pnpm run museum-enrichment enrich 1
```

为已存在的博物馆添加或更新：
- 详细描述信息
- 展厅布局
- 展品目录

## 数据结构说明

### 博物馆信息 (museums)

| 字段 | 类型 | 说明 |
|------|------|------|
| museum_id | number | 主键，自动生成 |
| name | string | 博物馆名称 |
| description | string | 详细描述 |
| address | string | 完整地址 |
| city | string | 城市 |
| country | string | 国家 |
| website | string | 官方网站 |
| opening_hours | JSON | 开放时间 |

### 展厅信息 (galleries)

| 字段 | 类型 | 说明 |
|------|------|------|
| gallery_id | number | 主键，自动生成 |
| museum_id | number | 所属博物馆ID |
| name | string | 展厅名称 |
| gallery_number | string | 展厅编号 |
| description | string | 展厅描述 |
| theme | string | 主题 |
| location_description | string | 位置描述 |

### 展品信息 (objects)

| 字段 | 类型 | 说明 |
|------|------|------|
| object_id | number | 主键，自动生成 |
| museum_id | number | 所属博物馆ID |
| gallery_id | number | 所属展厅ID |
| title | string | 展品标题 |
| artist_display_name | string | 艺术家姓名 |
| culture | string | 文化背景 |
| period | string | 历史时期 |
| object_date | string | 创作日期 |
| medium | string | 材质 |
| description | string | 展品描述 |
| classification | string | 分类 |
| tags | string[] | 标签数组 |

## 示例输出

### 搜索结果示例

```json
{
  "museum": {
    "name": "故宫博物院",
    "description": "位于北京市中心的明清两代皇宫，是世界上现存规模最大、保存最为完整的木质结构古建筑群",
    "address": "北京市东城区景山前街4号",
    "city": "北京",
    "country": "中国",
    "website": "https://www.dpm.org.cn",
    "opening_hours": {
      "tuesday": "8:30-17:00",
      "wednesday": "8:30-17:00",
      "thursday": "8:30-17:00",
      "friday": "8:30-17:00",
      "saturday": "8:30-17:00",
      "sunday": "8:30-17:00",
      "monday": "闭馆"
    },
    "galleries": [
      {
        "name": "午门展厅",
        "gallery_number": "G001",
        "description": "故宫博物院的主要展览厅",
        "theme": "宫廷文化",
        "location_description": "午门城楼",
        "objects": [
          {
            "title": "清乾隆粉彩瓷瓶",
            "object_number": "QG001",
            "artist_display_name": "宫廷造办处",
            "culture": "中国",
            "period": "清代",
            "object_date": "乾隆年间",
            "medium": "陶瓷",
            "description": "精美的粉彩装饰瓷瓶",
            "classification": "陶瓷",
            "department": "陶瓷部",
            "tags": ["陶瓷", "粉彩", "清代", "乾隆"]
          }
        ]
      }
    ]
  },
  "confidence": 0.95,
  "sources": ["故宫博物院官网", "维基百科", "文化遗产网"]
}
```

## 注意事项

### 🚨 重要提醒

1. **API 配额**：脚本会调用 LLM API，请注意 API 使用配额
2. **数据质量**：AI 生成的数据可能需要人工验证和修正
3. **重复创建**：避免重复创建相同的博物馆记录
4. **网络连接**：确保网络连接稳定，搜索过程可能需要一些时间

### 性能优化

- 脚本在批量处理时会自动添加延迟
- 建议分批处理大量博物馆，避免超时
- 可以先用 `search` 命令测试单个博物馆的数据质量

### 错误处理

- 如果某个博物馆搜索失败，脚本会继续处理其他博物馆
- 检查控制台输出了解详细的错误信息
- 确保环境变量配置正确

## 高级用法

### 自定义搜索

可以修改脚本中的 `prompt` 内容来：
- 调整搜索的详细程度
- 添加特定的数据字段
- 优化特定类型博物馆的数据收集

### 集成到工作流

```bash
# 示例：自动化工作流
#!/bin/bash

# 1. 更新数据库统计
pnpm run museum-enrichment stats

# 2. 批量添加世界知名博物馆
museums=(
  "大英博物馆"
  "卢浮宫"
  "纽约大都会艺术博物馆"
  "故宫博物院"
  "梵蒂冈博物馆"
)

for museum in "${museums[@]}"; do
  echo "正在处理: $museum"
  pnpm run museum-enrichment create "$museum"
  sleep 5  # 添加延迟
done

# 3. 显示最终统计
pnpm run museum-enrichment stats
```

## 故障排除

### 常见问题

1. **API Key 错误**
   ```
   错误: LLM API key not configured
   解决: 检查 .env 文件中的 API key 配置
   ```

2. **数据库连接失败**
   ```
   错误: Supabase URL and Key must be configured
   解决: 确认 SUPABASE_URL 和 SUPABASE_KEY 配置正确
   ```

3. **JSON 解析错误**
   ```
   错误: Unexpected token in JSON
   解决: LLM 返回格式可能不规范，可重试或检查模型配置
   ```

### 调试模式

修改脚本开头的日志级别：

```typescript
// 在脚本顶部添加
consola.level = 4  // 显示详细调试信息
```

## 贡献

如果您发现脚本有改进空间，欢迎：
- 提交 issue 报告问题
- 提交 PR 改进功能
- 分享使用经验和最佳实践 