import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { AUTH_HEADERS } from "@/lib/auth-headers";
import supervisorsData from "@/data/supervisors.json";
import topicsData from "@/data/topics.json";
import companiesData from "@/data/companies.json";

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;


interface FilterResult {
  professors: FilteredEntity[];
  topics: FilteredEntity[];
  companies: FilteredEntity[];
  books: FilteredBook[];
  summary: { professors: number; topics: number; companies: number; books: number };
}

interface FilteredEntity {
  entity_id: string;
  entity_name: string;
  relevance_score: number;
  reason: string;
  matched_traits: string[];
  exploration_flag?: boolean;
}

interface FilteredBook {
  title: string;
  author: string;
  relevance_score: number;
  reason: string;
  category: string;
  exploration_flag?: boolean;
}

export function useDatabaseFilter() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilterResult | null>(null);
  const { toast } = useToast();

  const filterDatabase = useCallback(async () => {
    setLoading(true);
    try {
      const latexContent = localStorage.getItem("thesis_latex_content") || "";
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          mode: "filter_database",
          latexContent,
          supervisorsData: supervisorsData,
          topicsData: topicsData,
          companiesData: companiesData,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        setResult(data);
        toast({
          title: "Database filtrato!",
          description: `${data.summary.professors} prof · ${data.summary.topics} topic · ${data.summary.companies} aziende · ${data.summary.books} libri`,
        });
        return data;
      } else {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || "Impossibile filtrare." });
      }
    } catch (e) {
      console.error("Filter error:", e);
      toast({ variant: "destructive", title: "Errore", description: "Errore filtraggio database." });
    } finally {
      setLoading(false);
    }
    return null;
  }, [toast]);

  return { filterDatabase, loading, result };
}

export type { FilterResult, FilteredEntity, FilteredBook };
