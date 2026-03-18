import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Lightbulb, Target, Users, Zap, MessageCircle } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";

const typeIcons: Record<string, React.ElementType> = { exploration: Lightbulb, decision: Target, contact: Users, action: Zap, feedback: MessageCircle };
const typeColors: Record<string, string> = { exploration: "bg-warning/10 text-warning", decision: "bg-accent/10 text-accent", contact: "bg-success/10 text-success", action: "bg-ai/10 text-ai", feedback: "bg-primary/10 text-primary" };
const typeLabels: Record<string, string> = { exploration: "Esplorazione", decision: "Decisione", contact: "Contatto", action: "Azione", feedback: "Feedback" };

interface MemEntry { id: string; type: string; title: string; detail: string; created_at: string; }

export default function MemoryPage() {
  const { profile, user } = useApp();
  const [entries, setEntries] = useState<MemEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("memory_entries").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setEntries(data); });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-ai/10"><Brain className="w-5 h-5 text-ai" /></div>
        <div><h1 className="text-xl font-bold font-display">Memoria della Tesi</h1><p className="text-sm text-muted-foreground">Cronologia di ogni azione e decisione</p></div>
      </div>
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold font-display mb-3">Stato Attuale</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold font-display text-accent">{entries.length}</p><p className="text-xs text-muted-foreground">Interazioni</p></div>
          <div><p className="text-2xl font-bold font-display text-ai">{entries.filter(m => m.type === "decision").length}</p><p className="text-xs text-muted-foreground">Decisioni</p></div>
          <div><p className="text-2xl font-bold font-display text-success">{entries.filter(m => m.type === "action").length}</p><p className="text-xs text-muted-foreground">Azioni</p></div>
        </div>
        {profile?.thesis_topic && <div className="mt-4 pt-3 border-t"><p className="text-xs text-muted-foreground">Argomento</p><p className="text-sm font-medium mt-0.5">{profile.thesis_topic}</p></div>}
      </div>
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {entries.map((entry, i) => {
            const Icon = typeIcons[entry.type] || Lightbulb;
            return (
              <motion.div key={entry.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 ${typeColors[entry.type] || "bg-muted text-muted-foreground"}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="bg-card border rounded-xl p-4 shadow-sm flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{typeLabels[entry.type] || entry.type}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(entry.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
                  </div>
                  <h3 className="font-semibold text-sm">{entry.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>
                </div>
              </motion.div>
            );
          })}
          {entries.length === 0 && <p className="text-sm text-muted-foreground ml-14">Nessuna memoria ancora. Parla con Socrate per iniziare!</p>}
        </div>
      </div>
    </div>
  );
}
