-- Add persona columns to podcasts table
-- Date: 2025-01-23
-- Description: Add host_persona_id, guest_persona_id, creator_persona_id and other missing columns to podcasts table

-- Add persona-related columns
ALTER TABLE public.podcasts 
ADD COLUMN IF NOT EXISTS host_persona_id INTEGER REFERENCES public.personas(persona_id),
ADD COLUMN IF NOT EXISTS guest_persona_id INTEGER REFERENCES public.personas(persona_id),
ADD COLUMN IF NOT EXISTS creator_persona_id INTEGER REFERENCES public.personas(persona_id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'zh-CN',
ADD COLUMN IF NOT EXISTS total_duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS total_word_count INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS museum_id INTEGER,
ADD COLUMN IF NOT EXISTS gallery_id INTEGER,
ADD COLUMN IF NOT EXISTS object_id INTEGER;

-- Create indexes for the new foreign key columns
CREATE INDEX IF NOT EXISTS idx_podcasts_host_persona_id ON public.podcasts(host_persona_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_guest_persona_id ON public.podcasts(guest_persona_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_creator_persona_id ON public.podcasts(creator_persona_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_status ON public.podcasts(status);
CREATE INDEX IF NOT EXISTS idx_podcasts_language ON public.podcasts(language);

-- Add comments to explain the new columns
COMMENT ON COLUMN public.podcasts.host_persona_id IS 'ID of the persona acting as host';
COMMENT ON COLUMN public.podcasts.guest_persona_id IS 'ID of the primary guest persona';
COMMENT ON COLUMN public.podcasts.creator_persona_id IS 'ID of the persona who created the podcast';
COMMENT ON COLUMN public.podcasts.description IS 'Detailed description of the podcast content';
COMMENT ON COLUMN public.podcasts.language IS 'Language code for the podcast (e.g., zh-CN, en-US)';
COMMENT ON COLUMN public.podcasts.total_duration_ms IS 'Total duration in milliseconds';
COMMENT ON COLUMN public.podcasts.total_word_count IS 'Total word count of the podcast script';
COMMENT ON COLUMN public.podcasts.status IS 'Status of the podcast (draft, published, archived, etc.)';
COMMENT ON COLUMN public.podcasts.museum_id IS 'Associated museum ID if applicable';
COMMENT ON COLUMN public.podcasts.gallery_id IS 'Associated gallery ID if applicable';
COMMENT ON COLUMN public.podcasts.object_id IS 'Associated object ID if applicable'; 