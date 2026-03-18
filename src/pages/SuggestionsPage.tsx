import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Lightbulb, GraduationCap, Building2, Search, BookOpen, Globe, Sparkles, Target, Briefcase, Zap, FileText } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import topicsData from "@/data/topics.json";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import fieldsData from "@/data/fields.json";
import type { Topic, Supervisor, Company, Field } from "@/types/data";

const topics = topicsData as Topic[];
const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const fields = fieldsData as Field[];
function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }

interface AISuggestion {
  id: string;
  category: string;
  title: string;
  detail: string;
  reason: string;
  created_at: string;
}

const categoryIcons: Record<string, React.ElementType> = {
  company: Building2, professor: GraduationCap, book: BookOpen, topic: Lightbulb,
  source: Globe, career: Briefcase, skill: Zap, thesis_feedback: FileText, next_step: Target,
};
const categoryLabels: Record<string, string> = {
  company: "Azienda", professor: "Professore", book: "Libro", topic: "Tema",
  source: "Fonte", career: "Carriera", skill: "Competenza", thesis_feedback: "Feedback Tesi", next_step: "Prossimo Passo",
};
const categoryColors: Record<string, string> = {
  company: "bg-success/10 text-success", professor: "bg-accent/10 text-accent",
  book: "bg-warning/10 text-warning", topic: "bg-primary/10 text-primary",
  source: "bg-ai/10 text-ai", career: "bg-success/10 text-success",
  skill: "bg-accent/10 text-accent", thesis_feedback: "bg-warning/10 text-warning",
  next_step: "bg-destructive/10 text-destructive",
};

type TabFilter = "all" | "books" | "topics_sources" | "career_skills" | "thesis" | "dataset";

export default function SuggestionsPage() {
  const { profile, user, setActiveSection } = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("all");
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const studentFields = profile?.field_ids || ["field-01", "field-03"];

  useEffect(() => {
    if (!user) return;
    supabase.from("socrate_suggestions" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }: any) => { if (data) setAiSuggestions(data); });
  }, [user]);

  const tabFilters: Record<TabFilter, string[]> = {
    all: [],
    books: ["book", "source"],
    topics_sources: ["topic", "source"],
    career_skills: ["career", "skill", "company"],
    thesis: ["thesis_feedback", "next_step"],
    dataset: [],
  };

  const filtered = useMemo(() => {
    let items = aiSuggestions;
    if (tab !== "all" && tab !== "dataset") {
      items = items.filter(s => tabFilters[tab].includes(s.category));
    }
    if (search) {
      items = items.filter(s => s.title.toLowerCase().includes(search.toLowerCase()) || s.detail.toLowerCase().includes(search.toLowerCase()));
    }
    return items;
  }, [search, aiSuggestions, tab]);

  const matchedTopics = useMemo(() => topics
    .filter(t => t.fieldIds.some(f => studentFields.includes(f)))
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12), [search, studentFields]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    aiSuggestions.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, [aiSuggestions]);

  const tabs: { id: TabFilter; label: string; icon: React.ElementType; count: number }[] = [
    { id: "all", label: "Tutti", icon: Sparkles, count: aiSuggestions.length },
    { id: "books", label: "Bibliografia", icon: BookOpen, count: (categoryCounts.book || 0) + (categoryCounts.source || 0) },
    { id: "topics_sources", label: "Temi", icon: Lightbulb, count: (categoryCounts.topic || 0) },
    { id: "career_skills", label: "Carriera", icon: Briefcase, count: (categoryCounts.career || 0) + (categoryCounts.skill || 0) + (categoryCounts.company || 0) },
    { id: "thesis", label: "Tesi", icon: FileText, count: (categoryCounts.thesis_feedback || 0) + (categoryCounts.next_step || 0) },
    { id: "dataset", label: "Match Dataset", icon: GraduationCap, count: matchedTopics.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-ai/10"><Sparkles className="w-5 h-5 text-ai" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Suggerimenti di Socrate</h1>
          <p className="text-sm text-muted-foreground">Consigli personalizzati estratti dal tuo profilo e dalla chat</p>
        </div>
      </div>

      {/* Stats Banner */}
      {aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-ai/5 to-accent/5 border border-ai/20 rounded-xl p-4">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const Icon = categoryIcons[cat] || Sparkles;
              return (
                <div key={cat} className="flex flex-col items-center gap-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-lg font-bold text-foreground">{count}</span>
                  <span className="text-[10px] text-muted-foreground">{categoryLabels[cat] || cat}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca suggerimenti..."
          className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* AI Suggestions */}
      {tab !== "dataset" && (
        <div className="space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-card border border-dashed rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {aiSuggestions.length === 0 ? "Nessun suggerimento ancora." : "Nessun risultato per questa categoria."}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Parla con Socrate per ricevere consigli personalizzati.</p>
              <button onClick={() => setActiveSection("socrate")}
                className="mt-3 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-xs font-medium hover:bg-accent/90 transition-colors">
                Vai a Socrate
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((sug, i) => {
                const Icon = categoryIcons[sug.category] || Lightbulb;
                const colorClass = categoryColors[sug.category] || "bg-muted text-muted-foreground";
                return (
                  <motion.div key={sug.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-[10px]">{categoryLabels[sug.category] || sug.category}</Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(sug.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>
                        </div>
                        <h3 className="font-semibold text-sm">{sug.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{sug.detail}</p>
                        {sug.reason && (
                          <p className="text-xs text-ai/80 mt-2 italic border-l-2 border-ai/20 pl-2">💡 {sug.reason}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Dataset Match */}
      {tab === "dataset" && (
        <div className="grid gap-4 md:grid-cols-2">
          {matchedTopics.map((topic, i) => {
            const company = companies.find(c => c.id === topic.companyId);
            return (
              <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-semibold font-display text-base mb-2">{topic.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{topic.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {topic.fieldIds.map(f => <Badge key={f} variant={studentFields.includes(f) ? "default" : "secondary"} className="text-xs">{getFieldName(f)}</Badge>)}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  {company && <span className="font-medium">{company.name}</span>}
                  {topic.degrees.map(d => <span key={d} className="uppercase">{d}</span>)}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
