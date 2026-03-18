import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    fetchTasks();
    if (!userId) return;
    const channel = supabase
      .channel("socrate-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "socrate_tasks", filter: `user_id=eq.${userId}` }, () => fetchTasks())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchTasks]);

  return { tasks, loading, refresh: fetchTasks, updateTaskStatus };
}
