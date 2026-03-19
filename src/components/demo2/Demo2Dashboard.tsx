import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Target, ShieldAlert, Users, GraduationCap, CheckCircle2, Circle,
  MessageCircle, X, BookOpen, ExternalLink, TrendingUp, BarChart3, Building2,
  ChevronRight, Loader2, ArrowRight, Mic,
} from "lucide-react";
import { useDemo2 } from "@/contexts/Demo2Context";
import { useT } from "@/contexts/LanguageContext";
import SocrateCoin from "@/components/shared/SocrateCoin";
import ReactMarkdown from "react-markdown";

// ─── Reusable Card ───
function DCard({ title, icon: Icon, children, badge, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode; badge?: number | null; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg flex flex-col h-full ds-card-hover ${className}`}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
        )}
      </div>
      <div className="px-4 py-2.5 flex-1 overflow-y-auto max-h-[300px]">{children}</div>
    </div>
  );
}

const PHASES = [
  { key: "orientation", label: "Orientamento", icon: "1" },
  { key: "topic_supervisor", label: "Tema & Relatore", icon: "2" },
  { key: "planning", label: "Pianificazione", icon: "3" },
  { key: "execution", label: "Esecuzione", icon: "4" },
  { key: "writing", label: "Scrittura", icon: "5" },
];

const PHASE_KEYS = PHASES.map(p => p.key);

// ─── Task Card ───
function TaskCard() {
  const { tasks, setTasks } = useDemo2();
  const t = useT();
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const active = tasks.filter(t => t.status !== "completed");
  const sorted = [...active].sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));
  const completedCount = tasks.filter(t => t.status === "completed").length;

  const handleComplete = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, status: "completed" } : t));
  };

  const priorityLabel = (p: string) => {
    switch (p) {
      case "critical": return { text: "Critico", cls: "bg-destructive/10 text-destructive" };
      case "high": return { text: "Alto", cls: "bg-warning/10 text-warning" };
      case "medium": return { text: "Medio", cls: "bg-accent/10 text-accent" };
      default: return { text: "Basso", cls: "bg-muted text-muted-foreground" };
    }
  };

  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun task attivo.</p>;

  return (
    <div className="space-y-1.5">
      {sorted.map(task => {
        const pr = priorityLabel(task.priority);
        return (
          <div key={task.id} className="border border-border p-2.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <Circle className={`w-3 h-3 shrink-0 ${task.priority === "critical" ? "text-destructive" : "text-muted-foreground/40"}`} />
              <p className="text-xs font-medium text-foreground flex-1">{task.title}</p>
              <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase ${pr.cls}`}>{pr.text}</span>
            </div>
            <p className="text-[10px] text-muted-foreground pl-5">{task.description}</p>
            <button onClick={() => handleComplete(task.id)}
              className="ml-5 flex items-center gap-1.5 text-[10px] font-medium text-accent hover:text-accent/80">
              <CheckCircle2 className="w-3 h-3" /> Segna come fatto
            </button>
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

// ─── Vulnerabilities Card ───
function VulnCard() {
  const { vulnerabilities, setVulnerabilities } = useDemo2();
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...vulnerabilities].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna vulnerabilità.</p>;

  return (
    <div className="space-y-1.5">
      {sorted.map((v, i) => {
        const color = v.severity === "critical" ? "text-destructive" : v.severity === "high" ? "text-warning" : "text-muted-foreground";
        return (
          <div key={v.id} className={`rounded-lg p-2.5 ${v.severity === "critical" ? "bg-destructive/[0.06]" : "bg-muted/30"}`}>
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-bold mt-0.5 ${color}`}>{i + 1}</span>
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">{v.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{v.description}</p>
              </div>
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 ${color}`} />
            </div>
            <button onClick={() => setVulnerabilities(vulnerabilities.filter(x => x.id !== v.id))}
              className="ml-5 mt-1 text-[10px] text-accent hover:text-accent/80 font-medium">
              Risolvi →
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── References Card ───
function RefCard() {
  const { references } = useDemo2();
  const categoryLabel: Record<string, { text: string; cls: string }> = {
    foundational: { text: "Base", cls: "bg-accent/10 text-accent" },
    methodology: { text: "Metodo", cls: "bg-warning/10 text-warning" },
    recent: { text: "Recente", cls: "bg-green-500/10 text-green-600" },
    contrarian: { text: "Critico", cls: "bg-destructive/10 text-destructive" },
  };

  if (references.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun riferimento.</p>;

  return (
    <div className="space-y-1.5">
      {references.map((ref, i) => {
        const cat = categoryLabel[ref.category] || categoryLabel.foundational;
        return (
          <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/30">
            <BookOpen className="w-3.5 h-3.5 mt-0.5 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{ref.title}</p>
              <p className="text-[10px] text-muted-foreground">{ref.authors}{ref.year ? ` (${ref.year})` : ""}</p>
            </div>
            <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase rounded ${cat.cls}`}>{cat.text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Career Tree ───
function CareerTreeCard() {
  const { careerSectors } = useDemo2();
  const colors = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(142 50% 40%)", "hsl(var(--warning))", "hsl(270 60% 55%)"];
  const sorted = [...careerSectors].sort((a, b) => b.percentage - a.percentage);

  if (sorted.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun settore configurato.</p>;

  return (
    <div className="space-y-3">
      <div className="h-3 rounded-full overflow-hidden flex bg-secondary">
        {sorted.map((s, i) => (
          <motion.div key={s.name} initial={{ width: 0 }} animate={{ width: `${s.percentage}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="h-full" style={{ backgroundColor: colors[i % colors.length] }} />
        ))}
      </div>
      {sorted.map((s, i) => (
        <div key={s.name} className="flex items-center gap-2 p-1.5">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
          <span className="text-[11px] font-medium text-foreground flex-1">{s.name}</span>
          <span className="text-[11px] font-bold text-foreground">{s.percentage}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Supervisors Card ───
function SupervisorsCard() {
  const { supervisors } = useDemo2();
  if (supervisors.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessun supervisore.</p>;
  return (
    <div className="space-y-1.5">
      {supervisors.map(sup => (
        <div key={sup.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50">
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">{sup.name}</p>
            <p className="text-[10px] text-muted-foreground">{sup.fields.join(", ")}</p>
          </div>
          <span className="text-[10px] font-bold text-accent">{sup.score}%</span>
        </div>
      ))}
    </div>
  );
}

// ─── Roadmap Card ───
function RoadmapCardDemo() {
  const { roadmapPhases, setRoadmapPhases } = useDemo2();

  const toggleTask = (phaseIdx: number, taskIdx: number) => {
    const updated = [...roadmapPhases];
    const tasks = [...updated[phaseIdx].tasks];
    tasks[taskIdx] = { ...tasks[taskIdx], completed: !tasks[taskIdx].completed };
    updated[phaseIdx] = { ...updated[phaseIdx], tasks };
    setRoadmapPhases(updated);
  };

  if (roadmapPhases.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">Nessuna roadmap.</p>;

  return (
    <div className="space-y-4">
      {roadmapPhases.map((phase, pi) => {
        const completed = phase.tasks.filter(t => t.completed).length;
        const progress = phase.tasks.length > 0 ? Math.round((completed / phase.tasks.length) * 100) : 0;
        return (
          <div key={phase.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{phase.title}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
            </div>
            <div className="space-y-1 pl-2">
              {phase.tasks.map((task, ti) => (
                <div key={task.id} className="flex items-center gap-2 py-0.5">
                  <button onClick={() => toggleTask(pi, ti)} className="shrink-0">
                    {task.completed ? <CheckCircle2 className="w-3 h-3 text-accent" /> : <Circle className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground" />}
                  </button>
                  <span className={`text-[11px] flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.task_title}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Chat Overlay ───
function Demo2Chat({ onClose }: { onClose: () => void }) {
  const { messages, addMessage, popResponse } = useDemo2();
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;
    addMessage({ id: `u-${Date.now()}`, role: "user", content: text });
    setInput("");
    setIsTyping(true);

    // Simulate typing delay then respond
    setTimeout(() => {
      const response = popResponse();
      addMessage({ id: `a-${Date.now()}`, role: "assistant", content: response });
      setIsTyping(false);
    }, 1200);
  }, [isTyping, addMessage, popResponse]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
      className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <SocrateCoin size={32} interactive={false} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground font-display">Socrate</p>
          <p className="text-[10px] text-muted-foreground">Demo2 — risposte predefinite</p>
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
              <div className="prose prose-sm max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </motion.div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary/50 border border-border rounded-2xl px-4 py-3 flex gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.3s" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.6s" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-border px-5 py-3 flex items-center gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Rispondi a Socrate..." disabled={isTyping}
          className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        <button onClick={() => sendMessage(input)} disabled={!input.trim() || isTyping}
          className="p-2.5 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-30">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// ─── MAIN DEMO2 DASHBOARD ───
export default function Demo2Dashboard() {
  const ctx = useDemo2();
  const t = useT();
  const { profile, careerSectors } = ctx;
  const [chatOpen, setChatOpen] = useState(false);

  const currentPhaseIndex = PHASE_KEYS.indexOf(profile.current_phase);

  // No phase gating — show ALL cards always
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="flex flex-col items-center pt-6 pb-6 shrink-0 relative gap-5">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{profile.first_name} {profile.last_name}</span>
        </div>

        <motion.div className="text-center px-16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-lg font-bold text-foreground font-display">{profile.thesis_topic || "Tesi non definita"}</h1>
          <p className="text-[10px] text-muted-foreground mt-1">{profile.university} — {profile.degree}</p>
        </motion.div>

        <motion.button onClick={() => setChatOpen(true)}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
          <MessageCircle className="w-4 h-4" />
          Parla con Socrate
        </motion.button>
      </div>

      {/* Cards Grid — NO phase gating */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-8 xl:px-16 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <DCard title="Roadmap" icon={BarChart3}>
              <RoadmapCardDemo />
            </DCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <DCard title="Supervisori suggeriti" icon={GraduationCap}>
              <SupervisorsCard />
            </DCard>
          </motion.div>

          <motion.div className="md:col-span-2 lg:col-span-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <DCard title="Direzioni possibili" icon={TrendingUp}>
              <CareerTreeCard />
            </DCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <DCard title="Task" icon={Target}>
              <TaskCard />
            </DCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <DCard title="Riferimenti" icon={BookOpen} badge={ctx.references.length}>
              <RefCard />
            </DCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <DCard title="Vulnerabilità" icon={ShieldAlert} badge={ctx.vulnerabilities.length}>
              <VulnCard />
            </DCard>
          </motion.div>
        </div>
      </div>

      {/* Phase Stepper — clickable, no restrictions */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-3 px-6 z-30">
        <div className="flex items-center max-w-3xl mx-auto">
          {PHASES.map((p, i) => (
            <div key={p.key} className="flex items-center flex-1 last:flex-none">
              <button onClick={() => ctx.setProfile({ ...profile, current_phase: p.key })} className="flex flex-col items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300 cursor-pointer ${
                  i < currentPhaseIndex ? "bg-foreground text-background"
                    : i === currentPhaseIndex ? "bg-foreground/15 text-foreground border-2 border-foreground/30"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}>
                  {i < currentPhaseIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : p.icon}
                </div>
                <span className={`text-[8px] font-medium whitespace-nowrap ${i <= currentPhaseIndex ? "text-foreground" : "text-muted-foreground"}`}>
                  {t(`phase.${p.key}`) || p.label}
                </span>
                {i === currentPhaseIndex && profile.phase_confidence > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-10 h-1 rounded-full bg-secondary overflow-hidden">
                      <motion.div className="h-full bg-foreground rounded-full" initial={{ width: 0 }}
                        animate={{ width: `${profile.phase_confidence}%` }} transition={{ duration: 0.8 }} />
                    </div>
                    <span className="text-[7px] text-muted-foreground">{Math.round(profile.phase_confidence)}%</span>
                  </div>
                )}
              </button>
              {i < PHASES.length - 1 && (
                <div className={`flex-1 h-px mx-1.5 ${i < currentPhaseIndex ? "bg-foreground/60" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chat Overlay */}
      <AnimatePresence>
        {chatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40" onClick={() => setChatOpen(false)} />
            <Demo2Chat onClose={() => setChatOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
