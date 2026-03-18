import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitBranch, TrendingUp, AlertTriangle, Award, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import topicsData from "@/data/topics.json";
import type { Topic } from "@/types/data";

const topics = (topicsData as Topic[]).slice(0, 6);

interface Scenario {
  topicTitle: string;
  careers: { title: string; probability: number; salary: string }[];
  completionTime: string;
  riskLevel: "basso" | "medio" | "alto";
  impactScore: number;
  publications: number;
  networkGrowth: number;
}

function generateScenario(topic: Topic): Scenario {
  const hash = topic.id.charCodeAt(topic.id.length - 1);
  const riskLevels: ("basso" | "medio" | "alto")[] = ["basso", "medio", "alto"];
  return {
    topicTitle: topic.title,
    careers: [
      { title: "Data Scientist", probability: 60 + (hash % 30), salary: `CHF ${90 + (hash % 40)}k` },
      { title: "Research Scientist", probability: 40 + (hash % 35), salary: `CHF ${80 + (hash % 30)}k` },
      { title: "ML Engineer", probability: 50 + (hash % 25), salary: `CHF ${100 + (hash % 35)}k` },
    ],
    completionTime: `${5 + (hash % 4)} mesi`,
    riskLevel: riskLevels[hash % 3],
    impactScore: 60 + (hash % 35),
    publications: 1 + (hash % 3),
    networkGrowth: 8 + (hash % 15),
  };
}

const riskColors = { basso: "text-success", medio: "text-warning", alto: "text-destructive" };
const riskBg = { basso: "bg-success/10", medio: "bg-warning/10", alto: "bg-destructive/10" };

export default function FuturesPage() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showResults, setShowResults] = useState(false);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const simulate = () => {
    const results = selectedTopics.map(id => generateScenario(topics.find(t => t.id === id)!));
    setScenarios(results);
    setShowResults(true);
  };

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
            {topics.map(topic => (
              <button key={topic.id} onClick={() => toggleTopic(topic.id)}
                className={`text-left p-4 rounded-xl border transition-all ${selectedTopics.includes(topic.id) ? "border-ai bg-ai/5 ring-2 ring-ai/20 shadow-md" : "border-border bg-card hover:border-ai/40"}`}>
                <h3 className="font-semibold text-sm">{topic.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
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
                  <p>⏱ {s.completionTime}</p><p>📄 {s.publications} pubblicazioni</p><p>🤝 +{s.networkGrowth} contatti</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
