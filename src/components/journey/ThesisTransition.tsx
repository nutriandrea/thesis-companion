import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SocrateCoin from "@/components/shared/SocrateCoin";

interface Props {
  thesisTopic: string;
  onComplete: () => void;
}

const lines = [
  { text: "The thesis has been chosen.", delay: 0 },
  { text: "Now we build.", delay: 2000 },
  { text: "Get ready.", delay: 4000 },
];

export default function ThesisTransition({ thesisTopic, onComplete }: Props) {
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<"lines" | "topic" | "ignite" | "fade-out">("lines");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentLine(i), lines[i].delay));
    });

    timers.push(setTimeout(() => setPhase("topic"), 6000));
    timers.push(setTimeout(() => setPhase("ignite"), 8500));
    // Start fade-out phase before calling onComplete
    timers.push(setTimeout(() => setPhase("fade-out"), 10000));

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden"
      animate={{ opacity: phase === "fade-out" ? 0 : 1 }}
      transition={{ duration: 0.8, ease: "easeInOut" }}
      onAnimationComplete={() => {
        if (phase === "fade-out") onComplete();
      }}
    >
      {/* Ambient glow */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === "ignite" ? 0.15 : 0.03 }}
        transition={{ duration: 2 }}
        className="absolute inset-0 pointer-events-none"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent blur-[150px]" />
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === "lines" && (
          <motion.div
            key="lines"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center px-6"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={currentLine}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.6 }}
                className="font-display text-white text-xl md:text-2xl font-medium tracking-wide italic"
              >
                {lines[currentLine].text}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        )}

        {phase === "topic" && (
          <motion.div
            key="topic"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center gap-10 px-6 max-w-2xl"
          >
            <div className="shrink-0 order-2">
              <SocrateCoin size={120} interactive={false} />
            </div>
            <div className="text-left order-1">
              <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-3">Your thesis</p>
              <h1 className="font-display text-white text-2xl md:text-3xl font-medium tracking-wide leading-tight italic">
                {thesisTopic}
              </h1>
            </div>
          </motion.div>
        )}

        {(phase === "ignite" || phase === "fade-out") && (
          <motion.div
            key="ignite"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="mx-auto mb-6"
            >
              <SocrateCoin size={96} interactive={false} />
            </motion.div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white text-lg font-medium tracking-[0.15em] uppercase"
            >
              Dashboard activated
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
