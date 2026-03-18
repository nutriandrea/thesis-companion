import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Mail, FileText, Route, Search, CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import type { Supervisor, Company } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];

export default function ActionsPage() {
  const { currentStudent, thesisTopic, actions, addAction, markActionDone, addMemory } = useApp();
  const [generating, setGenerating] = useState<string | null>(null);

  const matchedSup = useMemo(() =>
    supervisors.filter(s => s.fieldIds.some(f => currentStudent.fieldIds.includes(f))).slice(0, 3),
    [currentStudent.fieldIds]
  );

  const generateEmail = (sup: Supervisor) => {
    setGenerating("email");
    setTimeout(() => {
      const topic = thesisTopic || "un argomento legato a " + sup.researchInterests.slice(0, 2).join(" e ");
      const content = `Gentile ${sup.title} ${sup.lastName},

mi chiamo ${currentStudent.firstName} ${currentStudent.lastName}, studente di ${currentStudent.degree.toUpperCase()} presso ETH Zurich. Le scrivo perché il suo lavoro su ${sup.researchInterests[0]} è strettamente legato alla mia area di ricerca.

Sto esplorando la possibilità di svolgere la mia tesi su "${topic}" e credo che la sua esperienza in ${sup.researchInterests.slice(0, 2).join(" e ")} potrebbe offrire una supervisione estremamente preziosa.

Le mie competenze includono ${currentStudent.skills.slice(0, 4).join(", ")}, e sono particolarmente motivato a contribuire alla ricerca in questo campo.

Sarebbe disponibile per un breve incontro di 15 minuti per discutere questa opportunità?

Cordiali saluti,
${currentStudent.firstName} ${currentStudent.lastName}
${currentStudent.email}`;

      addAction({ type: "email_draft", title: `Email per ${sup.title} ${sup.lastName}`, content });
      addMemory({ type: "action", title: `Generata email per ${sup.firstName} ${sup.lastName}`, detail: `Richiesta supervisione per tesi` });
      setGenerating(null);
    }, 1200);
  };

  const generateProposal = () => {
    setGenerating("proposal");
    setTimeout(() => {
      const topic = thesisTopic || "Applicazione di AI nella ricerca accademica";
      const content = `PROPOSTA DI TESI
═══════════════

Titolo: ${topic}

Studente: ${currentStudent.firstName} ${currentStudent.lastName}
Programma: ${currentStudent.degree.toUpperCase()} Computer Science
Università: ETH Zurich

1. INTRODUZIONE
Questa tesi si propone di esplorare ${topic.toLowerCase()}, un ambito di crescente rilevanza nel panorama della ricerca contemporanea.

2. OBIETTIVI
- Analizzare lo stato dell'arte nella letteratura esistente
- Sviluppare un framework metodologico innovativo
- Validare l'approccio proposto attraverso sperimentazione empirica
- Contribuire con risultati pubblicabili alla comunità scientifica

3. METODOLOGIA
L'approccio proposto combina tecniche di ${currentStudent.skills.slice(0, 3).join(", ")} per affrontare le sfide identificate nella fase esplorativa.

4. TIMELINE STIMATA
- Mese 1-2: Literature review e definizione framework
- Mese 3-4: Sviluppo metodologico e raccolta dati
- Mese 5-6: Analisi risultati e stesura

5. COMPETENZE RILEVANTI
${currentStudent.skills.map(s => `• ${s}`).join("\n")}

6. RISULTATI ATTESI
Ci si aspetta di produrre almeno un paper conferenza e di sviluppare un prototipo funzionante che dimostri la validità dell'approccio.`;

      addAction({ type: "proposal", title: `Proposta tesi: ${topic.slice(0, 50)}...`, content });
      addMemory({ type: "action", title: "Generata proposta di tesi", detail: topic });
      setGenerating(null);
    }, 1500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><Zap className="w-5 h-5 text-accent" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Azioni Autonome</h1>
          <p className="text-sm text-muted-foreground">L'AI agisce per te: email, proposte e roadmap</p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <Mail className="w-8 h-8 text-accent mb-3" />
          <h3 className="font-semibold font-display">Genera Email</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Crea bozze personalizzate per contattare supervisori</p>
          <div className="space-y-2">
            {matchedSup.map(sup => (
              <Button key={sup.id} variant="outline" size="sm" className="w-full justify-start text-xs"
                onClick={() => generateEmail(sup)}
                disabled={generating === "email"}>
                <Mail className="w-3 h-3 mr-2" />
                {sup.title} {sup.lastName}
              </Button>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <FileText className="w-8 h-8 text-ai mb-3" />
          <h3 className="font-semibold font-display">Genera Proposta</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Crea una thesis proposal strutturata e completa</p>
          <Button variant="ai" className="w-full" onClick={generateProposal} disabled={generating === "proposal"}>
            {generating === "proposal" ? "Generando..." : "Genera Proposal"}
          </Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <Route className="w-8 h-8 text-success mb-3" />
          <h3 className="font-semibold font-display">Trova Contatti</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Identifica automaticamente le persone chiave per il tuo topic</p>
          <Button variant="outline" className="w-full" onClick={() => {
            addMemory({ type: "contact", title: "Ricerca contatti avviata", detail: "AI ha cercato contatti rilevanti" });
          }}>
            <Search className="w-4 h-4 mr-2" /> Cerca Contatti
          </Button>
        </motion.div>
      </div>

      {/* Generated actions list */}
      {actions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display">Azioni Generate</h2>
          {actions.map((action, i) => (
            <motion.div key={action.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {action.type === "email_draft" ? <Mail className="w-4 h-4 text-accent" /> : <FileText className="w-4 h-4 text-ai" />}
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <Badge variant={action.status === "done" ? "default" : "secondary"} className="text-[10px]">
                    {action.status === "done" ? "✓ Fatto" : "In attesa"}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(action.content)}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  {action.status !== "done" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markActionDone(action.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto font-sans">
                {action.content}
              </pre>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
