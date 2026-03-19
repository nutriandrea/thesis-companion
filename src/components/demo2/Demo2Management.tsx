import { useState } from "react";
import { useDemo2, Demo2Task, Demo2Vulnerability, Demo2Reference, Demo2CareerSector, Demo2RoadmapPhase, Demo2Supervisor } from "@/contexts/Demo2Context";
import { Plus, Trash2, Save, Settings } from "lucide-react";
import { useT } from "@/contexts/LanguageContext";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-2 px-4 py-3 bg-secondary/30 text-left">
        <span className="text-xs font-bold text-foreground uppercase tracking-wider flex-1">{title}</span>
        <span className="text-xs text-muted-foreground">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function InputField({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3}
          className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)}
          className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
      )}
    </div>
  );
}

const PHASES = ["orientation", "topic_supervisor", "planning", "execution", "writing"];

export default function Demo2Management() {
  const ctx = useDemo2();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4 overflow-y-auto h-full pb-20">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-foreground font-display">Demo2 — Pannello di Gestione</h1>
      </div>

      {/* Profile */}
      <Section title="Profilo Studente">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Nome" value={ctx.profile.first_name} onChange={v => ctx.setProfile({ ...ctx.profile, first_name: v })} />
          <InputField label="Cognome" value={ctx.profile.last_name} onChange={v => ctx.setProfile({ ...ctx.profile, last_name: v })} />
          <InputField label="Università" value={ctx.profile.university} onChange={v => ctx.setProfile({ ...ctx.profile, university: v })} />
          <InputField label="Corso" value={ctx.profile.degree} onChange={v => ctx.setProfile({ ...ctx.profile, degree: v })} />
          <div className="col-span-2">
            <InputField label="Tema tesi" value={ctx.profile.thesis_topic} onChange={v => ctx.setProfile({ ...ctx.profile, thesis_topic: v })} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Fase corrente</label>
            <select value={ctx.profile.current_phase} onChange={e => ctx.setProfile({ ...ctx.profile, current_phase: e.target.value })}
              className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent">
              {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <InputField label="Confidenza fase (%)" value={String(ctx.profile.phase_confidence)}
            onChange={v => ctx.setProfile({ ...ctx.profile, phase_confidence: Number(v) || 0 })} />
        </div>
      </Section>

      {/* Socrate Responses */}
      <Section title="Risposte di Socrate (coda)">
        <p className="text-[10px] text-muted-foreground mb-2">Socrate risponderà ciclicamente con queste frasi.</p>
        {ctx.socrateResponses.map((r, i) => (
          <div key={i} className="flex gap-2">
            <textarea value={r} onChange={e => {
              const updated = [...ctx.socrateResponses];
              updated[i] = e.target.value;
              ctx.setSocrateResponses(updated);
            }} rows={2} className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
            <button onClick={() => ctx.setSocrateResponses(ctx.socrateResponses.filter((_, j) => j !== i))}
              className="p-2 text-destructive hover:bg-destructive/10 rounded-md transition-colors shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button onClick={() => ctx.setSocrateResponses([...ctx.socrateResponses, "New response..."])}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi risposta
        </button>
      </Section>

      {/* Tasks */}
      <Section title="Task">
        {ctx.tasks.map((task, i) => (
          <div key={task.id} className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={task.title} onChange={e => {
                const updated = [...ctx.tasks];
                updated[i] = { ...task, title: e.target.value };
                ctx.setTasks(updated);
              }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <select value={task.priority} onChange={e => {
                const updated = [...ctx.tasks];
                updated[i] = { ...task, priority: e.target.value };
                ctx.setTasks(updated);
              }} className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground">
                {["critical", "high", "medium", "low"].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <button onClick={() => ctx.setTasks(ctx.tasks.filter((_, j) => j !== i))}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea value={task.description} onChange={e => {
              const updated = [...ctx.tasks];
              updated[i] = { ...task, description: e.target.value };
              ctx.setTasks(updated);
            }} rows={2} className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
          </div>
        ))}
        <button onClick={() => ctx.setTasks([...ctx.tasks, {
          id: `t${Date.now()}`, title: "New task", description: "Description...",
          section: "planning", priority: "medium", estimated_minutes: 30, status: "pending",
        }])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi task
        </button>
      </Section>

      {/* Vulnerabilities */}
      <Section title="Vulnerabilità">
        {ctx.vulnerabilities.map((v, i) => (
          <div key={v.id} className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={v.title} onChange={e => {
                const updated = [...ctx.vulnerabilities];
                updated[i] = { ...v, title: e.target.value };
                ctx.setVulnerabilities(updated);
              }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <select value={v.severity} onChange={e => {
                const updated = [...ctx.vulnerabilities];
                updated[i] = { ...v, severity: e.target.value };
                ctx.setVulnerabilities(updated);
              }} className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground">
                {["critical", "high", "medium", "low"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <button onClick={() => ctx.setVulnerabilities(ctx.vulnerabilities.filter((_, j) => j !== i))}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea value={v.description} onChange={e => {
              const updated = [...ctx.vulnerabilities];
              updated[i] = { ...v, description: e.target.value };
              ctx.setVulnerabilities(updated);
            }} rows={2} className="w-full bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
          </div>
        ))}
        <button onClick={() => ctx.setVulnerabilities([...ctx.vulnerabilities, {
          id: `v${Date.now()}`, type: "general", title: "New vulnerability",
          description: "Description...", severity: "medium",
        }])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi vulnerabilità
        </button>
      </Section>

      {/* References */}
      <Section title="Riferimenti">
        {ctx.references.map((ref, i) => (
          <div key={i} className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input value={ref.title} onChange={e => {
                const updated = [...ctx.references];
                updated[i] = { ...ref, title: e.target.value };
                ctx.setReferences(updated);
              }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
              <select value={ref.category} onChange={e => {
                const updated = [...ctx.references];
                updated[i] = { ...ref, category: e.target.value };
                ctx.setReferences(updated);
              }} className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground">
                {["foundational", "methodology", "recent", "contrarian"].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={() => ctx.setReferences(ctx.references.filter((_, j) => j !== i))}
                className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input value={ref.authors} onChange={e => {
                const updated = [...ctx.references];
                updated[i] = { ...ref, authors: e.target.value };
                ctx.setReferences(updated);
              }} placeholder="Authors" className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
              <input value={ref.year || ""} onChange={e => {
                const updated = [...ctx.references];
                updated[i] = { ...ref, year: e.target.value };
                ctx.setReferences(updated);
              }} placeholder="Year" className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
              <input value={ref.url} onChange={e => {
                const updated = [...ctx.references];
                updated[i] = { ...ref, url: e.target.value };
                ctx.setReferences(updated);
              }} placeholder="URL" className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
            </div>
          </div>
        ))}
        <button onClick={() => ctx.setReferences([...ctx.references, {
          title: "New reference", authors: "Author", year: "2024",
          url: "https://example.com", category: "foundational", relevance: "Relevant because...",
        }])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi riferimento
        </button>
      </Section>

      {/* Career Sectors */}
      <Section title="Settori Carriera">
        {ctx.careerSectors.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <input value={s.name} onChange={e => {
              const updated = [...ctx.careerSectors];
              updated[i] = { ...s, name: e.target.value };
              ctx.setCareerSectors(updated);
            }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
            <input value={String(s.percentage)} onChange={e => {
              const updated = [...ctx.careerSectors];
              updated[i] = { ...s, percentage: Number(e.target.value) || 0 };
              ctx.setCareerSectors(updated);
            }} className="w-16 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none text-center" />
            <span className="text-xs text-muted-foreground">%</span>
            <button onClick={() => ctx.setCareerSectors(ctx.careerSectors.filter((_, j) => j !== i))}
              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={() => ctx.setCareerSectors([...ctx.careerSectors, { name: "New sector", percentage: 10 }])}
          className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi settore
        </button>
      </Section>

      {/* Supervisors */}
      <Section title="Supervisori">
        {ctx.supervisors.map((sup, i) => (
          <div key={sup.id} className="flex items-center gap-2">
            <input value={sup.name} onChange={e => {
              const updated = [...ctx.supervisors];
              updated[i] = { ...sup, name: e.target.value };
              ctx.setSupervisors(updated);
            }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
            <input value={sup.fields.join(", ")} onChange={e => {
              const updated = [...ctx.supervisors];
              updated[i] = { ...sup, fields: e.target.value.split(",").map(s => s.trim()) };
              ctx.setSupervisors(updated);
            }} placeholder="Fields" className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
            <input value={String(sup.score)} onChange={e => {
              const updated = [...ctx.supervisors];
              updated[i] = { ...sup, score: Number(e.target.value) || 0 };
              ctx.setSupervisors(updated);
            }} className="w-16 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none text-center" />
            <button onClick={() => ctx.setSupervisors(ctx.supervisors.filter((_, j) => j !== i))}
              className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        <button onClick={() => ctx.setSupervisors([...ctx.supervisors, {
          id: `sup${Date.now()}`, name: "Prof. New", fields: ["Field"], score: 70,
        }])} className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 font-medium">
          <Plus className="w-3.5 h-3.5" /> Aggiungi supervisore
        </button>
      </Section>

      {/* Roadmap */}
      <Section title="Roadmap">
        {ctx.roadmapPhases.map((phase, pi) => (
          <div key={phase.key} className="border border-border rounded-md p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent uppercase">{phase.title}</span>
              <div className="flex-1" />
            </div>
            {phase.tasks.map((task, ti) => (
              <div key={task.id} className="flex items-center gap-2">
                <input type="checkbox" checked={task.completed} onChange={e => {
                  const updated = [...ctx.roadmapPhases];
                  updated[pi] = { ...phase, tasks: phase.tasks.map((t, j) => j === ti ? { ...t, completed: e.target.checked } : t) };
                  ctx.setRoadmapPhases(updated);
                }} className="shrink-0" />
                <input value={task.task_title} onChange={e => {
                  const updated = [...ctx.roadmapPhases];
                  updated[pi] = { ...phase, tasks: phase.tasks.map((t, j) => j === ti ? { ...t, task_title: e.target.value } : t) };
                  ctx.setRoadmapPhases(updated);
                }} className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground focus:outline-none" />
                <button onClick={() => {
                  const updated = [...ctx.roadmapPhases];
                  updated[pi] = { ...phase, tasks: phase.tasks.filter((_, j) => j !== ti) };
                  ctx.setRoadmapPhases(updated);
                }} className="p-1 text-destructive hover:bg-destructive/10 rounded-md transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => {
              const updated = [...ctx.roadmapPhases];
              updated[pi] = { ...phase, tasks: [...phase.tasks, { id: `r${Date.now()}`, task_title: "New task", completed: false }] };
              ctx.setRoadmapPhases(updated);
            }} className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 font-medium">
              <Plus className="w-3 h-3" /> Aggiungi task
            </button>
          </div>
        ))}
      </Section>
    </div>
  );
}
