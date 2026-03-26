import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import type { ProgressState } from "@/hooks/useDatabaseFilter";

interface GenerationProgressProps {
  progress: ProgressState;
}

export default function GenerationProgress({ progress }: GenerationProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-card border border-ai/20 rounded-xl p-5 space-y-3"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{progress.currentIcon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{progress.currentLabel}</p>
          <p className="text-xs text-muted-foreground">
            {progress.currentStep < progress.totalSteps
              ? `Categoria ${progress.currentStep + 1} di ${progress.totalSteps}`
              : "Tutte le categorie completate"}
          </p>
        </div>
        <span className="text-sm font-bold text-ai">{Math.round(progress.percent)}%</span>
      </div>
      <Progress value={progress.percent} className="h-2" />
      <div className="flex gap-2">
        {["🎓", "📚", "🏢", "📖"].map((icon, i) => (
          <div
            key={i}
            className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm transition-all ${
              i < progress.currentStep
                ? "bg-ai/20 scale-100"
                : i === progress.currentStep && progress.currentStep < progress.totalSteps
                ? "bg-ai/10 animate-pulse scale-110"
                : "bg-muted/50 opacity-40"
            }`}
          >
            {icon}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
