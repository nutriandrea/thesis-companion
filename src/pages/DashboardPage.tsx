import { useApp } from "@/contexts/AppContext";
import StatCard from "@/components/shared/StatCard";
import { motion } from "framer-motion";
import { Clock, Target, CheckCircle2, Calendar, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

export default function DashboardPage() {
  const { roadmap, toggleTask, profile } = useApp();

  const totalTasks = roadmap.flatMap(p => p.tasks).length;
  const completedTasks = roadmap.flatMap(p => p.tasks).filter(t => t.completed).length;
  const overallProgress = Math.round((completedTasks / totalTasks) * 100);
  const totalDays = 199;
  const elapsedDays = 17;
  const expectedProgress = Math.round((elapsedDays / totalDays) * 100);
  const pace = overallProgress >= expectedProgress ? "In linea" : "In ritardo";
  const estimatedCompletion = overallProgress >= expectedProgress ? "15 Set 2026" : "28 Set 2026";
  const name = profile?.first_name || "Studente";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Ciao, {name} 👋</h1>
        <p className="text-muted-foreground text-sm mt-1">Ecco il punto sulla tua tesi</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Progresso Totale" value={`${overallProgress}%`} subtitle={`${completedTasks}/${totalTasks} compiti`} icon={Target} color="accent" />
        <StatCard title="Stima Completamento" value={estimatedCompletion} subtitle={pace} icon={Clock} color={overallProgress >= expectedProgress ? "success" : "warning"} />
        <StatCard title="Fase Attuale" value="Esplorazione" subtitle="Fase 1 di 4" icon={Calendar} color="ai" />
        <StatCard title="Prossima Scadenza" value="5 Apr" subtitle="Outline struttura tesi" icon={TrendingUp} color="warning" />
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-bold font-display">Roadmap Tesi</h2>
        {roadmap.map((phase, i) => (
          <motion.div key={phase.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold font-display text-lg">{phase.title}</h3>
                <p className="text-sm text-muted-foreground">{phase.description}</p>
              </div>
              <span className="text-sm font-medium text-accent">{phase.progress}%</span>
            </div>
            <Progress value={phase.progress} className="h-2 mb-4" />
            <div className="space-y-2">
              {phase.tasks.map(task => (
                <label key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(phase.id, task.id)} />
                  <span className={`text-sm flex-1 ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>
                  <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
                </label>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
