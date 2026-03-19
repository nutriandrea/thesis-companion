import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Mic, PenTool, ArrowRight, GraduationCap, MapPin } from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";

type InteractionMode = "voice" | "text";

interface Props {
  onComplete: (mode: InteractionMode) => void;
}

const journeyOptions: { state: JourneyState; label: string; description: string }[] = [
  { state: "lost", label: "Non ho ancora idea", description: "Devo ancora trovare un argomento" },
  { state: "vague_idea", label: "Ho un'idea vaga", description: "So la direzione ma non il focus" },
  { state: "topic_chosen", label: "Ho scelto il topic", description: "Ho il tema, devo strutturarlo" },
  { state: "finding_contacts", label: "Cerco supervisore", description: "Devo trovare chi mi segue" },
];

const subtitles = [
  { text: "Non ti dirò cosa fare.", delay: 0, duration: 2500 },
  { text: "Voglio tirare fuori la tua tesi.", delay: 2800, duration: 2500 },
  { text: "Sei pronto per il duello?", delay: 5600, duration: 2000 },
];

export default function SocrateIntro({ onComplete }: Props) {
  const { profile, updateProfile } = useApp();
  const [phase, setPhase] = useState(0);
  const [university, setUniversity] = useState(profile?.university || "");
  const [degree, setDegree] = useState(profile?.degree || "");
  const [selectedState, setSelectedState] = useState<JourneyState | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  useEffect(() => {
    if (phase !== 1) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    subtitles.forEach((sub) => {
      timers.push(setTimeout(() => setCurrentSubtitle(sub.text), sub.delay));
    });
    timers.push(setTimeout(() => setPhase(2), 8500));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const handleContinue = async () => {
    if (!university.trim() || !selectedState) return;
    await updateProfile({ university, degree, journey_state: selectedState });
    setPhase(1);
  };

  const handleModeChoice = async (mode: InteractionMode) => {
    if (mode === "voice") {
      setPhase(3);
      setTimeout(async () => {
        await updateProfile({ onboarding_done: true });
        onComplete(mode);
      }, 2000);
    } else {
      await updateProfile({ onboarding_done: true });
      onComplete(mode);
    }
  };

  const name = profile?.first_name || "studente";
  const canContinue = university.trim() && selectedState;

  return (
    <div className="fixed inset-0 z-50 bg-foreground overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">

        {/* Phase 0: Info collection */}
        {phase === 0 && (
          <motion.div
            key="info-collect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6 w-full max-w-sm"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-background/30 text-[10px] tracking-[0.3em] uppercase mb-3"
            >
              Benvenuto, {name}
            </motion.p>
            <h2 className="font-display text-background text-3xl font-bold tracking-tight mb-10 text-center">
              A che punto sei?
            </h2>

            <div className="w-full space-y-3 mb-8">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-background/20" />
                <input
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  placeholder="La tua università"
                  className="w-full bg-background/[0.06] border border-background/[0.08] px-4 pl-10 py-3 text-sm text-background placeholder-background/25 focus:outline-none focus:border-background/20 transition-colors"
                />
              </div>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-background/20" />
                <input
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                  placeholder="Corso di laurea"
                  className="w-full bg-background/[0.06] border border-background/[0.08] px-4 pl-10 py-3 text-sm text-background placeholder-background/25 focus:outline-none focus:border-background/20 transition-colors"
                />
              </div>
            </div>

            <div className="w-full space-y-1.5 mb-8">
              {journeyOptions.map((opt) => (
                <button
                  key={opt.state}
                  onClick={() => setSelectedState(opt.state)}
                  className={`w-full text-left px-4 py-3 transition-all border ${
                    selectedState === opt.state
                      ? "border-background/30 bg-background/[0.08]"
                      : "border-background/[0.05] bg-background/[0.02] hover:bg-background/[0.05]"
                  }`}
                >
                  <p className={`text-sm font-medium ${selectedState === opt.state ? "text-background" : "text-background/50"}`}>
                    {opt.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${selectedState === opt.state ? "text-background/40" : "text-background/20"}`}>
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full bg-background text-foreground py-3.5 text-sm font-medium uppercase tracking-[0.15em] hover:bg-background/90 transition-all disabled:opacity-15 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continua
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Phase 1: Socrate reveal */}
        {phase === 1 && (
          <motion.div
            key="socrate-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="relative flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <SocrateCoin size={200} interactive={false} />
            </motion.div>

            <div className="mt-10 h-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {currentSubtitle && (
                  <motion.p
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="font-display text-background text-xl md:text-2xl font-medium text-center px-6 italic"
                  >
                    {currentSubtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Phase 2: Mode choice */}
        {phase === 2 && (
          <motion.div
            key="mode-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6"
          >
            <h2 className="font-display text-background text-3xl font-bold tracking-tight mb-2 text-center">
              Come vuoi comunicare?
            </h2>
            <p className="text-background/25 text-sm mb-10 text-center">
              Scegli come affrontare il duello
            </p>
            <div className="flex gap-6">
              <button
                onClick={() => handleModeChoice("voice")}
                className="group border border-background/[0.08] hover:border-background/20 hover:bg-background/[0.04] transition-all px-12 py-8 flex flex-col items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full border border-background/15 flex items-center justify-center group-hover:border-background/30 transition-colors">
                  <Mic className="w-5 h-5 text-background/60" />
                </div>
                <span className="text-background/60 text-sm font-medium tracking-[0.1em] uppercase">Parlare</span>
              </button>
              <button
                onClick={() => handleModeChoice("text")}
                className="group border border-background/[0.08] hover:border-background/20 hover:bg-background/[0.04] transition-all px-12 py-8 flex flex-col items-center gap-4"
              >
                <div className="w-14 h-14 rounded-full border border-background/15 flex items-center justify-center group-hover:border-background/30 transition-colors">
                  <PenTool className="w-5 h-5 text-background/60" />
                </div>
                <span className="text-background/60 text-sm font-medium tracking-[0.1em] uppercase">Scrivere</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Phase 3: Voice coin */}
        {phase === 3 && (
          <motion.div
            key="voice-orb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            >
              <SocrateCoin size={240} interactive={false} isActive />
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              transition={{ delay: 0.5 }}
              className="mt-8 font-display text-background text-lg italic"
            >
              Parla con me
            </motion.p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
