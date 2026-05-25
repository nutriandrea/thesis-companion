import { DemoPageHeader } from "./DemoShell";
import { DEMO_SUPERVISORS, DEMO_EXPERTS } from "@/data/demo-mocks";
import { Mail, GraduationCap, Building2 } from "lucide-react";

function Row({ name, sub, badge, email, reasoning, icon: Icon }: any) {
  return (
    <div className="border border-border p-5 bg-background hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-secondary border border-border">
            <Icon className="w-4 h-4 text-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <p className="text-[11px] text-muted-foreground">{sub}</p>
          </div>
        </div>
        <span className="text-2xl font-bold font-display text-foreground shrink-0">{badge}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">{reasoning}</p>
      <a href={`mailto:${email}`} className="mt-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-foreground hover:underline">
        <Mail className="w-3 h-3" /> {email}
      </a>
    </div>
  );
}

export default function DemoContacts() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Contatti" subtitle="Supervisori e interlocutori industriali" />
      <div className="px-8 py-6 space-y-8">
        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Supervisori accademici</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_SUPERVISORS.map((s) => (
              <Row key={s.id} name={s.name} sub={`${s.university} · ${s.fields.join(", ")}`} badge={s.score} email={s.email} reasoning={s.reasoning} icon={GraduationCap} />
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Esperti & industria</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_EXPERTS.map((e) => (
              <Row key={e.id} name={e.name} sub={e.title} badge={e.score} email={e.email} reasoning={e.reasoning} icon={Building2} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
