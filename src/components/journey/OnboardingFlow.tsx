import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Compass, Lightbulb, Target, Users, PenTool, ArrowRight, Sparkles } from "lucide-react";

const journeyOptions: { state: JourneyState; icon: React.ElementType; title: string; desc: string }[] = [
  { state: "lost", icon: Compass, title: "I'm lost", desc: "I have no idea what to write yet. I need brainstorming and inspiration." },
  { state: "vague_idea", icon: Lightbulb, title: "I have a vague idea", desc: "I have a rough topic but need to refine and structure it." },
  { state: "topic_chosen", icon: Target, title: "I've chosen the topic", desc: "I know what I want to write. I need a roadmap, timeline and supervisor." },
  { state: "finding_contacts", icon: Users, title: "Looking for contacts", desc: "I need to find professors, experts or collaborators for my thesis." },
  { state: "writing", icon: PenTool, title: "Sto scrivendo", desc: "Ho già iniziato. Mi serve supporto per la stesura, revisione e difesa." },
];

export default function OnboardingFlow() {
  const { profile, updateProfile, setActiveSection } = useApp();
  const [step, setStep] = useState(0);
  const [selectedState, setSelectedState] = useState<JourneyState | null>(null);
  const [topicInput, setTopicInput] = useState("");
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [skills, setSkills] = useState("");

  const handleComplete = async () => {
    if (!selectedState) return;
    await updateProfile({
      journey_state: selectedState,
      thesis_topic: topicInput,
      degree,
      university,
      skills: skills.split(",").map(s => s.trim()).filter(Boolean),
      onboarding_done: true,
    });
    // Everyone goes to Socrate first
    setActiveSection("socrate");
  };

  const name = profile?.first_name || "studente";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display">Ciao, {name}!</h1>
                <p className="text-muted-foreground mt-2 text-lg">Prima di tutto, Socrate vuole conoscerti. Rispondi a qualche domanda.</p>
              </div>
              <Button variant="accent" size="lg" onClick={() => setStep(1)} className="gap-2">
                Iniziamo <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Parlaci di te</h2>
                <p className="text-muted-foreground mt-1">Queste info aiuteranno Socrate a sfidarti meglio</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Corso di laurea</label>
                    <input value={degree} onChange={e => setDegree(e.target.value)} placeholder="es. MSc Computer Science"
                      className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Università</label>
                    <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="es. ETH Zurich"
                      className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Competenze (separate da virgola)</label>
                  <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="es. Python, machine learning, NLP, data analysis"
                    className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="accent" size="lg" onClick={() => setStep(2)} className="gap-2">
                  Continua <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
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
                        : "border-border bg-card hover:border-accent/40 hover:shadow-sm"}`}>
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
                <Button variant="accent" size="lg" onClick={() => setStep(3)} disabled={!selectedState} className="gap-2">
                  Continua <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="topic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Hai un argomento in mente?</h2>
                <p className="text-muted-foreground mt-1">Anche un'idea vaga. Socrate ti aiuterà a svilupparla.</p>
              </div>
              <textarea value={topicInput} onChange={e => setTopicInput(e.target.value)}
                placeholder="es. 'Applicazione di NLP per automatizzare la scoperta di conoscenza' oppure 'qualcosa legato a AI e medicina'..."
                className="w-full h-32 bg-card border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent" />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(2)}>Indietro</Button>
                <Button variant="ai" size="lg" onClick={handleComplete} className="gap-2">
                  Incontra Socrate <Sparkles className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
