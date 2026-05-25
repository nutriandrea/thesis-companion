import { DemoPageHeader } from "./DemoShell";
import { DEMO_SUGGESTIONS } from "@/data/demo-mocks";
import { GraduationCap, Lightbulb, Building2, BookOpen } from "lucide-react";

const ICONS: Record<string, any> = { professor: GraduationCap, topic: Lightbulb, company: Building2, book: BookOpen };
const LABELS: Record<string, string> = { professor: "Professore", topic: "Argomento", company: "Azienda", book: "Libro" };

export default function DemoSuggestions() {
  const grouped = DEMO_SUGGESTIONS.reduce((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {} as Record<string, typeof DEMO_SUGGESTIONS>);

  return (
    <div className="min-h-screen">
      <DemoPageHeader title="Suggerimenti" subtitle="Ciò che Socrate ti propone di esplorare" />
      <div className="px-8 py-6 space-y-8">
        {Object.entries(grouped).map(([cat, items]) => {
          const Icon = ICONS[cat];
          return (
            <section key={cat}>
              <h3 className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                <Icon className="w-3 h-3" /> {LABELS[cat]}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((s) => (
                  <article key={s.id} className="border border-border p-5 bg-background">
                    <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1">{s.detail}</p>
                    <p className="text-[11px] text-foreground mt-3 pt-3 border-t border-border italic">{s.reason}</p>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
