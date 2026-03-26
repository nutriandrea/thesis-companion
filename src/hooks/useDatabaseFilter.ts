import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { AUTH_HEADERS } from "@/lib/auth-headers";

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

const PROGRESS_STEPS = [
  { key: "professors", label: "Professori", icon: "🎓" },
  { key: "topics", label: "Argomenti", icon: "📚" },
  { key: "companies", label: "Aziende", icon: "🏢" },
  { key: "books", label: "Libri", icon: "📖" },
] as const;

export interface ProgressState {
  currentStep: number;
  totalSteps: number;
  currentLabel: string;
  currentIcon: string;
  percent: number;
}

export function useDatabaseFilter() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FilterResult | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const { toast } = useToast();

  const filterDatabase = useCallback(async () => {
    setLoading(true);
    setProgress({ currentStep: 0, totalSteps: PROGRESS_STEPS.length, currentLabel: "Inizializzazione...", currentIcon: "⚡", percent: 5 });

    // Simulate progress steps while waiting for the single API call
    const intervalId = setInterval(() => {
      setProgress(prev => {
        if (!prev || prev.currentStep >= PROGRESS_STEPS.length - 1) return prev;
        const next = prev.currentStep + 1;
        const step = PROGRESS_STEPS[next];
        return {
          currentStep: next,
          totalSteps: PROGRESS_STEPS.length,
          currentLabel: `Generando ${step.label}...`,
          currentIcon: step.icon,
          percent: Math.min(90, ((next + 1) / PROGRESS_STEPS.length) * 85 + 5),
        };
      });
    }, 3000);

    // Start with first step
    setTimeout(() => {
      setProgress(prev => prev ? {
        ...prev,
        currentStep: 0,
        currentLabel: `Generando ${PROGRESS_STEPS[0].label}...`,
        currentIcon: PROGRESS_STEPS[0].icon,
        percent: 15,
      } : prev);
    }, 500);

    try {
      const latexContent = localStorage.getItem("thesis_latex_content") || "";
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          mode: "filter_database",
          latexContent,
        }),
      });

      clearInterval(intervalId);

      if (resp.ok) {
        setProgress({ currentStep: PROGRESS_STEPS.length, totalSteps: PROGRESS_STEPS.length, currentLabel: "Completato!", currentIcon: "✅", percent: 100 });
        const data = await resp.json();
        setResult(data);
        toast({
          title: "Raccomandazioni generate!",
          description: `${data.summary.professors} prof · ${data.summary.topics} topic · ${data.summary.companies} aziende · ${data.summary.books} libri`,
        });
        setTimeout(() => setProgress(null), 1500);
        return data;
      } else {
        setProgress(null);
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || "Impossibile generare." });
      }
    } catch (e) {
      clearInterval(intervalId);
      setProgress(null);
      console.error("Filter error:", e);
      toast({ variant: "destructive", title: "Errore", description: "Errore generazione raccomandazioni." });
    } finally {
      setLoading(false);
    }
    return null;
  }, [toast]);

  return { filterDatabase, loading, result, progress };
}

export type { FilterResult, FilteredEntity, FilteredBook };
