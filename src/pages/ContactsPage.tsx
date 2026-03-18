import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Contact, Search, Mail, Building2, GraduationCap, Filter, Sparkles, Loader2, Compass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";
import { useSocrateSuggestions, useAffinityScores } from "@/hooks/useSocrateSuggestions";
import { useDatabaseFilter } from "@/hooks/useDatabaseFilter";
import supervisorsData from "@/data/supervisors.json";
import expertsData from "@/data/experts.json";
import companiesData from "@/data/companies.json";
import universitiesData from "@/data/universities.json";
import fieldsData from "@/data/fields.json";
import type { Supervisor, Expert, Company, University, Field } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const experts = expertsData as Expert[];
const companies = companiesData as Company[];
const universities = universitiesData as University[];
const fields = fieldsData as Field[];
function getCompanyName(id: string) { return companies.find(c => c.id === id)?.name || ""; }
function getUniName(id: string) { return universities.find(u => u.id === id)?.name || ""; }
function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }

type ContactType = {
  type: "supervisor" | "expert"; id: string;
  name: string; title: string; email: string; org: string;
  fieldIds: string[]; about: string | null;
  interests?: string[]; offerInterviews?: boolean;
};

export default function ContactsPage() {
  const { profile, user, setActiveSection } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "supervisor" | "expert" | "socrate">("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const studentFields = profile?.field_ids || [];

  // Realtime suggestions & affinities
  const { suggestions: professorSuggestions } = useSocrateSuggestions(user?.id, ["professor"]);
  const { affinities: supervisorAffinities } = useAffinityScores(user?.id, "supervisor");
  const { filterDatabase, loading: filterLoading } = useDatabaseFilter();

  const allContacts: ContactType[] = useMemo(() => {
    const sups = supervisors.map(s => ({
      type: "supervisor" as const, id: s.id,
      name: `${s.title} ${s.firstName} ${s.lastName}`,
      title: s.researchInterests.slice(0, 2).join(", "),
      email: s.email, org: getUniName(s.universityId),
      fieldIds: s.fieldIds, about: s.about,
      interests: s.researchInterests,
    }));
    const exps = experts.map(e => ({
      type: "expert" as const, id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      title: e.title, email: e.email,
      org: getCompanyName(e.companyId),
      fieldIds: e.fieldIds, about: e.about,
      offerInterviews: e.offerInterviews,
    }));
    return [...sups, ...exps];
  }, []);

  // Sort by affinity score when available
  const affinityMap = useMemo(() => new Map(supervisorAffinities.map(a => [a.entity_id, a])), [supervisorAffinities]);

  const filtered = useMemo(() => {
    if (filter === "socrate") return [];
    return allContacts
      .filter(c => filter === "all" || c.type === filter)
      .filter(c => fieldFilter === "all" || c.fieldIds.includes(fieldFilter))
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.org.toLowerCase().includes(search.toLowerCase()) || c.title.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        // Affinity score first, then field match
        const aAff = affinityMap.get(a.id)?.score || 0;
        const bAff = affinityMap.get(b.id)?.score || 0;
        if (aAff !== bAff) return bAff - aAff;
        const aM = a.fieldIds.filter(f => studentFields.includes(f)).length;
        const bM = b.fieldIds.filter(f => studentFields.includes(f)).length;
        return bM - aM;
      });
  }, [search, filter, fieldFilter, allContacts, studentFields, affinityMap]);

  const activeFields = useMemo(() => {
    const ids = new Set(allContacts.flatMap(c => c.fieldIds));
    return fields.filter(f => ids.has(f.id));
  }, [allContacts]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10"><Contact className="w-5 h-5 text-accent" /></div>
          <div>
            <h1 className="text-xl font-bold font-display">Rubrica Contatti</h1>
            <p className="text-sm text-muted-foreground">{supervisors.length} professori · {experts.length} esperti · {supervisorAffinities.length} affinità</p>
          </div>
        </div>
        <Button onClick={filterDatabase} disabled={filterLoading} variant="outline" size="sm" className="gap-1.5">
          {filterLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-ai" />}
          {filterLoading ? "Filtrando..." : "Filtra con Socrate"}
        </Button>
      </div>

      {/* Socrate Professor Suggestions Banner */}
      {professorSuggestions.length > 0 && filter !== "socrate" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-ai/5 to-accent/5 border border-ai/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-ai" />
              <div>
                <p className="text-sm font-semibold text-foreground">Socrate suggerisce {professorSuggestions.length} professori</p>
                <p className="text-xs text-muted-foreground">Basato sulla tua conversazione e sul tuo profilo</p>
              </div>
            </div>
            <button onClick={() => setFilter("socrate")}
              className="px-3 py-1.5 bg-ai/10 text-ai rounded-lg text-xs font-medium hover:bg-ai/20 transition-colors">
              Mostra
            </button>
          </div>
        </motion.div>
      )}

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca per nome, ruolo, organizzazione..."
            className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          {([
            { v: "all", l: `Tutti (${allContacts.length})` },
            { v: "supervisor", l: "Professori" },
            { v: "expert", l: "Esperti" },
            { v: "socrate", l: `🧠 Socrate (${professorSuggestions.length})` },
          ] as const).map(opt => (
            <button key={opt.v} onClick={() => setFilter(opt.v)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filter === opt.v ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {opt.l}
            </button>
          ))}
          {filter !== "socrate" && (
            <select value={fieldFilter} onChange={e => setFieldFilter(e.target.value)}
              className="bg-card border rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent">
              <option value="all">Tutti i campi</option>
              {activeFields.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Socrate Suggestions View */}
      {filter === "socrate" && (
        <div className="grid gap-4 md:grid-cols-2">
          {professorSuggestions.length === 0 ? (
            <div className="col-span-2 bg-card border border-dashed rounded-xl p-8 text-center">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Parla con Socrate per ricevere suggerimenti su professori.</p>
            </div>
          ) : professorSuggestions.map((sug, i) => (
            <motion.div key={sug.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="bg-card border border-ai/20 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-ai/10 flex items-center justify-center text-ai shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{sug.title}</h3>
                    <Badge variant="secondary" className="text-[10px] bg-ai/10 text-ai">Socrate</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{sug.detail}</p>
                  <p className="text-xs text-ai/80 mt-2 italic border-l-2 border-ai/20 pl-2">💡 {sug.reason}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Regular Contacts — with affinity badges */}
      {filter !== "socrate" && (
        <div className="grid gap-3">
          {filtered.slice(0, 30).map((contact, i) => {
            const isMatch = contact.fieldIds.some(f => studentFields.includes(f));
            const isExpanded = expanded === contact.id;
            const affinity = affinityMap.get(contact.id);
            return (
              <motion.div key={contact.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                className={`bg-card border rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer ${affinity ? "border-ai/20" : isMatch ? "border-accent/20" : ""}`}
                onClick={() => setExpanded(isExpanded ? null : contact.id)}>
                <div className="flex items-center gap-4 p-4">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${contact.type === "supervisor" ? "bg-accent/10 text-accent" : "bg-ai/10 text-ai"}`}>
                    {contact.type === "supervisor" ? <GraduationCap className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                      {affinity && <span className="text-xs font-bold text-ai shrink-0">{affinity.score}%</span>}
                      {isMatch && !affinity && <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" title="Match" />}
                      <Badge variant={contact.type === "supervisor" ? "default" : "secondary"} className="text-[10px] shrink-0">
                        {contact.type === "supervisor" ? "Prof" : "Expert"}
                      </Badge>
                      {contact.offerInterviews && <Badge variant="secondary" className="text-[10px] shrink-0 bg-success/10 text-success">Interviste</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{contact.title} · {contact.org}</p>
                  </div>
                  <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
                {isExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                    {affinity && (
                      <div className="bg-ai/5 border border-ai/10 rounded-lg p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-medium text-ai">Affinità Socrate</span>
                          <span className="text-sm font-bold text-ai">{affinity.score}%</span>
                        </div>
                        <Progress value={affinity.score} className="h-1 mb-2" />
                        <p className="text-xs text-muted-foreground italic">{affinity.reasoning}</p>
                        {affinity.matched_traits?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {affinity.matched_traits.map((t, j) => <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-ai/10 text-ai">{t}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                    {contact.about && <p className="text-xs text-muted-foreground">{contact.about}</p>}
                    {contact.interests && contact.interests.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground mb-1">Interessi di ricerca</p>
                        <div className="flex flex-wrap gap-1">{contact.interests.map(r => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}</div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-1">Campi</p>
                      <div className="flex flex-wrap gap-1">
                        {contact.fieldIds.map(f => <Badge key={f} variant={studentFields.includes(f) ? "default" : "secondary"} className="text-[10px]">{getFieldName(f)}</Badge>)}
                      </div>
                    </div>
                    <a href={`mailto:${contact.email}`} className="text-xs text-accent hover:underline flex items-center gap-1">
                      <Mail className="w-3 h-3" /> {contact.email}
                    </a>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
          {filtered.length > 30 && (
            <p className="text-xs text-muted-foreground text-center">Mostrati 30 di {filtered.length}. Usa i filtri per restringere.</p>
          )}
        </div>
      )}
    </div>
  );
}
