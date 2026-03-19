import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Loader2, ShieldAlert, Flame, Target, Users, Building2,
  CheckCircle2, Circle, GraduationCap, LogOut, MessageCircle,
  ChevronLeft, ChevronRight, X, FileText, Link2, RefreshCw,
  TrendingUp, ArrowRight, Lock, Unlock, Briefcase, BarChart3, Mic,
  BookOpen, ExternalLink, Mail
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
import expertsData from "@/data/experts.json";
import fieldsData from "@/data/fields.json";
import type { Supervisor, Company, Expert, Field } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const experts = expertsData as Expert[];
const fields = fieldsData as Field[];

interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }
interface Vulnerability { id: string; type: string; title: string; description: string; severity: string; }
interface Reference { title: string; authors: string; year?: string; url: string; category: string; relevance: string; }
interface CareerSector { name: string; percentage: number; reasoning?: string; }

const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const CAREER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-engine`;
const RAG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`;
const TASK_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/task-engine`;


const PHASES = [
  { key: "orientation", label: "Orientation", icon: "1" },
  { key: "topic_supervisor", label: "Topic & Supervisor", icon: "2" },
  { key: "planning", label: "Planning", icon: "3" },
  { key: "execution", label: "Execution", icon: "4" },
  { key: "writing", label: "Writing", icon: "5" },
] as const;

type SinglePhaseKey = (typeof PHASES)[number]["key"];
type PhaseKey = SinglePhaseKey;

const POST_PLANNING_PHASES: PhaseKey[] = ["planning", "execution", "writing"];

// Parse a phase string that might be hybrid (e.g. "orientation+topic_supervisor")
interface ParsedPhase {
  primary: SinglePhaseKey;
  secondary: SinglePhaseKey | null;
  isHybrid: boolean;
}

const SINGLE_PHASE_KEYS: SinglePhaseKey[] = ["orientation", "topic_supervisor", "planning", "execution", "writing"];

const normalizeSinglePhase = (phase?: string | null): SinglePhaseKey => {
  switch (phase) {
    case "orientation":
    case "topic_supervisor":
    case "planning":
    case "execution":
    case "writing":
      return phase;
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

const parsePhase = (phase?: string | null): ParsedPhase => {
  if (!phase) return { primary: "orientation", secondary: null, isHybrid: false };

  // Check for hybrid format: "phase1+phase2"
  if (phase.includes("+")) {
    const [a, b] = phase.split("+");
    const primary = normalizeSinglePhase(a);
    const secondary = normalizeSinglePhase(b);
    if (primary !== secondary) {
      // Ensure order: primary should come first in PHASES
      const pi = SINGLE_PHASE_KEYS.indexOf(primary);
      const si = SINGLE_PHASE_KEYS.indexOf(secondary);
      if (pi < si) return { primary, secondary, isHybrid: true };
      return { primary: secondary, secondary: primary, isHybrid: true };
    }
  }

  return { primary: normalizeSinglePhase(phase), secondary: null, isHybrid: false };
};

// Helper: check if a phase key is active in a parsed phase
const phaseActive = (parsed: ParsedPhase, key: SinglePhaseKey): boolean =>
  parsed.primary === key || parsed.secondary === key;

const normalizePhase = (phase?: string | null): PhaseKey => normalizeSinglePhase(phase);

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
        toast({ title: "Task completed", description: result.feedback || "Well done." });
      } else {
        setRejectedIds(prev => new Set(prev).add(taskId));
        toast({ variant: "destructive", title: "Not yet", description: result.feedback || "Socrate is not convinced. Try again." });
      }
    } catch {
      await updateTaskStatus(taskId, "completed");
      toast({ title: "Task completed" });
    } finally {
      setValidatingId(null);
    }
  };

  const forceComplete = async (taskId: string) => {
    await updateTaskStatus(taskId, "completed");
    setRejectedIds(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    toast({ title: "Task forced as completed" });
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
      <span className="text-xs text-muted-foreground ml-2">Analyzing career...</span>
    </div>
  );

  if (sectors.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-6">Talk to Socrate to calculate your orientation.</p>
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

// ─── CAREER TREE (tree view with sectors → companies) ───
function CareerTree({ sectors, userId, loading }: {
  sectors: CareerSector[]; userId: string; loading: boolean;
}) {
  const [expandedSector, setExpandedSector] = useState<string | null>(null);
  const [sectorCompanies, setSectorCompanies] = useState<Record<string, any[]>>({});
  const [loadingSector, setLoadingSector] = useState<string | null>(null);
  const { affinities } = useAffinityScores(userId, "company");

  const BRANCH_COLORS = [
    "hsl(var(--accent))", "hsl(var(--destructive))", "hsl(142 50% 40%)",
    "hsl(var(--warning))", "hsl(270 60% 55%)", "hsl(200 70% 50%)",
  ];

  const sorted = useMemo(() => [...sectors].sort((a, b) => b.percentage - a.percentage), [sectors]);

  // When a sector expands, fetch its companies
  const toggleSector = useCallback(async (sectorName: string) => {
    if (expandedSector === sectorName) { setExpandedSector(null); return; }
    setExpandedSector(sectorName);
    if (sectorCompanies[sectorName]) return; // already fetched

    setLoadingSector(sectorName);
    try {
      const resp = await fetch(CAREER_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "get_companies_by_sector", sector: sectorName }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setSectorCompanies(prev => ({ ...prev, [sectorName]: data.companies || [] }));
      }
    } catch { /* silent */ }

    // Fallback: match from local data by domain keywords
    if (!sectorCompanies[sectorName]) {
      const kw = sectorName.toLowerCase();
      const matched = companies.filter(c =>
        c.domains.some(d => d.toLowerCase().includes(kw)) ||
        c.description.toLowerCase().includes(kw)
      ).slice(0, 5);
      setSectorCompanies(prev => ({ ...prev, [sectorName]: matched.map(c => ({ name: c.name, description: c.description, domains: c.domains })) }));
    }
    setLoadingSector(null);
  }, [expandedSector, sectorCompanies]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground ml-2">Analyzing directions...</span>
    </div>
  );

  if (sorted.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-8 italic">
      Talk to Socrate to discover possible directions for your thesis.
    </p>
  );

  return (
    <div className="space-y-1">
      {/* Trunk label */}
      <div className="flex items-center gap-2 pb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Your thesis</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {sorted.map((sector, i) => {
        const isExpanded = expandedSector === sector.name;
        const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
        const comps = sectorCompanies[sector.name] || [];
        const isLoading = loadingSector === sector.name;

        return (
          <div key={sector.name} className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />

            {/* Branch */}
            <button
              onClick={() => toggleSector(sector.name)}
              className={`relative w-full flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-lg transition-all text-left group ${
                isExpanded ? "bg-secondary/60" : "hover:bg-secondary/30"
              }`}
            >
              {/* Branch node */}
              <div className="absolute left-[3px] top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-[9px] h-[9px] rounded-full border-2 shrink-0" style={{ borderColor: color, backgroundColor: isExpanded ? color : "transparent" }} />
                <div className="w-3 h-px" style={{ backgroundColor: color }} />
              </div>

              {/* Sector info */}
              <div className="flex-1 min-w-0 ml-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground">{sector.name}</span>
                  {sector.reasoning && (
                    <span className="text-[9px] text-muted-foreground truncate max-w-[180px] hidden lg:inline">
                      {sector.reasoning}
                    </span>
                  )}
                </div>
              </div>

              {/* Percentage bar */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${sector.percentage}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }}
                  />
                </div>
                <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{sector.percentage}%</span>
              </div>

              {/* Expand indicator */}
              <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>

            {/* Expanded: companies under this branch */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="overflow-hidden"
                >
                  <div className="pl-8 pr-2 pb-2 space-y-1">
                    {isLoading ? (
                      <div className="flex items-center gap-2 py-3 pl-4">
                        <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">Searching companies...</span>
                      </div>
                    ) : comps.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-2 pl-4 italic">No companies found for this sector.</p>
                    ) : (
                      comps.slice(0, 5).map((comp: any, j: number) => (
                        <div key={j} className="relative flex items-center gap-2.5 pl-4 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors">
                          {/* Leaf connector */}
                          <div className="absolute left-0 top-1/2 w-3 h-px" style={{ backgroundColor: `${color}40` }} />
                          <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center shrink-0">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-medium text-foreground truncate">{comp.name}</p>
                            <p className="text-[9px] text-muted-foreground truncate">
                              {comp.domains?.join(", ") || comp.description?.substring(0, 60) || ""}
                            </p>
                          </div>
                          {comp.thesis_coherence != null && (
                            <span className="text-[9px] font-bold shrink-0" style={{ color }}>{comp.thesis_coherence}%</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
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
        return { id: a.entity_id, name: a.entity_name, score: a.score, fields: sup?.researchInterests?.slice(0, 2) || [], reasoning: a.reasoning, email: sup?.email || "", university: sup?.universityId || "" };
      });
    }
    return supervisors.slice(0, 5).map(s => ({
      id: s.id, name: `${s.title} ${s.firstName} ${s.lastName}`, score: null, fields: s.researchInterests.slice(0, 2), reasoning: "", email: s.email, university: s.universityId,
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
              {sup.email && (
                <a href={`mailto:${sup.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-[10px] text-accent hover:underline mt-0.5">
                  <Mail className="w-2.5 h-2.5" />{sup.email}
                </a>
              )}
              {sup.reasoning && <p className="text-[10px] text-foreground/60 line-clamp-1 mt-0.5">{sup.reasoning}</p>}
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
                    placeholder="Explain your motivation..."
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

