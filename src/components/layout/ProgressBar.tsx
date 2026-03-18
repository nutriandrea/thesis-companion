import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";

export default function ProgressBar() {
  const { overallProgress, roadmap, activeSection } = useApp();

  // Calculate current phase
  const currentPhaseIndex = roadmap.findIndex(p => p.progress < 100);
  const currentPhase = roadmap[currentPhaseIndex >= 0 ? currentPhaseIndex : roadmap.length - 1];

  // Estimated time (mock calculation based on progress)
  const estimatedMinutes = Math.max(5, Math.round((100 - overallProgress) * 1.5));
  const estimatedLabel = estimatedMinutes > 60
    ? `${Math.round(estimatedMinutes / 60)}h ${estimatedMinutes % 60}m`
    : `${estimatedMinutes}m`;

  return (
    <div className="fixed right-0 top-0 z-30 h-screen w-12 flex flex-col items-center py-6 bg-background border-l border-border">
      {/* Progress track */}
      <div className="flex-1 relative w-1 bg-secondary rounded-full overflow-hidden my-4">
        <motion.div
          className="absolute bottom-0 left-0 w-full rounded-full bg-accent"
          initial={{ height: 0 }}
          animate={{ height: `${overallProgress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
        {/* Phase markers */}
        {roadmap.map((phase, i) => {
          const position = ((i + 1) / roadmap.length) * 100;
          return (
            <div
              key={phase.id}
              className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 transition-colors ${
                phase.progress === 100
                  ? "bg-accent border-accent"
                  : phase.id === currentPhase?.id
                  ? "bg-background border-accent animate-glow-pulse"
                  : "bg-background border-border"
              }`}
              style={{ bottom: `${position}%` }}
              title={phase.title}
            />
          );
        })}
      </div>

      {/* Progress percentage */}
      <div className="text-center space-y-1">
        <span className="text-[10px] font-bold text-accent block">{overallProgress}%</span>
      </div>

      {/* Estimated time */}
      <div className="mt-2 flex flex-col items-center gap-0.5" title={`Tempo stimato: ${estimatedLabel}`}>
        <Clock className="w-3 h-3 text-muted-foreground" />
        <span className="text-[8px] text-muted-foreground font-medium">{estimatedLabel}</span>
      </div>
    </div>
  );
}
