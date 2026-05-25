import { DemoPageHeader } from "./DemoShell";
import { DEMO_PATHS } from "@/data/demo-mocks";
import { CheckCircle2 } from "lucide-react";

const DIFF_LABEL: Record<string, string> = { low: "Bassa difficoltà", medium: "Media difficoltà", high: "Alta difficoltà" };

export default function DemoPath() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Percorsi" subtitle="Tre direzioni alternative per la tua tesi" />
      <div className="px-8 py-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {DEMO_PATHS.map((p, i) => (
          <article key={p.id} className="border border-border p-6 bg-background flex flex-col">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Opzione {i + 1} · {DIFF_LABEL[p.difficulty]}</span>
            <h3 className="text-base font-bold font-display text-foreground mt-2 leading-snug">{p.title}</h3>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.summary}</p>

            <ol className="mt-4 space-y-2 flex-1">
              {p.steps.map((s, idx) => (
                <li key={idx} className="flex items-start gap-2 text-[11px] text-foreground">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-foreground/60 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ol>

            <p className="mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground italic">{p.fits}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
