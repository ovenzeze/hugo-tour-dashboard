-- Migration: Create personas table with recommendation fields
-- Date: 2024-12-27
-- Description: Create complete personas table structure with recommendation capabilities

-- Create personas table
CREATE TABLE IF NOT EXISTS public.personas (
  persona_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  tts_provider VARCHAR(100),
  voice_model_identifier VARCHAR(255),
  voice_description TEXT,
  language_support TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'active',
  
  -- Recommendation fields
  is_recommended_host BOOLEAN NOT NULL DEFAULT FALSE,
  is_recommended_guest BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_priority INTEGER DEFAULT 100
);

-- Add comments to explain the fields
COMMENT ON COLUMN public.personas.is_recommended_host IS 'Whether this persona is recommended as a host for its supported languages';
COMMENT ON COLUMN public.personas.is_recommended_guest IS 'Whether this persona is recommended as a guest for its supported languages';
COMMENT ON COLUMN public.personas.recommended_priority IS 'Priority for recommendation (lower number = higher priority, default = 100)';

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_personas_name ON public.personas (name);
CREATE INDEX IF NOT EXISTS idx_personas_status ON public.personas (status);
CREATE INDEX IF NOT EXISTS idx_personas_recommended_host 
ON public.personas (is_recommended_host, recommended_priority) 
WHERE is_recommended_host = TRUE;

CREATE INDEX IF NOT EXISTS idx_personas_recommended_guest 
ON public.personas (is_recommended_guest, recommended_priority) 
WHERE is_recommended_guest = TRUE;

-- Create composite index for language-based recommendations
CREATE INDEX IF NOT EXISTS idx_personas_recommendations_by_language 
ON public.personas USING GIN (language_support) 
WHERE is_recommended_host = TRUE OR is_recommended_guest = TRUE;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personas_updated_at 
    BEFORE UPDATE ON public.personas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample personas for testing
INSERT INTO public.personas (name, description, tts_provider, voice_model_identifier, language_support, is_recommended_host, is_recommended_guest, recommended_priority) VALUES
('主持人', '专业播客主持人，声音温和友善', 'volcengine', 'zh_female_shuangkuai_moon_bigtts', ARRAY['zh-CN', 'zh'], true, false, 10),
('Smith', 'Professional English podcast host with clear articulation', 'volcengine', 'en_male_adam_streaming', ARRAY['en', 'en-US'], true, false, 10),
('艺境述说者', '艺术领域专家，适合文化类节目', 'volcengine', 'zh_female_shuangkuai_moon_bigtts', ARRAY['zh-CN', 'zh'], false, true, 20),
('文博学者', '博物馆学者，知识渊博', 'volcengine', 'zh_male_jingqiang_moon_bigtts', ARRAY['zh-CN', 'zh'], false, true, 30),
('Guest', 'Professional English podcast guest', 'volcengine', 'en_female_bella_streaming', ARRAY['en', 'en-US'], false, true, 20);

-- Grant necessary permissions
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;

-- Create basic policies (adjust as needed for your auth requirements)
CREATE POLICY "Personas are publicly readable" ON public.personas
  FOR SELECT USING (true);

-- For now, allow all operations (you may want to restrict this later)
CREATE POLICY "Personas can be managed" ON public.personas
  FOR ALL USING (true); 