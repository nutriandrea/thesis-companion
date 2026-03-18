import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AISuggestion {
  id: string;
  category: string;
  title: string;
  detail: string;
  reason: string;
  created_at: string;
}

interface AffinityScore {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  score: number;
  reasoning: string;
  matched_traits: string[];
}

/**
 * Realtime hook for Socrate suggestions and affinity scores.
 * Subscribes to changes so all pages update instantly when new data arrives.
 */
export function useSocrateSuggestions(userId: string | undefined, categories?: string[]) {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    if (!userId) return;
    let query = supabase.from("socrate_suggestions").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (categories && categories.length === 1) {
      query = query.eq("category", categories[0]);
    }
    const { data } = await query;
    if (data) {
      const filtered = categories && categories.length > 1
        ? data.filter((s: any) => categories.includes(s.category))
        : data;
      setSuggestions(filtered as AISuggestion[]);
    }
    setLoading(false);
  }, [userId, categories?.join(",")]);

  useEffect(() => {
    fetchSuggestions();

    if (!userId) return;
    const channel = supabase
      .channel(`suggestions-${categories?.join("-") || "all"}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "socrate_suggestions",
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchSuggestions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchSuggestions]);

  return { suggestions, loading, refresh: fetchSuggestions };
}

export function useAffinityScores(userId: string | undefined, entityType?: string) {
  const [affinities, setAffinities] = useState<AffinityScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAffinities = useCallback(async () => {
    if (!userId) return;
    let query = supabase.from("affinity_scores").select("*").eq("user_id", userId).order("score", { ascending: false });
    if (entityType) {
      query = query.eq("entity_type", entityType);
    }
    const { data } = await query;
    if (data) setAffinities(data as unknown as AffinityScore[]);
    setLoading(false);
  }, [userId, entityType]);

  useEffect(() => {
    fetchAffinities();

    if (!userId) return;
    const channel = supabase
      .channel(`affinities-${entityType || "all"}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "affinity_scores",
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchAffinities();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchAffinities]);

  return { affinities, loading, refresh: fetchAffinities };
}

export type { AISuggestion, AffinityScore };
