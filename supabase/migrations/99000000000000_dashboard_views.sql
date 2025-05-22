-- Dashboard 视图 SQL 文件
-- 为 Hugo Tour Dashboard 创建所需的视图

-- 1. Dashboard 总览视图
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

-- 2. 博物馆内容统计视图
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

-- 3. 最新内容视图
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

-- 4. 语言统计视图
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

-- 5. 角色(Persona)使用统计视图
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

-- 6. 综合 Dashboard 视图
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
