import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, ShieldAlert, Flame, Target, Users, Building2,
  CheckCircle2, Circle, GraduationCap, LogOut, MessageCircle,
  ChevronLeft, ChevronRight, X, FileText, Link2, RefreshCw,
  TrendingUp, ArrowRight, Lock, Unlock, Briefcase, BarChart3, Mic
} from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import VoiceConversation from "@/components/voice/VoiceConversation";
import SocrateCoin from "@/components/shared/SocrateCoin";
import SocrateTutor from "@/components/shared/SocrateTutor";
import { supabase } from "@/integrations/supabase/client";
import { AUTH_HEADERS } from "@/lib/auth-headers";
import { useToast } from "@/hooks/use-toast";
import { useSocrateTasks } from "@/hooks/useSocrateTasks";
import { useAffinityScores } from "@/hooks/useSocrateSuggestions";
import ReactMarkdown from "react-markdown";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import fieldsData from "@/data/fields.json";
import type { Supervisor, Company, Field } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const fields = fieldsData as Field[];

interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }
interface Vulnerability { id: string; type: string; title: string; description: string; severity: string; }
interface CareerSector { name: string; percentage: number; reasoning?: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const CAREER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-engine`;
const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`;
const TASK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-engine`;

  // Close chat and auto-compute career
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setInputMode("text");
    // Auto-compute career after conversation ends (if there were messages)
    if (messages.length > 2) {
      setTimeout(() => computeCareer(), 500);
    }
  }, [messages.length, computeCareer]);


const PHASES = [
  { key: "orientation", label: "Orientamento", icon: "1" },
  { key: "topic_supervisor", label: "Topic & Supervisore", icon: "2" },
  { key: "planning", label: "Pianificazione", icon: "3" },
  { key: "execution", label: "Esecuzione", icon: "4" },
  { key: "writing", label: "Scrittura", icon: "5" },
] as const;

type PhaseKey = (typeof PHASES)[number]["key"];

const POST_PLANNING_PHASES: PhaseKey[] = ["planning", "execution", "writing"];

const normalizePhase = (phase?: string | null): PhaseKey => {
  switch (phase) {
    case "orientation":
    case "topic_supervisor":
    case "planning":
    case "execution":
    case "writing":
      return phase;
    // Legacy career-engine phases
    case "convergence":
    case "lost":
    case "vague_idea":
    case "exploration":
      return "orientation";
    case "thesis_defined":
    case "topic_chosen":
    case "finding_contacts":
      return "topic_supervisor";
    case "refinement":
    case "structuring":
      return "planning";
    case "revision":
      return "writing";
    default:
      return "orientation";
  }
};

// SocrateIcon is now the shared SocrateCoin component

// ─── CARD COMPONENT ───
function DashboardCard({
  title, icon: Icon, children, badge, action, className = ""
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  badge?: number | null; action?: { label: string; onClick: () => void; loading?: boolean }; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg flex flex-col h-full ds-card-hover ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <div className="w-4 h-4 rounded-full bg-foreground/80 flex items-center justify-center">
          <span className="text-[6px] font-bold text-background">S</span>
        </div>
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
        )}
        {action && (
          <button onClick={action.onClick} disabled={action.loading}
            className="text-[10px] font-medium px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">
            {action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  );
}

// ─── TASK PANEL ───
function TaskContent({ userId }: { userId: string }) {
  const { tasks, updateTaskStatus, validateTask } = useSocrateTasks(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const activeTasks = tasks.filter(t => t.status !== "completed").slice(0, 8);
  const completedCount = tasks.filter(t => t.status === "completed").length;
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...activeTasks].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

  const handleMarkDone = async (taskId: string) => {
    setValidatingId(taskId);
    try {
      const result = await validateTask(taskId);
      if (result.approved) {
        await updateTaskStatus(taskId, "completed");
        setRejectedIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
        toast({ title: "Task completato", description: result.feedback || "Ben fatto." });
      } else {
        setRejectedIds(prev => new Set(prev).add(taskId));
        toast({ variant: "destructive", title: "Non ancora", description: result.feedback || "Socrate non è convinto. Riprova." });
      }
    } catch {
      await updateTaskStatus(taskId, "completed");
      toast({ title: "Task completato" });
    } finally {
      setValidatingId(null);
    }
  };

  const forceComplete = async (taskId: string) => {
    await updateTaskStatus(taskId, "completed");
    setRejectedIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    toast({ title: "Task forzato come completato" });
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case "critical": return { text: "Critico", cls: "bg-destructive/10 text-destructive" };
      case "high": return { text: "Alta", cls: "bg-warning/10 text-warning" };
      case "medium": return { text: "Media", cls: "bg-accent/10 text-accent" };
      default: return { text: "Bassa", cls: "bg-muted text-muted-foreground" };
    }
  };

  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun task. Parla con Socrate.</p>;

  return (
    <div className="space-y-1.5">
      {sorted.map(task => {
        const isExpanded = expandedId === task.id;
        const isValidating = validatingId === task.id;
        const priority = priorityLabel(task.priority);

        return (
          <div key={task.id} className="border border-border hover:border-foreground/10 transition-colors duration-200">
            {/* Collapsed row */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : task.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
            >
              <Circle className={`w-3 h-3 shrink-0 ${
                task.priority === "critical" ? "text-destructive" : task.priority === "high" ? "text-warning" : "text-muted-foreground/40"
              }`} />
              <p className="text-xs font-medium text-foreground flex-1 leading-snug">{task.title}</p>
              <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 ${priority.cls}`}>
                {priority.text}
              </span>
              {task.estimated_minutes > 0 && (
                <span className="text-[9px] text-muted-foreground shrink-0">{task.estimated_minutes}m</span>
              )}
            </button>

            {/* Expanded content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-3">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {task.description}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMarkDone(task.id); }}
                      disabled={isValidating}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-foreground text-background text-[10px] font-medium uppercase tracking-[0.12em] hover:bg-foreground/90 transition-colors disabled:opacity-40"
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Socrate sta verificando…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Segna come fatto
                        </>
                      )}
                    </button>
                    {rejectedIds.has(task.id) && !isValidating && (
                      <button
                        onClick={(e) => { e.stopPropagation(); forceComplete(task.id); }}
                        className="w-full flex items-center justify-center gap-2 py-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Forza completamento
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {completedCount > 0 && (
        <div className="flex items-center gap-2 pt-2">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] text-muted-foreground">{completedCount} completati</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  );
}

// ─── CAREER DISTRIBUTION BAR ───
function CareerBar({ sectors, onSectorClick, loading }: {
  sectors: CareerSector[]; onSectorClick: (sector: string) => void; loading: boolean;
}) {
  const colors = [
    "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(142 50% 40%)",
    "hsl(var(--warning))", "hsl(270 60% 55%)", "hsl(200 70% 50%)",
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground ml-2">Analizzando carriera...</span>
    </div>
  );

  if (sectors.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-6">Parla con Socrate per calcolare il tuo orientamento.</p>
  );

  const sorted = [...sectors].sort((a, b) => b.percentage - a.percentage);

  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
        {sorted.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ width: 0 }}
            animate={{ width: `${s.percentage}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="h-full cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: colors[i % colors.length] }}
            onClick={() => onSectorClick(s.name)}
            title={`${s.name}: ${s.percentage}%`}
          />
        ))}
      </div>

      {/* Labels */}
      <div className="space-y-1.5">
        {sorted.map((s, i) => (
          <button
            key={s.name}
            onClick={() => onSectorClick(s.name)}
            className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-[11px] font-medium text-foreground flex-1">{s.name}</span>
            <span className="text-[11px] font-bold text-foreground">{s.percentage}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── SUPERVISOR SELECTION ───
function SupervisorSelection({ userId, selectedId, onSelect }: {
  userId: string; selectedId: string | null;
  onSelect: (id: string, name: string, motivation: string) => void;
}) {
  const { affinities } = useAffinityScores(userId, "supervisor");
  const [selecting, setSelecting] = useState<string | null>(null);
  const [motivation, setMotivation] = useState("");

  const items = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 5).map(a => {
        const sup = supervisors.find(s => s.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, fields: sup?.researchInterests?.slice(0, 2) || [] };
      });
    }
    return supervisors.slice(0, 5).map(s => ({
      id: s.id, name: `${s.title} ${s.firstName} ${s.lastName}`, score: null, fields: s.researchInterests.slice(0, 2),
    }));
  }, [affinities]);

  return (
    <div className="space-y-2">
      {items.map(sup => (
        <div key={sup.id}>
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer ${
              selectedId === sup.id ? "bg-accent/10 border border-accent/20" : "hover:bg-secondary/50"
            }`}
            onClick={() => setSelecting(selecting === sup.id ? null : sup.id)}
          >
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              {selectedId === sup.id ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <GraduationCap className="w-3.5 h-3.5 text-accent" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{sup.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{sup.fields.join(", ")}</p>
            </div>
            {sup.score !== null && <span className="text-[10px] font-bold text-accent shrink-0">{sup.score}%</span>}
          </div>

          {/* Motivation input */}
          <AnimatePresence>
            {selecting === sup.id && selectedId !== sup.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 py-2 space-y-2">
                  <p className="text-[10px] text-muted-foreground">Perché questo supervisore?</p>
                  <textarea
                    value={motivation}
                    onChange={e => setMotivation(e.target.value)}
                    placeholder="Spiega la tua motivazione..."
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    rows={2}
                  />
                  <button
                    onClick={() => { onSelect(sup.id, sup.name, motivation); setSelecting(null); setMotivation(""); }}
                    disabled={!motivation.trim()}
                    className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-30"
                  >
                    Conferma scelta
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

// ─── DYNAMIC COMPANIES ───
function DynamicCompanies({ userId, sectors, activeSector }: {
  userId: string; sectors: CareerSector[]; activeSector: string | null;
}) {
  const { affinities } = useAffinityScores(userId, "company");
  const [aiCompanies, setAiCompanies] = useState<any[]>([]);
  const [loadingAi, setLoadingAi] = useState(false);

  const defaultItems = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 5).map(a => {
        const comp = companies.find(c => c.id === a.entity_id);
        return { id: a.entity_id, name: a.entity_name, score: a.score, domains: comp?.domains?.slice(0, 2) || [] };
      });
    }
    return companies.slice(0, 5).map(c => ({ id: c.id, name: c.name, score: null, domains: c.domains.slice(0, 2) }));
  }, [affinities]);

  useEffect(() => {
    if (!activeSector || !userId) return;
    setLoadingAi(true);
    fetch(CAREER_URL, {
      method: "POST", headers: AUTH_HEADERS,
      body: JSON.stringify({ mode: "get_companies_by_sector", sector: activeSector }),
    }).then(r => r.json()).then(data => {
      setAiCompanies(data.companies || []);
    }).catch(() => {}).finally(() => setLoadingAi(false));
  }, [activeSector, userId]);

  if (activeSector) {
    if (loadingAi) return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground ml-2">Cercando aziende in {activeSector}...</span>
      </div>
    );

    if (aiCompanies.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna azienda trovata per {activeSector}.</p>;

    return (
      <div className="space-y-2">
        <p className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-2">{activeSector}</p>
        {aiCompanies.slice(0, 6).map((comp, i) => (
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
            <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
              <Building2 className="w-3.5 h-3.5 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium text-foreground">{comp.name}</p>
                {comp.thesis_coherence != null && (
                  <span className="text-[9px] font-bold text-accent">{comp.thesis_coherence}%</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{comp.description}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {comp.technologies?.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {defaultItems.map(comp => (
        <div key={comp.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <div className="w-7 h-7 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-warning" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{comp.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{comp.domains.join(", ")}</p>
          </div>
          {comp.score !== null && <span className="text-[10px] font-bold text-warning shrink-0">{comp.score}%</span>}
        </div>
      ))}
    </div>
  );
}

// ─── VULNERABILITIES PANEL ───
function VulnerabilitiesContent({ vulnerabilities }: { vulnerabilities: Vulnerability[] }) {
  if (vulnerabilities.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna vulnerabilità rilevata.</p>;
  return (
    <div className="space-y-2">
      {vulnerabilities.slice(0, 5).map(v => (
        <div key={v.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-destructive/[0.04]">
          <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${v.severity === "critical" ? "text-destructive" : "text-warning"}`} />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
            <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{v.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── THESIS DOCUMENT WIDGET ───
function ThesisDocWidget({ profile, updateProfile, user }: { profile: any; updateProfile: any; user: any }) {
  const { toast } = useToast();
  const [docUrl, setDocUrl] = useState(profile?.google_doc_url || "");
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(!!profile?.google_doc_url);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    if (profile?.google_doc_url) {
      setDocUrl(profile.google_doc_url);
      setSynced(true);
    }
  }, [profile?.google_doc_url]);

  const isValidUrl = (url: string) => {
    const trimmed = url.trim();
    return (
      trimmed.includes("docs.google.com/document") ||
      trimmed.includes("overleaf.com") ||
      /^[a-zA-Z0-9_-]{20,}$/.test(trimmed)
    );
  };

  const saveAndSync = async () => {
    if (!docUrl.trim() || !user) return;
    if (!isValidUrl(docUrl)) {
      toast({ variant: "destructive", title: "Link non valido", description: "Inserisci un link Google Docs o Overleaf valido." });
      return;
    }
    setSyncing(true);
    try {
      await updateProfile({ google_doc_url: docUrl.trim() } as any);
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-google-doc`, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ google_doc_url: docUrl.trim() }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSynced(true);
        setLastSyncTime(new Date());
        toast({ title: "Documento collegato", description: `${Math.round((data.length || 0) / 1000)}k caratteri sincronizzati.` });
        if (data.content?.length > 100) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`, {
            method: "POST", headers: AUTH_HEADERS,
            body: JSON.stringify({ mode: "embed_thesis", content: data.content }),
          }).catch(console.error);
        }
      } else {
        toast({ variant: "destructive", title: "Errore", description: "Impossibile leggere il documento. Assicurati che sia condiviso con 'Chiunque abbia il link'." });
      }
    } catch {
      toast({ variant: "destructive", title: "Errore", description: "Connessione fallita." });
    } finally { setSyncing(false); }
  };

  const disconnect = async () => {
    await updateProfile({ google_doc_url: "" } as any);
    setDocUrl("");
    setSynced(false);
    setLastSyncTime(null);
    toast({ title: "Documento scollegato" });
  };

  return (
    <div className="space-y-3">
      {synced ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2.5 bg-secondary/50">
            <div className="w-2 h-2 rounded-full bg-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground">Collegato</p>
              <p className="text-[10px] text-muted-foreground truncate">{docUrl}</p>
              {lastSyncTime && (
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  Ultimo sync: {lastSyncTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <button onClick={saveAndSync} disabled={syncing}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Risincronizza">
              {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            </button>
          </div>
          <button onClick={disconnect} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
            Scollega documento
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 p-2.5 bg-secondary/30">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 shrink-0" />
            <p className="text-xs text-muted-foreground">Nessun documento collegato</p>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Collega il tuo documento per consentire a Socrate di analizzare la tua tesi.
          </p>
          <div className="flex items-center gap-2">
            <input
              value={docUrl} onChange={e => setDocUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveAndSync()}
              placeholder="Incolla link Google Docs / Overleaf"
              className="flex-1 bg-secondary/50 border border-border px-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/20 transition-colors"
            />
            <button onClick={saveAndSync} disabled={!docUrl.trim() || syncing}
              className="px-3 py-2.5 bg-foreground text-background text-[10px] font-medium uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors disabled:opacity-20">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Collega"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── CHAT OVERLAY ───
function ChatOverlay({
  messages, input, setInput, sendMessage, isStreaming, onClose, onSwitchToVoice
}: {
  messages: ChatMsg[]; input: string; setInput: (v: string) => void;
  sendMessage: (text: string) => void; isStreaming: boolean; onClose: () => void; onSwitchToVoice?: () => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <SocrateCoin size={32} interactive={false} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground font-display">Socrate</p>
          <p className="text-[10px] text-muted-foreground">Il tuo mentore critico</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.map(msg => (
          <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm rounded-xl ${
              msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"
            }`}>
              {msg.content === "" && isStreaming ? (
                <div className="flex gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
                </div>
              ) : (
                <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border px-5 py-3 flex items-center gap-3">
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Rispondi a Socrate..."
          disabled={isStreaming}
          className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {onSwitchToVoice && (
          <button onClick={onSwitchToVoice}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Passa alla modalità vocale">
            <Mic className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming}
          className="p-2.5 bg-accent text-accent-foreground rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-30">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── MAIN DASHBOARD ───
export default function UnifiedDashboard() {
  const { profile, user, updateProfile, signOut, inputMode, setInputMode } = useApp();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const exchangeCountRef = useRef(0);
  const memoryRef = useRef<any[]>([]);

  // New state
  const [careerSectors, setCareerSectors] = useState<CareerSector[]>([]);
  const [careerLoading, setCareerLoading] = useState(false);
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [phaseEvalLoading, setPhaseEvalLoading] = useState(false);
  const [supervisorResponse, setSupervisorResponse] = useState<string | null>(null);

  // Google Docs state - auto-sync from profile
  const [thesisContent, setThesisContent] = useState("");

  // Auto-fetch Google Doc content silently on load
  const fetchGoogleDoc = useCallback(async () => {
    const docUrl = profile?.google_doc_url;
    if (!docUrl || !user) return;
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-google-doc`, {
        method: "POST",
        headers: AUTH_HEADERS,
        body: JSON.stringify({ google_doc_url: docUrl }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setThesisContent(data.content || "");
        if (data.content && data.content.length > 100) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`, {
            method: "POST",
            headers: AUTH_HEADERS,
            body: JSON.stringify({ mode: "embed_thesis", content: data.content }),
          }).catch(console.error);
        }
      }
    } catch { /* silent */ }
  }, [profile?.google_doc_url, user]);

  useEffect(() => {
    if (profile?.google_doc_url && user && !thesisContent) fetchGoogleDoc();
  }, [profile?.google_doc_url, user]);

  const studentContext = profile ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nCompetenze: ${profile.skills?.join(", ") || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}` : "";

  const fetchStudentProfile = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("student_profiles" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setStudentProfile(data);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    fetchStudentProfile();

    const channel = supabase
      .channel(`student-profile-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchStudentProfile();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchStudentProfile]);

  // Stream helper
  const streamResponse = useCallback(async (resp: Response, msgId: string): Promise<string> => {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "", content = "";
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
          if (delta) { content += delta; setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m)); }
        } catch {}
      }
    }
    return content;
  }, []);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming || !user) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    await supabase.from("socrate_messages").insert({ user_id: user.id, role: "user", content: text });
    const apiMessages = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: apiMessages, studentContext, latexContent: thesisContent, memoryEntries: memoryRef.current.slice(-15), mode: "chat" }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ variant: "destructive", title: "Errore", description: err.error || `Errore ${resp.status}` });
        setIsStreaming(false); return;
      }
      const assistantId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      const assistantContent = await streamResponse(resp, assistantId);
      if (assistantContent) await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: assistantContent });
      if (!profile?.socrate_done) await updateProfile({ socrate_done: true });
      exchangeCountRef.current += 1;
      if (exchangeCountRef.current % 3 === 0) runBackgroundExtraction([...messages, userMsg, { id: assistantId, role: "assistant", content: assistantContent }]);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Errore", description: "Impossibile contattare Socrate." });
    } finally { setIsStreaming(false); }
  }, [isStreaming, user, messages, studentContext, thesisContent, profile, updateProfile, toast, streamResponse]);

  const runBackgroundExtraction = useCallback(async (msgs: ChatMsg[]) => {
    if (!user) return;
    const recentMsgs = msgs.slice(-20).map(m => ({ role: m.role, content: m.content }));
    const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`;
    const TASK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-engine`;
    try {
      await Promise.allSettled([
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent: thesisContent, memoryEntries: memoryRef.current.slice(-20), mode: "extract_memory" }) }),
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent: thesisContent, mode: "extract_suggestions" }) }),
        fetch(RAG_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ mode: "embed_conversation", messages: recentMsgs.slice(-6) }) }),
        fetch(TASK_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ mode: "auto_generate", messages: recentMsgs.slice(-6), thesis_content: thesisContent?.substring(0, 2000) || "" }) }),
        // Compute career distribution
        fetch(CAREER_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ mode: "compute_career", thesis_content: thesisContent?.substring(0, 3000) || "" }) }),
        // Evaluate phase transition
        fetch(CAREER_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ mode: "evaluate_phase" }) }),
      ]);
    } catch {}
  }, [user, studentContext, thesisContent]);

  const scanVulnerabilities = useCallback(async () => {
    if (!user || isScanning) return;
    setIsScanning(true);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })), studentContext, latexContent: thesisContent, mode: "extract_vulnerabilities" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast({ title: "Scansione completata", description: `${data.vulnerabilities?.length || 0} vulnerabilità rilevate.` });
        const { data: fresh } = await supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(8);
        if (fresh) setVulnerabilities(fresh as any);
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
    finally { setIsScanning(false); }
  }, [user, isScanning, messages, studentContext, thesisContent, toast]);

  // Compute career on demand
  const computeCareer = useCallback(async () => {
    if (!user || careerLoading) return;
    setCareerLoading(true);
    try {
      const resp = await fetch(CAREER_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "compute_career", thesis_content: thesisContent?.substring(0, 3000) || "" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.sectors) setCareerSectors(data.sectors);
        toast({ title: "Orientamento aggiornato" });
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
    finally { setCareerLoading(false); }
  }, [user, careerLoading, thesisContent, toast]);

  // Evaluate phase
  const evaluatePhase = useCallback(async () => {
    if (!user || phaseEvalLoading) return;
    setPhaseEvalLoading(true);
    try {
      const resp = await fetch(CAREER_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "evaluate_phase" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.can_advance) {
          toast({ title: "Fase avanzata", description: data.socrate_comment?.substring(0, 100) || "Sei passato alla fase successiva." });
        } else {
          toast({ title: "Non ancora", description: data.socrate_comment?.substring(0, 100) || "Ci sono blocchi da risolvere." });
        }
        // Refresh student profile
        const { data: sp } = await supabase.from("student_profiles" as any).select("*").eq("user_id", user.id).single();
        if (sp) setStudentProfile(sp);
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
    finally { setPhaseEvalLoading(false); }
  }, [user, phaseEvalLoading, toast]);

  // Select supervisor
  const handleSelectSupervisor = useCallback(async (supId: string, supName: string, motivation: string) => {
    if (!user) return;
    try {
      const resp = await fetch(CAREER_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "select_supervisor", supervisor_id: supId, supervisor_name: supName, motivation }),
      });
      if (resp.ok) {
        const data = await resp.json();
        toast({ title: "Supervisore selezionato", description: supName });
        if (data.socrate_response) {
          setSupervisorResponse(data.socrate_response);
          // Also inject into chat
          const socrateMsg: ChatMsg = { id: `sup-${Date.now()}`, role: "assistant", content: data.socrate_response };
          setMessages(prev => [...prev, socrateMsg]);
          await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: data.socrate_response });
        }
        // Refresh student profile
        const { data: sp } = await supabase.from("student_profiles" as any).select("*").eq("user_id", user.id).single();
        if (sp) setStudentProfile(sp);
      }
    } catch { toast({ variant: "destructive", title: "Errore" }); }
  }, [user, toast]);

  // Progress
  const currentPhase = normalizePhase(
    studentProfile?.current_phase || studentProfile?.thesis_stage || profile?.journey_state
  );
  const phaseConfidence = studentProfile?.phase_confidence || 0;
  const currentPhaseIndex = PHASES.findIndex(p => p.key === currentPhase);
  const selectedSupervisorId = studentProfile?.selected_supervisor_id || null;
  const name = profile?.first_name || "Studente";
  const lastMessage = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* ─── TOP: Orb + Identity ─── */}
      <div className="flex flex-col items-center pt-6 pb-3 shrink-0 relative">
        {/* Top-left: user name + logout */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{name}</span>
          <button onClick={signOut} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Center: Thesis title + doc link */}
        <motion.div className="text-center space-y-1 px-16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-bold text-foreground font-display">
              {profile?.thesis_topic || "Tesi non definita"}
            </h1>
            {profile?.google_doc_url ? (
              <a
                href={profile.google_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Apri documento tesi"
              >
                <Link2 className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={() => setShowDocModal(true)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Collega documento tesi"
              >
                <Link2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        <motion.button
          onClick={() => setChatOpen(true)}
          className="mt-3 flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        >
          <MessageCircle className="w-4 h-4" />
          Parla con Socrate
        </motion.button>
        {lastMessage && !chatOpen && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-[11px] text-muted-foreground max-w-lg mx-auto px-6 mt-2 text-center line-clamp-2 italic">
            "{lastMessage.slice(0, 120)}…"
          </motion.p>
        )}
      </div>

      {/* Doc link modal */}
      <AnimatePresence>
        {showDocModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDocModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Collega documento tesi</h3>
                <button onClick={() => setShowDocModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              <ThesisDocWidget profile={profile} updateProfile={updateProfile} user={user} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Doc auto-syncs from profile settings */}

      {/* ─── CARDS GRID ─── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-16 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          {/* Career Distribution */}
          <motion.div data-tutor-id="career" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <DashboardCard title="Orientamento Lavorativo" icon={Briefcase}>
              <CareerBar sectors={careerSectors} onSectorClick={s => setActiveSector(activeSector === s ? null : s)} loading={careerLoading} />
            </DashboardCard>
          </motion.div>

          {/* Tasks */}
          <motion.div data-tutor-id="tasks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <DashboardCard title="Task" icon={Target}>
              <TaskContent userId={user?.id || ""} />
            </DashboardCard>
          </motion.div>

          {/* Vulnerabilities */}
          <motion.div data-tutor-id="vulnerabilities" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <DashboardCard title="Vulnerabilità" icon={ShieldAlert} badge={vulnerabilities.length}
              action={{ label: "Scansiona", onClick: scanVulnerabilities, loading: isScanning }}>
              <VulnerabilitiesContent vulnerabilities={vulnerabilities} />
            </DashboardCard>
          </motion.div>

          {/* Supervisors */}
          <motion.div data-tutor-id="supervisor" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <DashboardCard title="Supervisore" icon={Users}>
              <SupervisorSelection userId={user?.id || ""} selectedId={selectedSupervisorId} onSelect={handleSelectSupervisor} />
            </DashboardCard>
          </motion.div>

          {/* Thesis Document - always visible */}
          <motion.div data-tutor-id="thesis-doc" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <DashboardCard title="Documento Tesi" icon={FileText}>
              <ThesisDocWidget profile={profile} updateProfile={updateProfile} user={user} />
            </DashboardCard>
          </motion.div>

          {/* Companies (spans remaining cols) */}
          <motion.div data-tutor-id="companies" className={POST_PLANNING_PHASES.includes(currentPhase) ? "" : "md:col-span-2"} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <DashboardCard title={activeSector ? `Aziende — ${activeSector}` : "Aziende"} icon={Building2}
              action={activeSector ? { label: "Tutti", onClick: () => setActiveSector(null) } : undefined}>
              <DynamicCompanies userId={user?.id || ""} sectors={careerSectors} activeSector={activeSector} />
            </DashboardCard>
          </motion.div>
        </div>
      </div>

      {/* ─── BOTTOM PHASE STEPPER ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-2.5 px-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          {PHASES.map((p, i) => {
            const isCompleted = i < currentPhaseIndex;
            const isCurrent = i === currentPhaseIndex;
            return (
              <div key={p.key} className="flex flex-col items-center gap-1 flex-1 relative">
                {/* Connector line */}
                {i < PHASES.length - 1 && (
                  <div className={`absolute top-3 left-[55%] right-[-45%] h-px ${
                    i < currentPhaseIndex ? "bg-accent" : "bg-border"
                  }`} />
                )}
                <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isCompleted ? "bg-accent text-accent-foreground"
                    : isCurrent ? "bg-accent/20 text-accent border border-accent/40"
                    : "bg-secondary text-muted-foreground"
                }`}>
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : p.icon}
                </div>
                <span className={`text-[8px] font-medium ${isCurrent ? "text-accent" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                  {p.label}
                </span>
                {/* Confidence on current */}
                {isCurrent && phaseConfidence > 0 && (
                  <div className="flex items-center gap-0.5">
                    <div className="w-10 h-1 rounded-full bg-secondary overflow-hidden">
                      <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${phaseConfidence}%` }} transition={{ duration: 0.5 }} />
                    </div>
                    <span className="text-[7px] text-accent">{Math.round(phaseConfidence)}%</span>
                  </div>
                )}
              </div>
            );
          })}
          {/* Evaluate button */}
          <button onClick={evaluatePhase} disabled={phaseEvalLoading}
            className="ml-3 p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 shrink-0"
            title="Valuta avanzamento fase">
            {phaseEvalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ─── CHAT / VOICE OVERLAY ─── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40"
              onClick={() => { setChatOpen(false); setInputMode("text"); }}
            />
            {inputMode === "voice" ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
                  <SocrateCoin size={32} interactive={false} isActive />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Socrate</p>
                    <p className="text-[10px] text-muted-foreground">Modalità vocale</p>
                  </div>
                  <button onClick={() => { setChatOpen(false); setInputMode("text"); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1">
                  <VoiceConversation
                    onTranscript={(text) => sendMessage(text)}
                    onSwitchToText={() => setInputMode("text")}
                    isStreaming={isStreaming}
                    lastAssistantMessage={lastMessage}
                    severity={studentProfile?.severita ?? 0.5}
                  />
                </div>
              </motion.div>
            ) : (
              <ChatOverlay messages={messages} input={input} setInput={setInput}
                sendMessage={sendMessage} isStreaming={isStreaming} onClose={() => setChatOpen(false)}
                onSwitchToVoice={() => setInputMode("voice")} />
            )}
          </>
        )}
      </AnimatePresence>

      {/* Socrate Tutor - omnipresent guide */}
      {!chatOpen && <SocrateTutor activeSection="dashboard" />}
    </div>
  );
}
