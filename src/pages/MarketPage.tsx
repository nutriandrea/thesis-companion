import { motion } from "framer-motion";
import { TrendingUp, ArrowUpRight, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockCareers } from "@/data/mock-market";

const demandColors = { alta: "text-success", media: "text-warning", bassa: "text-destructive" };
const demandBg = { alta: "bg-success/10", media: "bg-warning/10", bassa: "bg-destructive/10" };

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><TrendingUp className="w-5 h-5 text-success" /></div>
        <div>
          <h1 className="text-xl font-bold font-display">Mercato del Lavoro</h1>
          <p className="text-sm text-muted-foreground">Carriere possibili basate sulla tua tesi</p>
        </div>
      </div>

      {/* Overview bar */}
      <div className="bg-card border rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold font-display mb-3">Compatibilità Carriera</h2>
        <p className="text-sm text-muted-foreground mb-4">
          In base al tuo tema di tesi in <strong>AI/NLP</strong> e le tue competenze in <strong>Python, ML, NLP</strong>,
          ecco le carriere più promettenti nel mercato svizzero.
        </p>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold font-display text-accent">{mockCareers.length}</p>
            <p className="text-xs text-muted-foreground">Percorsi identificati</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-success">92%</p>
            <p className="text-xs text-muted-foreground">Match massimo</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-ai">CHF 130k</p>
            <p className="text-xs text-muted-foreground">Salario mediano</p>
          </div>
        </div>
      </div>

      {/* Career cards */}
      <div className="space-y-4">
        {mockCareers.map((career, i) => (
          <motion.div key={career.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-accent/10">
                  <Briefcase className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold font-display text-lg">{career.title}</h3>
                  <p className="text-sm text-muted-foreground">{career.sector}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-accent">{career.matchPercentage}%</p>
                <p className="text-xs text-muted-foreground">match</p>
              </div>
            </div>

            <Progress value={career.matchPercentage} className="h-2 mb-3" />

            <p className="text-sm text-muted-foreground mb-3">{career.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {career.skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm shrink-0 ml-4">
                <span className="font-medium">{career.salary}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${demandBg[career.demand]} ${demandColors[career.demand]}`}>
                  Domanda {career.demand}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
