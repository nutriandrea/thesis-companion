import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Users, Building2, CheckCircle2, Circle, GraduationCap,
  MessageCircle, ChevronRight, ShieldAlert, BarChart3, BookOpen,
  ExternalLink, ArrowRight, TrendingUp, Link2, Loader2, Mic,
} from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";

// ─── TYPES ───
interface CareerSector { name: string; percentage: number; reasoning?: string; }
interface MockTask { id: string; title: string; description: string; priority: string; status: string; estimated_minutes: number; }
interface MockVulnerability { id: string; type: string; title: string; description: string; severity: string; }
interface MockReference { title: string; authors: string; year: string; url: string; category: string; relevance: string; }
interface MockSupervisor { id: string; name: string; fields: string[]; score: number; reasoning: string; email: string; university: string; }
interface MockExpert { id: string; name: string; title: string; score: number; reasoning: string; offerInterviews: boolean; email: string; }
interface RoadmapPhase { key: string; title: string; tasks: { id: string; title: string; completed: boolean; due_date?: string }[]; }

// ─── MOCK DATA ───
const MOCK_THESIS = "Applicazione di Large Language Models per l'Analisi Automatica di Vulnerabilità nel Codice Sorgente";

const MOCK_SECTORS: CareerSector[] = [
  { name: "AI & Machine Learning", percentage: 42, reasoning: "Core of the thesis" },
  { name: "Cybersecurity", percentage: 28, reasoning: "Application domain" },
  { name: "DevOps & Automazione", percentage: 15, reasoning: "CI/CD Pipeline" },
  { name: "Ricerca Accademica", percentage: 10, reasoning: "Publications" },
  { name: "Consulenza Tech", percentage: 5, reasoning: "Enterprise applications" },
];

const MOCK_TASKS: Record<string, MockTask[]> = {
  orientation: [
    { id: "t1", title: "Explore 3 areas of interest", description: "Identify at least three macro-areas of interest and write pros/cons for each.", priority: "high", status: "completed", estimated_minutes: 30 },
    { id: "t2", title: "Read survey on LLM for code analysis", description: "Find and read at least one recent survey paper on LLM for code analysis.", priority: "high", status: "completed", estimated_minutes: 60 },
    { id: "t3", title: "Define preliminary research question", description: "Draft a first version of your research question.", priority: "critical", status: "pending", estimated_minutes: 45 },
  ],
  topic_supervisor: [
    { id: "t4", title: "Contact Prof. Rossi for supervision", description: "Write a motivated email to Prof. Rossi explaining your interest in LLM research.", priority: "critical", status: "pending", estimated_minutes: 30 },
    { id: "t5", title: "Prepare thesis outline (5 chapters)", description: "Define the macro structure of the thesis with provisional chapter titles.", priority: "high", status: "pending", estimated_minutes: 60 },
    { id: "t6", title: "Collect vulnerability dataset", description: "Identify and download at least 2 public software vulnerability datasets.", priority: "medium", status: "pending", estimated_minutes: 90 },
  ],
  planning: [
    { id: "t7", title: "Create detailed timeline", description: "Break work into biweekly sprints with measurable deliverables.", priority: "high", status: "completed", estimated_minutes: 45 },
    { id: "t8", title: "Setup experimental environment", description: "Configure cloud GPU, Git repository, and training pipeline.", priority: "critical", status: "pending", estimated_minutes: 120 },
    { id: "t9", title: "Define evaluation metrics", description: "Choose precision, recall, F1 and specific metrics for vulnerability detection.", priority: "high", status: "pending", estimated_minutes: 30 },
  ],
  execution: [
    { id: "t10", title: "Fine-tuning GPT-4 on CWE dataset", description: "Execute model fine-tuning on the CWE vulnerability dataset.", priority: "critical", status: "pending", estimated_minutes: 240 },
    { id: "t11", title: "Benchmark against SAST tools", description: "Compare model results with SonarQube, Semgrep, CodeQL.", priority: "high", status: "pending", estimated_minutes: 180 },
    { id: "t12", title: "Qualitative analysis of false positives", description: "Classify and analyze the most common false positive patterns.", priority: "medium", status: "pending", estimated_minutes: 120 },
    { id: "t10b", title: "Read paper: VulDeePecker (Li et al.)", description: "Read the VulDeePecker paper in detail to compare your detection approach with the deep learning baseline.", priority: "high", status: "completed", estimated_minutes: 90 },
    { id: "t10c", title: "Read thesis: 'LLM-based SAST' (ETH 2025)", description: "Analyze K. Meier's master thesis (ETH Zurich) comparing LLM vs traditional SAST for code review.", priority: "medium", status: "pending", estimated_minutes: 120 },
  ],
  writing: [
    { id: "t13", title: "Write Methodology chapter", description: "Describe in detail the experimental pipeline, models used, and training parameters.", priority: "critical", status: "pending", estimated_minutes: 300 },
    { id: "t14", title: "Create result charts", description: "Generate confusion matrix, ROC curves, and comparative tables.", priority: "high", status: "pending", estimated_minutes: 120 },
    { id: "t15", title: "Final review with supervisor", description: "Send the complete draft to the supervisor for final review.", priority: "critical", status: "pending", estimated_minutes: 60 },
    { id: "t15b", title: "Read paper: Limits of LLMs in Security", description: "Re-read the critical paper by Pearce et al. to strengthen the Discussion section and anticipate objections.", priority: "high", status: "pending", estimated_minutes: 60 },
    { id: "t15c", title: "Read thesis: 'Automated Vuln Detection' (EPFL 2024)", description: "Consult S. Dupont's doctoral thesis (EPFL) to deepen related work on automated vulnerability detection.", priority: "medium", status: "pending", estimated_minutes: 90 },
  ],
};

