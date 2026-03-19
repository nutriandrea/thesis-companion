
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table for RAG
CREATE TABLE IF NOT EXISTS public.embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_type text NOT NULL, -- 'thesis_chunk', 'conversation', 'supervisor', 'company', 'topic'
  source_id text, -- reference to original entity
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON public.embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_user ON public.embeddings (user_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_source ON public.embeddings (source_type);

-- Semantic search function
CREATE OR REPLACE FUNCTION public.match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_user_id uuid DEFAULT NULL,
  filter_source_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.source_type,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM public.embeddings e
  WHERE 1 = 1
    AND (filter_user_id IS NULL OR e.user_id = filter_user_id)
    AND (filter_source_type IS NULL OR e.source_type = filter_source_type)
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

-- Users can read their own embeddings + shared ones (supervisor/company/topic)
CREATE POLICY "Users can read own and shared embeddings"
  ON public.embeddings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR source_type IN ('supervisor', 'company', 'topic'));

-- Users can insert their own embeddings
CREATE POLICY "Users can insert own embeddings"
  ON public.embeddings FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own embeddings
CREATE POLICY "Users can delete own embeddings"
  ON public.embeddings FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
  ON public.embeddings FOR ALL TO service_role
  USING (true) WITH CHECK (true);
