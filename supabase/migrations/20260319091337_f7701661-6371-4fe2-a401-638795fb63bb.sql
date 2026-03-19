
-- Roadmap items table: each row is a task within a phase
CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  phase_key text NOT NULL, -- 'orientation', 'topic_supervisor', 'planning', 'execution', 'writing'
  phase_title text NOT NULL,
  task_title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  due_date date,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roadmap" ON public.roadmap_items
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own roadmap" ON public.roadmap_items
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert roadmap" ON public.roadmap_items
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service can delete roadmap" ON public.roadmap_items
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.roadmap_items;

-- Index for fast lookups
CREATE INDEX idx_roadmap_items_user ON public.roadmap_items(user_id, phase_key, sort_order);
