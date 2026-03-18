import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { Clock, Target, Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export default function DashboardPage() {
  const { roadmap, toggleTask, profile, overallProgress } = useApp();

  const totalTasks = roadmap.flatMap(p => p.tasks).length;
  const completedTasks = roadmap.flatMap(p => p.tasks).filter(t => t.completed).length;
  const name = profile?.first_name || "Studente";

  const stats = [
    { label: "Progresso", value: `${overallProgress}%`, sub: `${completedTasks}/${totalTasks}`, icon: Target, color: "text-accent" },
    { label: "Stima", value: "15 Set", sub: "In linea", icon: Clock, color: "text-success" },
    { label: "Fase", value: "Esplorazione", sub: "1 di 4", icon: Calendar, color: "text-accent" },
    { label: "Scadenza", value: "5 Apr", sub: "Outline tesi", icon: TrendingUp, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display text-foreground">Ciao, {name}</h1>
        <p className="text-muted-foreground text-xs mt-1">Ecco il punto sulla tua tesi</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold font-display text-foreground">Roadmap</h2>
        {roadmap.map((phase, i) => (
          <motion.div
            key={phase.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-card rounded-lg border border-border p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold font-display text-sm text-foreground">{phase.title}</h3>
                <p className="text-xs text-muted-foreground">{phase.description}</p>
              </div>
              <span className="text-xs font-bold text-accent">{phase.progress}%</span>
            </div>
            <Progress value={phase.progress} className="h-1 mb-3" />
            <div className="space-y-1">
              {phase.tasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 transition-colors cursor-pointer">
                  <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(phase.id, task.id)} />
                  <span className={`text-xs flex-1 ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.title}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(task.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
