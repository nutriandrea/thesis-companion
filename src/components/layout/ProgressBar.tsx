import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface StudentProgress {
  overall_completion: number | null;
  current_phase: string | null;
  estimated_days_remaining: number | null;
}

export default function ProgressBar() {
  const { user } = useApp();
  const [progress, setProgress] = useState<StudentProgress>({
    overall_completion: null,
    current_phase: null,
    estimated_days_remaining: null,
  });

  const fetchProgress = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("student_profiles" as any)
      .select("overall_completion, current_phase, estimated_days_remaining")
      .eq("user_id", user.id)
      .single();
    if (data) setProgress(data as unknown as StudentProgress);
  }, [user?.id]);

  useEffect(() => {
    fetchProgress();
    if (!user?.id) return;

    const channel = supabase
      .channel("progress-bar")
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "student_profiles",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchProgress();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchProgress]);

  const realProgress = progress.overall_completion || 0;
  const estimatedDays = progress.estimated_days_remaining;
  const currentPhase = progress.current_phase || "orientation";

  const totalWeeks = 24;
  const currentWeek = Math.max(1, Math.round((realProgress / 100) * totalWeeks));

  const stageMarkers = [
    { label: "O", week: 4, id: "orientation" },
    { label: "T", week: 8, id: "topic_supervisor" },
    { label: "P", week: 12, id: "planning" },
    { label: "E", week: 20, id: "execution" },
    { label: "W", week: 24, id: "writing" },
  ];

  const normalizePhase = (p: string): string => {
    switch (p) {
      case "orientation": case "topic_supervisor": case "planning": case "execution": case "writing": return p;
      case "lost": case "vague_idea": case "exploration": case "convergence": return "orientation";
      case "topic_chosen": case "finding_contacts": case "thesis_defined": return "topic_supervisor";
      case "structuring": case "refinement": return "planning";
      case "revision": return "writing";
      default: return "orientation";
    }
  };

  const phaseOrder = ["orientation", "topic_supervisor", "planning", "execution", "writing"];
  const currentPhaseIdx = phaseOrder.indexOf(normalizePhase(currentPhase));

  return (
    <div className="fixed right-0 top-0 z-30 h-screen w-12 flex flex-col items-center bg-background border-l border-border">
      {/* Week count */}
      <div className="py-3 border-b border-border w-full flex flex-col items-center">
        <span className="ds-caption">W</span>
        <span className="text-sm font-semibold text-foreground">{totalWeeks}</span>
      </div>

      {/* Track */}
      <div className="flex-1 relative w-full flex flex-col items-center py-6">
        <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-px bg-border" />

        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-6 w-px bg-foreground/30"
          initial={{ height: 0 }}
          animate={{ height: `${Math.min(realProgress, 100) * 0.88}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />

        {stageMarkers.map((marker) => {
          const position = (marker.week / totalWeeks) * 88 + 3;
          const markerIdx = phaseOrder.indexOf(marker.id);
          const isDone = markerIdx < currentPhaseIdx;
          const isCurrent = markerIdx === currentPhaseIdx;

          return (
            <div
              key={marker.id}
              className="absolute flex items-center gap-1"
              style={{ top: `${position}%`, right: "6px" }}
            >
              <div className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                isDone ? "bg-foreground" : isCurrent ? "bg-foreground/60" : "bg-border"
              }`} />
              <span className={`text-[9px] font-semibold ${
                isDone || isCurrent ? "text-foreground" : "text-muted-foreground"
              }`}>
                {marker.week}
              </span>
            </div>
          );
        })}

        {/* Current position dot */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-foreground border-2 border-background z-10"
          initial={{ top: 24 }}
          animate={{ top: `calc(${Math.min(realProgress * 0.88, 85)}% + 24px)` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Bottom */}
      <div className="py-3 border-t border-border w-full flex flex-col items-center">
        {estimatedDays ? (
          <>
            <span className="ds-caption">ETA</span>
            <span className="text-xs font-semibold text-foreground">{estimatedDays}g</span>
          </>
        ) : (
          <>
            <span className="ds-caption">Now</span>
            <span className="text-xs font-semibold text-foreground">{currentWeek}</span>
          </>
        )}
      </div>

      {/* Phase indicator */}
      <div className="py-2 border-t border-border w-full flex flex-col items-center">
        <span className="text-[8px] text-muted-foreground">Fase</span>
        <span className="text-[10px] font-semibold text-foreground">
          {stageMarkers[currentPhaseIdx]?.label || "O"}
        </span>
      </div>
    </div>
  );
}
