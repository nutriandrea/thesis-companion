import { DemoPageHeader } from "./DemoShell";
import { Link } from "react-router-dom";
import {
  DEMO_THESIS, DEMO_SUPERVISORS, DEMO_SECTORS, DEMO_VULNERABILITIES,
  DEMO_REFERENCES, DEMO_ROADMAP, DEMO_TASKS,
} from "@/data/demo-mocks";
import { GraduationCap, ShieldAlert, BookOpen, Target, BarChart3, TrendingUp, ArrowRight } from "lucide-react";

function Card({ title, icon: Icon, children }: any) {
  return (
    <div className="border border-border bg-background p-5">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
        <Icon className="w-4 h-4 text-foreground" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function DemoDashboard() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Dashboard" subtitle="Vista d'insieme della tesi" />

      <div className="px-8 py-6 space-y-6">
        <div className="border border-border p-6 bg-secondary/20">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Topic confermato</p>
          <h1 className="text-xl font-bold font-display text-foreground leading-snug">{DEMO_THESIS}</h1>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Prof. Marco Rossi</span>
            <span>·</span>
            <span>Fase: Planning</span>
            <span>·</span>
            <span>Confidence 60%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card title="Supervisori top" icon={GraduationCap}>
            <ul className="space-y-3">
              {DEMO_SUPERVISORS.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-[10px] text-muted-foreground">{s.fields.join(" · ")}</p>
                  </div>
                  <span className="text-xs font-bold text-foreground shrink-0">{s.score}</span>
                </li>
              ))}
            </ul>
            <Link to="../contacts" className="mt-4 flex items-center gap-1 text-[10px] uppercase tracking-widest text-foreground hover:underline">
              Vedi tutti <ArrowRight className="w-3 h-3" />
            </Link>
          </Card>

          <Card title="Career mix" icon={TrendingUp}>
            <ul className="space-y-2">
              {DEMO_SECTORS.map((s) => (
                <li key={s.name}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-foreground">{s.name}</span>
                    <span className="font-bold text-foreground">{s.percentage}%</span>
                  </div>
                  <div className="h-1 bg-secondary">
                    <div className="h-full bg-foreground" style={{ width: `${s.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Vulnerabilità" icon={ShieldAlert}>
            <ul className="space-y-3">
              {DEMO_VULNERABILITIES.map((v) => (
                <li key={v.id}>
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className="text-xs font-semibold text-foreground">{v.title}</p>
                    <span className="text-[9px] uppercase font-bold text-foreground">{v.severity}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{v.description}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Riferimenti" icon={BookOpen}>
            <ul className="space-y-3">
              {DEMO_REFERENCES.slice(0, 4).map((r) => (
                <li key={r.title}>
                  <p className="text-xs font-semibold text-foreground leading-snug">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">{r.authors} · {r.year}</p>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Roadmap" icon={BarChart3}>
            <ul className="space-y-3">
              {DEMO_ROADMAP.map((p) => {
                const done = p.tasks.filter((t) => t.completed).length;
                const pct = Math.round((done / p.tasks.length) * 100);
                return (
                  <li key={p.key}>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-foreground">{p.title}</span>
                      <span className="text-muted-foreground">{done}/{p.tasks.length}</span>
                    </div>
                    <div className="h-1 bg-secondary">
                      <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card title="Task aperti" icon={Target}>
            <ul className="space-y-2">
              {DEMO_TASKS.filter((t) => t.status === "pending").slice(0, 5).map((t) => (
                <li key={t.id} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1 h-1 bg-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-foreground">{t.title}</p>
                    <p className="text-[10px] text-muted-foreground">{t.estimated_minutes} min · {t.priority}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
