import { useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { User, Mail, GraduationCap, Code, Target, CheckCircle2, Circle, LogOut, Save, Loader2, Brain, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import fieldsData from "@/data/fields.json";
import universitiesData from "@/data/universities.json";
import type { Field, University } from "@/types/data";

const fields = fieldsData as Field[];
const universities = universitiesData as University[];

interface StudentProfile {
  reasoning_style: string;
  strengths: string[];
  weaknesses: string[];
  deep_interests: string[];
  research_maturity: string;
  methodology_awareness: string;
  writing_quality: string;
  critical_thinking: string;
  career_interests: string[];
  thesis_stage: string;
  thesis_quality_score: number;
  total_exchanges: number;
  total_extractions: number;
  version: number;
  updated_at: string;
}

const maturityLabels: Record<string, { label: string; color: string; percent: number }> = {
  beginner: { label: "Principiante", color: "text-warning", percent: 20 },
  developing: { label: "In sviluppo", color: "text-accent", percent: 45 },
  intermediate: { label: "Intermedio", color: "text-accent", percent: 70 },
  advanced: { label: "Avanzato", color: "text-success", percent: 95 },
};

export default function ProfilePage() {
  const { profile, roadmap, signOut, updateProfile, user } = useApp();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [formData, setFormData] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    university: profile?.university || "",
    degree: profile?.degree || "",
    thesis_topic: profile?.thesis_topic || "",
    skills: profile?.skills?.join(", ") || "",
  });

  // Load centralized student profile
  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles" as any).select("*").eq("user_id", user.id).single()
      .then(({ data }: any) => { if (data) setStudentProfile(data); });
  }, [user]);

  if (!profile) return null;

  const allTasks = roadmap.flatMap(p => p.tasks);
  const completedTasks = allTasks.filter(t => t.completed);
  const pendingTasks = allTasks.filter(t => !t.completed).slice(0, 5);
  const studentFields = profile.field_ids || [];

  const maturity = maturityLabels[studentProfile?.research_maturity || "beginner"] || maturityLabels.beginner;

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
        <div><h1 className="text-xl font-bold font-display">Profilo</h1><p className="text-sm text-muted-foreground">Dati personali e profilo intellettuale</p></div>
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

        {!editing && profile.skills && profile.skills.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1"><Code className="w-3 h-3" /> Competenze</p>
            <div className="flex flex-wrap gap-1.5">{profile.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
          </div>
        )}

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
      </motion.div>

      {/* Socrate's Intellectual Profile */}
      {studentProfile && studentProfile.reasoning_style && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-ai/5 to-accent/5 border border-ai/20 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-ai" />
            <h2 className="font-bold font-display">Profilo Intellettuale</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">v{studentProfile.version} · {new Date(studentProfile.updated_at).toLocaleDateString("it-IT")}</span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Reasoning Style */}
            <div className="bg-card/50 rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Stile di ragionamento</p>
              <p className="text-sm font-semibold text-foreground capitalize">{studentProfile.reasoning_style}</p>
            </div>

            {/* Research Maturity */}
            <div className="bg-card/50 rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Maturità ricerca</p>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${maturity.color}`}>{maturity.label}</span>
                <Progress value={maturity.percent} className="h-1.5 flex-1" />
              </div>
            </div>

            {/* Thesis Score */}
            <div className="bg-card/50 rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Qualità tesi</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-accent">{studentProfile.thesis_quality_score}</span>
                <span className="text-sm text-muted-foreground">/10</span>
                <Progress value={studentProfile.thesis_quality_score * 10} className="h-1.5 flex-1" />
              </div>
            </div>

            {/* Sessions */}
            <div className="bg-card/50 rounded-lg p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Sessioni con Socrate</p>
              <div className="flex items-center gap-4">
                <div><span className="text-2xl font-bold text-foreground">{studentProfile.total_exchanges}</span><span className="text-xs text-muted-foreground ml-1">scambi</span></div>
                <div><span className="text-2xl font-bold text-ai">{studentProfile.total_extractions}</span><span className="text-xs text-muted-foreground ml-1">analisi</span></div>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {studentProfile.strengths?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-success mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Punti di forza</p>
                <div className="flex flex-wrap gap-1.5">
                  {studentProfile.strengths.map((s, i) => <Badge key={i} variant="secondary" className="text-xs bg-success/10 text-success">{s}</Badge>)}
                </div>
              </div>
            )}
            {studentProfile.weaknesses?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-destructive mb-2 flex items-center gap-1"><Zap className="w-3 h-3" /> Da migliorare</p>
                <div className="flex flex-wrap gap-1.5">
                  {studentProfile.weaknesses.map((w, i) => <Badge key={i} variant="secondary" className="text-xs bg-destructive/10 text-destructive">{w}</Badge>)}
                </div>
              </div>
            )}
          </div>

          {/* Deep Interests */}
          {studentProfile.deep_interests?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-ai mb-2 flex items-center gap-1"><Brain className="w-3 h-3" /> Interessi profondi</p>
              <div className="flex flex-wrap gap-1.5">
                {studentProfile.deep_interests.map((d, i) => <Badge key={i} variant="secondary" className="text-xs bg-ai/10 text-ai">{d}</Badge>)}
              </div>
            </div>
          )}

          {/* Career Interests */}
          {studentProfile.career_interests?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-accent mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Inclinazioni professionali</p>
              <div className="flex flex-wrap gap-1.5">
                {studentProfile.career_interests.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
              </div>
            </div>
          )}

          {/* Qualitative Assessments */}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {studentProfile.methodology_awareness && (
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Metodologia</p>
                <p className="text-xs text-foreground">{studentProfile.methodology_awareness}</p>
              </div>
            )}
            {studentProfile.writing_quality && (
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Qualità scrittura</p>
                <p className="text-xs text-foreground">{studentProfile.writing_quality}</p>
              </div>
            )}
            {studentProfile.critical_thinking && (
              <div className="bg-card/50 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Pensiero critico</p>
                <p className="text-xs text-foreground">{studentProfile.critical_thinking}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-accent">{completedTasks.length}</p>
          <p className="text-xs text-muted-foreground">Completati</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-warning">{pendingTasks.length}</p>
          <p className="text-xs text-muted-foreground">In attesa</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-success">{Math.round((completedTasks.length / Math.max(allTasks.length, 1)) * 100)}%</p>
          <p className="text-xs text-muted-foreground">Progresso</p>
        </motion.div>
      </div>

      {/* Tasks */}
      <div className="grid md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-card border rounded-xl p-5 shadow-sm">
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-card border rounded-xl p-5 shadow-sm">
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
