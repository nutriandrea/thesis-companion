import { useMemo } from "react";
import { motion } from "framer-motion";
import { Route, GraduationCap, Building2, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/contexts/AppContext";
import supervisorsData from "@/data/supervisors.json";
import companiesData from "@/data/companies.json";
import expertsData from "@/data/experts.json";
import topicsData from "@/data/topics.json";
import fieldsData from "@/data/fields.json";
import type { Supervisor, Company, Expert, Topic, Field } from "@/types/data";

const supervisors = supervisorsData as Supervisor[];
const companies = companiesData as Company[];
const experts = expertsData as Expert[];
const topics = topicsData as Topic[];
const fields = fieldsData as Field[];

function getFieldName(id: string) { return fields.find(f => f.id === id)?.name || id; }

interface PersonalizedPath {
  topic: Topic;
  supervisor: Supervisor;
  company: Company | null;
  experts: Expert[];
  matchScore: number;
  steps: string[];
}

export default function PathPage() {
  const { currentStudent, addMemory, setActiveSection } = useApp();

  const paths = useMemo<PersonalizedPath[]>(() => {
    const studentFields = currentStudent.fieldIds;
    const matched = topics
      .filter(t => t.fieldIds.some(f => studentFields.includes(f)))
      .slice(0, 4)
      .map(topic => {
        const sup = supervisors.find(s =>
          s.fieldIds.some(f => topic.fieldIds.includes(f))
        ) || supervisors[0];
        const company = topic.companyId ? companies.find(c => c.id === topic.companyId) || null : null;
        const topicExperts = topic.expertIds
          .map(id => experts.find(e => e.id === id))
          .filter(Boolean) as Expert[];
        const fieldOverlap = topic.fieldIds.filter(f => studentFields.includes(f)).length;
        const matchScore = Math.min(95, 60 + fieldOverlap * 15);

        return {
          topic,
          supervisor: sup,
          company,
          experts: topicExperts,
          matchScore,
          steps: [
            `Contatta ${sup.title} ${sup.lastName} per la supervisione`,
            company ? `Candidati per la collaborazione con ${company.name}` : "Cerca un partner industriale",
            "Completa la literature review iniziale",
            "Definisci la metodologia con il supervisore",
            topicExperts.length > 0 ? `Programma incontro con ${topicExperts[0].firstName} ${topicExperts[0].lastName}` : "Cerca mentori aggiuntivi",
            "Inizia la fase sperimentale",
          ],
        };
      });
    return matched.sort((a, b) => b.matchScore - a.matchScore);
  }, [currentStudent.fieldIds]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><Route className="w-5 h-5 text-success" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Percorsi Personalizzati</h1>
          <p className="text-sm text-muted-foreground">Roadmap ottimizzate per le tue competenze e interessi</p>
        </div>
      </div>

      <div className="space-y-4">
        {paths.map((path, i) => (
          <motion.div key={path.topic.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <Badge variant="secondary" className="text-[10px] mb-2">Percorso {i + 1}</Badge>
                <h3 className="font-bold font-display text-lg leading-tight">{path.topic.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{path.topic.description}</p>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-3xl font-bold text-accent">{path.matchScore}%</p>
                <p className="text-xs text-muted-foreground">compatibilità</p>
              </div>
            </div>

            {/* Key people */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
                <GraduationCap className="w-4 h-4 text-accent shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Supervisore</p>
                  <p className="text-sm font-medium truncate">{path.supervisor.title} {path.supervisor.lastName}</p>
                </div>
              </div>
              {path.company && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-success/5 border border-success/10">
                  <Building2 className="w-4 h-4 text-success shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Azienda</p>
                    <p className="text-sm font-medium truncate">{path.company.name}</p>
                  </div>
                </div>
              )}
              {path.experts.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-ai/5 border border-ai/10">
                  <Users className="w-4 h-4 text-ai shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Esperto</p>
                    <p className="text-sm font-medium truncate">{path.experts[0].firstName} {path.experts[0].lastName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Steps */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Passi consigliati:</p>
              {path.steps.map((step, j) => (
                <div key={j} className="flex items-center gap-2 text-sm">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 text-[10px] font-bold text-muted-foreground">
                    {j + 1}
                  </div>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t">
              {path.topic.fieldIds.map(f => (
                <Badge key={f} variant={currentStudent.fieldIds.includes(f) ? "default" : "secondary"} className="text-xs">
                  {getFieldName(f)}
                </Badge>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