const MOCK_ROADMAP: RoadmapPhase[] = [
  {
    key: "planning", title: "Planning",
    tasks: [
      { id: "r1", title: "Define final research questions", completed: true },
      { id: "r2", title: "Get supervisor approval", completed: true },
      { id: "r3", title: "Setup ambiente cloud (GPU)", completed: false, due_date: "2026-04-15" },
      { id: "r4", title: "Acquire training dataset", completed: false, due_date: "2026-04-20" },
    ],
  },
  {
    key: "execution", title: "Execution",
    tasks: [
      { id: "r5", title: "Train baseline model", completed: false, due_date: "2026-05-01" },
      { id: "r6", title: "Fine-tune on vulnerability data", completed: false, due_date: "2026-05-15" },
      { id: "r7", title: "Comparative benchmark", completed: false, due_date: "2026-06-01" },
      { id: "r8", title: "Results analysis + ablation study", completed: false, due_date: "2026-06-15" },
    ],
  },
  {
    key: "writing", title: "Writing",
    tasks: [
      { id: "r9", title: "Chapters 1-2 (Intro + Related Work)", completed: false, due_date: "2026-07-01" },
      { id: "r10", title: "Chapter 3 (Methodology)", completed: false, due_date: "2026-07-15" },
      { id: "r11", title: "Chapters 4-5 (Results + Conclusion)", completed: false, due_date: "2026-08-01" },
      { id: "r12", title: "Final revision", completed: false, due_date: "2026-08-15" },
    ],
  },
];

const MOCK_SUPERVISORS: MockSupervisor[] = [
  { id: "s1", name: "Prof. Marco Rossi", fields: ["NLP", "Code Analysis"], score: 92, reasoning: "NLP expert applied to software engineering with 15 publications on the topic.", email: "marco.rossi@ethz.ch", university: "ETH Zurich" },
  { id: "s2", name: "Prof.ssa Elena Bianchi", fields: ["Cybersecurity", "ML"], score: 85, reasoning: "Active research on vulnerability detection with ML approaches.", email: "elena.bianchi@epfl.ch", university: "EPFL" },
  { id: "s3", name: "Prof. Luigi Verdi", fields: ["Software Engineering", "Testing"], score: 78, reasoning: "Focus on automated testing and code quality.", email: "luigi.verdi@uzh.ch", university: "UZH" },
  { id: "s4", name: "Prof.ssa Anna Neri", fields: ["AI Safety", "LLM"], score: 74, reasoning: "Works on alignment and safety of large language models.", email: "anna.neri@unisg.ch", university: "HSG" },
];

