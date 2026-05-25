import { DemoPageHeader } from "./DemoShell";
import { DEMO_PROFILE } from "@/data/demo-mocks";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-1">{value}</p>
    </div>
  );
}

export default function DemoProfile() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Profilo" subtitle="I dati che Socrate usa per personalizzarti tutto" />
      <div className="px-8 py-6 max-w-3xl space-y-6">
        <section className="border border-border p-6 bg-background">
          <div className="flex items-center gap-4 mb-6 pb-4 border-b border-border">
            <div className="w-16 h-16 bg-foreground text-background flex items-center justify-center text-xl font-bold font-display">
              {DEMO_PROFILE.first_name[0]}{DEMO_PROFILE.last_name[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold font-display text-foreground">{DEMO_PROFILE.name}</h3>
              <p className="text-xs text-muted-foreground">{DEMO_PROFILE.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <Field label="Università" value={DEMO_PROFILE.university} />
            <Field label="Corso di studi" value={DEMO_PROFILE.degree} />
            <Field label="Laurea prevista" value={DEMO_PROFILE.expected_graduation} />
            <Field label="Fase attuale" value="Planning" />
          </div>
        </section>

        <section className="border border-border p-6 bg-background">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Topic di tesi</h4>
          <p className="text-sm text-foreground leading-relaxed">{DEMO_PROFILE.thesis_topic}</p>
        </section>

        <section className="border border-border p-6 bg-background">
          <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Competenze</h4>
          <div className="flex flex-wrap gap-2">
            {DEMO_PROFILE.skills.map((s) => (
              <span key={s} className="text-[11px] px-2.5 py-1 bg-secondary border border-border text-foreground">{s}</span>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4">
          <section className="border border-border p-5 bg-background">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Punti di forza</h4>
            <ul className="space-y-1">
              {DEMO_PROFILE.strengths.map((s) => (
                <li key={s} className="text-xs text-foreground">— {s}</li>
              ))}
            </ul>
          </section>
          <section className="border border-border p-5 bg-background">
            <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Aree di crescita</h4>
            <ul className="space-y-1">
              {DEMO_PROFILE.weaknesses.map((s) => (
                <li key={s} className="text-xs text-foreground">— {s}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