// ─── EXPERT SUGGESTIONS ───
function ExpertSuggestions({ userId }: { userId: string }) {
  const { affinities, loading } = useAffinityScores(userId, "expert");
  const [expanded, setExpanded] = useState<string | null>(null);

  const items = useMemo(() => {
    if (affinities.length > 0) {
      return affinities.slice(0, 6).map(a => {
        const exp = experts.find(e => e.id === a.entity_id);
        return {
          id: a.entity_id, name: a.entity_name, score: a.score,
          reasoning: a.reasoning,
          matched_traits: a.matched_traits || [],
          title: exp?.title || "",
          offerInterviews: exp?.offerInterviews ?? false,
          fieldIds: exp?.fieldIds || [],
          email: exp?.email || "",
        };
      });
    }
    return [];
  }, [affinities]);

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );

  if (items.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-6 italic">
      Suggestions will appear after your first conversations with Socrate.
    </p>
  );

  return (
    <div className="space-y-1.5">
      {items.map(exp => (
        <div key={exp.id}>
          <div
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
            onClick={() => setExpanded(expanded === exp.id ? null : exp.id)}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              exp.offerInterviews ? "bg-green-500/10" : "bg-accent/10"
            }`}>
              <Users className={`w-3.5 h-3.5 ${exp.offerInterviews ? "text-green-500" : "text-accent"}`} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{exp.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{exp.title}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {exp.offerInterviews && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">Intervista</span>
              )}
              <span className="text-[10px] font-bold text-accent">{exp.score}%</span>
            </div>
          </div>
          <AnimatePresence>
            {expanded === exp.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 pb-2 space-y-1.5">
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{exp.reasoning}</p>
                  {exp.email && (
                    <a href={`mailto:${exp.email}`} className="flex items-center gap-1.5 text-[10px] text-accent hover:underline font-medium">
                      <Mail className="w-3 h-3" /> {exp.email}
                    </a>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {exp.matched_traits.slice(0, 4).map((t: string) => (
                      <span key={t} className="text-[8px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">{t}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {exp.fieldIds.map(fid => {
                      const f = fields.find(ff => ff.id === fid);
                      return f ? <span key={fid} className="text-[8px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{f.name}</span> : null;
                    })}
                  </div>
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
        <span className="text-xs text-muted-foreground ml-2">Searching companies in {activeSector}...</span>
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

// ─── CONFIRMED TRACK SUMMARY (planning phase) ───
function ConfirmedTrackSummary({ supervisorId, sectors, thesisTopic }: {
  supervisorId: string | null; sectors: CareerSector[]; thesisTopic?: string | null;
}) {
  const sup = supervisorId ? supervisors.find(s => s.id === supervisorId) : null;
  const topSectors = sectors.filter(s => s.percentage > 0).sort((a, b) => b.percentage - a.percentage).slice(0, 3);

  return (
    <div className="space-y-3">
      {thesisTopic && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Topic</p>
          <p className="text-xs font-medium text-foreground">{thesisTopic}</p>
        </div>
      )}
      {sup && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Supervisore</p>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-accent" />
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{sup.title} {sup.firstName} {sup.lastName}</p>
              <p className="text-[10px] text-muted-foreground">{sup.researchInterests.slice(0, 2).join(", ")}</p>
            </div>
          </div>
        </div>
      )}
      {topSectors.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Direzione</p>
          <div className="space-y-1">
            {topSectors.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${s.percentage}%` }} />
                </div>
                <span className="text-[10px] text-foreground font-medium w-24 truncate">{s.name}</span>
                <span className="text-[10px] text-muted-foreground font-bold w-8 text-right">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {!sup && topSectors.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4 italic">Confirm supervisor and orientation to proceed.</p>
      )}
    </div>
  );
}