const MOCK_EXPERTS: MockExpert[] = [
  { id: "e1", name: "Dr. Paolo Ferretti", title: "Security Researcher @ Google", score: 88, reasoning: "Fuzzing and vulnerability research expert, could provide practical insights.", offerInterviews: true, email: "p.ferretti@google.com" },
  { id: "e2", name: "Dr.ssa Maria Conti", title: "ML Engineer @ DeepMind", score: 82, reasoning: "Published on LLM for code generation, knows the limitations.", offerInterviews: true, email: "m.conti@deepmind.com" },
  { id: "e3", name: "Ing. Luca Barbieri", title: "CTO @ CyberNext", score: 75, reasoning: "Industry experience in applying AI to cybersecurity.", offerInterviews: false, email: "l.barbieri@cybernext.ch" },
  { id: "e4", name: "Prof. James Chen", title: "Stanford University", score: 71, reasoning: "Author of the VulnBench framework, reference in vulnerability detection.", offerInterviews: false, email: "jchen@stanford.edu" },
];

const MOCK_REFERENCES: MockReference[] = [
  { title: "Large Language Models for Code: Opportunities and Challenges", authors: "Chen et al.", year: "2024", url: "https://arxiv.org/abs/2401.00001", category: "foundational", relevance: "Fundamental survey covering the state of the art of LLMs applied to code." },
  { title: "VulDeePecker: A Deep Learning-Based System for Vulnerability Detection", authors: "Li et al.", year: "2018", url: "https://arxiv.org/abs/1801.01681", category: "methodology", relevance: "First paper to use deep learning for vulnerability detection, baseline approach." },
  { title: "Automated Vulnerability Detection with ML: A Systematic Review", authors: "Zhang, Wang", year: "2025", url: "https://scholar.google.com/scholar?q=automated+vulnerability+detection+ML", category: "recent", relevance: "Systematic review of ML techniques for vulnerability detection." },
  { title: "The Limits of LLMs in Security Analysis", authors: "Pearce et al.", year: "2025", url: "https://arxiv.org/abs/2502.00001", category: "contrarian", relevance: "Critical analysis of current LLM limitations in security analysis." },
  { title: "CodeBERT: A Pre-Trained Model for Programming Languages", authors: "Feng et al.", year: "2020", url: "https://arxiv.org/abs/2002.08155", category: "foundational", relevance: "Pre-trained model for code that paved the way for transformers in SE." },
];

const MOCK_VULNERABILITIES: MockVulnerability[] = [
  { id: "v1", type: "methodology_flaw", title: "Dataset too small for generalization", description: "With only 5000 training samples, the model risks overfitting and not generalizing to unseen vulnerabilities. At least 20k diverse samples are needed.", severity: "critical" },
  { id: "v2", type: "logic_gap", title: "Lack of non-ML baseline", description: "You are not comparing with standard rule-based (SAST) approaches. Without this comparison, you cannot demonstrate the added value of ML.", severity: "high" },
  { id: "v3", type: "superficiality", title: "Related work too generic", description: "The related work section lists papers without critical analysis. You need to explain what each approach lacks and how yours improves it.", severity: "medium" },
  { id: "v4", type: "originality_deficit", title: "Standard fine-tuning without innovation", description: "You are doing vanilla fine-tuning of GPT-4. What is your original contribution compared to those who have already done the same?", severity: "high" },
];

const MOCK_MESSAGES = [
  { id: "m1", role: "assistant" as const, content: "You have a clear direction: LLM for vulnerability detection. Great starting point. But tell me: **what makes your approach different** from those who have already fine-tuned models on vulnerability datasets?" },
  { id: "m2", role: "user" as const, content: "I want to combine traditional static analysis with LLM, creating a hybrid system." },
  { id: "m3", role: "assistant" as const, content: "Interesting. A hybrid SAST + LLM approach has potential, but you need to be precise: **which component handles what?** The risk is that you end up with a system where the LLM is just a glorified wrapper around static rules. Define the boundary clearly." },
  { id: "m4", role: "user" as const, content: "SAST would do the initial screening, then the LLM would analyze the results to reduce false positives." },
  { id: "m5", role: "assistant" as const, content: "This is a **concrete contribution**: reducing false positives via LLM post-processing. It's measurable, useful, and publishable. Now the critical question: **do you have access to a dataset with false positive annotations?** Without that, you can't train the model to distinguish them." },
];

