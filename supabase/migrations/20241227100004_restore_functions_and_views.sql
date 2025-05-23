-- Restore Database Functions and Views
-- Date: 2024-12-27

-- 1. Create synthesis task status update trigger
CREATE OR REPLACE FUNCTION update_synthesis_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_synthesis_tasks_updated_at_trigger') THEN
        CREATE TRIGGER update_synthesis_tasks_updated_at_trigger
            BEFORE UPDATE ON public.synthesis_tasks
            FOR EACH ROW EXECUTE FUNCTION update_synthesis_tasks_updated_at();
    END IF;
END $$;

-- 2. Create function to get LLM formatted messages
CREATE OR REPLACE FUNCTION get_llm_formatted_messages(p_thread_id TEXT)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'role', CASE WHEN is_llm_message THEN 'assistant' ELSE 'user' END,
            'content', content,
            'timestamp', created_at
        ) ORDER BY created_at
    )
    INTO result
    FROM public.messages
    WHERE thread_id = p_thread_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to transfer device
CREATE OR REPLACE FUNCTION transfer_device(
    device_id TEXT,
    new_account_id TEXT,
    device_name TEXT DEFAULT NULL
)
RETURNS SETOF public.devices AS $$
BEGIN
    UPDATE public.devices 
    SET account_id = new_account_id,
        name = COALESCE(device_name, name),
        updated_at = timezone('utc'::text, now())
    WHERE id = device_id;
    
    RETURN QUERY SELECT * FROM public.devices WHERE id = device_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Create dashboard views for analytics
CREATE OR REPLACE VIEW public.podcast_stats AS
SELECT 
    COUNT(*) as total_podcasts,
    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_podcasts,
    AVG(CASE 
        WHEN ps.segments_count IS NOT NULL 
        THEN ps.segments_count 
        ELSE 0 
    END) as avg_segments_per_podcast
FROM public.podcasts p
LEFT JOIN (
    SELECT 
        podcast_id, 
        COUNT(*) as segments_count 
    FROM public.podcast_segments 
    GROUP BY podcast_id
) ps ON p.podcast_id = ps.podcast_id;

-- 5. Create museum stats view
CREATE OR REPLACE VIEW public.museum_stats AS
SELECT 
    m.museum_id,
    m.name as museum_name,
    COUNT(DISTINCT g.gallery_id) as gallery_count,
    COUNT(DISTINCT o.object_id) as object_count,
    COUNT(DISTINCT gt.guide_text_id) as guide_text_count,
    COUNT(DISTINCT ga.audio_guide_id) as guide_audio_count
FROM public.museums m
LEFT JOIN public.galleries g ON m.museum_id = g.museum_id
LEFT JOIN public.objects o ON m.museum_id = o.museum_id
LEFT JOIN public.guide_texts gt ON m.museum_id = gt.museum_id
LEFT JOIN public.guide_audios ga ON m.museum_id = ga.museum_id
GROUP BY m.museum_id, m.name;

-- 6. Create persona usage stats view
CREATE OR REPLACE VIEW public.persona_usage_stats AS
SELECT 
    p.persona_id,
    p.name as persona_name,
    p.language_support,
    p.is_recommended_host,
    p.is_recommended_guest,
    COUNT(DISTINCT gt.guide_text_id) as guide_text_count,
    COUNT(DISTINCT ga.audio_guide_id) as guide_audio_count,
    COUNT(DISTINCT ps.segment_text_id) as podcast_segment_count
FROM public.personas p
LEFT JOIN public.guide_texts gt ON p.persona_id = gt.persona_id
LEFT JOIN public.guide_audios ga ON p.persona_id = ga.persona_id
LEFT JOIN public.podcast_segments ps ON p.name = ps.speaker
GROUP BY p.persona_id, p.name, p.language_support, p.is_recommended_host, p.is_recommended_guest;

-- 7. Create synthesis task status summary view
CREATE OR REPLACE VIEW public.synthesis_task_summary AS
SELECT 
    status,
    COUNT(*) as task_count,
    AVG(progress_completed::float / NULLIF(progress_total, 0) * 100) as avg_progress_percent
FROM public.synthesis_tasks
GROUP BY status;

-- 8. Create recording management table (if needed for device recordings)
CREATE TABLE IF NOT EXISTS public.recordings (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL,
    device_id TEXT NOT NULL,
    name TEXT,
    raw_data_file_path TEXT,
    preprocessed_file_path TEXT,
    audio_file_path TEXT,
    metadata_file_path TEXT,
    a11y_file_path TEXT,
    action_training_file_path TEXT,
    meta JSONB,
    ui_annotated BOOLEAN DEFAULT false,
    action_annotated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    FOREIGN KEY (device_id) REFERENCES public.devices(id) ON DELETE CASCADE
);

-- Create indexes and triggers for recordings
CREATE INDEX IF NOT EXISTS idx_recordings_account_id ON public.recordings(account_id);
CREATE INDEX IF NOT EXISTS idx_recordings_device_id ON public.recordings(device_id);
CREATE TRIGGER update_recordings_updated_at BEFORE UPDATE ON public.recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS and create policies for recordings
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Recordings are publicly accessible" ON public.recordings FOR SELECT USING (true);
CREATE POLICY "Recordings can be managed" ON public.recordings FOR ALL USING (true); 