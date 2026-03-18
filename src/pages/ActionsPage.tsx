import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Mail, FileText, Copy, Loader2, BookOpen, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import type { Supervisor, Company } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];

interface Action { id: string; type: string; title: string; content: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const AUTH_HEADERS = { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` };

export default function ActionsPage() {
  const { profile, user } = useApp();
  const { toast } = useToast();
  const [actions, setActions] = useState<Action[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);

  const studentFields = profile?.field_ids || [];
  const matchedSup = useMemo(() =>
    supervisors.filter(s => s.fieldIds.some(f => studentFields.includes(f))).slice(0, 4),
    [studentFields]);
  const matchedCompanies = useMemo(() =>
    companies.slice(0, 3),
    []);

  const generateWithAI = async (prompt: string, title: string, type: string, genKey: string) => {
    if (!user || generating) return;
    setGenerating(genKey);

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          studentContext: profile
            ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}\nEmail: ${profile.email}`
            : "",
          mode: "chat",
        }),
      });

      if (!resp.ok) {
        toast({ variant: "destructive", title: "Errore", description: "Errore nella generazione." });
        setGenerating(null);
        return;
      }

      // Read stream to completion
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const delta = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
            if (delta) content += delta;
          } catch {}
        }
      }

      if (content) {
        setActions(prev => [...prev, { id: `a-${Date.now()}`, type, title, content }]);
        await supabase.from("memory_entries").insert({
          user_id: user.id, type: "action", title, detail: `Generato: ${title}`,
        });
        toast({ title: "Generato!", description: title });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile generare." });
    } finally {
      setGenerating(null);
    }
  };

  const generateEmail = (sup: Supervisor) => {
    const prompt = `Scrivi una email formale in italiano per contattare ${sup.title} ${sup.firstName} ${sup.lastName} dell'università, esperto in ${sup.researchInterests.slice(0, 3).join(", ")}. Lo studente vuole chiedergli di essere il supervisore della tesi. Includi: presentazione, motivazione, competenze, richiesta di incontro. Tono professionale ma personale. NON fare domande socratiche, scrivi SOLO la email pronta da inviare.`;
    generateWithAI(prompt, `Email per ${sup.title} ${sup.lastName}`, "email", `email-${sup.id}`);
  };

  const generateCompanyEmail = (company: Company) => {
    const prompt = `Scrivi una email formale in italiano per contattare ${company.name} riguardo una potenziale collaborazione per la tesi. L'azienda opera in: ${company.domains.join(", ")}. Lo studente vuole proporre un progetto di tesi in partnership. Includi: presentazione, proposta di valore per l'azienda, competenze, richiesta di incontro. Tono professionale. NON fare domande socratiche, scrivi SOLO la email.`;
    generateWithAI(prompt, `Email per ${company.name}`, "email", `company-${company.id}`);
  };

  const generateProposal = () => {
    const topic = profile?.thesis_topic || "da definire";
    const prompt = `Scrivi una thesis proposal strutturata in italiano per il topic "${topic}". Includi: Titolo, Abstract (150 parole), Introduzione e Motivazione, Research Questions (3), Metodologia proposta, Timeline (6 mesi), Risultati attesi, Riferimenti bibliografici suggeriti (5). Usa formato markdown. NON fare domande socratiche, scrivi SOLO il documento.`;
    generateWithAI(prompt, `Proposal: ${topic.slice(0, 40)}...`, "proposal", "proposal");
  };

  const generateOutline = () => {
    const topic = profile?.thesis_topic || "da definire";
    const prompt = `Genera un outline dettagliato per una tesi su "${topic}". Includi tutti i capitoli e sotto-capitoli tipici: Abstract, Introduzione, Literature Review (con sotto-sezioni), Metodologia, Risultati, Discussione, Conclusioni, Bibliografia. Per ogni sezione indica brevemente cosa scrivere. Formato markdown. NON fare domande socratiche, scrivi SOLO l'outline.`;
    generateWithAI(prompt, `Outline: ${topic.slice(0, 40)}...`, "outline", "outline");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><Zap className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Azioni AI</h1><p className="text-sm text-muted-foreground">Genera documenti e bozze con AI</p></div>
      </div>

      {/* Action Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Email Supervisors */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-accent" />
            <h3 className="font-semibold font-display">Email Supervisori</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Bozze personalizzate per contattare professori</p>
          <div className="space-y-2">
            {matchedSup.map(sup => (
              <Button key={sup.id} variant="outline" size="sm" className="w-full justify-start text-xs gap-2"
                onClick={() => generateEmail(sup)} disabled={!!generating}>
                {generating === `email-${sup.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {sup.title} {sup.firstName} {sup.lastName}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Email Companies */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-success" />
            <h3 className="font-semibold font-display">Email Aziende</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Proposte di collaborazione per la tesi</p>
          <div className="space-y-2">
            {matchedCompanies.map(company => (
              <Button key={company.id} variant="outline" size="sm" className="w-full justify-start text-xs gap-2"
                onClick={() => generateCompanyEmail(company)} disabled={!!generating}>
                {generating === `company-${company.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                {company.name}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Thesis Proposal */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-ai" />
            <h3 className="font-semibold font-display">Thesis Proposal</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Genera una proposta di tesi completa</p>
          <Button className="w-full gap-2" onClick={generateProposal} disabled={!!generating}>
            {generating === "proposal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {generating === "proposal" ? "Generando..." : "Genera Proposal"}
          </Button>
        </motion.div>

        {/* Thesis Outline */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-warning" />
            <h3 className="font-semibold font-display">Outline Tesi</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Struttura dettagliata di tutti i capitoli</p>
          <Button className="w-full gap-2" variant="outline" onClick={generateOutline} disabled={!!generating}>
            {generating === "outline" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {generating === "outline" ? "Generando..." : "Genera Outline"}
          </Button>
        </motion.div>
      </div>

      {/* Generated Actions */}
      {actions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold font-display">Documenti Generati</h2>
          {actions.map((action, i) => (
            <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {action.type === "email" ? <Mail className="w-4 h-4 text-accent" /> :
                   action.type === "outline" ? <BookOpen className="w-4 h-4 text-warning" /> :
                   <FileText className="w-4 h-4 text-ai" />}
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <Badge variant="secondary" className="text-[10px]">{action.type}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                  navigator.clipboard.writeText(action.content);
                  toast({ title: "Copiato!" });
                }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto font-sans">
                {action.content}
              </pre>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
