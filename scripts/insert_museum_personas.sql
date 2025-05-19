-- SQL script to insert recommended museum and art guide personas

-- Persona 1: "文博学者" (博学权威型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('文博学者', '声音沉稳、富有学识的男性讲解员，适合深度解析历史文物、艺术流派及背景知识，营造庄重、权威的氛围。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '男声，音色浑厚，语速适中偏缓，吐字清晰，充满智慧感。', 'BV701_V2_streaming', NOW(), NOW());

-- Persona 2: "艺境述说者" (生动故事型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('艺境述说者', '声音灵动、富有表现力的女性讲解员，擅长将艺术品背后的故事娓娓道来，引导观众进入艺术的意境。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色清亮悦耳，语调富有变化，擅长情感表达。', 'BV700_V2_streaming', NOW(), NOW());

-- Persona 3: "典藏守护人" (严谨专业型 - 男)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('典藏守护人', '声音清晰、严谨的男性专业讲解员，注重对展品材质、工艺、年代等细节的准确描述。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '男声，音色标准清晰，语速平稳，不带过多情感色彩，强调客观与准确。', 'BV002_streaming', NOW(), NOW());

-- Persona 4: "美术馆向导" (清晰亲和型 - 女)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('美术馆向导', '声音清晰、语调亲切的女性向导，为观众提供流畅、易懂的展品介绍和参观指引。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色明亮，吐字清晰，语速适中，带有自然的亲和力。', 'BV001_V2_streaming', NOW(), NOW());

-- Persona 5: "儒雅品鉴师" (温文尔雅型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('儒雅品鉴师', '声音温和、富有涵养的男性讲解员，以儒雅的风格品评艺术作品，引导观众感受艺术之美。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '男声，音色温润，语调平和，不疾不徐，带有书卷气。', 'BV102_streaming', NOW(), NOW());

-- Persona 6: "知性艺评家" (深度解析型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('知性艺评家', '声音知性、富有洞察力的女性讲解员，能够对艺术作品进行深度解读和评论。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色成熟清晰，语调沉稳，逻辑性强。', 'BV009_streaming', NOW(), NOW());

-- Persona 7: "温柔叙艺者" (情感共鸣型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('温柔叙艺者', '声音温柔、富有同理心的女性讲解员，擅长引导观众与艺术品产生情感共鸣，感受作品的内在情感。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色柔和甜美，语调舒缓，富有感染力。', 'BV104_streaming', NOW(), NOW());

-- Persona 8: "历史回响者" (智慧长者型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('历史回响者', '声音苍劲、充满智慧的年长男性讲解员，以深沉的嗓音讲述历史的厚重与沧桑。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '男声，音色略带沙哑，沉稳有力，富有历史感。', 'BV158_streaming', NOW(), NOW());

-- Persona 9: "文艺漫谈者" (清新诗意型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('文艺漫谈者', '声音清新、富有文艺气息的女性讲解员，以诗意的语言描绘艺术作品，带来独特的审美体验。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色干净清澈，语调轻柔，富有节奏感。', 'BV428_streaming', NOW(), NOW());

-- Persona 10: "纪录片解说" (经典旁白型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('纪录片解说', '具有经典纪录片旁白风格的男性解说员，声音富有磁性，叙事客观且引人入胜。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '男声，音色标准，富有磁性，语调平稳中带有叙事张力。', 'BV408_streaming', NOW(), NOW());

-- Persona 11: "明晰讲解家" (清晰易懂型 - 强调多语种潜力)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('明晰讲解家', '声音明快、发音标准的女性讲解员，擅长将复杂的艺术概念或历史背景清晰地传达给观众，尤其适合需要双语或多语种支持的场合（此处仅配置中文）。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色清晰、标准，语速适中，专业且易于理解。', 'BV421_streaming', NOW(), NOW());

-- Persona 12: "教育导览员" (温和启发型)
INSERT INTO public.personas (name, description, avatar_url, is_active, language_support, tts_provider, voice_description, voice_model_identifier, created_at, updated_at) VALUES
('教育导览员', '声音温和、富有启发性的女性讲解员，特别适合面向学生或进行教育普及类的艺术讲解。', NULL, TRUE, ARRAY['zh-CN'], 'VolcEngine', '女声，音色温和标准，语调亲切，带有引导性。', 'BV034_streaming', NOW(), NOW());