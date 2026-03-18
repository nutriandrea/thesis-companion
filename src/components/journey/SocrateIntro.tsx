import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Mic, PenTool } from "lucide-react";
import socrateImg from "@/assets/socrate.png";

type InteractionMode = "voice" | "text";

interface Props {
  onComplete: (mode: InteractionMode) => void;
}

const roleOptions = [
  { id: "triennale", label: "Triennale" },
  { id: "magistrale", label: "Magistrale" },
  { id: "ciclo_unico", label: "Ciclo Unico" },
  { id: "dottorando", label: "Dottorando" },
  { id: "erasmus", label: "Erasmus" },
  { id: "lavoratore", label: "Lavoratore" },
  { id: "fuori_corso", label: "Fuori corso" },
  { id: "altro", label: "Altro" },
];

const journeyOptions: { state: JourneyState; label: string }[] = [
  { state: "lost", label: "Non ho ancora idea" },
  { state: "vague_idea", label: "Ho un'idea vaga" },
  { state: "topic_chosen", label: "Ho scelto il topic" },
  { state: "finding_contacts", label: "Cerco supervisore" },
];

const subtitles = [
  { text: "Non ti dirò cosa fare.", delay: 0, duration: 2500 },
  { text: "Voglio tirare fuori la tua tesi.", delay: 2800, duration: 2500 },
  { text: "Sei pronto per il duello?", delay: 5600, duration: 2000 },
];

export default function SocrateIntro({ onComplete }: Props) {
  const { profile, updateProfile } = useApp();
  const [phase, setPhase] = useState(0);
  // 0=CHI SEI, 1=STATO DI AVANZAMENTO, 2=Socrate reveal+subtitles, 3=COME VUOI COMUNICARE, 4=Voice orb
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<JourneyState | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  // Phase 2: Socrate subtitles auto-advance
  useEffect(() => {
    if (phase !== 2) return;
    const timers: ReturnType<typeof setTimeout>[] = [];

    subtitles.forEach((sub) => {
      timers.push(setTimeout(() => setCurrentSubtitle(sub.text), sub.delay));
    });

    // Auto-advance after subtitles
    timers.push(setTimeout(() => setPhase(3), 8500));

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    // Small delay then advance
    setTimeout(() => setPhase(1), 400);
  };

  const handleStateSelect = async (state: JourneyState) => {
    setSelectedState(state);
    const role = roleOptions.find(r => r.id === selectedRole);
    await updateProfile({
      degree: role?.label || "",
      journey_state: state,
    });
    setTimeout(() => setPhase(2), 400);
  };

  const handleModeChoice = async (mode: InteractionMode) => {
    if (mode === "voice") {
      setPhase(4);
      // Small delay then complete
      setTimeout(async () => {
        await updateProfile({ onboarding_done: true });
        onComplete(mode);
      }, 2000);
    } else {
      await updateProfile({ onboarding_done: true });
      onComplete(mode);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">

        {/* Phase 0: CHI SEI? */}
        {phase === 0 && (
          <motion.div
            key="chi-sei"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6"
          >
            <h2 className="text-white text-2xl font-bold tracking-wider uppercase mb-12">
              CHI SEI?
            </h2>
            <div className="grid grid-cols-2 gap-4 max-w-sm w-full">
              {roleOptions.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className={`px-6 py-4 text-sm font-medium transition-all ${
                    selectedRole === role.id
                      ? "bg-white text-black"
                      : "bg-[#1a1a1a] text-white/80 hover:bg-[#252525]"
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 1: STATO DI AVANZAMENTO */}
        {phase === 1 && (
          <motion.div
            key="stato"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6"
          >
            <h2 className="text-white text-2xl font-bold tracking-wider uppercase mb-10 text-center max-w-[200px] leading-relaxed">
              STATO DI AVANZAMENTO
            </h2>
            <div className="flex flex-col gap-5 w-[200px]">
              {journeyOptions.map((opt) => (
                <button
                  key={opt.state}
                  onClick={() => handleStateSelect(opt.state)}
                  className={`px-6 py-4 text-sm font-medium transition-all ${
                    selectedState === opt.state
                      ? "bg-white text-black"
                      : "bg-[#1a1a1a] text-white/80 hover:bg-[#252525]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Phase 2: Socrate reveal with subtitles */}
        {phase === 2 && (
          <motion.div
            key="socrate-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="relative w-full h-full flex items-center justify-center"
          >
            <img
              src={socrateImg}
              alt="Socrate"
              className="max-w-[500px] w-full h-auto object-contain"
            />
            {/* Subtitles */}
            <div className="absolute bottom-[12%] left-0 right-0 flex justify-center">
              <AnimatePresence mode="wait">
                {currentSubtitle && (
                  <motion.p
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.5 }}
                    className="text-white text-lg md:text-xl font-bold tracking-wide text-center px-4"
                  >
                    {currentSubtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Phase 3: COME VUOI COMUNICARE */}
        {phase === 3 && (
          <motion.div
            key="mode-choice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center px-6"
          >
            <h2 className="text-white text-2xl font-bold tracking-wider uppercase mb-10 text-center max-w-[220px] leading-relaxed">
              COME VUOI COMUNICARE
            </h2>
            <div className="flex gap-6">
              <button
                onClick={() => handleModeChoice("voice")}
                className="bg-[#1a1a1a] hover:bg-[#252525] transition-all px-8 py-4 flex flex-col items-center gap-2"
              >
                <Mic className="w-6 h-6 text-white/80" />
                <span className="text-white/80 text-sm font-medium">Parlare</span>
              </button>
              <button
                onClick={() => handleModeChoice("text")}
                className="bg-[#1a1a1a] hover:bg-[#252525] transition-all px-8 py-4 flex flex-col items-center gap-2"
              >
                <PenTool className="w-6 h-6 text-white/80" />
                <span className="text-white/80 text-sm font-medium">Scrivere</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Phase 4: Voice orb */}
        {phase === 4 && (
          <motion.div
            key="voice-orb"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="flex flex-col items-center"
          >
            {/* Gradient orb */}
            <div className="relative w-72 h-72 md:w-96 md:h-96 mb-8">
              <div
                className="w-full h-full rounded-full animate-pulse"
                style={{
                  background: "radial-gradient(circle at 30% 40%, #f5a623, #e94e77 40%, #7b61ff 70%, #4a90d9 100%)",
                  filter: "blur(1px)",
                }}
              />
              {/* Subtle ring lines */}
              <div className="absolute inset-0 rounded-full border border-white/5" />
            </div>
            <h2 className="text-white text-xl font-bold tracking-wider uppercase text-center leading-relaxed">
              SPEAK WITH<br />ME
            </h2>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
