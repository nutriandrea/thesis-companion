import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Mic, PenTool, ArrowRight, GraduationCap, MapPin } from "lucide-react";
import socrateImg from "@/assets/socrate.png";

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
  // 0=STATO + UNIVERSITÀ, 1=Socrate reveal+subtitles, 2=COME VUOI COMUNICARE, 3=Voice orb
  const [university, setUniversity] = useState(profile?.university || "");
  const [degree, setDegree] = useState(profile?.degree || "");
  const [selectedState, setSelectedState] = useState<JourneyState | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // Phase 1: Socrate subtitles
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
    await updateProfile({
      university,
      degree,
      journey_state: selectedState,
    });
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
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex items-center justify-center">
      {/* Subtle ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.015] blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">

        {/* Phase 0: STATO DI AVANZAMENTO + UNIVERSITÀ */}
        {phase === 0 && (
          <motion.div
            key="info-collect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6 w-full max-w-md"
          >
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-white/30 text-xs tracking-[0.3em] uppercase mb-3"
            >
              Benvenuto, {name}
            </motion.p>
            <h2 className="text-white text-2xl font-bold tracking-[0.1em] uppercase mb-10 text-center">
              A CHE PUNTO SEI?
            </h2>

            {/* University & Degree inputs */}
            <div className="w-full space-y-3 mb-8">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  placeholder="La tua università"
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  value={degree}
                  onChange={e => setDegree(e.target.value)}
                  placeholder="Corso di laurea"
                  className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>

            {/* Journey state */}
            <div className="w-full space-y-2 mb-8">
              {journeyOptions.map((opt) => (
                <button
                  key={opt.state}
                  onClick={() => setSelectedState(opt.state)}
                  className={`w-full text-left px-4 py-3.5 transition-all border ${
                    selectedState === opt.state
                      ? "border-white/30 bg-white/[0.08]"
                      : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <p className={`text-sm font-medium ${
                    selectedState === opt.state ? "text-white" : "text-white/60"
                  }`}>
                    {opt.label}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    selectedState === opt.state ? "text-white/50" : "text-white/25"
                  }`}>
                    {opt.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="w-full bg-white text-black py-3 text-sm font-semibold uppercase tracking-wider hover:bg-white/90 transition-all disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continua
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Phase 1: Socrate reveal with subtitles */}
        {phase === 1 && (
          <motion.div
            key="socrate-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <motion.img
              src={socrateImg}
              alt="Socrate"
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="max-w-[480px] w-full h-auto object-contain"
            />
            {/* Gradient fade at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black to-transparent" />
            {/* Subtitles */}
            <div className="absolute bottom-[10%] left-0 right-0 flex justify-center">
              <AnimatePresence mode="wait">
                {currentSubtitle && (
                  <motion.p
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="text-white text-lg md:text-xl font-bold tracking-wide text-center px-6"
                  >
                    {currentSubtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Phase 2: COME VUOI COMUNICARE */}
        {phase === 2 && (
          <motion.div
            key="mode-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6"
          >
            <h2 className="text-white text-2xl font-bold tracking-[0.1em] uppercase mb-3 text-center">
              COME VUOI COMUNICARE
            </h2>
            <p className="text-white/30 text-sm mb-10 text-center max-w-xs">
              Scegli come affrontare il duello con Socrate
            </p>
            <div className="flex gap-5">
              <button
                onClick={() => handleModeChoice("voice")}
                className="group bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all px-10 py-6 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                  <Mic className="w-5 h-5 text-white/70" />
                </div>
                <span className="text-white/70 text-sm font-medium tracking-wide">Parlare</span>
              </button>
              <button
                onClick={() => handleModeChoice("text")}
                className="group bg-white/[0.04] border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.07] transition-all px-10 py-6 flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-white/[0.1] transition-colors">
                  <PenTool className="w-5 h-5 text-white/70" />
                </div>
                <span className="text-white/70 text-sm font-medium tracking-wide">Scrivere</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Phase 3: Voice orb */}
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
              className="relative w-64 h-64 md:w-80 md:h-80 mb-8"
            >
              <div
                className="w-full h-full rounded-full"
                style={{
                  background: "radial-gradient(circle at 30% 40%, #f5a623, #e94e77 40%, #7b61ff 70%, #4a90d9 100%)",
                  animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                }}
              />
            </motion.div>
            <h2 className="text-white text-lg font-bold tracking-[0.15em] uppercase text-center leading-relaxed">
              SPEAK WITH<br />ME
            </h2>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
