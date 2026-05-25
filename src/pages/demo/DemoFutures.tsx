import { DemoPageHeader } from "./DemoShell";
import { DEMO_FUTURES } from "@/data/demo-mocks";
import { Compass, ArrowRight } from "lucide-react";

export default function DemoFutures() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Futuro" subtitle="Scenari what-if a partire dalla tesi" />
      <div className="px-8 py-6 space-y-4">
        {DEMO_FUTURES.map((f) => (
          <article key={f.id} className="border border-border p-6 bg-background">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Compass className="w-4 h-4 text-foreground" />
                  <h3 className="text-base font-bold font-display text-foreground">{f.scenario}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>

                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Mosse da fare ora</p>
                  <ul className="space-y-1.5">
                    {f.steps_now.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11px] text-foreground">
                        <ArrowRight className="w-3 h-3 mt-0.5 text-foreground/50 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Probabilità</p>
                <p className="text-3xl font-bold font-display text-foreground">{f.probability}%</p>
                <div className="mt-2 w-24 h-1 bg-secondary">
                  <div className="h-full bg-foreground" style={{ width: `${f.probability}%` }} />
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
