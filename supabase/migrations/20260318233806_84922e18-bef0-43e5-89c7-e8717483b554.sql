
-- Session events: tracks all user activity across the platform
CREATE TABLE public.session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'chat_exchange', 'latex_edit', 'latex_analysis', 'fusion_analysis', 'report_generated', 'extraction', 'login'
  event_data JSONB DEFAULT '{}'::jsonb,
  section TEXT, -- which section the event happened in
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own session events" ON public.session_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own session events" ON public.session_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Service role policy for edge functions
CREATE POLICY "Service role full access" ON public.session_events FOR ALL USING (true) WITH CHECK (true);

-- Index for fast queries by user and type
CREATE INDEX idx_session_events_user ON public.session_events(user_id, created_at DESC);
CREATE INDEX idx_session_events_type ON public.session_events(user_id, event_type);

-- Add progress tracking columns to student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS sections_progress JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_days_remaining INTEGER,
  ADD COLUMN IF NOT EXISTS overall_completion INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_events;
