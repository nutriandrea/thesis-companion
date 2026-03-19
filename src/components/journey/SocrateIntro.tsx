import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { Mic, PenTool } from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";

type InteractionMode = "voice" | "text";

interface Props {
  onComplete: (mode: InteractionMode) => void;
}

const subtitles = [
  { text: "Non ti dirò cosa fare.", delay: 0, duration: 2500 },
  { text: "Voglio tirare fuori la tua tesi.", delay: 2800, duration: 2500 },
  { text: "Sei pronto per il duello?", delay: 5600, duration: 2000 },
];

const INTRO_TEXT = `Hello {name}, I am Socrates. I will guide you through this cognitive journey.

It does not matter where you begin: whether you are just exploring or already have an idea, we can start from there.

I would prefer to carry out this exchange through voice rather than writing; I believe that speaking can help you answer more authentically. Would you be open to that?`;

export default function SocrateIntro({ onComplete }: Props) {
  const { profile, updateProfile } = useApp();
  const [phase, setPhase] = useState<"coin-reveal" | "coin-translate" | "text-appear" | "mode-choice">("coin-reveal");
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  const name = profile?.first_name || "studente";

  // Phase 1: Coin reveal with subtitles
  useEffect(() => {
    if (phase !== "coin-reveal") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    subtitles.forEach((sub) => {
      timers.push(setTimeout(() => setCurrentSubtitle(sub.text), sub.delay));
    });
    // After subtitles, move to coin translation
    timers.push(setTimeout(() => setPhase("coin-translate"), 8500));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Phase 2: Coin translates to right, then text appears
  useEffect(() => {
    if (phase !== "coin-translate") return;
    const timer = setTimeout(() => setPhase("text-appear"), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  // Phase 3: Text appears, then mode choice after a delay
  useEffect(() => {
    if (phase !== "text-appear") return;
    const timer = setTimeout(() => setPhase("mode-choice"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleModeChoice = async (mode: InteractionMode) => {
    await updateProfile({ onboarding_done: true });
    onComplete(mode);
  };

  const introText = INTRO_TEXT.replace("{name}", name);

  return (
    <div className="fixed inset-0 z-50 bg-foreground overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">

        {/* Phase: Coin Reveal with subtitles */}
        {phase === "coin-reveal" && (
          <motion.div
            key="coin-reveal"
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

        {/* Phase: Coin translates to right + text appears + mode choice */}
        {(phase === "coin-translate" || phase === "text-appear" || phase === "mode-choice") && (
          <motion.div
            key="main-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            {/* Coin - translates to the right edge */}
            <motion.div
              initial={{ x: 0, y: 0 }}
              animate={{
                x: typeof window !== "undefined" ? (window.innerWidth / 2) - 140 : 300,
                y: 0,
              }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-10"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 0.5 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <SocrateCoin size={200} interactive={false} />
              </motion.div>
            </motion.div>

            {/* Center content */}
            <div className="flex flex-col items-center max-w-lg px-8">
              {/* Intro text */}
              {(phase === "text-appear" || phase === "mode-choice") && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-center mb-12"
                >
                  {introText.split("\n\n").map((paragraph, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.4, duration: 0.8 }}
                      className="text-background/70 text-sm md:text-base leading-relaxed mb-4 last:mb-0"
                    >
                      {paragraph}
                    </motion.p>
                  ))}
                </motion.div>
              )}

              {/* Mode choice buttons */}
              {phase === "mode-choice" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="flex gap-6"
                >
                  <button
                    onClick={() => handleModeChoice("voice")}
                    className="group border border-background/[0.08] hover:border-background/20 hover:bg-background/[0.04] transition-all px-12 py-8 flex flex-col items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-full border border-background/15 flex items-center justify-center group-hover:border-background/30 transition-colors">
                      <Mic className="w-5 h-5 text-background/60" />
                    </div>
                    <span className="text-background/60 text-sm font-medium tracking-[0.1em] uppercase">Voice</span>
                  </button>
                  <button
                    onClick={() => handleModeChoice("text")}
                    className="group border border-background/[0.08] hover:border-background/20 hover:bg-background/[0.04] transition-all px-12 py-8 flex flex-col items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-full border border-background/15 flex items-center justify-center group-hover:border-background/30 transition-colors">
                      <PenTool className="w-5 h-5 text-background/60" />
                    </div>
                    <span className="text-background/60 text-sm font-medium tracking-[0.1em] uppercase">Text</span>
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
