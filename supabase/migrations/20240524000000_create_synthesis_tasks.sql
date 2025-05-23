-- Create synthesis_tasks table for persistent task tracking
CREATE TABLE IF NOT EXISTS public.synthesis_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    podcast_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    progress_completed INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL,
    progress_current_segment INTEGER,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_synthesis_tasks_podcast_id ON public.synthesis_tasks(podcast_id);
CREATE INDEX IF NOT EXISTS idx_synthesis_tasks_status ON public.synthesis_tasks(status);
CREATE INDEX IF NOT EXISTS idx_synthesis_tasks_created_at ON public.synthesis_tasks(created_at);

-- Create function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_synthesis_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at updates
CREATE TRIGGER update_synthesis_tasks_updated_at_trigger
    BEFORE UPDATE ON public.synthesis_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_synthesis_tasks_updated_at();

-- Enable RLS
ALTER TABLE public.synthesis_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (adjust as needed for your auth system)
CREATE POLICY "Users can view all synthesis tasks" ON public.synthesis_tasks
    FOR SELECT USING (true);

CREATE POLICY "Users can insert synthesis tasks" ON public.synthesis_tasks
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update synthesis tasks" ON public.synthesis_tasks
    FOR UPDATE USING (true); 