import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp, JourneyState } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Mic, PenTool, ArrowRight } from "lucide-react";
import socrateImg from "@/assets/socrate.png";

const journeyOptions: { state: JourneyState; label: string }[] = [
  { state: "lost", label: "Non ho ancora idea" },
  { state: "vague_idea", label: "Ho un'idea vaga" },
  { state: "topic_chosen", label: "Ho scelto il topic" },
  { state: "finding_contacts", label: "Cerco contatti e supervisore" },
  { state: "writing", label: "Sto già scrivendo" },
];

type InteractionMode = "voice" | "text";

interface Props {
  onComplete: (mode: InteractionMode) => void;
}

export default function SocrateIntro({ onComplete }: Props) {
  const { profile, updateProfile } = useApp();
  const [phase, setPhase] = useState(0); // 0=black, 1=socrate appears, 2=intro text, 3=collect info, 4=mode choice
  const [university, setUniversity] = useState(profile?.university || "");
  const [selectedState, setSelectedState] = useState<JourneyState | null>(
    (profile?.journey_state as JourneyState) || null
  );

  // Phase progression: black → socrate image → text → form
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 800);   // show socrate
    const t2 = setTimeout(() => setPhase(2), 2400);  // show intro text
    const t3 = setTimeout(() => setPhase(3), 5000);  // show form
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleContinueToChoice = async () => {
    if (!university.trim() || !selectedState) return;
    await updateProfile({ university, journey_state: selectedState });
    setPhase(4);
  };

  const handleModeChoice = async (mode: InteractionMode) => {
    await updateProfile({ onboarding_done: true });
    onComplete(mode);
  };

  const name = profile?.first_name || "studente";

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] overflow-hidden flex items-center justify-center">
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#1a1510]/40 blur-[120px]" />
      </div>

      <AnimatePresence mode="wait">
        {/* Phase 0: Pure black */}
        {phase === 0 && (
          <motion.div
            key="black"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          />
        )}

        {/* Phase 1-2: Socrate appears */}
        {(phase === 1 || phase === 2) && (
          <motion.div
            key="socrate-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="flex flex-col items-center text-center px-6"
          >
            {/* Socrate portrait */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="relative w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden mb-8 ring-1 ring-[#c9a96e]/20"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10" />
              <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
            </motion.div>

            {/* Intro text - appears in phase 2 */}
            <AnimatePresence>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.2, delay: 0.2 }}
                  className="max-w-lg space-y-4"
                >
                  <p className="text-[#c9a96e]/90 text-sm tracking-[0.2em] uppercase font-sans">
                    Il Duello Socratico
                  </p>
                  <h1 className="text-[#e8dcc8] text-2xl md:text-3xl font-display leading-snug">
                    {name}, benvenuto.
                  </h1>
                  <p className="text-[#a09882] text-base md:text-lg leading-relaxed font-sans">
                    Non ti dirò cosa fare.<br />
                    Voglio tirare fuori <em className="text-[#c9a96e]">la tua tesi</em>.
                  </p>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.5 }}
                  >
                    <Button
                      onClick={() => setPhase(3)}
                      className="mt-6 bg-transparent border border-[#c9a96e]/30 text-[#c9a96e] hover:bg-[#c9a96e]/10 rounded-full px-8 py-2 text-sm"
                    >
                      Continua <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Phase 3: Collect university & state */}
        {phase === 3 && (
          <motion.div
            key="collect"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center px-6 max-w-md w-full"
          >
            {/* Small Socrate avatar */}
            <div className="w-16 h-16 rounded-full overflow-hidden mb-6 ring-1 ring-[#c9a96e]/20">
              <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
            </div>

            <p className="text-[#a09882] text-sm mb-2 font-sans text-center">
              Socrate vuole conoscerti.
            </p>
            <h2 className="text-[#e8dcc8] text-xl font-display mb-8 text-center">
              Dimmi di te, {name}.
            </h2>

            <div className="w-full space-y-5">
              {/* University */}
              <div>
                <label className="text-[#a09882] text-xs font-sans mb-1.5 block tracking-wide uppercase">
                  Università
                </label>
                <input
                  value={university}
                  onChange={e => setUniversity(e.target.value)}
                  placeholder="es. Politecnico di Milano"
                  className="w-full bg-[#151515] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-[#e8dcc8] placeholder-[#555] focus:outline-none focus:border-[#c9a96e]/40 font-sans"
                />
              </div>

              {/* Journey state */}
              <div>
                <label className="text-[#a09882] text-xs font-sans mb-2 block tracking-wide uppercase">
                  Dove ti trovi?
                </label>
                <div className="space-y-2">
                  {journeyOptions.map(opt => (
                    <button
                      key={opt.state}
                      onClick={() => setSelectedState(opt.state)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-sans transition-all border ${
                        selectedState === opt.state
                          ? "border-[#c9a96e]/50 bg-[#c9a96e]/10 text-[#c9a96e]"
                          : "border-[#2a2a2a] bg-[#151515] text-[#a09882] hover:border-[#3a3a3a]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleContinueToChoice}
                disabled={!university.trim() || !selectedState}
                className="w-full mt-2 bg-[#c9a96e] text-[#0a0a0a] hover:bg-[#d4b87d] rounded-lg font-sans font-semibold disabled:opacity-30"
              >
                Continua <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Phase 4: Voice or Text choice */}
        {phase === 4 && (
          <motion.div
            key="mode-choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center px-6 max-w-lg w-full"
          >
            <div className="w-20 h-20 rounded-full overflow-hidden mb-6 ring-1 ring-[#c9a96e]/20">
              <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
            </div>

            <p className="text-[#c9a96e]/80 text-xs tracking-[0.2em] uppercase font-sans mb-2">
              Scegli la tua arma
            </p>
            <h2 className="text-[#e8dcc8] text-2xl font-display mb-2 text-center">
              Come vuoi affrontare il duello?
            </h2>
            <p className="text-[#a09882] text-sm mb-10 text-center font-sans max-w-sm">
              Puoi parlare con Socrate a voce, oppure sfidarlo per iscritto. 
              In entrambi i casi, non aspettarti risposte facili.
            </p>

            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {/* Voice */}
              <button
                onClick={() => handleModeChoice("voice")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-[#2a2a2a] bg-[#111] hover:border-[#c9a96e]/40 hover:bg-[#c9a96e]/5 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#c9a96e]/10 flex items-center justify-center group-hover:bg-[#c9a96e]/20 transition-colors">
                  <Mic className="w-6 h-6 text-[#c9a96e]" />
                </div>
                <div className="text-center">
                  <p className="text-[#e8dcc8] font-semibold text-sm font-sans">Parlare</p>
                  <p className="text-[#777] text-xs font-sans mt-1">Dialogo a voce</p>
                </div>
              </button>

              {/* Text */}
              <button
                onClick={() => handleModeChoice("text")}
                className="group flex flex-col items-center gap-3 p-6 rounded-2xl border border-[#2a2a2a] bg-[#111] hover:border-[#c9a96e]/40 hover:bg-[#c9a96e]/5 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-[#c9a96e]/10 flex items-center justify-center group-hover:bg-[#c9a96e]/20 transition-colors">
                  <PenTool className="w-6 h-6 text-[#c9a96e]" />
                </div>
                <div className="text-center">
                  <p className="text-[#e8dcc8] font-semibold text-sm font-sans">Scrivere</p>
                  <p className="text-[#777] text-xs font-sans mt-1">Chat testuale</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
