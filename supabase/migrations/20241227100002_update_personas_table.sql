-- Update Personas Table with Recommendation Fields
-- Date: 2024-12-27

-- Add recommendation fields to personas table if they don't exist
ALTER TABLE public.personas 
ADD COLUMN IF NOT EXISTS is_recommended_host BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recommended_guest BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS recommended_priority INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Update existing columns to match the expected structure
ALTER TABLE public.personas 
ALTER COLUMN tts_provider DROP NOT NULL,
ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- Create indexes for recommendation queries
CREATE INDEX IF NOT EXISTS idx_personas_recommended_host 
ON public.personas(is_recommended_host, recommended_priority) 
WHERE is_recommended_host = true;

CREATE INDEX IF NOT EXISTS idx_personas_recommended_guest 
ON public.personas(is_recommended_guest, recommended_priority) 
WHERE is_recommended_guest = true;

CREATE INDEX IF NOT EXISTS idx_personas_recommendations_by_language 
ON public.personas USING GIN (language_support) 
WHERE is_recommended_host = true OR is_recommended_guest = true;

CREATE INDEX IF NOT EXISTS idx_personas_status 
ON public.personas(status);

CREATE INDEX IF NOT EXISTS idx_personas_name 
ON public.personas(name);

-- Ensure the unique constraint exists (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'personas_name_key') THEN
        ALTER TABLE public.personas ADD CONSTRAINT personas_name_key UNIQUE (name);
    END IF;
END $$; 