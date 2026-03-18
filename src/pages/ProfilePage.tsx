import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { User, Mail, GraduationCap, Code, Target, CheckCircle2, Circle, LogOut, Save, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import fieldsData from "@/data/fields.json";
import universitiesData from "@/data/universities.json";
import studyProgramsData from "@/data/study-programs.json";
import type { Field, University, StudyProgram } from "@/types/data";

const fields = fieldsData as Field[];
const universities = universitiesData as University[];
const studyPrograms = studyProgramsData as StudyProgram[];

export default function ProfilePage() {
  const { profile, roadmap, signOut, updateProfile } = useApp();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    university: profile?.university || "",
    degree: profile?.degree || "",
    thesis_topic: profile?.thesis_topic || "",
    skills: profile?.skills?.join(", ") || "",
  });

  if (!profile) return null;

  const allTasks = roadmap.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.completed);
  const pendingTasks = allTasks.filter(t => !t.completed).slice(0, 5);
  const studentFields = profile.field_ids || [];

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      first_name: formData.first_name,
      last_name: formData.last_name,
      university: formData.university,
      degree: formData.degree,
      thesis_topic: formData.thesis_topic,
      skills: formData.skills.split(",").map(s => s.trim()).filter(Boolean),
    });
    setSaving(false);
    setEditing(false);
    toast({ title: "Profilo aggiornato" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><User className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Profilo</h1><p className="text-sm text-muted-foreground">Le tue informazioni e progresso</p></div>
      </div>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xl font-bold font-display shrink-0">
            {profile.first_name?.[0]}{profile.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input value={formData.first_name} onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                    placeholder="Nome" className="bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                  <input value={formData.last_name} onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                    placeholder="Cognome" className="bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                </div>
                <select value={formData.university} onChange={e => setFormData(p => ({ ...p, university: e.target.value }))}
                  className="w-full bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent">
                  <option value="">Seleziona università</option>
                  {universities.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
                <input value={formData.degree} onChange={e => setFormData(p => ({ ...p, degree: e.target.value }))}
                  placeholder="Corso di studi" className="w-full bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                <input value={formData.thesis_topic} onChange={e => setFormData(p => ({ ...p, thesis_topic: e.target.value }))}
                  placeholder="Argomento tesi" className="w-full bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                <input value={formData.skills} onChange={e => setFormData(p => ({ ...p, skills: e.target.value }))}
                  placeholder="Competenze (separate da virgola)" className="w-full bg-secondary border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Salva
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Annulla</Button>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold font-display">{profile.first_name} {profile.last_name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1"><Mail className="w-3.5 h-3.5" /> {profile.email}</div>
                {profile.university && <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1"><GraduationCap className="w-3.5 h-3.5" /> {profile.degree} · {profile.university}</div>}
                {profile.thesis_topic && <p className="text-sm text-muted-foreground mt-3"><strong>Tema:</strong> {profile.thesis_topic}</p>}
              </>
            )}
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Modifica</Button>}
            <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5"><LogOut className="w-3.5 h-3.5" /> Esci</Button>
          </div>
        </div>

        {/* Skills */}
        {!editing && profile.skills && profile.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Code className="w-3 h-3" /> Competenze</p>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
          </div>
        )}

        {/* Fields */}
        {!editing && studentFields.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Target className="w-3 h-3" /> Campi di interesse</p>
            <div className="flex flex-wrap gap-1.5">
              {studentFields.map(fId => {
                const field = fields.find(f => f.id === fId);
                return field ? <Badge key={fId} className="text-xs">{field.name}</Badge> : null;
              })}
            </div>
          </div>
        )}

        {/* Journey State */}
        {!editing && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-1">Stato del percorso</p>
            <Badge variant="default" className="text-xs capitalize">{profile.journey_state.replace("_", " ")}</Badge>
          </div>
        )}
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{completedTasks.length}</p>
          <p className="text-xs text-muted-foreground">Completati</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pendingTasks.length}</p>
          <p className="text-xs text-muted-foreground">In attesa</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{Math.round((completedTasks.length / Math.max(allTasks.length, 1)) * 100)}%</p>
          <p className="text-xs text-muted-foreground">Progresso</p>
        </motion.div>
      </div>

      {/* Tasks */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Prossimi Compiti</h3>
          <div className="space-y-2">
            {pendingTasks.map(task => (
              <div key={task.id} className="flex items-center gap-2 text-sm">
                <Circle className="w-4 h-4 text-warning shrink-0" /><span className="flex-1">{task.title}</span>
                <span className="text-xs text-muted-foreground">{new Date(task.dueDate).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
            {pendingTasks.length === 0 && <p className="text-sm text-muted-foreground">Tutto completato! 🎉</p>}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border rounded-xl p-5 shadow-sm">
          <h3 className="font-semibold font-display mb-3">Completati</h3>
          <div className="space-y-2">
            {completedTasks.slice(0, 5).map(task => (
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
