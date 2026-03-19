import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socrateCoinImg from "@/assets/socrate-coin.png";

interface Props {
  thesisTopic: string;
  onComplete: () => void;
}

const lines = [
  { text: "La tesi è stata scelta.", delay: 0 },
  { text: "Ora si costruisce.", delay: 2000 },
  { text: "Preparati.", delay: 4000 },
];

export default function ThesisTransition({ thesisTopic, onComplete }: Props) {
  const [currentLine, setCurrentLine] = useState(0);
  const [phase, setPhase] = useState<"lines" | "topic" | "ignite">("lines");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    lines.forEach((_, i) => {
      timers.push(setTimeout(() => setCurrentLine(i), lines[i].delay));
    });

    timers.push(setTimeout(() => setPhase("topic"), 6000));
    timers.push(setTimeout(() => setPhase("ignite"), 8500));
    timers.push(setTimeout(() => onComplete(), 10500));

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center overflow-hidden">
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
                className="text-white text-xl md:text-2xl font-bold tracking-wide"
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
            className="text-center px-6 max-w-lg"
          >
            <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-6 ring-2 ring-accent/30">
              <img src={socrateImg} alt="Socrate" className="w-full h-full object-cover" />
            </div>
            <p className="text-white/40 text-xs tracking-[0.3em] uppercase mb-3">La tua tesi</p>
            <h1 className="text-white text-2xl md:text-3xl font-bold tracking-wide leading-tight">
              {thesisTopic}
            </h1>
          </motion.div>
        )}

        {phase === "ignite" && (
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
              className="w-24 h-24 rounded-full mx-auto mb-6"
              style={{
                background: "radial-gradient(circle at 30% 40%, #f5a623, #e94e77 35%, #7b61ff 65%, #4a90d9 100%)",
                boxShadow: "0 0 60px rgba(123, 97, 255, 0.4), 0 0 120px rgba(233, 78, 119, 0.2)",
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-white text-lg font-bold tracking-[0.15em] uppercase"
            >
              Dashboard attivata
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
