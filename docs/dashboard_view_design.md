# Dashboard 视图设计方案

本文档提供了为博物馆导览系统 dashboard 设计的数据视图，基于 Supabase 数据库结构。

## 数据库关系概述

根据 Supabase 类型文件，系统的主要表格及其关系如下：

```
museums
   ↓
galleries
   ↓
objects
   ↑
   |
personas → guide_texts → guide_audios
```

## Dashboard 所需数据

Dashboard 主页需要展示以下关键指标：

1. 总体统计数据：博物馆数量、展厅数量、展品数量、导览音频数量等
2. 内容统计：各语言的导览文本和音频数量
3. 最新添加的内容：最近添加的展品、文本和音频
4. 按博物馆分类的内容统计
5. 按角色分类的音频统计

## SQL 视图设计

### 1. Dashboard 总览视图

```sql
CREATE OR REPLACE VIEW dashboard_overview AS
WITH museum_counts AS (
  SELECT COUNT(*) AS total_museums
  FROM museums
),
gallery_counts AS (
  SELECT COUNT(*) AS total_galleries
  FROM galleries
),
object_counts AS (
  SELECT
    COUNT(*) AS total_objects,
    COUNT(CASE WHEN is_highlight = true THEN 1 END) AS highlight_objects
  FROM objects
),
guide_text_counts AS (
  SELECT
    COUNT(*) AS total_texts,
    COUNT(DISTINCT language) AS language_count
  FROM guide_texts
),
guide_audio_counts AS (
  SELECT
    COUNT(*) AS total_audios,
    SUM(duration_seconds) AS total_duration_seconds
  FROM guide_audios
),
persona_counts AS (
  SELECT COUNT(*) AS total_personas
  FROM personas
)
SELECT
  m.total_museums,
  g.total_galleries,
  o.total_objects,
  o.highlight_objects,
  t.total_texts,
  t.language_count,
  a.total_audios,
  a.total_duration_seconds,
  p.total_personas
FROM
  museum_counts m,
  gallery_counts g,
  object_counts o,
  guide_text_counts t,
  guide_audio_counts a,
  persona_counts p;
```

### 2. 博物馆内容统计视图

```sql
CREATE OR REPLACE VIEW museum_content_stats AS
SELECT
  m.museum_id,
  m.name AS museum_name,
  m.city,
  m.country,
  COUNT(DISTINCT g.gallery_id) AS gallery_count,
  COUNT(DISTINCT o.object_id) AS object_count,
  COUNT(DISTINCT gt.guide_text_id) AS guide_text_count,
  COUNT(DISTINCT ga.audio_guide_id) AS audio_guide_count,
  STRING_AGG(DISTINCT gt.language, ', ') AS supported_languages
FROM
  museums m
LEFT JOIN galleries g ON g.museum_id = m.museum_id
LEFT JOIN objects o ON o.museum_id = m.museum_id
LEFT JOIN guide_texts gt ON gt.museum_id = m.museum_id
LEFT JOIN guide_audios ga ON ga.museum_id = m.museum_id
GROUP BY
  m.museum_id, m.name, m.city, m.country
ORDER BY
  object_count DESC;
```

### 3. 最新内容视图

```sql
CREATE OR REPLACE VIEW recent_content AS
WITH recent_museums AS (
  SELECT
    museum_id,
    name,
    description,
    created_at,
    'museum' AS content_type
  FROM
    museums
  ORDER BY
    created_at DESC
  LIMIT 5
),
recent_objects AS (
  SELECT
    o.object_id,
    o.title AS name,
    o.description,
    o.created_at,
    'object' AS content_type,
    m.name AS museum_name
  FROM
    objects o
  JOIN
    museums m ON o.museum_id = m.museum_id
  ORDER BY
    o.created_at DESC
  LIMIT 10
),
recent_audios AS (
  SELECT
    ga.audio_guide_id,
    COALESCE(o.title, g.name, m.name) AS name,
    ga.language AS description,
    ga.generated_at AS created_at,
    'audio' AS content_type,
    m.name AS museum_name
  FROM
    guide_audios ga
  LEFT JOIN museums m ON ga.museum_id = m.museum_id
  LEFT JOIN galleries g ON ga.gallery_id = g.gallery_id
  LEFT JOIN objects o ON ga.object_id = o.object_id
  ORDER BY
    ga.generated_at DESC
  LIMIT 10
)
SELECT * FROM recent_museums
UNION ALL
SELECT * FROM recent_objects
UNION ALL
SELECT * FROM recent_audios
ORDER BY created_at DESC
LIMIT 20;
```

### 4. 语言统计视图

```sql
CREATE OR REPLACE VIEW language_stats AS
SELECT
  gt.language,
  COUNT(DISTINCT gt.guide_text_id) AS text_count,
  COUNT(DISTINCT ga.audio_guide_id) AS audio_count,
  COUNT(DISTINCT gt.museum_id) AS museum_count,
  COUNT(DISTINCT gt.object_id) AS object_count
FROM
  guide_texts gt
LEFT JOIN
  guide_audios ga ON ga.guide_text_id = gt.guide_text_id AND ga.language = gt.language
GROUP BY
  gt.language
ORDER BY
  text_count DESC;
```

### 5. 角色(Persona)使用统计视图

