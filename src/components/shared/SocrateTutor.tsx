import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SocrateCoin from "./SocrateCoin";
import { X } from "lucide-react";

interface TutorTip {
  text: string;
  position?: "top" | "bottom";
}

const SECTION_TIPS: Record<string, TutorTip[]> = {
  socrate: [
    { text: "Sono Socrate. Non ti darò risposte — ti farò le domande giuste." },
    { text: "Scrivi quello che pensi. Io troverò i buchi nel ragionamento." },
    { text: "Più sei onesto, più sarò utile. Niente formalità." },
  ],
  dashboard: [
    { text: "Questa è la tua base operativa. Tutto il tuo percorso, in un colpo d'occhio." },
    { text: "I task a sinistra? Sono le prossime mosse concrete. Falle." },
    { text: "Le vulnerabilità non sono insulti — sono i punti da rafforzare prima della discussione." },
  ],
  suggestions: [
    { text: "Qui trovi i topic che ho selezionato per te. Non a caso — in base a chi sei." },
    { text: "Clicca su un topic per esplorarlo. Se ti intriga, portalo nella nostra conversazione." },
  ],
  contacts: [
    { text: "I supervisori non sono tutti uguali. Qui li ho filtrati per affinità con il tuo profilo." },
    { text: "Guarda il punteggio: più è alto, più quel relatore è in linea con i tuoi interessi." },
  ],
  market: [
    { text: "Il mercato del lavoro collegato alla tua tesi. Sì, la tesi serve anche a questo." },
    { text: "Le aziende qui? Sono quelle che cercano competenze legate al tuo argomento." },
  ],
  editor: [
    { text: "L'editor è il tuo spazio di scrittura. LaTeX puro, come piace all'accademia." },
    { text: "Scrivi qui, e io analizzerò il contenuto nella nostra prossima conversazione." },
  ],
  actions: [
    { text: "Le azioni sono i compiti che ho estratto dalle nostre conversazioni. Concreti." },
    { text: "Completale e il tuo progresso nella barra in alto si muoverà." },
  ],
  memory: [
    { text: "La mia memoria. Tutto ciò che ho capito di te è qui — niente si perde." },
    { text: "Se qualcosa è sbagliato, dimmelo. Mi correggerò." },
  ],
  profile: [
    { text: "Il tuo profilo accademico. Aggiornalo e le mie analisi miglioreranno." },
    { text: "Università, competenze, interessi — tutto influenza i suggerimenti che ricevi." },
  ],
};

const FALLBACK_TIPS: TutorTip[] = [
  { text: "Esplora questa sezione. Se ti perdi, torna a parlarmi." },
  { text: "Ogni strumento qui ha uno scopo. Usali tutti." },
];

export default function SocrateTutor({ activeSection }: { activeSection: string }) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [prevSection, setPrevSection] = useState(activeSection);

  const tips = SECTION_TIPS[activeSection] || FALLBACK_TIPS;

  // Show tip when section changes
  useEffect(() => {
    if (activeSection !== prevSection) {
      setPrevSection(activeSection);
      setCurrentTipIndex(0);
      setDismissed(false);
      // Small delay for dramatic entrance
      const t = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(t);
    }
  }, [activeSection, prevSection]);

  // Initial show
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Auto-advance tips
  useEffect(() => {
    if (!visible || dismissed) return;
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => {
        const next = prev + 1;
        if (next >= tips.length) {
          setDismissed(true);
          return prev;
        }
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [visible, dismissed, tips.length]);

  const handleCoinClick = useCallback(() => {
    if (dismissed) {
      setDismissed(false);
      setCurrentTipIndex(0);
    } else {
      setCurrentTipIndex((prev) => {
        const next = prev + 1;
        if (next >= tips.length) {
          setDismissed(true);
          return prev;
        }
        return next;
      });
    }
  }, [dismissed, tips.length]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  const tip = tips[currentTipIndex];

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {visible && !dismissed && tip && (
          <motion.div
            key={`${activeSection}-${currentTipIndex}`}
            initial={{ opacity: 0, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="relative max-w-[260px] mb-2"
          >
            <div className="relative bg-foreground text-background px-4 py-3 text-xs leading-relaxed font-medium">
              {tip.text}
              {/* Tip counter */}
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-1">
                  {tips.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1 h-1 rounded-full transition-colors duration-200 ${
                        i === currentTipIndex ? "bg-background" : "bg-background/25"
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleDismiss}
                  className="text-background/40 hover:text-background transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              {/* Arrow pointing to coin */}
              <div className="absolute right-[-6px] bottom-4 w-3 h-3 bg-foreground rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Socrate coin */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 0.5, type: "spring" }}
      >
        <SocrateCoin
          size={48}
          interactive
          isActive={!dismissed}
          onClick={handleCoinClick}
          className="shadow-lg"
        />
      </motion.div>
    </div>
  );
}
