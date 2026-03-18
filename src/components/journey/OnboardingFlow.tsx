import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Compass, Lightbulb, Target, Users, PenTool, ArrowRight, Sparkles } from "lucide-react";

const journeyOptions: { state: JourneyState; icon: React.ElementType; title: string; desc: string }[] = [
  { state: "lost", icon: Compass, title: "Sono perduto", desc: "Non ho ancora idea di cosa scrivere. Ho bisogno di brainstorming e ispirazione." },
  { state: "vague_idea", icon: Lightbulb, title: "Ho un'idea vaga", desc: "Ho una bozza di argomento ma ho bisogno di affinarlo e strutturarlo." },
  { state: "topic_chosen", icon: Target, title: "Ho scelto il topic", desc: "So cosa voglio scrivere. Mi serve una roadmap, timeline e supervisore." },
  { state: "finding_contacts", icon: Users, title: "Cerco contatti", desc: "Ho bisogno di trovare professori, esperti o collaboratori per la mia tesi." },
  { state: "writing", icon: PenTool, title: "Sto scrivendo", desc: "Ho già iniziato. Mi serve supporto per la stesura, revisione e difesa." },
];

export default function OnboardingFlow() {
  const { currentStudent, setJourneyState, setOnboardingDone, addMemory, setActiveSection, setThesisTopic } = useApp();
  const [step, setStep] = useState(0);
  const [selectedState, setSelectedState] = useState<JourneyState | null>(null);
  const [topicInput, setTopicInput] = useState("");

  const handleComplete = () => {
    if (selectedState) {
      setJourneyState(selectedState);
      if (topicInput) setThesisTopic(topicInput);
      addMemory({
        type: "decision",
        title: `Stato iniziale: ${journeyOptions.find(j => j.state === selectedState)?.title}`,
        detail: topicInput ? `Argomento: ${topicInput}` : "Nessun argomento ancora definito",
      });
      setOnboardingDone(true);
      // Navigate based on state
      const nav: Record<JourneyState, string> = {
        lost: "socrate",
        vague_idea: "suggestions",
        topic_chosen: "dashboard",
        finding_contacts: "contacts",
        writing: "editor",
      };
      setActiveSection(nav[selectedState]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl"
      >
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display">Ciao, {currentStudent.firstName}!</h1>
                <p className="text-muted-foreground mt-2 text-lg">Thesis AI ti guiderà in ogni fase della tua tesi. Iniziamo capendo dove sei nel tuo percorso.</p>
              </div>
              <Button variant="accent" size="lg" onClick={() => setStep(1)} className="gap-2">
                Iniziamo <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Dove ti trovi?</h2>
                <p className="text-muted-foreground mt-1">Seleziona lo stato che ti descrive meglio</p>
              </div>
              <div className="space-y-3">
                {journeyOptions.map(opt => (
                  <button key={opt.state} onClick={() => setSelectedState(opt.state)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                      ${selectedState === opt.state
                        ? "border-accent bg-accent/5 shadow-md ring-2 ring-accent/20"
                        : "border-border bg-card hover:border-accent/40 hover:shadow-sm"
                      }`}>
                    <div className={`p-2.5 rounded-lg shrink-0 ${selectedState === opt.state ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{opt.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="accent" size="lg" onClick={() => setStep(2)} disabled={!selectedState} className="gap-2">
                  Continua <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="topic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Hai un argomento in mente?</h2>
                <p className="text-muted-foreground mt-1">Anche una bozza va bene. Puoi cambiarlo in qualsiasi momento.</p>
              </div>
              <textarea
                value={topicInput}
                onChange={e => setTopicInput(e.target.value)}
                placeholder="es. 'Applicazione di NLP per automatizzare la scoperta di conoscenza nella ricerca accademica' oppure 'qualcosa legato a AI e medicina'..."
                className="w-full h-32 bg-card border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>Indietro</Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleComplete}>Salta per ora</Button>
                  <Button variant="accent" size="lg" onClick={handleComplete} className="gap-2">
                    Inizia il percorso <Sparkles className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
