import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import { User, Mail, GraduationCap, Code, Target, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import fieldsData from "@/data/fields.json";
import studyProgramsData from "@/data/study-programs.json";
import universitiesData from "@/data/universities.json";
import type { Field, StudyProgram, University } from "@/types/data";

const fields = fieldsData as Field[];
const programs = studyProgramsData as StudyProgram[];
const universities = universitiesData as University[];

export default function ProfilePage() {
  const { currentStudent, roadmap } = useApp();

  const program = programs.find(p => p.id === currentStudent.studyProgramId);
  const uni = universities.find(u => u.id === currentStudent.universityId);
  const studentFields = currentStudent.fieldIds.map(id => fields.find(f => f.id === id)?.name).filter(Boolean);

  const allTasks = roadmap.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.completed);
  const pendingTasks = allTasks.filter(t => !t.completed).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><User className="w-5 h-5 text-accent" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Profilo</h1>
          <p className="text-sm text-muted-foreground">Le tue informazioni e compiti</p>
        </div>
      </div>

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl font-bold font-display">
            {currentStudent.firstName[0]}{currentStudent.lastName[0]}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold font-display">{currentStudent.firstName} {currentStudent.lastName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="w-3.5 h-3.5" /> {currentStudent.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <GraduationCap className="w-3.5 h-3.5" />
              {program?.name} · {uni?.name}
            </div>
            {currentStudent.about && (
              <p className="text-sm text-muted-foreground mt-3">{currentStudent.about}</p>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Code className="w-3 h-3" /> Competenze</p>
            <div className="flex flex-wrap gap-1.5">
              {currentStudent.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> Ambiti</p>
            <div className="flex flex-wrap gap-1.5">
              {studentFields.map(f => <Badge key={f} className="text-xs">{f}</Badge>)}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tasks */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Prossimi Compiti</h3>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <Circle className="w-4 h-4 text-warning shrink-0" />
                <span className="flex-1">{task.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Compiti Completati</h3>
          <div className="space-y-2">
            {completedTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                <span className="line-through">{task.title}</span>
              </div>
            ))}
            {completedTasks.length === 0 && <p className="text-sm text-muted-foreground">Nessun compito completato ancora</p>}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
