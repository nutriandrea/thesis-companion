import { DemoPageHeader } from "./DemoShell";
import { DEMO_MEMORY } from "@/data/demo-mocks";
import { CheckCircle2, Lightbulb, Flag, AlertTriangle } from "lucide-react";

const ICONS: Record<string, any> = {
  decision: Flag,
  insight: Lightbulb,
  milestone: CheckCircle2,
  blocker: AlertTriangle,
};
const LABELS: Record<string, string> = {
  decision: "Decisione",
  insight: "Intuizione",
  milestone: "Milestone",
  blocker: "Blocker",
};

export default function DemoMemory() {
  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Memoria" subtitle="Traccia delle decisioni e degli insight nel tempo" />
      <div className="px-8 py-6 max-w-3xl">
        <ol className="relative border-l border-border ml-3 space-y-6">
          {DEMO_MEMORY.map((m) => {
            const Icon = ICONS[m.type];
            return (
              <li key={m.id} className="ml-6">
                <span className="absolute -left-3 flex items-center justify-center w-6 h-6 bg-background border border-border">
                  <Icon className="w-3 h-3 text-foreground" />
                </span>
                <div className="border border-border p-4 bg-background">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{LABELS[m.type]}</span>
                    <time className="text-[10px] text-muted-foreground">{new Date(m.date).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}</time>
                  </div>
                  <h4 className="text-sm font-semibold text-foreground">{m.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-1">{m.detail}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
