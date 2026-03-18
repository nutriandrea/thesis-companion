
-- Affinity scores: computed matches between student and dataset entities
CREATE TABLE public.affinity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  reasoning TEXT NOT NULL DEFAULT '',
  matched_traits JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.affinity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own affinity scores" ON public.affinity_scores FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own affinity scores" ON public.affinity_scores FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own affinity scores" ON public.affinity_scores FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own affinity scores" ON public.affinity_scores FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_affinity_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER affinity_score_updated
  BEFORE UPDATE ON public.affinity_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_affinity_timestamp();
