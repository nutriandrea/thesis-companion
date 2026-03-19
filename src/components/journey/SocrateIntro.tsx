import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Mic, PenTool } from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";

type InteractionMode = "voice" | "text";

interface Props {
  onComplete: (mode: InteractionMode) => void;
}

export default function SocrateIntro({ onComplete }: Props) {
  const { profile, updateProfile } = useApp();
  const { t } = useLanguage();
  const [phase, setPhase] = useState<"coin-reveal" | "coin-translate" | "text-appear" | "mode-choice">("coin-reveal");
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  const name = profile?.first_name || "studente";

  const subtitles = [
    { text: t("intro.sub1"), delay: 0, duration: 2500 },
    { text: t("intro.sub2"), delay: 2800, duration: 2500 },
    { text: t("intro.sub3"), delay: 5600, duration: 2000 },
  ];

  const introText = t("intro.text", { name });

  useEffect(() => {
    if (phase !== "coin-reveal") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    subtitles.forEach((sub) => {
      timers.push(setTimeout(() => setCurrentSubtitle(sub.text), sub.delay));
    });
    timers.push(setTimeout(() => setPhase("coin-translate"), 8500));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "coin-translate") return;
    const timer = setTimeout(() => setPhase("text-appear"), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "text-appear") return;
    const timer = setTimeout(() => setPhase("mode-choice"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  const handleModeChoice = async (mode: InteractionMode) => {
    await updateProfile({ onboarding_done: true });
    onComplete(mode);
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
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
              <SocrateCoin size={280} interactive={false} />
            </motion.div>
            <div className="mt-12 h-20 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {currentSubtitle && (
                  <motion.p
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="font-display text-background/90 text-2xl md:text-3xl font-medium text-center px-8 italic leading-snug tracking-tight"
                  >
                    {currentSubtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {(phase === "coin-translate" || phase === "text-appear" || phase === "mode-choice") && (
          <motion.div
            key="main-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ x: 0, y: 0 }}
              animate={{
                x: typeof window !== "undefined" ? window.innerWidth / 2 - 280 : 300,
                y: typeof window !== "undefined" ? window.innerHeight / 2 - 480 : 0,
              }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-10"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 0.45 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <SocrateCoin size={400} interactive={false} />
              </motion.div>
            </motion.div>

            <LayoutGroup>
              <motion.div
                layout
                transition={{ layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
                className="flex flex-col items-center max-w-xl px-8 mt-32"
              >
                {(phase === "text-appear" || phase === "mode-choice") && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut", layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
                    className="text-center mb-6"
                  >
                    {introText.split("\n\n").map((paragraph, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.4, duration: 0.8 }}
                        className="font-display text-background/60 text-base md:text-lg leading-[1.8] mb-5 last:mb-0"
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </motion.div>
                )}

                {phase === "mode-choice" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex gap-14 mt-4"
                  >
                    <button
                      onClick={() => handleModeChoice("voice")}
                      className="group flex flex-col items-center gap-3 transition-all"
                    >
                      <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                        <Mic className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                      </div>
                      <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">
                        Voce
                      </span>
                    </button>
                    <button
                      onClick={() => handleModeChoice("text")}
                      className="group flex flex-col items-center gap-3 transition-all"
                    >
                      <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                        <PenTool className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                      </div>
                      <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">
                        Testo
                      </span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
