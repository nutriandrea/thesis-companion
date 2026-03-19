import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_HEADERS } from "@/lib/auth-headers";

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;

export interface SocrateTask {
  id: string;
  title: string;
  description: string;
  section: string;
  priority: string;
  estimated_minutes: number;
  status: string;
  source: string;
  created_at: string;
  completed_at: string | null;
}

export interface ValidationResult {
  approved: boolean;
  feedback: string;
}

export function useSocrateTasks(userId: string | undefined) {
  const [tasks, setTasks] = useState<SocrateTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("socrate_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (data) setTasks(data as unknown as SocrateTask[]);
    setLoading(false);
  }, [userId]);

  const updateTaskStatus = useCallback(async (taskId: string, status: string) => {
    const update: any = { status };
    if (status === "completed") update.completed_at = new Date().toISOString();
    await supabase.from("socrate_tasks").update(update).eq("id", taskId);
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...update } : t));
  }, []);

  const validateTask = useCallback(async (taskId: string): Promise<ValidationResult> => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return { approved: true, feedback: "" };

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          mode: "validate_task",
          task: { title: task.title, description: task.description, section: task.section },
        }),
      });

      if (!resp.ok) throw new Error("Validation failed");
      const data = await resp.json();
      return {
        approved: data.approved ?? true,
        feedback: data.feedback || "",
      };
    } catch {
      // If validation service is unavailable, approve by default
      return { approved: true, feedback: "" };
    }
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
    if (!userId) return;
    const channel = supabase
      .channel("socrate-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "socrate_tasks", filter: `user_id=eq.${userId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchTasks]);

  return { tasks, loading, refresh: fetchTasks, updateTaskStatus, validateTask };
}
