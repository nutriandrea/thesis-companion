import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Search, Building2, GraduationCap, Briefcase, Sparkles, Loader2, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useSocrateSuggestions, useAffinityScores } from "@/hooks/useSocrateSuggestions";
import { useDatabaseFilter } from "@/hooks/useDatabaseFilter";
import { mockCareers } from "@/data/mock-market";
import { Progress } from "@/components/ui/progress";

type TabType = "topics" | "companies" | "careers" | "socrate";

export default function MarketPage() {
  const { profile, user, setActiveSection } = useApp();
  const [tab, setTab] = useState<TabType>("topics");
  const [search, setSearch] = useState("");

  // All data from DB (LLM-generated)
  const { suggestions: marketSuggestions } = useSocrateSuggestions(user?.id, ["company", "career"]);
  const { affinities: topicAffinities } = useAffinityScores(user?.id, "topic");
  const { affinities: companyAffinities } = useAffinityScores(user?.id, "company");
  const { filterDatabase, loading: filterLoading } = useDatabaseFilter();

  const filteredTopics = useMemo(() => 
    topicAffinities
      .filter(a => !search || a.entity_name.toLowerCase().includes(search.toLowerCase()) || a.reasoning.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.score - a.score),
    [topicAffinities, search]);

  const filteredCompanies = useMemo(() =>
    companyAffinities
      .filter(a => !search || a.entity_name.toLowerCase().includes(search.toLowerCase()) || a.reasoning.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.score - a.score),
    [companyAffinities, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
          <div>
            <h1 className="text-xl font-bold font-display">Mercato</h1>
            <p className="text-sm text-muted-foreground">{topicAffinities.length} topic · {companyAffinities.length} aziende</p>
          </div>
        </div>
        <Button onClick={filterDatabase} disabled={filterLoading} variant="outline" size="sm" className="gap-1.5">
          {filterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-ai" />}
          {filterLoading ? "Generando..." : "Genera con Socrate"}
        </Button>
      </div>

      {/* Socrate Banner */}
      {marketSuggestions.length > 0 && tab !== "socrate" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-ai/5 to-success/5 border border-ai/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ai" />
              <div>
                <p className="text-sm font-semibold text-foreground">{marketSuggestions.length} opportunità suggerite da Socrate</p>
                <p className="text-xs text-muted-foreground">Aziende e carriere basate sul tuo profilo</p>
              </div>
            </div>
            <button onClick={() => setTab("socrate")}
              className="px-3 py-1.5 bg-ai/10 text-ai rounded-lg text-xs font-medium hover:bg-ai/20 transition-colors">
              Mostra
            </button>
          </div>
        </motion.div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca topic, aziende, carriere..."
          className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {([
          { id: "topics" as TabType, label: "Topic", icon: GraduationCap, count: filteredTopics.length },
          { id: "companies" as TabType, label: "Aziende", icon: Building2, count: filteredCompanies.length },
          { id: "careers" as TabType, label: "Carriere", icon: Briefcase, count: mockCareers.length },
          { id: "socrate" as TabType, label: "Socrate", icon: Sparkles, count: marketSuggestions.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* SOCRATE TAB */}
      {tab === "socrate" && (
        <div className="grid gap-4 md:grid-cols-2">
          {marketSuggestions.length === 0 ? (
            <div className="col-span-2 bg-card border border-dashed rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Parla con Socrate per ricevere suggerimenti su aziende e carriere.</p>
            </div>
          ) : marketSuggestions.map((sug, i) => (
            <motion.div key={sug.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-ai/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${sug.category === "company" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>
                  {sug.category === "company" ? <Building2 className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{sug.title}</h3>
                    <Badge variant="secondary" className="text-[10px] bg-ai/10 text-ai">
                      {sug.category === "company" ? "Azienda" : "Carriera"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sug.detail}</p>
                  <p className="text-xs text-ai/80 mt-2 italic border-l-2 border-ai/20 pl-2">{sug.reason}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* TOPICS TAB — from LLM-generated affinities */}
      {tab === "topics" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredTopics.length === 0 ? (
            <div className="col-span-2 bg-card border border-dashed rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Clicca "Genera con Socrate" per ricevere topic personalizzati.</p>
            </div>
          ) : filteredTopics.map((topic, i) => (
            <motion.div key={topic.entity_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-card border border-ai/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm leading-tight">{topic.entity_name}</h3>
                <span className="text-sm font-bold text-ai shrink-0 ml-2">{topic.score}%</span>
              </div>
              <Progress value={topic.score} className="h-1 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">{topic.reasoning}</p>
              {topic.matched_traits?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(topic.matched_traits as string[]).map((t, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-ai/10 text-ai">{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* COMPANIES TAB — from LLM-generated affinities */}
      {tab === "companies" && (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredCompanies.length === 0 ? (
            <div className="col-span-2 bg-card border border-dashed rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Clicca "Genera con Socrate" per ricevere aziende personalizzate.</p>
            </div>
          ) : filteredCompanies.map((company, i) => (
            <motion.div key={company.entity_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-ai/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-success/10 flex items-center justify-center text-success font-bold text-sm shrink-0">
                  {company.entity_name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold font-display">{company.entity_name}</h3>
                    <span className="text-sm font-bold text-ai">{company.score}%</span>
                  </div>
                </div>
              </div>
              <Progress value={company.score} className="h-1 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">{company.reasoning}</p>
              {company.matched_traits?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(company.matched_traits as string[]).map((t, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-ai/10 text-ai">{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* CAREERS TAB */}
      {tab === "careers" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold font-display mb-2">Compatibilità Carriera</h2>
            <p className="text-sm text-muted-foreground mb-4">In base al tuo profilo e le tue competenze.</p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><p className="text-2xl font-bold font-display text-accent">{mockCareers.length}</p><p className="text-xs text-muted-foreground">Percorsi</p></div>
              <div><p className="text-2xl font-bold font-display text-success">{Math.max(...mockCareers.map(c => c.matchPercentage))}%</p><p className="text-xs text-muted-foreground">Match max</p></div>
              <div><p className="text-2xl font-bold font-display text-ai">CHF 130k</p><p className="text-xs text-muted-foreground">Mediana</p></div>
            </div>
          </div>
          {mockCareers.map((career, i) => (
            <motion.div key={career.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className="bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-accent/10"><Briefcase className="w-5 h-5 text-accent" /></div>
                  <div><h3 className="font-semibold font-display">{career.title}</h3><p className="text-sm text-muted-foreground">{career.sector}</p></div>
                </div>
                <div className="text-right"><p className="text-2xl font-bold text-accent">{career.matchPercentage}%</p><p className="text-xs text-muted-foreground">match</p></div>
              </div>
              <Progress value={career.matchPercentage} className="h-1.5 mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{career.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">{career.skills.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                <div className="flex items-center gap-3 text-sm shrink-0 ml-4">
                  <span className="font-medium">{career.salary}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${career.demand === "alta" ? "bg-success/10 text-success" : career.demand === "media" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                    {career.demand}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
