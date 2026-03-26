import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Mail, FileText, Copy, Loader2, BookOpen, Send, CheckCircle2, Clock, AlertTriangle, Circle, Brain, Target, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_HEADERS } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { useSocrateTasks, type SocrateTask } from "@/hooks/useSocrateTasks";
import { useAffinityScores } from "@/hooks/useSocrateSuggestions";

interface Action { id: string; type: string; title: string; content: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;


const priorityConfig: Record<string, { icon: typeof AlertTriangle; color: string; label: string; order: number }> = {
  critical: { icon: AlertTriangle, color: "text-destructive", label: "Critico", order: 0 },
  high: { icon: Target, color: "text-warning", label: "Alto", order: 1 },
  medium: { icon: Circle, color: "text-accent", label: "Medio", order: 2 },
  low: { icon: Circle, color: "text-muted-foreground", label: "Basso", order: 3 },
};

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function ActionsPage() {
  const { profile, user } = useApp();
  const { toast } = useToast();
  const [actions, setActions] = useState<Action[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const { tasks, loading: tasksLoading, updateTaskStatus, refresh: refreshTasks } = useSocrateTasks(user?.id);
  const [profilingLoading, setProfilingLoading] = useState(false);
  const [expandedTask, setExpandedTask] = useState<string | null>(null);

  const { affinities: supAffinities } = useAffinityScores(user?.id, "supervisor");
  const { affinities: compAffinities } = useAffinityScores(user?.id, "company");
  const matchedSup = useMemo(() =>
    supAffinities.slice(0, 4).map(a => ({ id: a.entity_id, name: a.entity_name, researchInterests: a.matched_traits || [], email: "" })),
    [supAffinities]);
  const matchedCompanies = useMemo(() =>
    compAffinities.slice(0, 3).map(a => ({ id: a.entity_id, name: a.entity_name, domains: a.matched_traits || [] })),
    [compAffinities]);

  // Task stats
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const dismissedTasks = tasks.filter(t => t.status === "dismissed");
  const totalEstimatedMins = pendingTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);
  const completionRate = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : 0;

  // Sort by priority
  const sortedPending = [...pendingTasks].sort((a, b) =>
    (priorityConfig[a.priority]?.order ?? 9) - (priorityConfig[b.priority]?.order ?? 9)
  );

  const generateTasks = async () => {
    if (!user || generating) return;
    setGenerating("tasks");
    try {
      const latexContent = localStorage.getItem("thesis_latex_content") || "";
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "generate_tasks", latexContent, studentContext: profile ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}` : "" }),
      });
      if (resp.ok) {
        const result = await resp.json();
        toast({ title: "Compiti generati!", description: `${result.count} nuovi compiti da Socrate` });
        refreshTasks();
      } else {
        toast({ variant: "destructive", title: "Errore", description: "Impossibile generare compiti." });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Errore generazione compiti." });
    } finally {
      setGenerating(null);
    }
  };

  const runDeepProfile = async () => {
    if (!user) return;
    setProfilingLoading(true);
    try {
      const latexContent = localStorage.getItem("thesis_latex_content") || "";
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "deep_profile", latexContent }),
      });
      if (resp.ok) {
        const result = await resp.json();
        toast({ title: "Profilo aggiornato!", description: result.profile?.profile_summary?.substring(0, 80) || "Profilazione completata" });
      } else {
        toast({ variant: "destructive", title: "Errore", description: "Errore profilazione." });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Errore profilazione." });
    } finally {
      setProfilingLoading(false);
    }
  };

  const generateWithAI = async (prompt: string, title: string, type: string, genKey: string) => {
    if (!user || generating) return;
    setGenerating(genKey);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          studentContext: profile ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}\nEmail: ${profile.email}` : "",
          mode: "chat",
        }),
      });
      if (!resp.ok) { toast({ variant: "destructive", title: "Errore" }); setGenerating(null); return; }

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
          try { const delta = JSON.parse(jsonStr).choices?.[0]?.delta?.content; if (delta) content += delta; } catch {}
        }
      }
      if (content) {
        setActions(prev => [...prev, { id: `a-${Date.now()}`, type, title, content }]);
        await supabase.from("memory_entries").insert({ user_id: user.id, type: "action", title, detail: `Generato: ${title}` });
        toast({ title: "Generato!", description: title });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore" });
    } finally {
      setGenerating(null);
    }
  };

  const generateEmail = (sup: Supervisor) => {
    const prompt = `Write a formal email per contattare ${sup.title} ${sup.firstName} ${sup.lastName} dell'università, esperto in ${sup.researchInterests.slice(0, 3).join(", ")}. The student wants to ask them to be the thesis supervisor. Include: introduction, motivation, skills, request for a meeting. Professional but personal tone. Do NOT ask Socratic questions, write ONLY the email ready to send.`;
    generateWithAI(prompt, `Email per ${sup.title} ${sup.lastName}`, "email", `email-${sup.id}`);
  };

  const generateCompanyEmail = (company: Company) => {
    const prompt = `Write a formal email per contattare ${company.name} riguardo una potenziale collaborazione per la tesi. L'azienda opera in: ${company.domains.join(", ")}. Lo studente vuole proporre un progetto di tesi in partnership. Includi: presentazione, proposta di valore per l'azienda, competenze, richiesta di incontro. Tono professionale. NON fare domande socratiche, scrivi SOLO la email.`;
    generateWithAI(prompt, `Email per ${company.name}`, "email", `company-${company.id}`);
  };

  const generateProposal = () => {
    const topic = profile?.thesis_topic || "da definire";
    const prompt = `Scrivi una thesis proposal strutturata in italiano per il topic "${topic}". Includi: Titolo, Abstract (150 parole), Introduzione e Motivazione, Research Questions (3), Metodologia proposta, Timeline (6 mesi), Risultati attesi, Riferimenti bibliografici suggeriti (5). Usa formato markdown. NON fare domande socratiche, scrivi SOLO il documento.`;
    generateWithAI(prompt, `Proposal: ${topic.slice(0, 40)}...`, "proposal", "proposal");
  };

  const generateOutline = () => {
    const topic = profile?.thesis_topic || "da definire";
    const prompt = `Genera un outline dettagliato per una tesi su "${topic}". Includi tutti i capitoli e sotto-capitoli tipici. Formato markdown. NON fare domande socratiche, scrivi SOLO l'outline.`;
    generateWithAI(prompt, `Outline: ${topic.slice(0, 40)}...`, "outline", "outline");
  };

  const TaskCard = ({ task, index }: { task: SocrateTask; index: number }) => {
    const config = priorityConfig[task.priority] || priorityConfig.medium;
    const PIcon = config.icon;
    const isExpanded = expandedTask === task.id;
    const isCompleted = task.status === "completed";
    const isDismissed = task.status === "dismissed";

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
        className={`bg-card border rounded-lg p-4 transition-all ${isCompleted ? "opacity-60 border-success/20" : isDismissed ? "opacity-40" : "border-border hover:shadow-sm"}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => updateTaskStatus(task.id, isCompleted ? "pending" : "completed")}
            className={`mt-0.5 shrink-0 ${isCompleted ? "text-success" : "text-muted-foreground hover:text-accent"}`}
          >
            <CheckCircle2 className={`w-5 h-5 ${isCompleted ? "fill-success/20" : ""}`} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</span>
              <PIcon className={`w-3.5 h-3.5 ${config.color}`} />
              <Badge variant="outline" className="text-[9px]">{task.section}</Badge>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto">
                <Clock className="w-3 h-3" />
                {formatMinutes(task.estimated_minutes)}
              </div>
            </div>
            {isExpanded && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="text-xs text-muted-foreground mt-2 leading-relaxed">{task.description}</motion.p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => setExpandedTask(isExpanded ? null : task.id)} className="text-[10px] text-accent hover:underline flex items-center gap-0.5">
                {isExpanded ? <><ChevronUp className="w-3 h-3" /> Meno</> : <><ChevronDown className="w-3 h-3" /> Dettagli</>}
              </button>
              {!isCompleted && !isDismissed && (
                <>
                  {task.status !== "in_progress" && (
                    <button onClick={() => updateTaskStatus(task.id, "in_progress")} className="text-[10px] text-accent hover:underline">Inizia</button>
                  )}
                  <button onClick={() => updateTaskStatus(task.id, "dismissed")} className="text-[10px] text-muted-foreground hover:underline">Ignora</button>
                </>
              )}
              {task.status === "in_progress" && <Badge className="text-[8px] bg-accent/10 text-accent border-0">In corso</Badge>}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><Zap className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Azioni & Compiti</h1><p className="text-sm text-muted-foreground">Compiti di Socrate e generazione documenti AI</p></div>
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="tasks" className="flex-1 gap-1.5">
            <Target className="w-3.5 h-3.5" /> Compiti {pendingTasks.length > 0 && <Badge variant="secondary" className="text-[9px] ml-1">{pendingTasks.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="generate" className="flex-1 gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Genera
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-1 gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Profilo
          </TabsTrigger>
        </TabsList>

        {/* ─── TASKS TAB ─── */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-foreground">{pendingTasks.length}</p>
              <p className="text-[10px] text-muted-foreground">Da fare</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-success">{completedTasks.length}</p>
              <p className="text-[10px] text-muted-foreground">Completati</p>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-accent">{formatMinutes(totalEstimatedMins)}</p>
              <p className="text-[10px] text-muted-foreground">Tempo stimato</p>
            </div>
          </div>

          {tasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Completamento</span>
                <span className="text-xs font-bold text-foreground">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-1.5" />
            </div>
          )}

          {/* Generate Tasks Button */}
          <Button onClick={generateTasks} disabled={!!generating} className="w-full gap-2">
            {generating === "tasks" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {generating === "tasks" ? "Generando compiti..." : "Genera Nuovi Compiti con Socrate"}
          </Button>

          {/* Task List */}
          {tasksLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedPending.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Da completare</h3>
              {sortedPending.map((task, i) => <TaskCard key={task.id} task={task} index={i} />)}
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nessun compito ancora. Clicca sopra per generarli!</p>
            </div>
          ) : null}

          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Completati ({completedTasks.length})</h3>
              {completedTasks.slice(0, 5).map((task, i) => <TaskCard key={task.id} task={task} index={i} />)}
            </div>
          )}
        </TabsContent>

        {/* ─── GENERATE TAB ─── */}
        <TabsContent value="generate" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Mail className="w-5 h-5 text-accent" /><h3 className="font-semibold font-display">Email Supervisori</h3></div>
              <p className="text-xs text-muted-foreground mb-4">Bozze personalizzate per contattare professori</p>
              <div className="space-y-2">
                {matchedSup.map(sup => (
                  <Button key={sup.id} variant="outline" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => generateEmail(sup)} disabled={!!generating}>
                    {generating === `email-${sup.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    {sup.title} {sup.firstName} {sup.lastName}
                  </Button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><Mail className="w-5 h-5 text-success" /><h3 className="font-semibold font-display">Email Aziende</h3></div>
              <p className="text-xs text-muted-foreground mb-4">Proposte di collaborazione per la tesi</p>
              <div className="space-y-2">
                {matchedCompanies.map(company => (
                  <Button key={company.id} variant="outline" size="sm" className="w-full justify-start text-xs gap-2" onClick={() => generateCompanyEmail(company)} disabled={!!generating}>
                    {generating === `company-${company.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    {company.name}
                  </Button>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><FileText className="w-5 h-5 text-ai" /><h3 className="font-semibold font-display">Thesis Proposal</h3></div>
              <p className="text-xs text-muted-foreground mb-4">Genera una proposta di tesi completa</p>
              <Button className="w-full gap-2" onClick={generateProposal} disabled={!!generating}>
                {generating === "proposal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {generating === "proposal" ? "Generando..." : "Genera Proposal"}
              </Button>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><BookOpen className="w-5 h-5 text-warning" /><h3 className="font-semibold font-display">Outline Tesi</h3></div>
              <p className="text-xs text-muted-foreground mb-4">Struttura dettagliata di tutti i capitoli</p>
              <Button className="w-full gap-2" variant="outline" onClick={generateOutline} disabled={!!generating}>
                {generating === "outline" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                {generating === "outline" ? "Generando..." : "Genera Outline"}
              </Button>
            </motion.div>
          </div>

          {actions.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold font-display">Documenti Generati</h2>
              {actions.map((action, i) => (
                <motion.div key={action.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-card border rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {action.type === "email" ? <Mail className="w-4 h-4 text-accent" /> : action.type === "outline" ? <BookOpen className="w-4 h-4 text-warning" /> : <FileText className="w-4 h-4 text-ai" />}
                      <h3 className="font-semibold text-sm">{action.title}</h3>
                      <Badge variant="secondary" className="text-[10px]">{action.type}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(action.content); toast({ title: "Copiato!" }); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3 max-h-60 overflow-y-auto font-sans">{action.content}</pre>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── PROFILE TAB ─── */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-ai/5 to-accent/5 border border-ai/20 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-ai/10 flex items-center justify-center">
                <Brain className="w-5 h-5 text-ai" />
              </div>
              <div>
                <h3 className="font-semibold font-display text-foreground">Profilazione Profonda</h3>
                <p className="text-xs text-muted-foreground">Analisi completa di tutte le tue interazioni, chat, LaTeX e attività</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Socrate analizzerà conversazioni, memoria, contenuto LaTeX, compiti completati e attività per costruire un profilo completo del tuo stile di pensiero, punti di forza, debolezze e interessi.
            </p>
            <Button onClick={runDeepProfile} disabled={profilingLoading} className="w-full gap-2">
              {profilingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
              {profilingLoading ? "Analizzando..." : "Avvia Profilazione Profonda"}
            </Button>
          </motion.div>

          <div className="bg-card border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Cosa viene analizzato:</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Tutte le conversazioni con Socrate</li>
              <li>Contenuto del LaTeX Editor</li>
              <li>Memoria e suggerimenti generati</li>
              <li>Compiti assegnati e completati</li>
              <li>Attività e pattern d'uso</li>
              <li>Affinità calcolate con professori e aziende</li>
            </ul>
          </div>

          <div className="bg-card border rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2">Output:</h4>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <li>Stile di ragionamento e pensiero critico</li>
              <li>Punti di forza e debolezze</li>
              <li>Interessi profondi e maturità di ricerca</li>
              <li>Qualità della scrittura</li>
              <li>Affinità professionali e accademiche</li>
              <li>Summary narrativo e aree di focus</li>
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
