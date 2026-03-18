import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { useSessionStats } from "@/hooks/useSessionStats";

export default function ProgressBar() {
  const { overallProgress, roadmap, user } = useApp();
  const { data: sessionData } = useSessionStats(user?.id);

  // Use real completion from session data if available
  const realProgress = sessionData?.progress?.overallCompletion || overallProgress;
  const estimatedDays = sessionData?.progress?.estimatedDaysRemaining;
  const thesisStage = sessionData?.progress?.thesisStage;

  const totalWeeks = 24;
  const currentWeek = Math.max(1, Math.round((realProgress / 100) * totalWeeks));

  const stageLabels: Record<string, string> = {
    exploration: "E", topic_chosen: "T", structuring: "S", writing: "W", revision: "R",
  };

  // Stage markers with their week positions
  const stageMarkers = [
    { label: "O", week: 4, id: "orientation" },
    { label: "T", week: 8, id: "topic-search" },
    { label: "P", week: 10, id: "planning" },
    { label: "E", week: 20, id: "execution" },
    { label: "W", week: 24, id: "writing" },
  ];

  return (
    <div className="fixed right-0 top-0 z-30 h-screen w-12 flex flex-col items-center bg-background border-l border-border">
      {/* Week count */}
      <div className="py-3 border-b border-border w-full flex flex-col items-center">
        <span className="text-[10px] text-muted-foreground">W</span>
        <span className="text-sm font-bold text-foreground">{totalWeeks}</span>
      </div>

      {/* Track */}
      <div className="flex-1 relative w-full flex flex-col items-center py-6">
        {/* Vertical line */}
        <div className="absolute left-1/2 -translate-x-1/2 top-6 bottom-6 w-px bg-border" />

        {/* Progress fill */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-6 w-px bg-accent"
          initial={{ height: 0 }}
          animate={{ height: `${Math.min(realProgress, 100) * 0.88}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />

        {/* Stage markers */}
        {stageMarkers.map((marker) => {
          const position = (marker.week / totalWeeks) * 88 + 3;
          const phase = roadmap.find(p => p.id === marker.id);
          const isDone = phase && phase.progress === 100;
          const isCurrent = phase && phase.progress > 0 && phase.progress < 100;

          return (
            <div
              key={marker.id}
              className="absolute flex items-center gap-1"
              style={{ top: `${position}%`, right: "6px" }}
            >
              <div className={`w-2 h-2 rounded-full ${
                isDone ? "bg-accent" : isCurrent ? "bg-accent animate-pulse" : "bg-border"
              }`} />
              <span className={`text-[9px] font-bold ${
                isDone || isCurrent ? "text-accent" : "text-muted-foreground"
              }`}>
                {marker.week}
              </span>
            </div>
          );
        })}

        {/* Current position dot */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent border-2 border-background z-10"
          initial={{ top: 24 }}
          animate={{ top: `calc(${Math.min(realProgress * 0.88, 85)}% + 24px)` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: "0 0 10px hsl(38 50% 60% / 0.5)" }}
        />
      </div>

      {/* Bottom: ETA or current week */}
      <div className="py-3 border-t border-border w-full flex flex-col items-center">
        {estimatedDays ? (
          <>
            <span className="text-[10px] text-muted-foreground">ETA</span>
            <span className="text-xs font-bold text-accent">{estimatedDays}g</span>
          </>
        ) : (
          <>
            <span className="text-[10px] text-muted-foreground">Now</span>
            <span className="text-xs font-bold text-accent">{currentWeek}</span>
          </>
        )}
      </div>

      {/* Stage indicator */}
      {thesisStage && (
        <div className="py-2 border-t border-border w-full flex flex-col items-center">
          <span className="text-[8px] text-muted-foreground">Stage</span>
          <span className="text-[10px] font-bold text-ai">{stageLabels[thesisStage] || "?"}</span>
        </div>
      )}
    </div>
  );
}
