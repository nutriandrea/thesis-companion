
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Service role full access" ON public.session_events;
