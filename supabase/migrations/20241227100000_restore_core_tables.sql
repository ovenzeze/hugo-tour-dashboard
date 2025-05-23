-- Restore Core Podcast System Tables
-- Date: 2024-12-27

-- 1. Create podcasts table
CREATE TABLE IF NOT EXISTS public.podcasts (
    podcast_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    topic TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create podcast_segments table
CREATE TABLE IF NOT EXISTS public.podcast_segments (
    segment_text_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    podcast_id TEXT,
    idx INTEGER NOT NULL,
    speaker TEXT,
    text TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (podcast_id) REFERENCES public.podcasts(podcast_id) ON DELETE CASCADE
);

-- 3. Create segment_audios table
CREATE TABLE IF NOT EXISTS public.segment_audios (
    segment_audio_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    segment_id TEXT,
    version_tag TEXT,
    audio_url TEXT,
    params JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (segment_id) REFERENCES public.podcast_segments(segment_text_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_podcast_segments_podcast_id ON public.podcast_segments(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_segments_idx ON public.podcast_segments(idx);
CREATE INDEX IF NOT EXISTS idx_segment_audios_segment_id ON public.segment_audios(segment_id);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_podcasts_updated_at BEFORE UPDATE ON public.podcasts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.segment_audios ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, can be restricted later)
CREATE POLICY "Podcasts are publicly accessible" ON public.podcasts FOR SELECT USING (true);
CREATE POLICY "Podcasts can be managed" ON public.podcasts FOR ALL USING (true);

CREATE POLICY "Podcast segments are publicly accessible" ON public.podcast_segments FOR SELECT USING (true);
CREATE POLICY "Podcast segments can be managed" ON public.podcast_segments FOR ALL USING (true);

CREATE POLICY "Segment audios are publicly accessible" ON public.segment_audios FOR SELECT USING (true);
CREATE POLICY "Segment audios can be managed" ON public.segment_audios FOR ALL USING (true); 