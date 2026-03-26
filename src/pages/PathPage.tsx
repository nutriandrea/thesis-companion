import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Route, GraduationCap, Building2, Users, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useAffinityScores, useSocrateSuggestions } from "@/hooks/useSocrateSuggestions";
import { useDatabaseFilter } from "@/hooks/useDatabaseFilter";
import GenerationProgress from "@/components/shared/GenerationProgress";

export default function PathPage() {
  const { user } = useApp();
  const { affinities: supervisors } = useAffinityScores(user?.id, "supervisor");
  const { affinities: topics } = useAffinityScores(user?.id, "topic");
  const { affinities: companies } = useAffinityScores(user?.id, "company");
  const { affinities: experts } = useAffinityScores(user?.id, "expert");
  const { filterDatabase, loading: generating } = useDatabaseFilter();

  const paths = useMemo(() => {
    if (topics.length === 0) return [];
    return topics.slice(0, 4).map((topic, i) => {
      const sup = supervisors[i % supervisors.length] || null;
      const company = companies[i % companies.length] || null;
      const expert = experts[i % experts.length] || null;
      return {
        id: topic.entity_id,
        title: topic.entity_name,
        description: topic.reasoning,
        matchScore: topic.score,
        supervisor: sup ? { name: sup.entity_name, score: sup.score } : null,
        company: company ? { name: company.entity_name } : null,
        expert: expert ? { name: expert.entity_name } : null,
        traits: topic.matched_traits || [],
        steps: [
          sup ? `Contatta ${sup.entity_name}` : "Cerca un relatore",
          company ? `Collaborazione con ${company.entity_name}` : "Cerca partner industriale",
          "Literature review iniziale",
          "Definisci metodologia",
          expert ? `Incontro con ${expert.entity_name}` : "Cerca mentori",
          "Fase sperimentale",
        ],
      };
    });
  }, [topics, supervisors, companies, experts]);

  if (topics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10"><Route className="w-5 h-5 text-success" /></div>
          <div><h1 className="text-xl font-bold font-display">Percorsi Personalizzati</h1><p className="text-sm text-muted-foreground">Roadmap ottimizzate per te</p></div>
        </div>
        <div className="text-center py-12 space-y-4">
          <Route className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nessun percorso generato ancora.</p>
          <Button onClick={() => filterDatabase()} disabled={generating} className="gap-2">
            <Sparkles className="w-4 h-4" /> {generating ? "Generando..." : "Genera con Socrate"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><Route className="w-5 h-5 text-success" /></div>
        <div><h1 className="text-xl font-bold font-display">Percorsi Personalizzati</h1><p className="text-sm text-muted-foreground">Roadmap ottimizzate per te</p></div>
      </div>
      <div className="space-y-4">
        {paths.map((path, i) => (
          <motion.div key={path.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Badge variant="secondary" className="text-[10px] mb-2">Percorso {i + 1}</Badge>
                <h3 className="font-bold font-display text-lg leading-tight">{path.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{path.description}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-3xl font-bold text-accent">{path.matchScore}%</p>
                <p className="text-xs text-muted-foreground">match</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {path.supervisor && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                  <GraduationCap className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Supervisore</p><p className="text-sm font-medium truncate">{path.supervisor.name}</p></div>
                </div>
              )}
              {path.company && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/10">
                  <Building2 className="w-4 h-4 text-success shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Azienda</p><p className="text-sm font-medium truncate">{path.company.name}</p></div>
                </div>
              )}
              {path.expert && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ai/5 border border-ai/10">
                  <Users className="w-4 h-4 text-ai shrink-0" />
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">Esperto</p><p className="text-sm font-medium truncate">{path.expert.name}</p></div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {path.steps.map((step, j) => (
                <div key={j} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">{j + 1}</div>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            {path.traits.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t">
                {path.traits.map((t: string) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
