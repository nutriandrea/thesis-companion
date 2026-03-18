
CREATE TABLE public.socrate_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL, -- 'company', 'professor', 'book', 'topic', 'source'
  title TEXT NOT NULL,
  detail TEXT DEFAULT '',
  reason TEXT DEFAULT '', -- why Socrate suggested this
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.socrate_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own suggestions"
  ON public.socrate_suggestions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own suggestions"
  ON public.socrate_suggestions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
