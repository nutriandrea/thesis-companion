import { DemoPageHeader } from "./DemoShell";
import { DEMO_MARKET, DEMO_SECTORS } from "@/data/demo-mocks";
import { TrendingUp, Briefcase, DollarSign } from "lucide-react";

export default function DemoMarket() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Mercato" subtitle="Dove la tua tesi può atterrare nel mondo reale" />

      <div className="px-8 py-6 space-y-6">
        <section className="border border-border p-6 bg-background">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Distribuzione settoriale della tesi</h3>
          <div className="space-y-3">
            {DEMO_SECTORS.map((s) => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-foreground">{s.name}</span>
                  <span className="font-bold">{s.percentage}%</span>
                </div>
                <div className="h-2 bg-secondary">
                  <div className="h-full bg-foreground" style={{ width: `${s.percentage}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{s.reasoning}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground mb-3">Trend del mercato europeo 2026</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEMO_MARKET.map((m) => (
              <article key={m.sector} className="border border-border p-5 bg-background">
                <h4 className="text-sm font-bold font-display text-foreground">{m.sector}</h4>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Crescita</p>
                    <p className="text-lg font-bold text-foreground">+{m.growth_pct_2026}%</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Ruoli EU</p>
                    <p className="text-lg font-bold text-foreground">{m.open_roles_eu.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" /> Mediana</p>
                    <p className="text-lg font-bold text-foreground">{(m.median_salary_chf / 1000).toFixed(0)}k</p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-border">{m.signal}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
