
-- Centralized dynamic student profile (Socrate's brain)
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Intellectual profile
  reasoning_style TEXT DEFAULT '',
  strengths JSONB DEFAULT '[]'::jsonb,
  weaknesses JSONB DEFAULT '[]'::jsonb,
  deep_interests JSONB DEFAULT '[]'::jsonb,
  
  -- Academic profile
  research_maturity TEXT DEFAULT 'beginner',
  methodology_awareness TEXT DEFAULT '',
  writing_quality TEXT DEFAULT '',
  critical_thinking TEXT DEFAULT '',
  
  -- Professional inclinations
  career_interests JSONB DEFAULT '[]'::jsonb,
  industry_fit JSONB DEFAULT '[]'::jsonb,
  
  -- Thesis progress tracking
  thesis_stage TEXT DEFAULT 'exploration',
  thesis_quality_score INTEGER DEFAULT 0,
  latex_sections_analyzed JSONB DEFAULT '[]'::jsonb,
  
  -- Session tracking
  total_exchanges INTEGER DEFAULT 0,
  total_extractions INTEGER DEFAULT 0,
  last_extraction_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profile snapshots for versioning
CREATE TABLE public.profile_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  profile_data JSONB NOT NULL,
  trigger_event TEXT NOT NULL DEFAULT 'auto',
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: users can only access their own data
CREATE POLICY "Users can read own student profile" ON public.student_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own student profile" ON public.student_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own student profile" ON public.student_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can read own snapshots" ON public.profile_snapshots FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own snapshots" ON public.profile_snapshots FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Auto-create student profile on user signup (trigger)
CREATE OR REPLACE FUNCTION public.create_student_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.student_profiles (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_student_profile();

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_student_profile_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_profile_updated
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_student_profile_timestamp();
