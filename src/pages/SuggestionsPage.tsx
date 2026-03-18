import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lightbulb, GraduationCap, Building2, Search } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import topicsData from "@/data/topics.json";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import expertsData from "@/data/experts.json";
import fieldsData from "@/data/fields.json";
import type { Topic, Supervisor, Company, Expert, Field } from "@/types/data";

const topics = topicsData as Topic[];
const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const experts = expertsData as Expert[];
const fields = fieldsData as Field[];
function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }

export default function SuggestionsPage() {
  const { profile } = useApp();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"topics" | "supervisors">("topics");
  const studentFields = profile?.field_ids || ["field-01", "field-03"];

  const matchedTopics = useMemo(() => topics
    .filter(t => t.fieldIds.some(f => studentFields.includes(f)))
    .filter(t => !search || t.title.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12), [search, studentFields]);

  const matchedSupervisors = useMemo(() => supervisors
    .filter(s => s.fieldIds.some(f => studentFields.includes(f)))
    .filter(s => !search || `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 12), [search, studentFields]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-ai/10"><Lightbulb className="w-5 h-5 text-ai" /></div>
        <div><h1 className="text-xl font-bold font-display">Suggerimenti AI</h1><p className="text-sm text-muted-foreground">Temi e supervisori consigliati per te</p></div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca temi o supervisori..."
          className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab("topics")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "topics" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
          <GraduationCap className="w-4 h-4 inline mr-2" />Temi ({matchedTopics.length})
        </button>
        <button onClick={() => setTab("supervisors")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "supervisors" ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
          <Building2 className="w-4 h-4 inline mr-2" />Supervisori ({matchedSupervisors.length})
        </button>
      </div>
      {tab === "topics" && (
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
      {tab === "supervisors" && (
        <div className="grid gap-4 md:grid-cols-2">
          {matchedSupervisors.map((sup, i) => (
            <motion.div key={sup.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
                  {sup.firstName[0]}{sup.lastName[0]}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{sup.title} {sup.firstName} {sup.lastName}</h3>
                  <p className="text-xs text-muted-foreground">{sup.email}</p>
                </div>
              </div>
              {sup.about && <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{sup.about}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sup.researchInterests.slice(0, 3).map(r => <Badge key={r} variant="secondary" className="text-xs">{r}</Badge>)}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
