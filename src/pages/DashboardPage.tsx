import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { Clock, Target, Calendar, TrendingUp, MessageCircle, Zap, BookOpen, Users, ChevronRight, Sparkles, Brain, FileText, Building2, GraduationCap, Activity, Timer, AlertTriangle, ShieldAlert, Copy, Eye, Flame, CircleX, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSessionStats } from "@/hooks/useSessionStats";
import { useToast } from "@/hooks/use-toast";

interface AISuggestion { id: string; category: string; title: string; detail: string; reason: string; }
interface AffinityScore { id: string; entity_type: string; entity_id: string; entity_name: string; score: number; reasoning: string; matched_traits: string[]; }
interface Vulnerability { id: string; type: string; title: string; description: string; severity: string; resolved: boolean; created_at: string; }

export default function DashboardPage() {
  const { roadmap, toggleTask, profile, overallProgress, setActiveSection, user } = useApp();
  const { toast } = useToast();
  const [memoryCount, setMemoryCount] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [nextSteps, setNextSteps] = useState<AISuggestion[]>([]);
  const [thesisFeedback, setThesisFeedback] = useState<AISuggestion[]>([]);
  const [topAffinities, setTopAffinities] = useState<AffinityScore[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Session stats (realtime)
  const { data: sessionData } = useSessionStats(user?.id);

  const totalTasks = roadmap.flatMap(p => p.tasks).length;
  const completedTasks = roadmap.flatMap(p => p.tasks).filter(t => t.completed).length;
  const name = profile?.first_name || "Studente";

  const currentPhase = roadmap.find(p => p.progress < 100) || roadmap[roadmap.length - 1];
  const currentPhaseIndex = roadmap.indexOf(currentPhase);

  const nextTasks = roadmap.flatMap(p => p.tasks.filter(t => !t.completed).map(t => ({ ...t, phase: p.title, phaseId: p.id })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const nextDeadline = nextTasks[0];
  const daysUntilDeadline = nextDeadline
    ? Math.max(0, Math.ceil((new Date(nextDeadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const endDate = roadmap[roadmap.length - 1]?.endDate;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("memory_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("socrate_suggestions" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("socrate_suggestions" as any).select("*").eq("user_id", user.id).eq("category", "next_step").order("created_at", { ascending: false }).limit(5),
      supabase.from("socrate_suggestions" as any).select("*").eq("user_id", user.id).eq("category", "thesis_feedback").order("created_at", { ascending: false }).limit(3),
      supabase.from("affinity_scores" as any).select("*").eq("user_id", user.id).order("score", { ascending: false }).limit(6),
      supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(10),
    ]).then(([mem, sug, steps, feedback, affinities, vulns]) => {
      setMemoryCount(mem.count || 0);
      setSuggestionCount((sug as any).count || 0);
      if ((steps as any).data) setNextSteps((steps as any).data);
      if ((feedback as any).data) setThesisFeedback((feedback as any).data);
      if ((affinities as any).data) setTopAffinities((affinities as any).data);
      if ((vulns as any).data) setVulnerabilities((vulns as any).data);
    });
  }, [user]);

  // Vulnerability scan
  const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
  const scanVulnerabilities = useCallback(async () => {
    if (!user || isScanning) return;
    setIsScanning(true);
    try {
      const msgs = await supabase.from("socrate_messages").select("role, content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20);
      const studentCtx = profile ? `Nome: ${profile.first_name}\nCorso: ${profile.degree}\nUniversità: ${profile.university}\nTopic: ${profile.thesis_topic}` : "";
      const latexContent = localStorage.getItem("thesis-latex-content") || "";
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: msgs.data || [], studentContext: studentCtx, latexContent, mode: "extract_vulnerabilities" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast({ title: "🔥 Scansione completata", description: `${data.vulnerabilities?.length || 0} vulnerabilità rilevate.` });
        const { data: fresh } = await supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(10);
        if (fresh) setVulnerabilities(fresh as any);
      }
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "Errore", description: "Scansione fallita." }); }
    finally { setIsScanning(false); }
  }, [user, isScanning, profile, toast]);

  const resolveVulnerability = useCallback(async (id: string) => {
    await supabase.from("vulnerabilities" as any).update({ resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    setVulnerabilities(prev => prev.filter(v => v.id !== id));
  }, []);

  // Compute real progress from session data or fallback to roadmap
  const realCompletion = sessionData?.progress?.overallCompletion || overallProgress;
  const estimatedDays = sessionData?.progress?.estimatedDaysRemaining;
  const thesisStage = sessionData?.progress?.thesisStage;

  const stageLabels: Record<string, string> = {
    exploration: "Esplorazione", topic_chosen: "Topic scelto", structuring: "Struttura",
    writing: "Scrittura", revision: "Revisione",
  };

  const stats = [
    { label: "Tesi", value: `${realCompletion}%`, sub: thesisStage ? stageLabels[thesisStage] || thesisStage : `${completedTasks}/${totalTasks} task`, icon: Target, color: "text-accent" },
    { label: "Fase", value: currentPhase.title, sub: `${currentPhaseIndex + 1} di ${roadmap.length}`, icon: Calendar, color: "text-accent" },
    { label: estimatedDays ? "ETA" : "Scadenza", value: estimatedDays ? `${estimatedDays}g` : nextDeadline ? `${daysUntilDeadline}g` : "—", sub: estimatedDays ? "Giorni stimati" : nextDeadline?.title.slice(0, 25) || "", icon: Clock, color: (estimatedDays || daysUntilDeadline) <= 3 ? "text-destructive" : "text-warning" },
    { label: "Sessioni", value: sessionData?.stats?.totalSessions?.toString() || "0", sub: `${sessionData?.stats?.totalMessages || 0} messaggi`, icon: Activity, color: "text-success" },
  ];

  const quickActions = [
    { label: "Parla con Socrate", icon: MessageCircle, section: "socrate", badge: "AI" },
    { label: "Genera Azioni", icon: Zap, section: "actions", badge: "AI" },
    { label: "Editor LaTeX", icon: BookOpen, section: "editor" },
    { label: "Rubrica", icon: Users, section: "contacts" },
  ];

  // Activity sparkline from session data
  const activityDays = sessionData?.activityByDay ? Object.entries(sessionData.activityByDay) : [];
  const maxActivity = Math.max(1, ...activityDays.map(([, v]) => v));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Ciao, {name}</h1>
        <p className="text-muted-foreground text-xs mt-1">
          {profile?.thesis_topic ? `Stai lavorando su "${profile.thesis_topic}"` : "Ecco il punto sulla tua tesi"}
          {sessionData?.progress?.lastActiveAt && (
            <span className="ml-2">· Ultima attività: {new Date(sessionData.progress.lastActiveAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Activity Graph */}
      {activityDays.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs font-semibold text-foreground">Attività ultimi 14 giorni</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{sessionData?.stats?.totalChatSessions || 0} chat</span>
              <span>{sessionData?.stats?.totalLatexAnalyses || 0} analisi</span>
              <span>{sessionData?.stats?.totalFusionAnalyses || 0} fusioni</span>
            </div>
          </div>
          <div className="flex items-end gap-1 h-12">
            {activityDays.map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-0.5" title={`${day}: ${count} eventi`}>
                <div
                  className={`w-full rounded-sm transition-all ${count > 0 ? "bg-accent" : "bg-border"}`}
                  style={{ height: `${Math.max(2, (count / maxActivity) * 40)}px` }}
                />
                <span className="text-[8px] text-muted-foreground">{new Date(day).getDate()}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Thesis Sections Progress */}
      {sessionData?.progress?.sectionsProgress && Object.keys(sessionData.progress.sectionsProgress).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-card border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-warning" />
              <span className="text-xs font-semibold text-foreground">Avanzamento Sezioni Tesi</span>
            </div>
            <button onClick={() => setActiveSection("editor")} className="text-xs text-accent hover:underline">Editor →</button>
          </div>
          <div className="space-y-2">
            {Object.entries(sessionData.progress.sectionsProgress).map(([name, data]: [string, any]) => {
              const statusColor = data.status === "complete" ? "text-success" : data.status === "partial" ? "text-warning" : data.status === "missing" ? "text-destructive" : "text-accent";
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs text-foreground">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${statusColor}`}>{data.status === "complete" ? "✓" : data.status === "missing" ? "✗" : "~"}</span>
                      <span className="text-xs font-bold text-foreground">{data.completeness}%</span>
                    </div>
                  </div>
                  <Progress value={data.completeness} className="h-1" />
                </div>
              );
            })}
          </div>
          {estimatedDays && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
              <Timer className="w-3.5 h-3.5 text-warning" />
              <span className="text-xs text-muted-foreground">Tempo stimato al completamento:</span>
              <span className="text-xs font-bold text-foreground">{estimatedDays} giorni</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {quickActions.map((action, i) => (
          <motion.button key={action.section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
            onClick={() => setActiveSection(action.section)}
            className="flex items-center gap-2.5 p-3 bg-card border border-border rounded-lg hover:border-accent/30 hover:bg-accent/5 transition-all text-left">
            <action.icon className="w-4 h-4 text-accent shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">{action.label}</span>
            {action.badge && <Badge variant="secondary" className="text-[8px] ml-auto shrink-0">{action.badge}</Badge>}
          </motion.button>
        ))}
      </div>

      {/* ─── VULNERABILITIES ─── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-card border border-destructive/20 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-destructive/10 bg-destructive/5">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-bold text-foreground tracking-wide uppercase">Vulnerabilità</h2>
            {vulnerabilities.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-destructive/20 text-destructive">{vulnerabilities.length}</span>
            )}
          </div>
          <button onClick={scanVulnerabilities} disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40">
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
            {isScanning ? "Analisi..." : "Scansiona"}
          </button>
        </div>
        {vulnerabilities.length === 0 ? (
          <div className="p-6 text-center">
            <ShieldAlert className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nessuna vulnerabilità rilevata.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Clicca "Scansiona" per far analizzare la tua tesi a Socrate.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {vulnerabilities.map((v, i) => {
              const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
                cliche: { icon: Copy, label: "CLICHÉ", color: "text-warning" },
                logic_gap: { icon: CircleX, label: "BUCO LOGICO", color: "text-destructive" },
                methodology_flaw: { icon: AlertTriangle, label: "METODO", color: "text-destructive" },
                superficiality: { icon: Eye, label: "SUPERFICIALE", color: "text-warning" },
                originality_deficit: { icon: Copy, label: "ZERO ORIGINALITÀ", color: "text-destructive" },
              };
              const config = typeConfig[v.type] || typeConfig.cliche;
              const sevColors: Record<string, string> = { critical: "bg-destructive/20 text-destructive border-destructive/30", high: "bg-warning/20 text-warning border-warning/30", medium: "bg-muted text-muted-foreground border-border" };
              return (
                <motion.div key={v.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                  className="p-4 hover:bg-destructive/[0.02] transition-colors group">
                  <div className="flex items-start gap-3">
                    <config.icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-bold tracking-wider ${config.color}`}>{config.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${sevColors[v.severity]}`}>
                          {v.severity === "critical" ? "CRITICO" : v.severity === "high" ? "SERIO" : "MEDIO"}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-foreground">{v.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{v.description}</p>
                    </div>
                    <button onClick={() => resolveVulnerability(v.id)} title="Segna come risolta"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-success/10 text-muted-foreground hover:text-success">
                      <CircleX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Socrate Hub Banner */}
      {(memoryCount > 0 || suggestionCount > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-ai/5 via-accent/5 to-success/5 border border-ai/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-ai/10 flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-ai" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Hub Centrale di Socrate</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {memoryCount} memorie · {suggestionCount} suggerimenti distribuiti nelle sezioni del sito
              </p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setActiveSection("memory")} className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:bg-secondary transition-colors">
                  <Brain className="w-3 h-3 inline mr-1" /> Memoria
                </button>
                <button onClick={() => setActiveSection("suggestions")} className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:bg-secondary transition-colors">
                  <Sparkles className="w-3 h-3 inline mr-1" /> Suggerimenti
                </button>
                <button onClick={() => setActiveSection("socrate")} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
                  <MessageCircle className="w-3 h-3 inline mr-1" /> Socrate
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Socrate Next Steps */}
      {nextSteps.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-ai" />
            <h2 className="text-sm font-bold font-display text-foreground">Prossimi Passi da Socrate</h2>
          </div>
          <div className="space-y-2">
            {nextSteps.map((step, i) => (
              <motion.div key={step.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                className="flex items-start gap-3 p-3 bg-card border border-ai/10 rounded-lg">
                <Target className="w-4 h-4 text-ai mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">{step.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{step.detail}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Thesis Feedback */}
      {thesisFeedback.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-warning" />
              <h2 className="text-sm font-bold font-display text-foreground">Feedback sulla Tesi</h2>
            </div>
            <button onClick={() => setActiveSection("editor")} className="text-xs text-accent hover:underline">Apri Editor →</button>
          </div>
          <div className="space-y-2">
            {thesisFeedback.map((fb, i) => (
              <motion.div key={fb.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className="p-3 bg-card border border-warning/10 rounded-lg">
                <p className="text-xs font-medium text-foreground">{fb.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{fb.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Top Affinities */}
      {topAffinities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-ai" />
              <h2 className="text-sm font-bold font-display text-foreground">Affinità Calcolate</h2>
            </div>
            <button onClick={() => setActiveSection("market")} className="text-xs text-accent hover:underline">Vedi tutte →</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {topAffinities.slice(0, 6).map((aff, i) => {
              const Icon = aff.entity_type === "company" ? Building2 : aff.entity_type === "supervisor" ? GraduationCap : Target;
              const typeLabel = aff.entity_type === "company" ? "Azienda" : aff.entity_type === "supervisor" ? "Professore" : "Topic";
              return (
                <motion.div key={aff.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }}
                  className="bg-card border rounded-lg p-3 hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">{typeLabel}</span>
                    <span className="ml-auto text-sm font-bold text-accent">{aff.score}%</span>
                  </div>
                  <p className="text-xs font-medium text-foreground truncate">{aff.entity_name}</p>
                  <Progress value={aff.score} className="h-1 mt-1.5" />
                  {aff.matched_traits?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {aff.matched_traits.slice(0, 2).map((t, j) => <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-ai/10 text-ai">{t}</span>)}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {sessionData?.recentEvents && sessionData.recentEvents.length > 0 && (
        <div>
          <h2 className="text-sm font-bold font-display text-foreground mb-3">Attività Recente</h2>
          <div className="space-y-1.5">
            {sessionData.recentEvents.slice(0, 8).map((ev, i) => {
              const eventLabels: Record<string, string> = {
                chat_exchange: "💬 Chat con Socrate",
                latex_analysis: "📝 Analisi LaTeX",
                fusion_analysis: "🧬 Fusione dati",
                report_generated: "📋 Report generato",
                extraction: "🧠 Estrazione profilo",
              };
              return (
                <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.03 }}
                  className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                  <span className="text-xs text-foreground">{eventLabels[ev.type] || ev.type}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {new Date(ev.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold font-display text-foreground">Prossimi Passi</h2>
          <span className="text-xs text-muted-foreground">{nextTasks.length} task in coda</span>
        </div>
        <div className="space-y-2">
          {nextTasks.map((task, i) => {
            const daysLeft = Math.ceil((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            return (
              <motion.label key={task.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer">
                <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.phaseId, task.id)} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-foreground">{task.title}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{task.phase}</span>
                </div>
                <span className={`text-[10px] font-medium shrink-0 ${daysLeft <= 3 ? "text-destructive" : daysLeft <= 7 ? "text-warning" : "text-muted-foreground"}`}>
                  {daysLeft <= 0 ? "Scaduto" : `${daysLeft}g`}
                </span>
              </motion.label>
            );
          })}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <h2 className="text-lg font-bold font-display text-foreground mb-3">Roadmap</h2>
        <div className="space-y-3">
          {roadmap.map((phase, i) => {
            const isCurrent = phase.id === currentPhase.id;
            return (
              <motion.div key={phase.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.08 }}
                className={`bg-card rounded-lg border p-4 transition-all cursor-pointer hover:shadow-sm ${isCurrent ? "border-accent/40 ring-1 ring-accent/10" : "border-border"}`}
                onClick={() => setActiveSection(phase.id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isCurrent && <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
                    <h3 className="font-semibold font-display text-sm text-foreground">{phase.title}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(phase.startDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })} – {new Date(phase.endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-accent">{phase.progress}%</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </div>
                <Progress value={phase.progress} className="h-1" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
