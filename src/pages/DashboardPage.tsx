import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { Clock, Target, Calendar, TrendingUp, MessageCircle, Zap, BookOpen, Users, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function DashboardPage() {
  const { roadmap, toggleTask, profile, overallProgress, setActiveSection, user } = useApp();
  const [memoryCount, setMemoryCount] = useState(0);
  const [suggestionCount, setSuggestionCount] = useState(0);

  const totalTasks = roadmap.flatMap(p => p.tasks).length;
  const completedTasks = roadmap.flatMap(p => p.tasks).filter(t => t.completed).length;
  const name = profile?.first_name || "Studente";

  // Find current stage
  const currentPhase = roadmap.find(p => p.progress < 100) || roadmap[roadmap.length - 1];
  const currentPhaseIndex = roadmap.indexOf(currentPhase);

  // Next upcoming tasks (uncompleted, sorted by date)
  const nextTasks = roadmap.flatMap(p => p.tasks.filter(t => !t.completed).map(t => ({ ...t, phase: p.title, phaseId: p.id })))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  // Nearest deadline
  const nextDeadline = nextTasks[0];
  const daysUntilDeadline = nextDeadline
    ? Math.max(0, Math.ceil((new Date(nextDeadline.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Estimated end date
  const endDate = roadmap[roadmap.length - 1]?.endDate;

  // Load counts
  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("memory_entries").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("socrate_suggestions" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([mem, sug]) => {
      setMemoryCount(mem.count || 0);
      setSuggestionCount((sug as any).count || 0);
    });
  }, [user]);

  const stats = [
    { label: "Progresso", value: `${overallProgress}%`, sub: `${completedTasks}/${totalTasks} task`, icon: Target, color: "text-accent" },
    { label: "Fase", value: currentPhase.title, sub: `${currentPhaseIndex + 1} di ${roadmap.length}`, icon: Calendar, color: "text-accent" },
    { label: "Prossima scadenza", value: nextDeadline ? `${daysUntilDeadline}g` : "—", sub: nextDeadline?.title.slice(0, 25) || "", icon: Clock, color: daysUntilDeadline <= 3 ? "text-destructive" : "text-warning" },
    { label: "Consegna", value: endDate ? new Date(endDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "—", sub: "Fine prevista", icon: TrendingUp, color: "text-success" },
  ];

  const quickActions = [
    { label: "Parla con Socrate", icon: MessageCircle, section: "socrate", badge: "AI" },
    { label: "Genera Azioni", icon: Zap, section: "actions", badge: "AI" },
    { label: "Editor LaTeX", icon: BookOpen, section: "editor" },
    { label: "Rubrica", icon: Users, section: "contacts" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Ciao, {name}</h1>
        <p className="text-muted-foreground text-xs mt-1">
          {profile?.thesis_topic
            ? `Stai lavorando su "${profile.thesis_topic}"`
            : "Ecco il punto sulla tua tesi"}
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

      {/* Socrate Insights Banner */}
      {(memoryCount > 0 || suggestionCount > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-accent/5 to-ai/5 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Insights di Socrate</p>
            <p className="text-xs text-muted-foreground mt-0.5">{memoryCount} memorie · {suggestionCount} suggerimenti personalizzati</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveSection("memory")} className="text-xs px-3 py-1.5 rounded-md bg-card border border-border hover:bg-secondary transition-colors">Memoria</button>
            <button onClick={() => setActiveSection("suggestions")} className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">Suggerimenti</button>
          </div>
        </motion.div>
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
