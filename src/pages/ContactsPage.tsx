import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Contact, Search, Mail, Building2, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
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

type ContactType = { type: "supervisor" | "expert"; name: string; title: string; email: string; org: string; fieldIds: string[]; };

export default function ContactsPage() {
  const { profile } = useApp();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "supervisor" | "expert">("all");
  const studentFields = profile?.field_ids || [];

  const allContacts: ContactType[] = useMemo(() => {
    const sups = supervisors.map(s => ({ type: "supervisor" as const, name: `${s.title} ${s.firstName} ${s.lastName}`, title: s.researchInterests.slice(0, 2).join(", "), email: s.email, org: getUniName(s.universityId), fieldIds: s.fieldIds }));
    const exps = experts.map(e => ({ type: "expert" as const, name: `${e.firstName} ${e.lastName}`, title: e.title, email: e.email, org: getCompanyName(e.companyId), fieldIds: e.fieldIds }));
    return [...sups, ...exps];
  }, []);

  const filtered = useMemo(() => allContacts
    .filter(c => filter === "all" || c.type === filter)
    .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.org.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aM = a.fieldIds.filter(f => studentFields.includes(f)).length;
      const bM = b.fieldIds.filter(f => studentFields.includes(f)).length;
      return bM - aM;
    }), [search, filter, allContacts, studentFields]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-accent/10"><Contact className="w-5 h-5 text-accent" /></div>
        <div><h1 className="text-xl font-bold font-display">Rubrica Contatti</h1><p className="text-sm text-muted-foreground">{filtered.length} contatti</p></div>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca..."
            className="w-full bg-card border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value as any)}
          className="bg-card border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
          <option value="all">Tutti</option>
          <option value="supervisor">Professori</option>
          <option value="expert">Esperti</option>
        </select>
      </div>
      <div className="grid gap-3">
        {filtered.slice(0, 20).map((contact, i) => (
          <motion.div key={contact.email} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className="bg-card border rounded-xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${contact.type === "supervisor" ? "bg-accent/10 text-accent" : "bg-ai/10 text-ai"}`}>
              {contact.type === "supervisor" ? <GraduationCap className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate">{contact.name}</h3>
                <Badge variant={contact.type === "supervisor" ? "default" : "secondary"} className="text-[10px] shrink-0">
                  {contact.type === "supervisor" ? "Prof" : "Expert"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{contact.title} · {contact.org}</p>
            </div>
            <a href={`mailto:${contact.email}`} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
              <Mail className="w-4 h-4 text-muted-foreground" />
            </a>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
