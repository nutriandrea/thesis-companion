import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Search, Building2, GraduationCap, Briefcase, MapPin, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import topicsData from "@/data/topics.json";
import companiesData from "@/data/companies.json";
import supervisorsData from "@/data/supervisors.json";
import expertsData from "@/data/experts.json";
import fieldsData from "@/data/fields.json";
import { mockCareers } from "@/data/mock-market";
import { Progress } from "@/components/ui/progress";
import type { Topic, Company, Supervisor, Expert, Field } from "@/types/data";

const topics = topicsData as Topic[];
const companies = companiesData as Company[];
const supervisors = supervisorsData as Supervisor[];
const experts = expertsData as Expert[];
const fields = fieldsData as Field[];
function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }
function getCompanyName(id: string) { return companies.find(c => c.id === id)?.name || ""; }

type TabType = "topics" | "companies" | "careers";
type TopicFilter = "all" | "topic" | "job";
type EmploymentFilter = "all" | "yes" | "open" | "no";

export default function MarketPage() {
  const { profile } = useApp();
  const [tab, setTab] = useState<TabType>("topics");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TopicFilter>("all");
  const [empFilter, setEmpFilter] = useState<EmploymentFilter>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const studentFields = profile?.field_ids || [];

  // Filtered topics
  const filteredTopics = useMemo(() => topics
    .filter(t => typeFilter === "all" || t.type === typeFilter)
    .filter(t => empFilter === "all" || t.employment === empFilter)
    .filter(t => fieldFilter === "all" || t.fieldIds.includes(fieldFilter))
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aM = a.fieldIds.filter(f => studentFields.includes(f)).length;
      const bM = b.fieldIds.filter(f => studentFields.includes(f)).length;
      return bM - aM;
    }),
    [search, typeFilter, empFilter, fieldFilter, studentFields]);

  // Companies with topic counts
  const companiesWithTopics = useMemo(() => companies.map(c => ({
    ...c,
    topicCount: topics.filter(t => t.companyId === c.id).length,
    expertCount: experts.filter(e => e.companyId === c.id).length,
  })).filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.topicCount - a.topicCount),
    [search]);

  // Active fields for filter
  const activeFields = useMemo(() => {
    const ids = new Set(topics.flatMap(t => t.fieldIds));
    return fields.filter(f => ids.has(f.id));
  }, []);

  const employmentLabel: Record<string, string> = { yes: "Assunzione", open: "Possibile", no: "No" };
  const employmentColor: Record<string, string> = { yes: "bg-success/10 text-success", open: "bg-warning/10 text-warning", no: "bg-muted text-muted-foreground" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Mercato</h1>
          <p className="text-sm text-muted-foreground">{topics.length} topic · {companies.length} aziende · {mockCareers.length} carriere</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca topic, aziende, carriere..."
          className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "topics" as TabType, label: "Topic", icon: GraduationCap, count: filteredTopics.length },
          { id: "companies" as TabType, label: "Aziende", icon: Building2, count: companiesWithTopics.length },
          { id: "careers" as TabType, label: "Carriere", icon: Briefcase, count: mockCareers.length },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${tab === t.id ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
            <t.icon className="w-4 h-4" /> {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* TOPICS TAB */}
      {tab === "topics" && (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap items-center">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as TopicFilter)}
              className="bg-card border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="all">Tutti i tipi</option>
              <option value="topic">Tesi</option>
              <option value="job">Lavoro</option>
            </select>
            <select value={empFilter} onChange={e => setEmpFilter(e.target.value as EmploymentFilter)}
              className="bg-card border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="all">Assunzione: tutti</option>
              <option value="yes">Con assunzione</option>
              <option value="open">Possibile</option>
              <option value="no">Senza</option>
            </select>
            <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}
              className="bg-card border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="all">Tutti i campi</option>
              {activeFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredTopics.slice(0, 20).map((topic, i) => {
              const company = companies.find(c => c.id === topic.companyId);
              const topicSupervisors = topic.supervisorIds.map(id => supervisors.find(s => s.id === id)).filter(Boolean) as Supervisor[];
              const topicExperts = topic.expertIds.map(id => experts.find(e => e.id === id)).filter(Boolean) as Expert[];
              const isMatch = topic.fieldIds.some(f => studentFields.includes(f));

              return (
                <motion.div key={topic.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${isMatch ? "border-accent/30" : ""}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex gap-1.5">
                      <Badge variant={topic.type === "job" ? "default" : "secondary"} className="text-[10px]">
                        {topic.type === "job" ? "Lavoro" : "Tesi"}
                      </Badge>
                      {topic.employment !== "no" && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${employmentColor[topic.employment]}`}>
                          {employmentLabel[topic.employment]}
                        </span>
                      )}
                      {topic.workplaceType && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />{topic.workplaceType}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-0.5">
                      {topic.degrees.map(d => <span key={d} className="text-[9px] uppercase font-bold text-muted-foreground bg-muted px-1 py-0.5 rounded">{d}</span>)}
                    </div>
                  </div>

                  <h3 className="font-semibold text-sm mb-1.5 leading-tight">{topic.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{topic.description}</p>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {topic.fieldIds.map(f => (
                      <Badge key={f} variant={studentFields.includes(f) ? "default" : "secondary"} className="text-[10px]">{getFieldName(f)}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      {company ? (
                        <><Building2 className="w-3 h-3" /> <span className="font-medium">{company.name}</span></>
                      ) : topicSupervisors[0] ? (
                        <><GraduationCap className="w-3 h-3" /> <span className="font-medium">{topicSupervisors[0].title} {topicSupervisors[0].lastName}</span></>
                      ) : null}
                    </div>
                    {topicExperts.length > 0 && (
                      <span className="text-[10px]">{topicExperts.length} esperto/i</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {filteredTopics.length > 20 && (
            <p className="text-xs text-muted-foreground text-center">Mostrati 20 di {filteredTopics.length} risultati. Usa i filtri per restringere.</p>
          )}
        </>
      )}

      {/* COMPANIES TAB */}
      {tab === "companies" && (
        <div className="grid gap-4 md:grid-cols-2">
          {companiesWithTopics.map((company, i) => (
            <motion.div key={company.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center text-accent font-bold text-sm shrink-0">
                  {company.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold font-display">{company.name}</h3>
                  <p className="text-xs text-muted-foreground">{company.size} dipendenti</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold text-accent">{company.topicCount}</p>
                  <p className="text-[10px] text-muted-foreground">topic</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{company.about || company.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {company.domains.slice(0, 3).map(d => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}
                </div>
                <span className="text-[10px] text-muted-foreground">{company.expertCount} esperti</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* CAREERS TAB */}
      {tab === "careers" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-5 shadow-sm">
            <h2 className="font-semibold font-display mb-2">Compatibilità Carriera</h2>
            <p className="text-sm text-muted-foreground mb-4">
              In base al tuo profilo e le tue competenze, ecco le carriere più promettenti.
            </p>
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
