-- 修复personas表中的语音模型标识符
-- 使用火山引擎支持的实际语音模型ID

-- 更新中文角色的语音模型
UPDATE personas SET voice_model_identifier = 'zh_female_shuangkuai_moon_bigtts' WHERE persona_id = 5; -- 小雨 (原思思)
UPDATE personas SET voice_model_identifier = 'zh_male_ruyaqingnian_mars_bigtts' WHERE persona_id = 10; -- 阿晨 (原梓辛)
UPDATE personas SET voice_model_identifier = 'zh_male_jieshuonansheng_mars_bigtts' WHERE persona_id = 30; -- 史密斯 (原Smith) - 使用磁性解说男声
UPDATE personas SET voice_model_identifier = 'zh_male_baqiqingshu_mars_bigtts' WHERE persona_id = 32; -- 亚当 (原Adam) - 使用霸气青叔
UPDATE personas SET voice_model_identifier = 'zh_female_wenroushunv_mars_bigtts' WHERE persona_id = 33; -- 莎拉 (原Sarah) - 使用温柔淑女
UPDATE personas SET voice_model_identifier = 'zh_female_gufengshaoyu_mars_bigtts' WHERE persona_id = 35; -- 和音 - 使用古风少御
UPDATE personas SET voice_model_identifier = 'zh_female_qiaopinvsheng_mars_bigtts' WHERE persona_id = 36; -- 晴子 - 使用俏皮女声
UPDATE personas SET voice_model_identifier = 'zh_male_chunhui_mars_bigtts' WHERE persona_id = 51; -- 春晖 (原春晖主播) - 使用广告解说
UPDATE personas SET voice_model_identifier = 'zh_male_changtianyi_mars_bigtts' WHERE persona_id = 61; -- 林深 (原常天逸) - 使用悬疑解说

-- 验证更新结果
SELECT persona_id, name, voice_model_identifier, language_support 
FROM personas 
WHERE persona_id IN (5, 10, 30, 32, 33, 35, 36, 51, 61) 
ORDER BY persona_id; 