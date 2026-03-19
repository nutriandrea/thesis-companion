import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SocrateCoin from "./SocrateCoin";

/**
 * Each step targets a dashboard card by data-tutor-id attribute.
 * Socrate physically moves to that card, highlights it, and speaks.
 * After all steps, he exits screen bottom-right.
 */

interface TutorStep {
  targetId: string;       // data-tutor-id on the card
  text: string;
}

const DASHBOARD_STEPS: TutorStep[] = [
  { targetId: "career",        text: "Orientamento lavorativo. La tua tesi non è solo accademica — guarda dove ti porta nel mercato." },
  { targetId: "tasks",         text: "I tuoi task. Azioni concrete, non teoria. Falle e avanza." },
  { targetId: "vulnerabilities", text: "Vulnerabilità. I punti deboli della tua tesi — meglio trovarli ora che in sede di discussione." },
  { targetId: "supervisor",    text: "Il supervisore giusto fa la differenza. Qui sono ordinati per affinità con te." },
  { targetId: "thesis-doc",    text: "Il tuo documento. Collegalo e io potrò analizzare quello che scrivi." },
  { targetId: "companies",     text: "Aziende in linea con la tua ricerca. La tesi apre porte — guarda quali." },
];

const STORAGE_KEY = "socrate-tutor-seen";

export default function SocrateTutor({ activeSection }: { activeSection: string }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [active, setActive] = useState(false);
  const [exiting, setExiting] = useState(false);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Only show for dashboard, once per session
  useEffect(() => {
    if (activeSection !== "dashboard") return;
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen) return;
    const t = setTimeout(() => setActive(true), 2000);
    return () => clearTimeout(t);
  }, [activeSection]);

  // Position Socrate next to the current target card
  const positionAtStep = useCallback((idx: number) => {
    const step = DASHBOARD_STEPS[idx];
    if (!step) return;
    const el = document.querySelector(`[data-tutor-id="${step.targetId}"]`) as HTMLElement;
    if (!el) return;

    // Scroll the card into view within the scrollable container
    if (!scrollContainerRef.current) {
      scrollContainerRef.current = el.closest(".overflow-y-auto");
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });

    // Wait for scroll, then measure
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      // Position coin to the right of the card, vertically centered
      const coinX = rect.right + 12;
      const coinY = rect.top + rect.height / 2 - 24;

      // If coin would go offscreen right, put it to the left
      const finalX = coinX + 300 > window.innerWidth
        ? rect.left - 310
        : coinX;

      setPosition({ x: finalX, y: coinY });

      // Highlight the card
      el.style.outline = "2px solid hsl(var(--accent))";
      el.style.outlineOffset = "2px";
      el.style.transition = "outline 0.3s ease";

      // Store ref to clear later
      if (highlightRef.current && highlightRef.current !== el) {
        highlightRef.current.style.outline = "";
        highlightRef.current.style.outlineOffset = "";
      }
      highlightRef.current = el as any;
    }, 400);
  }, []);

  // Position on step change
  useEffect(() => {
    if (!active || exiting) return;
    positionAtStep(stepIndex);
  }, [stepIndex, active, exiting, positionAtStep]);

  // Auto-advance
  useEffect(() => {
    if (!active || exiting) return;
    const timer = setTimeout(() => {
      if (stepIndex < DASHBOARD_STEPS.length - 1) {
        setStepIndex(s => s + 1);
      } else {
        // Done — clear highlight and exit
        if (highlightRef.current) {
          highlightRef.current.style.outline = "";
          highlightRef.current.style.outlineOffset = "";
        }
        setExiting(true);
        sessionStorage.setItem(STORAGE_KEY, "1");
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [stepIndex, active, exiting]);

  // Skip on click
  const handleClick = useCallback(() => {
    if (stepIndex < DASHBOARD_STEPS.length - 1) {
      setStepIndex(s => s + 1);
    } else {
      if (highlightRef.current) {
        highlightRef.current.style.outline = "";
        highlightRef.current.style.outlineOffset = "";
      }
      setExiting(true);
      sessionStorage.setItem(STORAGE_KEY, "1");
    }
  }, [stepIndex]);

  // Cleanup highlight on unmount
  useEffect(() => {
    return () => {
      if (highlightRef.current) {
        highlightRef.current.style.outline = "";
        highlightRef.current.style.outlineOffset = "";
      }
    };
  }, []);

  if (!active || activeSection !== "dashboard") return null;

  const step = DASHBOARD_STEPS[stepIndex];
  const bubbleOnLeft = position && (position.x + 300 > window.innerWidth);

  return (
    <AnimatePresence>
      {!exiting ? (
        position && (
          <motion.div
            key={`tutor-${stepIndex}`}
            className="fixed z-50 flex items-start gap-3 pointer-events-auto"
            style={{ top: position.y, left: position.x }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* If bubble is on the left, show bubble first */}
            {bubbleOnLeft && (
              <motion.div
                key={`bubble-${stepIndex}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="max-w-[240px] relative"
              >
                <div className="bg-foreground text-background px-4 py-3 text-xs leading-relaxed font-medium rounded-sm">
                  {step.text}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-background/10">
                    <div className="flex gap-1">
                      {DASHBOARD_STEPS.map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${i === stepIndex ? "bg-background" : "bg-background/25"}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-background/40">{stepIndex + 1}/{DASHBOARD_STEPS.length}</span>
                  </div>
                  <div className="absolute right-[-6px] top-4 w-3 h-3 bg-foreground rotate-45" />
                </div>
              </motion.div>
            )}

            <div onClick={handleClick} className="cursor-pointer shrink-0">
              <SocrateCoin size={44} interactive isActive />
            </div>

            {/* If bubble is on the right */}
            {!bubbleOnLeft && (
              <motion.div
                key={`bubble-${stepIndex}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: 0.15, duration: 0.3 }}
                className="max-w-[240px] relative"
              >
                <div className="bg-foreground text-background px-4 py-3 text-xs leading-relaxed font-medium rounded-sm">
                  {step.text}
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-background/10">
                    <div className="flex gap-1">
                      {DASHBOARD_STEPS.map((_, i) => (
                        <div key={i} className={`w-1 h-1 rounded-full ${i === stepIndex ? "bg-background" : "bg-background/25"}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-background/40">{stepIndex + 1}/{DASHBOARD_STEPS.length}</span>
                  </div>
                  <div className="absolute left-[-6px] top-4 w-3 h-3 bg-foreground rotate-45" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )
      ) : (
        /* Exit animation: slide to bottom-right corner and vanish */
        <motion.div
          className="fixed z-50 pointer-events-none"
          initial={position ? { top: position.y, left: position.x, opacity: 1, scale: 1 } : {}}
          animate={{
            top: window.innerHeight + 50,
            left: window.innerWidth - 60,
            opacity: 0,
            scale: 0.5,
          }}
          transition={{ duration: 0.8, ease: "easeIn" }}
          onAnimationComplete={() => setActive(false)}
        >
          <SocrateCoin size={44} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
