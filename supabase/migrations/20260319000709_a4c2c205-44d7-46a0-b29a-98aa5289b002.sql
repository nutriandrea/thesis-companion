CREATE TABLE public.vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'cliche',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT DEFAULT 'socrate',
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own vulnerabilities"
  ON public.vulnerabilities FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert vulnerabilities"
  ON public.vulnerabilities FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own vulnerabilities"
  ON public.vulnerabilities FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.vulnerabilities;