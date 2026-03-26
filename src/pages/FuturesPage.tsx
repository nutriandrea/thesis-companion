import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, TrendingUp, AlertTriangle, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useApp } from "@/contexts/AppContext";
import { useAffinityScores } from "@/hooks/useSocrateSuggestions";
import { useDatabaseFilter } from "@/hooks/useDatabaseFilter";

interface Scenario {
  topicTitle: string;
  careers: { title: string; probability: number; salary: string }[];
  completionTime: string;
  riskLevel: "low" | "medium" | "high";
  impactScore: number;
  publications: number;
  networkGrowth: number;
}

function generateScenario(name: string, score: number): Scenario {
  const hash = name.charCodeAt(name.length - 1) || 65;
  const riskLevels: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
  return {
    topicTitle: name,
    careers: [
      { title: "Data Scientist", probability: Math.min(95, score + (hash % 10)), salary: `CHF ${90 + (hash % 40)}k` },
      { title: "Research Scientist", probability: Math.min(90, score - 10 + (hash % 15)), salary: `CHF ${80 + (hash % 30)}k` },
      { title: "ML Engineer", probability: Math.min(90, score - 5 + (hash % 12)), salary: `CHF ${100 + (hash % 35)}k` },
    ],
    completionTime: `${5 + (hash % 4)} mesi`,
    riskLevel: riskLevels[hash % 3],
    impactScore: Math.min(100, score + (hash % 15)),
    publications: 1 + (hash % 3),
    networkGrowth: 8 + (hash % 15),
  };
}

const riskColors: Record<string, string> = { low: "text-success", medium: "text-warning", high: "text-destructive" };
const riskBg: Record<string, string> = { low: "bg-success/10", medium: "bg-warning/10", high: "bg-destructive/10" };

export default function FuturesPage() {
  const { user } = useApp();
  const { affinities: topics } = useAffinityScores(user?.id, "topic");
  const { filterDatabase, loading: generating } = useDatabaseFilter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showResults, setShowResults] = useState(false);

  const availableTopics = useMemo(() => topics.slice(0, 6), [topics]);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const simulate = () => {
    const results = selectedTopics.map(id => {
      const topic = availableTopics.find(t => t.entity_id === id)!;
      return generateScenario(topic.entity_name, topic.score);
    });
    setScenarios(results);
    setShowResults(true);
  };

  if (availableTopics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-ai/10"><GitBranch className="w-5 h-5 text-ai" /></div>
          <div><h1 className="text-xl font-bold font-display">Futuri Alternativi</h1><p className="text-sm text-muted-foreground">Simula scenari "what-if"</p></div>
        </div>
        <div className="text-center py-12 space-y-4">
          <GitBranch className="w-10 h-10 mx-auto text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nessun argomento disponibile. Genera raccomandazioni prima.</p>
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
        <div className="p-2 rounded-lg bg-ai/10"><GitBranch className="w-5 h-5 text-ai" /></div>
        <div><h1 className="text-xl font-bold font-display">Futuri Alternativi</h1><p className="text-sm text-muted-foreground">Simula scenari "what-if"</p></div>
      </div>
      {!showResults ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Seleziona fino a 3 argomenti per confrontare:</p>
          <div className="grid gap-3 md:grid-cols-2">
            {availableTopics.map(topic => (
              <button key={topic.entity_id} onClick={() => toggleTopic(topic.entity_id)}
                className={`text-left p-4 rounded-xl border transition-all ${selectedTopics.includes(topic.entity_id) ? "border-ai bg-ai/5 ring-2 ring-ai/20 shadow-md" : "border-border bg-card hover:border-ai/40"}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">{topic.entity_name}</h3>
                  <span className="text-[10px] font-bold text-accent">{topic.score}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.reasoning}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="ai" onClick={simulate} disabled={selectedTopics.length < 2} className="gap-2"><Sparkles className="w-4 h-4" /> Simula</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Button variant="outline" onClick={() => { setShowResults(false); setSelectedTopics([]); }}>← Nuova simulazione</Button>
          <div className="grid gap-4 lg:grid-cols-3 md:grid-cols-2">
            {scenarios.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
                className="bg-card border rounded-xl p-5 shadow-sm space-y-4">
                <div><Badge variant="secondary" className="text-[10px] mb-2">Scenario {i + 1}</Badge><h3 className="font-semibold font-display text-sm leading-tight">{s.topicTitle}</h3></div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Carriere</p>
                  {s.careers.map(c => (<div key={c.title} className="mb-2"><div className="flex justify-between text-xs mb-0.5"><span>{c.title}</span><span className="font-medium">{c.probability}%</span></div><Progress value={c.probability} className="h-1.5" /><p className="text-[10px] text-muted-foreground mt-0.5">{c.salary}</p></div>))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-[10px] font-medium text-muted-foreground mb-1"><AlertTriangle className="w-2.5 h-2.5 inline" /> Rischio</p><span className={`text-sm font-semibold px-2 py-0.5 rounded ${riskBg[s.riskLevel]} ${riskColors[s.riskLevel]}`}>{s.riskLevel}</span></div>
                  <div><p className="text-[10px] font-medium text-muted-foreground mb-1"><Award className="w-2.5 h-2.5 inline" /> Impatto</p><span className="text-sm font-semibold">{s.impactScore}/100</span></div>
                </div>
                <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                  <p>{s.completionTime}</p><p>{s.publications} pubblicazioni</p><p>+{s.networkGrowth} contatti</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
