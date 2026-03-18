import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { User, Mail, GraduationCap, Code, Target, CheckCircle2, Circle, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { profile, roadmap, signOut } = useApp();
  if (!profile) return null;

  const allTasks = roadmap.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.completed);
  const pendingTasks = allTasks.filter(t => !t.completed).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><User className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Profilo</h1><p className="text-sm text-muted-foreground">Le tue informazioni e compiti</p></div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl font-bold font-display">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold font-display">{profile.first_name} {profile.last_name}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1"><Mail className="w-3.5 h-3.5" /> {profile.email}</div>
            {profile.university && <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1"><GraduationCap className="w-3.5 h-3.5" /> {profile.degree} · {profile.university}</div>}
            {profile.thesis_topic && <p className="text-sm text-muted-foreground mt-3"><strong>Tema:</strong> {profile.thesis_topic}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5"><LogOut className="w-3.5 h-3.5" /> Esci</Button>
        </div>
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Code className="w-3 h-3" /> Competenze</p>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
          </div>
        )}
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Prossimi Compiti</h3>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <Circle className="w-4 h-4 text-warning shrink-0" /><span className="flex-1">{task.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Completati</h3>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" /><span className="line-through">{task.title}</span>
              </div>
            ))}
            {completedTasks.length === 0 && <p className="text-sm text-muted-foreground">Nessun compito completato</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
