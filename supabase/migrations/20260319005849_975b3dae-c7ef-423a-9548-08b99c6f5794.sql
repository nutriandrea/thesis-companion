-- Add unique constraint for upsert in auto-sync
CREATE UNIQUE INDEX IF NOT EXISTS embeddings_user_source_unique 
ON public.embeddings (user_id, source_type, source_id);

-- Enable pg_cron and pg_net for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;