// ─── ROADMAP CARD (real data from DB) ───
function RoadmapCard({ currentPhase, userId }: { currentPhase: PhaseKey; userId: string }) {
  const isEditable = currentPhase === "planning";
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Fetch roadmap items
  const fetchRoadmap = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("roadmap_items" as any)
      .select("*")
      .eq("user_id", userId)
      .order("sort_order");
    if (data) setItems(data as any[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchRoadmap();
    if (!userId) return;
    const channel = supabase
      .channel(`roadmap-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_items", filter: `user_id=eq.${userId}` }, () => fetchRoadmap())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchRoadmap]);

  // Generate roadmap via AI
  const generateRoadmap = useCallback(async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const resp = await fetch(TASK_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ mode: "generate_roadmap" }),
      });
      if (resp.ok) {
        toast({ title: "Roadmap generated", description: "The roadmap has been created based on your thesis." });
        await fetchRoadmap();
      } else {
        toast({ variant: "destructive", title: "Error", description: "Unable to generate the roadmap." });
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setGenerating(false); }
  }, [generating, toast, fetchRoadmap]);

  // Toggle task completion
  const toggleTask = useCallback(async (taskId: string, completed: boolean) => {
    // Optimistic update
    setItems(prev => prev.map(i => i.id === taskId ? { ...i, completed } : i));
    await fetch(TASK_URL, {
      method: "POST", headers: AUTH_HEADERS,
      body: JSON.stringify({ mode: "toggle_roadmap_task", task_id: taskId, completed }),
    });
  }, []);

  // Group by phase
  const phases = useMemo(() => {
    const grouped: Record<string, { title: string; key: string; tasks: any[] }> = {};
    const order = ["planning", "execution", "writing"];
    items.forEach(item => {
      if (!grouped[item.phase_key]) {
        grouped[item.phase_key] = { title: item.phase_title, key: item.phase_key, tasks: [] };
      }
      grouped[item.phase_key].tasks.push(item);
    });
    return order.map(k => grouped[k]).filter(Boolean);
  }, [items]);

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
    </div>
  );

  // Empty state: offer to generate
  if (phases.length === 0) return (
    <div className="text-center py-8 space-y-3">
      <p className="text-xs text-muted-foreground">Nessuna roadmap ancora. Socrate può generarne una basata sulla tua tesi.</p>
      <button
        onClick={generateRoadmap}
        disabled={generating}
        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-40"
      >
        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <BarChart3 className="w-3 h-3" />}
        {generating ? "Generating..." : "Generate Roadmap"}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Regenerate button */}
      {isEditable && (
        <div className="flex justify-end">
          <button
            onClick={generateRoadmap}
            disabled={generating}
            className="text-[10px] font-medium px-2.5 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40 flex items-center gap-1.5"
          >
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Rigenera
          </button>
        </div>
      )}

      {phases.map(phase => {
        const completedCount = phase.tasks.filter((t: any) => t.completed).length;
        const progress = phase.tasks.length > 0 ? Math.round((completedCount / phase.tasks.length) * 100) : 0;

        return (
          <div key={phase.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{phase.title}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-accent rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8 }}
              />
            </div>
            <div className="space-y-1 pl-2">
              {phase.tasks.map((task: any) => (
                <div key={task.id} className="flex items-center gap-2 py-0.5">
                  <button
                    onClick={() => toggleTask(task.id, !task.completed)}
                    className="shrink-0"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-3 h-3 text-accent" />
                    ) : (
                      <Circle className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />
                    )}
                  </button>
                  <span className={`text-[11px] flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {task.task_title}
                  </span>
                  {task.due_date && (
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(task.due_date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function VulnerabilitiesContent({ vulnerabilities, onResolve }: { vulnerabilities: Vulnerability[]; onResolve?: (id: string) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (vulnerabilities.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna vulnerabilità rilevata.</p>;

  // Rank: critical first, then high, medium, low
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const ranked = [...vulnerabilities].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return (
    <div className="space-y-1.5">
      {ranked.slice(0, 8).map((v, i) => {
        const isExpanded = expandedId === v.id;
        const severityColor = v.severity === "critical" ? "text-destructive" : v.severity === "high" ? "text-warning" : "text-muted-foreground";
        const severityBg = v.severity === "critical" ? "bg-destructive/[0.06]" : v.severity === "high" ? "bg-warning/[0.06]" : "bg-muted/30";

        return (
          <div key={v.id} className={`rounded-lg transition-colors ${severityBg}`}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
              className="w-full flex items-start gap-2.5 p-2.5 text-left"
            >
              <span className={`text-[10px] font-bold mt-0.5 shrink-0 w-4 text-center ${severityColor}`}>
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
                {!isExpanded && (
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">{v.description}</p>
                )}
              </div>
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColor}`} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">{v.description}</p>
                    {onResolve && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolve(v.id); }}
                        className="ml-6 text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                      >
                        Spiega a Socrate che è risolta →
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN REFERENCES ───
interface SavedRef { id: string; title: string; authors: string; year?: string; url: string; category: string; relevance: string; }

function ReferencesContent({ references, loading, onRefresh, userId }: {
  references: Reference[]; loading: boolean; onRefresh: () => void; userId?: string;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savedRefs, setSavedRefs] = useState<SavedRef[]>([]);
  const [savingUrl, setSavingUrl] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();

  // Load saved references
  useEffect(() => {
    if (!userId) return;
    supabase.from("saved_references" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setSavedRefs(data as any); });
  }, [userId]);

  const isSaved = (url: string) => savedRefs.some(s => s.url === url);

  const toggleSave = async (ref: Reference) => {
    if (!userId) return;
    setSavingUrl(ref.url);
    try {
      if (isSaved(ref.url)) {
        await supabase.from("saved_references" as any).delete().eq("user_id", userId).eq("url", ref.url);
        setSavedRefs(prev => prev.filter(s => s.url !== ref.url));
        toast({ title: "Removed from saved" });
      } else {
        const { data } = await supabase.from("saved_references" as any).insert({
          user_id: userId, title: ref.title, authors: ref.authors, year: ref.year || null,
          url: ref.url, category: ref.category, relevance: ref.relevance,
        } as any).select().single();
        if (data) setSavedRefs(prev => [data as any, ...prev]);
        toast({ title: "Saved to favorites ⭐" });
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    setSavingUrl(null);
  };

  const categoryLabel: Record<string, { text: string; cls: string }> = {
    foundational: { text: "Foundational", cls: "bg-accent/10 text-accent" },
    methodology: { text: "Method", cls: "bg-warning/10 text-warning" },
    recent: { text: "Recent", cls: "bg-green-500/10 text-green-600" },
    contrarian: { text: "Critical", cls: "bg-destructive/10 text-destructive" },
  };

  const renderRef = (ref: Reference | SavedRef, i: number, canSave: boolean) => {
    const isExpanded = expandedIdx === i + (showSaved ? 10000 : 0);
    const idx = i + (showSaved ? 10000 : 0);
    const cat = categoryLabel[ref.category] || categoryLabel.foundational;
    const saved = isSaved(ref.url);

    return (
      <div key={ref.url + i} className="rounded-lg hover:bg-secondary/30 transition-colors">
        <div className="flex items-start">
          <button
            onClick={() => setExpandedIdx(isExpanded ? null : idx)}
            className="flex-1 flex items-start gap-2.5 p-2.5 text-left"
          >
            <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground leading-tight">{ref.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {ref.authors}{ref.year ? ` (${ref.year})` : ""}
              </p>
            </div>
            <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 rounded ${cat.cls}`}>
              {cat.text}
            </span>
          </button>
          {canSave && (
            <button
              onClick={() => toggleSave(ref as Reference)}
              disabled={savingUrl === ref.url}
              className={`p-2.5 shrink-0 transition-colors ${saved ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
              title={saved ? "Remove from saved" : "Save"}
            >
              {savingUrl === ref.url ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                saved ? <span className="text-sm">⭐</span> : <span className="text-sm opacity-50">☆</span>}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-2.5 pb-2.5 pt-0 space-y-2 pl-8">
                <p className="text-[11px] text-muted-foreground leading-relaxed">{ref.relevance}</p>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Apri riferimento
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      <span className="text-xs text-muted-foreground ml-2">Cercando riferimenti...</span>
    </div>
  );

  const displayList = showSaved ? savedRefs : references;

  return (
    <div className="space-y-2">
      {/* Tabs: Suggeriti / Salvati */}
      <div className="flex gap-1 border-b border-border/50 pb-1">
        <button
          onClick={() => { setShowSaved(false); setExpandedIdx(null); }}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-t transition-colors ${!showSaved ? "text-accent border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"}`}
        >
          Suggested ({references.length})
        </button>
        <button
          onClick={() => { setShowSaved(true); setExpandedIdx(null); }}
          className={`px-2.5 py-1 text-[10px] font-medium rounded-t transition-colors ${showSaved ? "text-yellow-500 border-b-2 border-yellow-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          ⭐ Saved ({savedRefs.length})
        </button>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-xs text-muted-foreground italic">
            {showSaved ? "No saved references. Click ☆ to save." : "Talk to Socrate to get reading suggestions."}
          </p>
          {!showSaved && (
            <button onClick={onRefresh} className="text-[10px] text-accent hover:text-accent/80 font-medium transition-colors">
              Genera riferimenti →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayList.map((ref, i) => renderRef(ref, i, !showSaved))}
        </div>
      )}
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
      toast({ variant: "destructive", title: "Invalid link", description: "Enter a valid Google Docs or Overleaf link." });
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
        toast({ title: "Document connected", description: `${Math.round((data.length || 0) / 1000)}k characters synced.` });
        if (data.content?.length > 100) {
          fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rag-engine`, {
            method: "POST", headers: AUTH_HEADERS,
            body: JSON.stringify({ mode: "embed_thesis", content: data.content }),
          }).catch(console.error);
        }
      } else {
        toast({ variant: "destructive", title: "Error", description: "Unable to read the document. Make sure it is shared with 'Anyone with the link'." });
      }
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Connection failed." });
    } finally { setSyncing(false); }
  };

  const disconnect = async () => {
    await updateProfile({ google_doc_url: "" } as any);
    setDocUrl("");
    setSynced(false);
    setLastSyncTime(null);
    toast({ title: "Document disconnected" });
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
                  Last sync: {lastSyncTime.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </div>
            <button onClick={saveAndSync} disabled={syncing}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" title="Resync">
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
              placeholder="Paste Google Docs / Overleaf link"
              className="flex-1 bg-secondary/50 border border-border px-3 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-foreground/20 transition-colors"
            />
            <button onClick={saveAndSync} disabled={!docUrl.trim() || syncing}
              className="px-3 py-2.5 bg-foreground text-background text-[10px] font-medium uppercase tracking-[0.1em] hover:bg-foreground/90 transition-colors disabled:opacity-20">
              {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
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
            <div className={`max-w-[80%] px-4 py-3 text-sm rounded-2xl ${
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
          placeholder="Reply to Socrate..."
          disabled={isStreaming}
          className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        {onSwitchToVoice && (
          <button onClick={onSwitchToVoice}
            className="p-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Switch to voice mode">
            <Mic className="w-4 h-4" />
          </button>
        )}
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || isStreaming}
          className="p-2.5 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-30">
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
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
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

   // References state
   const [references, setReferences] = useState<Reference[]>([]);
   const [isLoadingRefs, setIsLoadingRefs] = useState(false);

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
        toast({ variant: "destructive", title: "Error", description: err.error || `Error ${resp.status}` });
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
      toast({ variant: "destructive", title: "Error", description: "Unable to contact Socrate." });
    } finally { setIsStreaming(false); }
  }, [isStreaming, user, messages, studentContext, thesisContent, profile, updateProfile, toast, streamResponse]);

  // Generate report
  const generateReport = useCallback(async () => {
    if (isStreaming || isGeneratingReport || !user || messages.length < 3) return;
    setIsGeneratingReport(true);
    const apiMessages = messages.slice(-20).map(m => ({ role: m.role, content: m.content }));
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: apiMessages, studentContext, latexContent: thesisContent, memoryEntries: memoryRef.current.slice(-15), mode: "report" }),
      });
      if (!resp.ok) { toast({ variant: "destructive", title: "Error" }); setIsGeneratingReport(false); return; }
      const reportId = `report-${Date.now()}`;
      setMessages(prev => [...prev,
        { id: `sep-${Date.now()}`, role: "assistant", content: "---\n\n## Report di Sessione\n" },
        { id: reportId, role: "assistant", content: "" },
      ]);
      const reportContent = await streamResponse(resp, reportId);
      if (reportContent) await supabase.from("socrate_messages").insert({ user_id: user.id, role: "assistant", content: `REPORT:\n${reportContent}` });
      toast({ title: "Report generated" });
    } catch (e) { console.error(e); toast({ variant: "destructive", title: "Error" }); }
    finally { setIsGeneratingReport(false); }
  }, [isStreaming, isGeneratingReport, user, messages, studentContext, thesisContent, toast, streamResponse]);

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
        // Match experts and supervisors
        fetch(SOCRATE_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ messages: recentMsgs, studentContext, latexContent: thesisContent, mode: "match_people", expertsData, supervisorsData: supervisors, fieldsData: fields }) }),
        // Update roadmap if in planning+ phase
        fetch(TASK_URL, { method: "POST", headers: AUTH_HEADERS, body: JSON.stringify({ mode: "generate_roadmap", thesis_content: thesisContent?.substring(0, 3000) || "" }) }),
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
        toast({ title: "Scan completed", description: `${data.vulnerabilities?.length || 0} vulnerabilities detected.` });
        const { data: fresh } = await supabase.from("vulnerabilities" as any).select("*").eq("user_id", user.id).eq("resolved", false).order("created_at", { ascending: false }).limit(8);
        if (fresh) setVulnerabilities(fresh as any);
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setIsScanning(false); }
  }, [user, isScanning, messages, studentContext, thesisContent, toast]);

  // Fetch references
  const fetchReferences = useCallback(async () => {
    if (!user || isLoadingRefs) return;
    setIsLoadingRefs(true);
    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST", headers: AUTH_HEADERS,
        body: JSON.stringify({ messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content })), studentContext, latexContent: thesisContent, mode: "suggest_references" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReferences(data.references || []);
        toast({ title: "References updated", description: `${data.references?.length || 0} references suggested.` });
      }
    } catch { toast({ variant: "destructive", title: "Error loading references" }); }
    finally { setIsLoadingRefs(false); }
  }, [user, isLoadingRefs, messages, studentContext, thesisContent, toast]);

  // Resolve vulnerability: open chat with pre-filled context, mark resolved
  const resolveVulnerability = useCallback((vulnId: string) => {
    const vuln = vulnerabilities.find(v => v.id === vulnId);
    if (!vuln) return;
    const msg = `I resolved the vulnerability "${vuln.title}". Here's why it's no longer an issue: `;
    setInput(msg);
    setChatOpen(true);
    supabase.from("vulnerabilities" as any).update({ resolved: true, resolved_at: new Date().toISOString() } as any).eq("id", vulnId).then(() => {
      setVulnerabilities(prev => prev.filter(v => v.id !== vulnId));
    });
  }, [vulnerabilities]);

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
        toast({ title: "Orientation updated" });
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
    finally { setCareerLoading(false); }
  }, [user, careerLoading, thesisContent, toast]);

  // Close chat and auto-compute career
  const closeChat = useCallback(() => {
    setChatOpen(false);
    setInputMode("text");
    if (messages.length > 2) {
      setTimeout(() => computeCareer(), 500);
    }
  }, [messages.length, computeCareer, setInputMode]);

  const switchChatToText = useCallback(() => {
    setInputMode("text");
  }, [setInputMode]);

  const switchChatToVoice = useCallback(() => {
    setInputMode("voice");
  }, [setInputMode]);

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
          toast({ title: "Phase advanced", description: data.socrate_comment?.substring(0, 100) || "You have moved to the next phase." });
        } else {
          toast({ title: "Non ancora", description: data.socrate_comment?.substring(0, 100) || "There are blockers to resolve." });
        }
        // Refresh student profile
        const { data: sp } = await supabase.from("student_profiles" as any).select("*").eq("user_id", user.id).single();
        if (sp) setStudentProfile(sp);
      }
    } catch { toast({ variant: "destructive", title: "Error" }); }
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
        toast({ title: "Supervisor selected", description: supName });
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
    } catch { toast({ variant: "destructive", title: "Error" }); }
  }, [user, toast]);

  // Progress — support hybrid phases
  const rawPhase = studentProfile?.current_phase || studentProfile?.thesis_stage || profile?.journey_state;
  const parsedPhase = parsePhase(rawPhase);
  const currentPhase = parsedPhase.primary;
  const phaseConfidence = studentProfile?.phase_confidence || 0;
  const currentPhaseIndex = PHASES.findIndex(p => p.key === parsedPhase.primary);
  const secondaryPhaseIndex = parsedPhase.secondary ? PHASES.findIndex(p => p.key === parsedPhase.secondary) : -1;
  const selectedSupervisorId = studentProfile?.selected_supervisor_id || null;
  const name = profile?.first_name || "Studente";
  const lastMessage = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";

  // ─── AUTO-ADVANCE: when all roadmap tasks + critical side tasks are done ───
  const autoAdvanceTriggered = useRef(false);
  useEffect(() => {
    if (currentPhase !== "planning") {
      autoAdvanceTriggered.current = false;
    }
  }, [currentPhase]);

  useEffect(() => {
    if (currentPhase !== "planning" || !user?.id || phaseEvalLoading || autoAdvanceTriggered.current) return;

    const checkAutoAdvance = async () => {
      const { data: roadmapItems } = await supabase
        .from("roadmap_items" as any)
        .select("completed")
        .eq("user_id", user.id);

      if (!roadmapItems || roadmapItems.length === 0) return;
      const allRoadmapDone = roadmapItems.every((item: any) => item.completed);
      if (!allRoadmapDone) return;

      const { data: criticalTasks } = await supabase
        .from("socrate_tasks")
        .select("id, status, priority")
        .eq("user_id", user.id)
        .eq("priority", "critical")
        .eq("status", "pending");

      if (criticalTasks && criticalTasks.length > 0) return;

      autoAdvanceTriggered.current = true;
      toast({ title: "All tasks completed!", description: "Automatic phase advancement evaluation in progress..." });
      evaluatePhase();
    };

    const roadmapChannel = supabase
      .channel(`auto-advance-roadmap-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "roadmap_items", filter: `user_id=eq.${user.id}` }, () => checkAutoAdvance())
      .subscribe();

    const tasksChannel = supabase
      .channel(`auto-advance-tasks-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "socrate_tasks", filter: `user_id=eq.${user.id}` }, () => checkAutoAdvance())
      .subscribe();

    checkAutoAdvance();

    return () => {
      supabase.removeChannel(roadmapChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [currentPhase, user?.id, phaseEvalLoading, evaluatePhase, toast]);

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
              {profile?.thesis_topic || "Thesis not defined"}
            </h1>
            {profile?.google_doc_url ? (
              <a
                href={profile.google_doc_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Open thesis document"
              >
                <Link2 className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={() => setShowDocModal(true)}
                className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Connect thesis document"
              >
                <Link2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Confirmed track summary — inline under title in planning+ */}
        {(phaseActive(parsedPhase, "planning") || phaseActive(parsedPhase, "execution") || phaseActive(parsedPhase, "writing")) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="flex items-center justify-center gap-4 flex-wrap mt-1"
          >
            {(() => {
              const sup = selectedSupervisorId ? supervisors.find(s => s.id === selectedSupervisorId) : null;
              const topSectors = careerSectors.filter(s => s.percentage > 0).sort((a, b) => b.percentage - a.percentage).slice(0, 2);
              return (
                <>
                  {sup && (
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3 h-3 text-accent" />
                      <span className="text-[11px] text-muted-foreground">{sup.title} {sup.firstName} {sup.lastName}</span>
                    </div>
                  )}
                  {topSectors.length > 0 && (
                    <>
                      <span className="text-muted-foreground/30 text-[10px]">·</span>
                      {topSectors.map((s, i) => (
                        <span key={s.name} className="text-[11px] text-muted-foreground">
                          {s.name} {s.percentage}%{i < topSectors.length - 1 ? "," : ""}
                        </span>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}

        <motion.button
          onClick={() => {
            setInputMode("voice");
            setChatOpen(true);
          }}
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

      {/* ─── CARDS GRID — strict phase-gated ─── */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-16 pb-28">

        {/* ═══ PHASE CONTENT — supports hybrid phases ═══ */}
        {(() => {
          const showOrientation = phaseActive(parsedPhase, "orientation");
          const showTopicSupervisor = phaseActive(parsedPhase, "topic_supervisor");
          const showPlanning = phaseActive(parsedPhase, "planning");
          const showExecution = phaseActive(parsedPhase, "execution");
          const showWriting = phaseActive(parsedPhase, "writing");

          // Collect cards to render based on active phases
          const cards: { key: string; component: React.ReactNode; colSpan?: string; delay: number }[] = [];
          let delay = 0.3;

          // Roadmap: planning, execution, writing
          if (showPlanning || showExecution || showWriting) {
            const roadmapTitle = showPlanning && !showExecution ? "Roadmap (in costruzione)" : "Roadmap";
            cards.push({
              key: "roadmap",
              colSpan: !showTopicSupervisor ? "md:col-span-2 lg:col-span-2" : undefined,
              delay: delay,
              component: (
                <DashboardCard title={roadmapTitle} icon={BarChart3}>
                  <RoadmapCard currentPhase={currentPhase} userId={user?.id || ""} />
                </DashboardCard>
              ),
            });
            delay += 0.05;
          }

          // Supervisors: topic_supervisor phase
          if (showTopicSupervisor) {
            cards.push({
              key: "supervisors",
              delay: delay,
              component: (
                <DashboardCard title="Suggested Supervisors" icon={GraduationCap}>
                  <SupervisorSelection userId={user?.id || ""} selectedId={selectedSupervisorId} onSelect={handleSelectSupervisor} />
                </DashboardCard>
              ),
            });
            delay += 0.05;
          }

          // Career Tree: topic_supervisor phase
          if (showTopicSupervisor) {
            cards.push({
              key: "career-tree",
              colSpan: !showPlanning ? "md:col-span-2" : undefined,
              delay: delay,
              component: (
                <DashboardCard title="Possible Directions" icon={TrendingUp}>
                  <CareerTree sectors={careerSectors} userId={user?.id || ""} loading={careerLoading} />
                </DashboardCard>
              ),
            });
            delay += 0.05;
          }

          // Tasks: always shown
          cards.push({
            key: "tasks",
            delay: delay,
            component: (
              <DashboardCard title="Tasks" icon={Target}>
                <TaskContent userId={user?.id || ""} />
              </DashboardCard>
            ),
          });
          delay += 0.05;

          // Rubrica: all phases
          cards.push({
            key: "rubrica",
            delay: delay,
            component: (
              <DashboardCard title={showTopicSupervisor ? "Interview Partners" : "Contacts"} icon={Users}>
                <ExpertSuggestions userId={user?.id || ""} />
              </DashboardCard>
            ),
          });
          delay += 0.05;

          // References: all phases
          cards.push({
            key: "references",
            delay: delay,
            component: (
              <DashboardCard title="Main References" icon={BookOpen} badge={references.length || null}
                action={{ label: "Update", onClick: fetchReferences, loading: isLoadingRefs }}>
                <ReferencesContent references={references} loading={isLoadingRefs} onRefresh={fetchReferences} userId={user?.id} />
              </DashboardCard>
            ),
          });
          delay += 0.05;

          // Vulnerabilities: execution and writing only
          if (showExecution || showWriting) {
            cards.push({
              key: "vulnerabilities",
              delay: delay,
              component: (
                <DashboardCard title="Vulnerabilities" icon={ShieldAlert} badge={vulnerabilities.length}
                  action={{ label: "Scan", onClick: scanVulnerabilities, loading: isScanning }}>
                  <VulnerabilitiesContent vulnerabilities={vulnerabilities} onResolve={resolveVulnerability} />
                </DashboardCard>
              ),
            });
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
              {cards.map(card => (
                <motion.div key={card.key} className={card.colSpan || ""} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: card.delay }}>
                  {card.component}
                </motion.div>
              ))}
            </div>
          );
        })()}

      </div>

      {/* ─── BOTTOM PHASE STEPPER ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-3 px-6 z-30">
        <div className="flex items-center max-w-3xl mx-auto">
          {PHASES.map((p, i) => {
            const isCompleted = i < currentPhaseIndex && !parsedPhase.isHybrid;
            const isPrimary = i === currentPhaseIndex;
            const isSecondary = parsedPhase.isHybrid && i === secondaryPhaseIndex;
            const isCurrent = isPrimary || isSecondary;
            const isHybridConnector = parsedPhase.isHybrid && i >= Math.min(currentPhaseIndex, secondaryPhaseIndex) && i < Math.max(currentPhaseIndex, secondaryPhaseIndex);
            const isBeforeActive = i < Math.min(currentPhaseIndex, parsedPhase.isHybrid ? secondaryPhaseIndex : currentPhaseIndex);
            return (
              <div key={p.key} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300 ${
                    isBeforeActive ? "bg-foreground text-background"
                      : isCurrent ? "bg-foreground/15 text-foreground border-2 border-foreground/30"
                      : "bg-secondary text-muted-foreground"
                  }`}>
                    {isBeforeActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : p.icon}
                  </div>
                  <span className={`text-[8px] font-medium whitespace-nowrap ${isCurrent ? "text-foreground" : isBeforeActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {p.label}
                  </span>
                  {isPrimary && phaseConfidence > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-10 h-1 rounded-full bg-secondary overflow-hidden">
                        <motion.div className="h-full bg-foreground rounded-full" initial={{ width: 0 }}
                          animate={{ width: `${phaseConfidence}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                      </div>
                      <span className="text-[7px] text-muted-foreground">{Math.round(phaseConfidence)}%</span>
                    </div>
                  )}
                </div>
                {/* Connector */}
                {i < PHASES.length - 1 && (
                  <div className={`flex-1 h-px mx-1.5 transition-colors duration-300 ${
                    isHybridConnector ? "bg-foreground/40"
                    : isBeforeActive ? "bg-foreground/60"
                    : "bg-border"
                  }`}>
                    {isHybridConnector && (
                      <motion.div className="h-full bg-foreground/60 rounded-full"
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
          <button onClick={evaluatePhase} disabled={phaseEvalLoading}
            className="ml-4 p-2 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors disabled:opacity-40 shrink-0"
            title="Evaluate phase">
            {phaseEvalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ─── SOCRATE OVERLAY ─── */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40"
              onClick={closeChat}
            />
            {inputMode === "voice" ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <VoiceConversation
                  onTranscript={(text) => sendMessage(text)}
                  onClose={closeChat}
                  onSwitchToText={switchChatToText}
                  isStreaming={isStreaming}
                  lastAssistantMessage={lastMessage}
                  severity={studentProfile?.severita ?? 0.5}
                  messages={messages}
                  onGenerateReport={generateReport}
                  isGeneratingReport={isGeneratingReport}
                />
              </motion.div>
            ) : (
              <ChatOverlay
                messages={messages}
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                isStreaming={isStreaming}
                onClose={closeChat}
                onSwitchToVoice={switchChatToVoice}
              />
            )}
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
