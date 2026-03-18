import { useApp, type JourneyState } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { Compass, Lightbulb, Target, Users, PenTool, ChevronRight } from "lucide-react";

const states: { state: JourneyState; icon: React.ElementType; label: string; color: string; tip: string; navTo: string }[] = [
  { state: "lost", icon: Compass, label: "Esplorazione", color: "bg-warning/10 text-warning", tip: "Prova Socrate Duello per brainstorming", navTo: "socrate" },
  { state: "vague_idea", icon: Lightbulb, label: "Idea vaga", color: "bg-ai/10 text-ai", tip: "Affina l'argomento con i suggerimenti AI", navTo: "suggestions" },
  { state: "topic_chosen", icon: Target, label: "Topic scelto", color: "bg-accent/10 text-accent", tip: "Segui la roadmap e le scadenze", navTo: "dashboard" },
  { state: "finding_contacts", icon: Users, label: "Cerco contatti", color: "bg-success/10 text-success", tip: "Consulta la rubrica e usa le azioni AI", navTo: "contacts" },
  { state: "writing", icon: PenTool, label: "Stesura", color: "bg-primary/10 text-primary", tip: "Apri l'editor LaTeX per scrivere", navTo: "editor" },
];

export default function JourneyIndicator() {
  const { journeyState, setJourneyState, setActiveSection, addMemory } = useApp();
  const currentIndex = states.findIndex(s => s.state === journeyState);
  const current = states[currentIndex];

  const handleAdvance = (newState: JourneyState, navTo: string) => {
    setJourneyState(newState);
    setActiveSection(navTo);
    addMemory({
      type: "decision",
      title: `Passaggio a: ${states.find(s => s.state === newState)?.label}`,
      detail: "Lo studente ha aggiornato il suo stato nel percorso.",
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-card border rounded-xl p-4 shadow-sm mb-6">
      {/* Progress steps */}
      <div className="flex items-center gap-1 mb-3">
        {states.map((s, i) => (
          <div key={s.state} className="flex items-center">
            <button
              onClick={() => handleAdvance(s.state, s.navTo)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                ${i === currentIndex ? `${s.color} ring-1 ring-current/20` : i < currentIndex ? "bg-success/5 text-success" : "bg-muted text-muted-foreground"}`}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < states.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/40 mx-0.5" />}
          </div>
        ))}
      </div>
      {/* Contextual tip */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${current.color} text-xs`}>
        <current.icon className="w-3.5 h-3.5 shrink-0" />
        <span className="font-medium">{current.tip}</span>
        <button onClick={() => setActiveSection(current.navTo)}
          className="ml-auto underline underline-offset-2 opacity-80 hover:opacity-100 shrink-0">
          Vai →
        </button>
      </div>
    </motion.div>
  );
}
