import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Mail, FileText, Search, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import supervisorsData from "@/data/supervisors.json";
import type { Supervisor } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];

interface Action { id: string; type: string; title: string; content: string; status: string; }

export default function ActionsPage() {
  const { profile, user } = useApp();
  const [actions, setActions] = useState<Action[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const studentFields = profile?.field_ids || [];
  const matchedSup = useMemo(() =>
    supervisors.filter(s => s.fieldIds.some(f => studentFields.includes(f))).slice(0, 3),
    [studentFields]);

  const addAction = (action: Omit<Action, "id" | "status">) => {
    setActions(prev => [...prev, { ...action, id: `a-${Date.now()}`, status: "pending" }]);
    // Save to memory
    if (user) {
      supabase.from("memory_entries").insert({ user_id: user.id, type: "action", title: action.title, detail: "Azione generata dall'AI" });
    }
  };

  const generateEmail = (sup: Supervisor) => {
    setGenerating("email");
    setTimeout(() => {
      const topic = profile?.thesis_topic || `un argomento legato a ${sup.researchInterests.slice(0, 2).join(" e ")}`;
      const content = `Gentile ${sup.title} ${sup.lastName},\n\nmi chiamo ${profile?.first_name} ${profile?.last_name}, studente di ${profile?.degree || "laurea magistrale"} presso ${profile?.university || "la mia università"}. Le scrivo perché il suo lavoro su ${sup.researchInterests[0]} è legato alla mia ricerca.\n\nSto esplorando "${topic}" e credo che la sua esperienza in ${sup.researchInterests.slice(0, 2).join(" e ")} potrebbe offrire supervisione preziosa.\n\nLe mie competenze: ${(profile?.skills || []).slice(0, 4).join(", ")}.\n\nSarebbe disponibile per un breve incontro?\n\nCordiali saluti,\n${profile?.first_name} ${profile?.last_name}\n${profile?.email}`;
      addAction({ type: "email_draft", title: `Email per ${sup.title} ${sup.lastName}`, content });
      setGenerating(null);
    }, 1200);
  };

  const generateProposal = () => {
    setGenerating("proposal");
    setTimeout(() => {
      const topic = profile?.thesis_topic || "Applicazione di AI nella ricerca";
      const content = `PROPOSTA DI TESI\n═══════════════\n\nTitolo: ${topic}\nStudente: ${profile?.first_name} ${profile?.last_name}\nProgramma: ${profile?.degree}\nUniversità: ${profile?.university}\n\n1. INTRODUZIONE\nQuesta tesi esplora ${topic.toLowerCase()}.\n\n2. OBIETTIVI\n- Analizzare lo stato dell'arte\n- Sviluppare un framework innovativo\n- Validare con sperimentazione empirica\n\n3. COMPETENZE\n${(profile?.skills || []).map(s => `• ${s}`).join("\n")}\n\n4. TIMELINE\n- Mese 1-2: Literature review\n- Mese 3-4: Sviluppo e raccolta dati\n- Mese 5-6: Analisi e stesura`;
      addAction({ type: "proposal", title: `Proposta: ${topic.slice(0, 50)}...`, content });
      setGenerating(null);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><Zap className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Azioni Autonome</h1><p className="text-sm text-muted-foreground">L'AI agisce per te</p></div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <Mail className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-semibold font-display">Genera Email</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Bozze per contattare supervisori</p>
          <div className="space-y-2">
            {matchedSup.map(sup => (
              <Button key={sup.id} variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => generateEmail(sup)} disabled={generating === "email"}>
                <Mail className="w-3 h-3 mr-2" />{sup.title} {sup.lastName}
              </Button>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <FileText className="w-8 h-8 text-ai mb-3" />
          <h3 className="font-semibold font-display">Genera Proposta</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Thesis proposal strutturata</p>
          <Button variant="ai" className="w-full" onClick={generateProposal} disabled={generating === "proposal"}>
            {generating === "proposal" ? "Generando..." : "Genera Proposal"}
          </Button>
        </motion.div>
      </div>
      {actions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display">Azioni Generate</h2>
          {actions.map((action, i) => (
            <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {action.type === "email_draft" ? <Mail className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-ai" />}
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(action.content)}><Copy className="w-3.5 h-3.5" /></Button>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-sans">{action.content}</pre>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
