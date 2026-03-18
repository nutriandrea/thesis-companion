import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";

const markers = [10, 20, 30, 40, 50];

export default function ProgressBar() {
  const { overallProgress, roadmap } = useApp();

  // Total days (e.g. 365 for a thesis year)
  const totalDays = 365;
  const elapsedDays = Math.round((overallProgress / 100) * totalDays);

  return (
    <div className="fixed right-0 top-0 z-30 h-screen w-14 flex flex-col items-center bg-background border-l border-border">
      {/* Total days label */}
      <div className="py-3 border-b border-border w-full flex items-center justify-center">
        <span className="text-xs font-bold text-foreground tracking-tight">{totalDays}</span>
      </div>

      {/* Track with markers */}
      <div className="flex-1 relative w-full flex flex-col items-center py-4">
        {/* Vertical track line */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 bottom-4 w-px bg-border" />

        {/* Progress fill (from top) */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 top-4 w-px bg-accent"
          initial={{ height: 0 }}
          animate={{ height: `${overallProgress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ maxHeight: "calc(100% - 2rem)" }}
        />

        {/* Markers */}
        {markers.map((num, i) => {
          const position = ((i + 1) / (markers.length + 1)) * 100;
          const isPassed = overallProgress >= position;
          return (
            <div
              key={num}
              className="absolute right-2 flex items-center"
              style={{ top: `${position}%` }}
            >
              <span className={`text-xs font-bold ${isPassed ? "text-accent" : "text-muted-foreground"}`}>
                {num}
              </span>
              {/* Tick mark */}
              <div className={`absolute -left-4 w-2 h-px ${isPassed ? "bg-accent" : "bg-border"}`} />
            </div>
          );
        })}

        {/* Current position indicator */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-accent border-2 border-background"
          initial={{ top: "4px" }}
          animate={{ top: `calc(${Math.min(overallProgress, 95)}% + 4px)` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ boxShadow: "0 0 8px hsl(38 50% 60% / 0.4)" }}
        />
      </div>
    </div>
  );
}
