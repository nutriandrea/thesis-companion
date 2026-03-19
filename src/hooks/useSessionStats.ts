import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SessionStats {
  totalMessages: number;
  totalChatSessions: number;
  totalLatexAnalyses: number;
  totalFusionAnalyses: number;
  totalSessions: number;
  totalExtractions: number;
}

interface ProgressData {
  overallCompletion: number;
  estimatedDaysRemaining: number | null;
  sectionsProgress: Record<string, { completeness: number; status: string }>;
  thesisStage: string | null;
  lastActiveAt: string | null;
}

interface RecentEvent {
  type: string;
  section: string;
  data: any;
  createdAt: string;
}

interface SessionData {
  stats: SessionStats;
  progress: ProgressData;
  activityByDay: Record<string, number>;
  recentEvents: RecentEvent[];
}

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;


export function useSessionStats(userId: string | undefined) {
  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "get_session_stats" }),
      });
      if (resp.ok) {
        const result = await resp.json();
        setData(result);
      }
    } catch (e) {
      console.error("Session stats error:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();

    if (!userId) return;
    // Subscribe to realtime session events for auto-refresh
    const channel = supabase
      .channel("session-stats")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "session_events",
        filter: `user_id=eq.${userId}`,
      }, () => {
        fetchStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchStats]);

  return { data, loading, refresh: fetchStats };
}

export type { SessionStats, ProgressData, RecentEvent, SessionData };