const PHASES = [
  { key: "orientation", label: "Orientation", icon: "1" },
  { key: "topic_supervisor", label: "Topic & Supervisor", icon: "2" },
  { key: "planning", label: "Planning", icon: "3" },
  { key: "execution", label: "Execution", icon: "4" },
  { key: "writing", label: "Writing", icon: "5" },
] as const;

const PHASE_COMPLETION: Record<string, number> = {
  orientation: 100,
  topic_supervisor: 75,
  planning: 45,
  execution: 15,
  writing: 0,
};

const PHASE_CONFIDENCE: Record<string, number> = {
  orientation: 100,
  topic_supervisor: 82,
  planning: 60,
  execution: 25,
  writing: 0,
};

// ─── CARD COMPONENT ───
function DemoCard({ title, icon: Icon, children, badge, action, className = "" }: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  badge?: number | null; action?: { label: string; onClick: () => void; loading?: boolean }; className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-lg flex flex-col h-full ds-card-hover ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
        {badge != null && badge > 0 && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
        )}
        {action && (
          <button onClick={action.onClick} disabled={action.loading}
            className="text-[10px] font-medium px-2 py-1 rounded-md bg-accent/10 text-accent hover:bg-accent/20 transition-colors disabled:opacity-40">
            {action.loading ? <Loader2 className="w-3 h-3 animate-spin" /> : action.label}
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
    </div>
  );
}

// ─── DEMO COMPONENTS ───

