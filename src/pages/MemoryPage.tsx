import { motion } from "framer-motion";
import { Brain, Lightbulb, Target, Users, Zap, MessageCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";

const typeIcons: Record<string, React.ElementType> = {
  exploration: Lightbulb,
  decision: Target,
  contact: Users,
  action: Zap,
  feedback: MessageCircle,
};
const typeColors: Record<string, string> = {
  exploration: "bg-warning/10 text-warning",
  decision: "bg-accent/10 text-accent",
  contact: "bg-success/10 text-success",
  action: "bg-ai/10 text-ai",
  feedback: "bg-primary/10 text-primary",
};
const typeLabels: Record<string, string> = {
  exploration: "Esplorazione",
  decision: "Decisione",
  contact: "Contatto",
  action: "Azione",
  feedback: "Feedback",
};

export default function MemoryPage() {
  const { memory, thesisTopic, journeyState } = useApp();

  const sorted = [...memory].reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-ai/10"><Brain className="w-5 h-5 text-ai" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Memoria della Tesi</h1>
          <p className="text-sm text-muted-foreground">Cronologia di ogni esplorazione, decisione e azione</p>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold font-display mb-3">Stato Attuale</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-accent">{memory.length}</p>
            <p className="text-xs text-muted-foreground">Interazioni totali</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-ai">{memory.filter(m => m.type === "decision").length}</p>
            <p className="text-xs text-muted-foreground">Decisioni prese</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-success">{memory.filter(m => m.type === "action").length}</p>
            <p className="text-xs text-muted-foreground">Azioni eseguite</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-warning">{memory.filter(m => m.type === "contact").length}</p>
            <p className="text-xs text-muted-foreground">Contatti attivati</p>
          </div>
        </div>
        {thesisTopic && (
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground">Argomento attuale</p>
            <p className="text-sm font-medium mt-0.5">{thesisTopic}</p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {sorted.map((entry, i) => {
            const Icon = typeIcons[entry.type] || Lightbulb;
            return (
              <motion.div key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex gap-4 ml-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${typeColors[entry.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="bg-card border rounded-xl p-4 shadow-sm flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {typeLabels[entry.type]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {entry.timestamp.toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm">{entry.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