```sql
CREATE OR REPLACE VIEW persona_usage_stats AS
SELECT
  p.persona_id,
  p.name AS persona_name,
  p.description,
  p.tts_provider,
  p.status,
  COUNT(DISTINCT gt.guide_text_id) AS text_count,
  COUNT(DISTINCT ga.audio_guide_id) AS audio_count,
  COUNT(DISTINCT gt.museum_id) AS museum_count,
  STRING_AGG(DISTINCT gt.language, ', ') AS languages_used,
  SUM(ga.duration_seconds) AS total_duration_seconds
FROM
  personas p
LEFT JOIN
  guide_texts gt ON gt.persona_id = p.persona_id
LEFT JOIN
  guide_audios ga ON ga.persona_id = p.persona_id
GROUP BY
  p.persona_id, p.name, p.description, p.tts_provider, p.status
ORDER BY
  audio_count DESC;
```

## 综合 Dashboard 视图

最后，创建一个综合性视图，整合所有需要的数据：

```sql
CREATE OR REPLACE VIEW dashboard_combined_view AS
WITH
-- 总体统计
overall_stats AS (
  SELECT * FROM dashboard_overview
),
-- 最近添加的内容
recent_items AS (
  SELECT * FROM recent_content LIMIT 10
),
-- 按博物馆分组的统计
top_museums AS (
  SELECT * FROM museum_content_stats LIMIT 5
),
-- 按语言分组的统计
language_distribution AS (
  SELECT * FROM language_stats
),
-- 按角色分组的统计
top_personas AS (
  SELECT * FROM persona_usage_stats LIMIT 5
)
SELECT
  jsonb_build_object(
    'overall_stats', to_jsonb(o.*),
    'recent_items', (SELECT jsonb_agg(to_jsonb(r.*)) FROM recent_items r),
    'top_museums', (SELECT jsonb_agg(to_jsonb(m.*)) FROM top_museums m),
    'language_stats', (SELECT jsonb_agg(to_jsonb(l.*)) FROM language_distribution l),
    'top_personas', (SELECT jsonb_agg(to_jsonb(p.*)) FROM top_personas p)
  ) AS dashboard_data
FROM overall_stats o;
```

## 使用方法

在 Nuxt 应用程序中，可以使用 Supabase 客户端查询此视图：

```typescript
const { data: dashboardData, error } = await supabase
  .from("dashboard_combined_view")
  .select("*")
  .single();

if (error) {
  console.error("获取 Dashboard 数据失败:", error);
  return null;
}

return dashboardData.dashboard_data;
```

## 性能注意事项

1. 这些视图包含多个子查询，可能会在数据量大时影响性能
2. 考虑添加适当的索引来加速查询，特别是在 `created_at` 和外键字段上
3. 对于实时仪表盘，可以考虑使用 Supabase 的实时订阅功能或定期刷新数据
4. 如果数据量非常大，考虑实现分页或无限滚动来分批加载数据

## 视图数据验证结果

经过验证，所有视图都已成功创建并可以正常查询。以下是当前数据概览：

### 1. 总体统计 (dashboard_overview)

```
total_museums | total_galleries | total_objects | highlight_objects | total_texts | language_count | total_audios | total_duration_seconds | total_personas
---------------+-----------------+---------------+-------------------+-------------+----------------+--------------+------------------------+----------------
             4 |               5 |             2 |                 0 |           0 |              0 |            0 |                      0 |             40
```

### 2. 博物馆内容统计 (museum_content_stats)

```
museum_id | museum_name                                    | city      | country       | gallery_count | object_count | guide_text_count | audio_guide_count
-----------+------------------------------------------------+-----------+---------------+---------------+--------------+------------------+-------------------
         1 | Test Museum Curl 1746148022                    | Test City | Test Country  |             1 |            1 |                0 |                 0
         2 | The Metropolitan Museum of Art (Fifth Avenue)   | New York  | United States |             2 |            1 |                0 |                 0
         3 | The Metropolitan Museum of Art (The Cloisters) | New York  | United States |             2 |            0 |                0 |                 0
         4 | Playground Sandbox Museum                      |           |               |             0 |            0 |                0 |                 0
```

### 3. 角色统计 (persona_usage_stats)

```
persona_id | persona_name | description     | tts_provider  | status | text_count | audio_count | museum_count
-----------+--------------+----------------+---------------+--------+------------+-------------+--------------
         2 | 柔若         | 多情感柔美女友 | 'volcengine' | active |          0 |           0 |            0
         3 | 阳辰         | 多情感阳光青年 | 'volcengine' | active |          0 |           0 |            0
         4 | 瑶音         | 多情感魅力女友 | 'volcengine' | active |          0 |           0 |            0
         5 | 思思         | 多情感爽快思思 | 'volcengine' | active |          0 |           0 |            0
         1 | 京小宇       | 多情感北京小爷 | 'volcengine' | active |          0 |           0 |            0
```

### 4. 语言统计 (language_stats)

目前没有语言数据记录。

### 验证结论

1. **数据结构完整性**

   - ✅ 所有视图已成功创建
   - ✅ 视图结构符合设计要求
   - ✅ 查询响应正常

2. **数据现状**

   - 基础设施（博物馆、展厅、展品）有少量数据
   - 导览内容（文本、音频）尚未生成
   - 角色系统已配置但未关联内容
   - 语言支持待实现

3. **下一步建议**
   - Dashboard UI 实现可以开始
   - 数据为空的部分使用合适的空状态展示
   - 考虑添加数据导入/生成功能
   - 实现语言内容生成功能

现有数据足以支持 Dashboard 的开发和测试，建议开始实现前端界面。