function DemoTasks({ phase }: { phase: string }) {
  const tasks = MOCK_TASKS[phase] || MOCK_TASKS.orientation;
  const priorityLabel = (p: string) => {
    switch (p) {
      case "critical": return { text: "Critical", cls: "bg-destructive/10 text-destructive" };
      case "high": return { text: "High", cls: "bg-warning/10 text-warning" };
      case "medium": return { text: "Medium", cls: "bg-accent/10 text-accent" };
      default: return { text: "Low", cls: "bg-muted text-muted-foreground" };
    }
  };
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-1.5">
      {tasks.map(task => {
        const priority = priorityLabel(task.priority);
        return (
          <div key={task.id} className="border border-border hover:border-foreground/10 transition-colors">
            <button onClick={() => setExpandedId(expandedId === task.id ? null : task.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left">
              {task.status === "completed" ? (
                <CheckCircle2 className="w-3 h-3 text-accent shrink-0" />
              ) : (
                <Circle className={`w-3 h-3 shrink-0 ${task.priority === "critical" ? "text-destructive" : task.priority === "high" ? "text-warning" : "text-muted-foreground/40"}`} />
              )}
              <p className={`text-xs font-medium flex-1 leading-snug ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
              <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 ${priority.cls}`}>{priority.text}</span>
              {task.estimated_minutes > 0 && <span className="text-[9px] text-muted-foreground shrink-0">{task.estimated_minutes}m</span>}
            </button>
            <AnimatePresence>
              {expandedId === task.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 pt-1 border-t border-border/50">
                    <p className="text-xs text-muted-foreground leading-relaxed">{task.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      <div className="flex items-center gap-2 pt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[10px] text-muted-foreground">{tasks.filter(t => t.status === "completed").length} completed</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}

function DemoCareerTree() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(142 50% 40%)", "hsl(var(--warning))", "hsl(270 60% 55%)"];
  const mockCompanies: Record<string, string[]> = {
    "AI & Machine Learning": ["Google DeepMind", "OpenAI", "Anthropic", "Meta AI", "Mistral AI"],
    "Cybersecurity": ["CrowdStrike", "Palo Alto Networks", "Snyk", "Checkmarx"],
    "DevOps & Automazione": ["GitHub", "GitLab", "HashiCorp", "Docker"],
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">La tua tesi</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {MOCK_SECTORS.map((sector, i) => {
        const color = COLORS[i % COLORS.length];
        const isExpanded = expanded === sector.name;
        const comps = mockCompanies[sector.name] || [];
        return (
          <div key={sector.name} className="relative">
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border" />
            <button onClick={() => setExpanded(isExpanded ? null : sector.name)}
              className={`relative w-full flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-lg transition-all text-left ${isExpanded ? "bg-secondary/60" : "hover:bg-secondary/30"}`}>
              <div className="absolute left-[3px] top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-[9px] h-[9px] rounded-full border-2 shrink-0" style={{ borderColor: color, backgroundColor: isExpanded ? color : "transparent" }} />
                <div className="w-3 h-px" style={{ backgroundColor: color }} />
              </div>
              <div className="flex-1 min-w-0 ml-2">
                <span className="text-xs font-semibold text-foreground">{sector.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${sector.percentage}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{sector.percentage}%</span>
              </div>
              <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {isExpanded && comps.length > 0 && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="pl-8 pr-2 pb-2 space-y-1">
                    {comps.map((c, j) => (
                      <div key={j} className="flex items-center gap-2.5 pl-4 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors">
                        <Building2 className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] font-medium text-foreground">{c}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function DemoSupervisors() {
  const [selected, setSelected] = useState("s1");
  return (
    <div className="space-y-2">
      {MOCK_SUPERVISORS.map(sup => (
        <div key={sup.id} className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer ${selected === sup.id ? "bg-accent/10 border border-accent/20" : "hover:bg-secondary/50"}`}
          onClick={() => setSelected(sup.id)}>
          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
            {selected === sup.id ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <GraduationCap className="w-3.5 h-3.5 text-accent" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{sup.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{sup.university} · {sup.fields.join(", ")}</p>
            <a href={`mailto:${sup.email}`} className="text-[10px] text-accent hover:underline block">{sup.email}</a>
            <p className="text-[10px] text-foreground/60 line-clamp-1 mt-0.5">{sup.reasoning}</p>
          </div>
          <span className="text-[10px] font-bold text-accent shrink-0">{sup.score}%</span>
        </div>
      ))}
    </div>
  );
}

function DemoExperts() {
  return (
    <div className="space-y-1.5">
      {MOCK_EXPERTS.map(exp => (
        <div key={exp.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${exp.offerInterviews ? "bg-green-500/10" : "bg-accent/10"}`}>
            <Users className={`w-3.5 h-3.5 ${exp.offerInterviews ? "text-green-500" : "text-accent"}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-foreground truncate">{exp.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">{exp.title}</p>
            <a href={`mailto:${exp.email}`} className="text-[10px] text-accent hover:underline block">{exp.email}</a>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {exp.offerInterviews && <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">Intervista</span>}
            <span className="text-[10px] font-bold text-accent">{exp.score}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoReferences() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const categoryLabel: Record<string, { text: string; cls: string }> = {
    foundational: { text: "Foundational", cls: "bg-accent/10 text-accent" },
    methodology: { text: "Method", cls: "bg-warning/10 text-warning" },
    recent: { text: "Recent", cls: "bg-green-500/10 text-green-600" },
    contrarian: { text: "Critical", cls: "bg-destructive/10 text-destructive" },
  };

  return (
    <div className="space-y-1.5">
      {MOCK_REFERENCES.map((ref, i) => {
        const cat = categoryLabel[ref.category] || categoryLabel.foundational;
        return (
          <div key={i} className="rounded-lg hover:bg-secondary/30 transition-colors">
            <button onClick={() => setExpandedIdx(expandedIdx === i ? null : i)} className="w-full flex items-start gap-2.5 p-2.5 text-left">
              <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">{ref.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{ref.authors} ({ref.year})</p>
              </div>
              <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 rounded ${cat.cls}`}>{cat.text}</span>
            </button>
            <AnimatePresence>
              {expandedIdx === i && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2 pl-8">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{ref.relevance}</p>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 font-medium">
                      <ExternalLink className="w-3 h-3" /> Apri riferimento
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function DemoVulnerabilities() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
  const ranked = [...MOCK_VULNERABILITIES].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  return (
    <div className="space-y-1.5">
      {ranked.map((v, i) => {
        const severityColor = v.severity === "critical" ? "text-destructive" : v.severity === "high" ? "text-warning" : "text-muted-foreground";
        const severityBg = v.severity === "critical" ? "bg-destructive/[0.06]" : v.severity === "high" ? "bg-warning/[0.06]" : "bg-muted/30";
        return (
          <div key={v.id} className={`rounded-lg transition-colors ${severityBg}`}>
            <button onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="w-full flex items-start gap-2.5 p-2.5 text-left">
              <span className={`text-[10px] font-bold mt-0.5 shrink-0 w-4 text-center ${severityColor}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
                {expandedId !== v.id && <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">{v.description}</p>}
              </div>
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColor}`} />
            </button>
            <AnimatePresence>
              {expandedId === v.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="px-2.5 pb-2.5 pt-0 pl-6">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{v.description}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

function DemoRoadmap() {
  const [items, setItems] = useState(MOCK_ROADMAP);
  const toggleTask = (phaseKey: string, taskId: string) => {
    setItems(prev => prev.map(phase =>
      phase.key === phaseKey
        ? { ...phase, tasks: phase.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : phase
    ));
  };

  return (
    <div className="space-y-4">
      {items.map(phase => {
        const completedCount = phase.tasks.filter(t => t.completed).length;
        const progress = Math.round((completedCount / phase.tasks.length) * 100);
        return (
          <div key={phase.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{phase.title}</span>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] font-bold text-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div className="h-full bg-accent rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.8 }} />
            </div>
            <div className="space-y-1 pl-2">
              {phase.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-2 py-0.5">
                  <button onClick={() => toggleTask(phase.key, task.id)} className="shrink-0">
                    {task.completed ? <CheckCircle2 className="w-3 h-3 text-accent" /> : <Circle className="w-3 h-3 text-muted-foreground/40 hover:text-muted-foreground transition-colors" />}
                  </button>
                  <span className={`text-[11px] flex-1 ${task.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</span>
                  {task.due_date && <span className="text-[9px] text-muted-foreground">{new Date(task.due_date).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DemoChat() {
  return (
    <div className="space-y-3">
      {MOCK_MESSAGES.map(msg => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] px-4 py-3 text-xs rounded-2xl ${msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"}`}>
            <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN DEMO PAGE ───
export default function DemoPage() {
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(2); // Start at planning
  const [showChat, setShowChat] = useState(false);
  const currentPhase = PHASES[currentPhaseIdx].key;
  const completion = PHASE_COMPLETION[currentPhase] || 0;
  const confidence = PHASE_CONFIDENCE[currentPhase] || 0;

  const showOrientation = currentPhase === "orientation";
  const showTopicSupervisor = currentPhase === "topic_supervisor";
  const showPlanning = currentPhase === "planning";
  const showExecution = currentPhase === "execution";
  const showWriting = currentPhase === "writing";

  const cards: { key: string; component: React.ReactNode; colSpan?: string; delay: number }[] = [];
  let delay = 0.1;

  // Roadmap: planning+
  if (showPlanning || showExecution || showWriting) {
    cards.push({
      key: "roadmap", colSpan: !showTopicSupervisor ? "md:col-span-2 lg:col-span-2" : undefined, delay,
      component: <DemoCard title={showPlanning ? "Roadmap (under construction)" : "Roadmap"} icon={BarChart3}><DemoRoadmap /></DemoCard>,
    });
    delay += 0.05;
  }

  // Supervisors: topic_supervisor
  if (showTopicSupervisor) {
    cards.push({ key: "supervisors", delay, component: <DemoCard title="Suggested Supervisors" icon={GraduationCap}><DemoSupervisors /></DemoCard> });
    delay += 0.05;
  }

  // Career Tree: topic_supervisor
  if (showTopicSupervisor) {
    cards.push({ key: "career-tree", colSpan: !showPlanning ? "md:col-span-2" : undefined, delay, component: <DemoCard title="Possible Directions" icon={TrendingUp}><DemoCareerTree /></DemoCard> });
    delay += 0.05;
  }

  // Tasks: always
  cards.push({ key: "tasks", delay, component: <DemoCard title="Task" icon={Target}><DemoTasks phase={currentPhase} /></DemoCard> });
  delay += 0.05;

  // Experts: always
  cards.push({ key: "rubrica", delay, component: <DemoCard title={showTopicSupervisor ? "Interview Partners" : "Contacts"} icon={Users}><DemoExperts /></DemoCard> });
  delay += 0.05;

  // References: all phases
  cards.push({ key: "references", delay, component: <DemoCard title="Main References" icon={BookOpen} badge={MOCK_REFERENCES.length}><DemoReferences /></DemoCard> });
  delay += 0.05;

  // Vulnerabilities: execution+
  if (showExecution || showWriting) {
    cards.push({ key: "vulnerabilities", delay, component: <DemoCard title="Vulnerabilities" icon={ShieldAlert} badge={MOCK_VULNERABILITIES.length}><DemoVulnerabilities /></DemoCard> });
    delay += 0.05;
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Demo banner */}
      <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 text-center shrink-0">
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">Demo Mode — Simulated data — Click on phases to navigate</span>
      </div>

      {/* Top: Identity */}
      <div className="flex flex-col items-center pt-5 pb-2 shrink-0 relative gap-3">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Marco Demo</span>
        </div>

        <motion.div className="text-center px-16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-bold text-foreground font-display">{MOCK_THESIS}</h1>
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.div>

        {/* Confirmed track for planning+ */}
        {(showPlanning || showExecution || showWriting) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3 text-accent" />
              <span className="text-[11px] text-muted-foreground">Prof. Marco Rossi</span>
            </div>
            <span className="text-muted-foreground/30 text-[10px]">·</span>
            <span className="text-[11px] text-muted-foreground">AI & ML 42%</span>
            <span className="text-[11px] text-muted-foreground">Cybersecurity 28%</span>
          </motion.div>
        )}

        <motion.button
          onClick={() => setShowChat(!showChat)}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        >
          <MessageCircle className="w-4 h-4" />
          Talk to Socrate
        </motion.button>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 xl:px-16 pb-28">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
          {cards.map(card => (
            <motion.div key={card.key + currentPhase} className={card.colSpan || ""} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: card.delay }}>
              {card.component}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Phase stepper */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border py-3 px-6 z-30">
        <div className="flex items-center max-w-3xl mx-auto">
          {PHASES.map((p, i) => {
            const isCompleted = i < currentPhaseIdx;
            const isCurrent = i === currentPhaseIdx;
            return (
              <div key={p.key} className="flex items-center flex-1 last:flex-none">
                <button onClick={() => setCurrentPhaseIdx(i)} className="flex flex-col items-center gap-1.5 group">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all duration-300 cursor-pointer ${
                    isCompleted ? "bg-foreground text-background"
                      : isCurrent ? "bg-foreground/15 text-foreground border-2 border-foreground/30"
                      : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : p.icon}
                  </div>
                  <span className={`text-[8px] font-medium whitespace-nowrap transition-colors ${isCurrent ? "text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}>
                    {p.label}
                  </span>
                  {isCurrent && confidence > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-10 h-1 rounded-full bg-secondary overflow-hidden">
                        <motion.div className="h-full bg-foreground rounded-full" initial={{ width: 0 }} animate={{ width: `${confidence}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                      </div>
                      <span className="text-[7px] text-muted-foreground">{confidence}%</span>
                    </div>
                  )}
                </button>
                {i < PHASES.length - 1 && (
                  <div className={`flex-1 h-px mx-1.5 transition-colors duration-300 ${isCompleted ? "bg-foreground/60" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat overlay */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40" onClick={() => setShowChat(false)} />
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
              className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
                <SocrateCoin size={32} interactive={false} />
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground font-display">Socrate</p>
                  <p className="text-[10px] text-muted-foreground">Demo — simulated conversation</p>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <span className="text-muted-foreground text-sm">✕</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <DemoChat />
              </div>
              <div className="border-t border-border px-5 py-3 flex items-center gap-3">
                <input placeholder="Reply to Socrate..." disabled className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground opacity-50" />
                <button disabled className="p-2.5 rounded-full border border-border text-muted-foreground opacity-50"><Mic className="w-4 h-4" /></button>
                <button disabled className="p-2.5 bg-accent text-accent-foreground rounded-full opacity-50"><ArrowRight className="w-4 h-4" /></button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
