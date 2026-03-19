import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRight, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (topic: string) => void;
  initialTopic?: string;
}

export default function ThesisConfirmDialog({ open, onClose, onConfirm, initialTopic = "" }: Props) {
  const [topic, setTopic] = useState(initialTopic);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] bg-black/80 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-card border border-border rounded-lg overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="text-sm font-bold text-foreground tracking-wide uppercase">
              Conferma la tua tesi
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-md">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning">
                Questo attiva la Dashboard e cambia il comportamento di Socrate. È un passaggio importante — assicurati di essere pronto.
              </p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Titolo o argomento della tesi
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="es. Analisi dell'impatto dell'AI generativa sulla supply chain nel settore automotive"
                rows={3}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
              />
            </div>
          </div>

          <div className="p-4 border-t border-border flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 text-xs font-medium text-muted-foreground border border-border rounded-md hover:bg-secondary transition-colors">
              Non ancora
            </button>
            <button
              onClick={() => topic.trim() && onConfirm(topic.trim())}
              disabled={!topic.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Confermo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
