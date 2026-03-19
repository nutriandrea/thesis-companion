
-- Add phase state machine columns to student_profiles
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS current_phase text DEFAULT 'exploration',
  ADD COLUMN IF NOT EXISTS phase_confidence numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase_history jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS career_distribution jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS selected_supervisor_id text,
  ADD COLUMN IF NOT EXISTS supervisor_motivation text,
  ADD COLUMN IF NOT EXISTS supervisor_selected_at timestamptz;

-- Enable realtime for student_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_profiles;
