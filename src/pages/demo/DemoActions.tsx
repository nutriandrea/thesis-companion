import { useState } from "react";
import { DemoPageHeader } from "./DemoShell";
import { DEMO_SUPERVISORS, DEMO_TASKS, DEMO_PROFILE } from "@/data/demo-mocks";
import { Mail, Target } from "lucide-react";

function buildEmail(supName: string) {
  return `Gentile ${supName},\n\nmi chiamo ${DEMO_PROFILE.name}, studente al ${DEMO_PROFILE.degree} presso ${DEMO_PROFILE.university}. Sto sviluppando una tesi su "${DEMO_PROFILE.thesis_topic}" e il suo lavoro su LLM applicati al codice è particolarmente affine alla mia direzione di ricerca.\n\nLe scriverei volentieri per un confronto di 20 minuti — sarei felice di condividere il mio outline e capire se ci sono spazi per una co-supervisione.\n\nResto in attesa di un suo riscontro.\nCordialmente,\n${DEMO_PROFILE.name}`;
}

export default function DemoActions() {
  const [selected, setSelected] = useState(DEMO_SUPERVISORS[0].id);
  const sup = DEMO_SUPERVISORS.find((s) => s.id === selected)!;

  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Azioni" subtitle="Email pronte e task del giorno" />
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 border border-border p-6 bg-background">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Bozza email</h3>
          </div>

          <div className="flex gap-2 mb-4 flex-wrap">
            {DEMO_SUPERVISORS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`text-[10px] px-3 py-1.5 border transition-colors ${
                  selected === s.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:bg-secondary"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          <div className="border border-border bg-secondary/30 p-4 text-xs text-foreground font-mono whitespace-pre-wrap leading-relaxed">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">A: {sup.email}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Oggetto: Richiesta confronto su tesi MSc</div>
            {buildEmail(sup.name)}
          </div>

          <button
            onClick={() => navigator.clipboard.writeText(buildEmail(sup.name))}
            className="mt-3 text-[10px] uppercase tracking-widest text-foreground hover:underline"
          >
            Copia testo
          </button>
        </section>

        <section className="border border-border p-6 bg-background">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-widest">Task della settimana</h3>
          </div>
          <ul className="space-y-4">
            {DEMO_TASKS.map((t) => (
              <li key={t.id} className="border-l-2 border-foreground/20 pl-3">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-semibold ${t.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {t.title}
                  </p>
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">{t.priority}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{t.description}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-1">{t.estimated_minutes} min</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
