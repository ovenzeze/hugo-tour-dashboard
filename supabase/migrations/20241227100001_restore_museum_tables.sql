-- Restore Museum System Tables
-- Date: 2024-12-27

-- 1. Create museums table
CREATE TABLE IF NOT EXISTS public.museums (
    museum_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    website TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    opening_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. Create galleries table
CREATE TABLE IF NOT EXISTS public.galleries (
    gallery_id SERIAL PRIMARY KEY,
    museum_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    theme TEXT,
    gallery_number TEXT,
    location_description TEXT,
    floor_plan_coordinate JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (museum_id) REFERENCES public.museums(museum_id) ON DELETE CASCADE
);

-- 3. Create objects table
CREATE TABLE IF NOT EXISTS public.objects (
    object_id INTEGER PRIMARY KEY,
    museum_id INTEGER NOT NULL,
    gallery_id INTEGER,
    title TEXT NOT NULL,
    description TEXT,
    artist_display_name TEXT,
    object_name TEXT,
    object_number TEXT,
    object_date TEXT,
    medium TEXT,
    dimensions TEXT,
    credit_line TEXT,
    classification TEXT,
    department TEXT,
    culture TEXT,
    period TEXT,
    image_url TEXT,
    link_resource TEXT,
    object_wikidata_url TEXT,
    metadata_date TEXT,
    is_highlight BOOLEAN DEFAULT false,
    is_public_domain BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (museum_id) REFERENCES public.museums(museum_id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES public.galleries(gallery_id) ON DELETE SET NULL
);

-- 4. Create guide_texts table
CREATE TABLE IF NOT EXISTS public.guide_texts (
    guide_text_id SERIAL PRIMARY KEY,
    museum_id INTEGER,
    gallery_id INTEGER,
    object_id INTEGER,
    persona_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    transcript TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (museum_id) REFERENCES public.museums(museum_id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES public.galleries(gallery_id) ON DELETE CASCADE,
    FOREIGN KEY (object_id) REFERENCES public.objects(object_id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES public.personas(persona_id) ON DELETE CASCADE
);

-- 5. Create guide_audios table
CREATE TABLE IF NOT EXISTS public.guide_audios (
    audio_guide_id SERIAL PRIMARY KEY,
    guide_text_id INTEGER,
    museum_id INTEGER,
    gallery_id INTEGER,
    object_id INTEGER,
    persona_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    audio_url TEXT NOT NULL,
    duration_seconds INTEGER,
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (guide_text_id) REFERENCES public.guide_texts(guide_text_id) ON DELETE CASCADE,
    FOREIGN KEY (museum_id) REFERENCES public.museums(museum_id) ON DELETE CASCADE,
    FOREIGN KEY (gallery_id) REFERENCES public.galleries(gallery_id) ON DELETE CASCADE,
    FOREIGN KEY (object_id) REFERENCES public.objects(object_id) ON DELETE CASCADE,
    FOREIGN KEY (persona_id) REFERENCES public.personas(persona_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_galleries_museum_id ON public.galleries(museum_id);
CREATE INDEX IF NOT EXISTS idx_objects_museum_id ON public.objects(museum_id);
CREATE INDEX IF NOT EXISTS idx_objects_gallery_id ON public.objects(gallery_id);
CREATE INDEX IF NOT EXISTS idx_guide_texts_museum_id ON public.guide_texts(museum_id);
CREATE INDEX IF NOT EXISTS idx_guide_texts_gallery_id ON public.guide_texts(gallery_id);
CREATE INDEX IF NOT EXISTS idx_guide_texts_object_id ON public.guide_texts(object_id);
CREATE INDEX IF NOT EXISTS idx_guide_texts_persona_id ON public.guide_texts(persona_id);
CREATE INDEX IF NOT EXISTS idx_guide_audios_guide_text_id ON public.guide_audios(guide_text_id);
CREATE INDEX IF NOT EXISTS idx_guide_audios_persona_id ON public.guide_audios(persona_id);

-- Create triggers for updated_at
CREATE TRIGGER update_museums_updated_at BEFORE UPDATE ON public.museums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_galleries_updated_at BEFORE UPDATE ON public.galleries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON public.objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guide_texts_updated_at BEFORE UPDATE ON public.guide_texts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.museums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_audios ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Museums are publicly accessible" ON public.museums FOR SELECT USING (true);
CREATE POLICY "Museums can be managed" ON public.museums FOR ALL USING (true);

CREATE POLICY "Galleries are publicly accessible" ON public.galleries FOR SELECT USING (true);
CREATE POLICY "Galleries can be managed" ON public.galleries FOR ALL USING (true);

CREATE POLICY "Objects are publicly accessible" ON public.objects FOR SELECT USING (true);
CREATE POLICY "Objects can be managed" ON public.objects FOR ALL USING (true);

CREATE POLICY "Guide texts are publicly accessible" ON public.guide_texts FOR SELECT USING (true);
CREATE POLICY "Guide texts can be managed" ON public.guide_texts FOR ALL USING (true);

CREATE POLICY "Guide audios are publicly accessible" ON public.guide_audios FOR SELECT USING (true);
CREATE POLICY "Guide audios can be managed" ON public.guide_audios FOR ALL USING (true); 