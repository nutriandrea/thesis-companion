
-- Enable realtime for suggestions and affinity tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.socrate_suggestions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.affinity_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.memory_entries;
