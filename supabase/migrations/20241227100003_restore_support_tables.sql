-- Restore Support Tables (User Management, Projects, Devices)
-- Date: 2024-12-27

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    project_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    sandbox JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create devices table
CREATE TABLE IF NOT EXISTS public.devices (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT NOT NULL,
    name TEXT,
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. Create threads table (for conversation tracking)
CREATE TABLE IF NOT EXISTS public.threads (
    thread_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    account_id TEXT,
    project_id TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE SET NULL
);

-- 4. Create messages table (for conversation messages)
CREATE TABLE IF NOT EXISTS public.messages (
    message_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id TEXT NOT NULL,
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    is_llm_message BOOLEAN DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES public.threads(thread_id) ON DELETE CASCADE
);

-- 5. Create agent_runs table (for AI agent execution tracking)
CREATE TABLE IF NOT EXISTS public.agent_runs (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    responses JSONB DEFAULT '[]'::jsonb,
    error TEXT,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    FOREIGN KEY (thread_id) REFERENCES public.threads(thread_id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_account_id ON public.projects(account_id);
CREATE INDEX IF NOT EXISTS idx_devices_account_id ON public.devices(account_id);
CREATE INDEX IF NOT EXISTS idx_threads_account_id ON public.threads(account_id);
CREATE INDEX IF NOT EXISTS idx_threads_project_id ON public.threads(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_thread_id ON public.agent_runs(thread_id);

-- Create triggers for updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON public.devices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON public.threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_runs_updated_at BEFORE UPDATE ON public.agent_runs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Projects are publicly accessible" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Projects can be managed" ON public.projects FOR ALL USING (true);

CREATE POLICY "Devices are publicly accessible" ON public.devices FOR SELECT USING (true);
CREATE POLICY "Devices can be managed" ON public.devices FOR ALL USING (true);

CREATE POLICY "Threads are publicly accessible" ON public.threads FOR SELECT USING (true);
CREATE POLICY "Threads can be managed" ON public.threads FOR ALL USING (true);

CREATE POLICY "Messages are publicly accessible" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Messages can be managed" ON public.messages FOR ALL USING (true);

CREATE POLICY "Agent runs are publicly accessible" ON public.agent_runs FOR SELECT USING (true);
CREATE POLICY "Agent runs can be managed" ON public.agent_runs FOR ALL USING (true); 