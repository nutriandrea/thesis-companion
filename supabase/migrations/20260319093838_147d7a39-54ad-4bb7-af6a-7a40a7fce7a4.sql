
CREATE TABLE public.saved_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  authors TEXT NOT NULL DEFAULT '',
  year TEXT,
  url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'foundational',
  relevance TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own saved references"
  ON public.saved_references FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved references"
  ON public.saved_references FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved references"
  ON public.saved_references FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE UNIQUE INDEX saved_references_user_url_idx ON public.saved_references (user_id, url);
