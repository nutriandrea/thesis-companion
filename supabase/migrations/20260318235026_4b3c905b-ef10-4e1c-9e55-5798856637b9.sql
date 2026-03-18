
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS severita NUMERIC(3,2) DEFAULT 1.0;

COMMENT ON COLUMN public.student_profiles.severita IS 'Severity parameter 0.0-1.0: 1.0=maximum severity (early stages), lower=more collaborative (writing/revision)';
