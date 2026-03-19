import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Users, Building2, CheckCircle2, Circle, GraduationCap,
  MessageCircle, ChevronRight, ShieldAlert, BarChart3, BookOpen,
  ExternalLink, ArrowRight, TrendingUp, Link2, Loader2, Mic,
  Mail, Lock, User, Eye, EyeOff, MapPin, Calendar,
  Compass, Lightbulb, PenTool, Sparkles, SkipForward, X,
  UserPlus, Share2, BarChart, Eye as EyeIcon,
} from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";

// ─── DEMO STEPS ───
type DemoStep = "login" | "onboarding" | "intro" | "socrate" | "dashboard";

// ─── TYPES ───
interface CareerSector { name: string; percentage: number; reasoning?: string; }
interface MockTask { id: string; title: string; description: string; priority: string; status: string; estimated_minutes: number; }
interface MockVulnerability { id: string; type: string; title: string; description: string; severity: string; }
interface MockReference { title: string; authors: string; year: string; url: string; category: string; relevance: string; }
interface MockSupervisor { id: string; name: string; fields: string[]; score: number; reasoning: string; email: string; university: string; }
interface MockExpert { id: string; name: string; title: string; score: number; reasoning: string; offerInterviews: boolean; email: string; }
interface RoadmapPhase { key: string; title: string; tasks: { id: string; title: string; completed: boolean; due_date?: string }[]; }

// ─── MOCK DATA ───
const MOCK_THESIS = "Applying Large Language Models for Automated Vulnerability Detection in Source Code";

const MOCK_SECTORS: CareerSector[] = [
  { name: "AI & Machine Learning", percentage: 42, reasoning: "Core of the thesis" },
  { name: "Cybersecurity", percentage: 28, reasoning: "Application domain" },
  { name: "DevOps & Automation", percentage: 15, reasoning: "CI/CD pipelines" },
  { name: "Academic Research", percentage: 10, reasoning: "Publications" },
  { name: "Tech Consulting", percentage: 5, reasoning: "Enterprise applications" },
];

const MOCK_TASKS: Record<string, MockTask[]> = {
  orientation: [
    { id: "t1", title: "Explore 3 areas of interest", description: "Identify at least three macro-areas of interest and write pros/cons for each.", priority: "high", status: "completed", estimated_minutes: 30 },
    { id: "t2", title: "Read survey on LLMs for code analysis", description: "Find and read at least one recent survey on LLMs for code analysis.", priority: "high", status: "completed", estimated_minutes: 60 },
    { id: "t3", title: "Define preliminary research question", description: "Write a first version of the research question.", priority: "critical", status: "pending", estimated_minutes: 45 },
  ],
  topic_supervisor: [
    { id: "t4", title: "Contact Prof. Rossi for supervision", description: "Write a motivated email to Prof. Rossi explaining your interest in LLM research.", priority: "critical", status: "pending", estimated_minutes: 30 },
    { id: "t5", title: "Prepare thesis outline (5 chapters)", description: "Define the macro-structure of the thesis with provisional chapter titles.", priority: "high", status: "pending", estimated_minutes: 60 },
    { id: "t6", title: "Collect vulnerability datasets", description: "Identify and download at least 2 public software vulnerability datasets.", priority: "medium", status: "pending", estimated_minutes: 90 },
  ],
  planning: [
    { id: "t7", title: "Create detailed timeline", description: "Break down the work into bi-weekly sprints with measurable deliverables.", priority: "high", status: "completed", estimated_minutes: 45 },
    { id: "t8", title: "Set up experimental environment", description: "Configure cloud GPU, Git repository and training pipeline.", priority: "critical", status: "pending", estimated_minutes: 120 },
    { id: "t9", title: "Define evaluation metrics", description: "Choose precision, recall, F1 and specific metrics for vulnerability detection.", priority: "high", status: "pending", estimated_minutes: 30 },
  ],
  execution: [
    { id: "t10", title: "Fine-tune GPT-4 on CWE dataset", description: "Run fine-tuning of the model on the CWE vulnerability dataset.", priority: "critical", status: "pending", estimated_minutes: 240 },
    { id: "t11", title: "Benchmark against SAST tools", description: "Compare model results with SonarQube, Semgrep, CodeQL.", priority: "high", status: "pending", estimated_minutes: 180 },
    { id: "t12", title: "Qualitative analysis of false positives", description: "Classify and analyze the most common false positive patterns.", priority: "medium", status: "pending", estimated_minutes: 120 },
  ],
  writing: [
    { id: "t13", title: "Write Methodology chapter", description: "Describe in detail the experimental pipeline, models used and training parameters.", priority: "critical", status: "pending", estimated_minutes: 300 },
    { id: "t14", title: "Create result charts", description: "Generate confusion matrix, ROC curves and comparative tables.", priority: "high", status: "pending", estimated_minutes: 120 },
    { id: "t15", title: "Final review with supervisor", description: "Send the complete draft to the supervisor for final review.", priority: "critical", status: "pending", estimated_minutes: 60 },
  ],
};

const MOCK_ROADMAP: RoadmapPhase[] = [
  {
    key: "planning", title: "Planning",
    tasks: [
      { id: "r1", title: "Define final research questions", completed: true },
      { id: "r2", title: "Get supervisor approval", completed: true },
      { id: "r3", title: "Set up cloud environment (GPU)", completed: false, due_date: "2026-04-15" },
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
      { id: "r9", title: "Chapters 1-2 (Intro + State of the art)", completed: false, due_date: "2026-07-01" },
      { id: "r10", title: "Chapter 3 (Methodology)", completed: false, due_date: "2026-07-15" },
      { id: "r11", title: "Chapters 4-5 (Results + Conclusions)", completed: false, due_date: "2026-08-01" },
      { id: "r12", title: "Final review", completed: false, due_date: "2026-08-15" },
    ],
  },
];

const MOCK_SUPERVISORS: MockSupervisor[] = [
  { id: "s1", name: "Prof. Marco Rossi", fields: ["NLP", "Code Analysis"], score: 92, reasoning: "Prof. Rossi is one of the leading European researchers in NLP applied to software engineering. He has published over 40 papers on automated code analysis and supervised 12 master's theses on topics related to yours. His experience with transformer models for code understanding makes him the ideal candidate to guide you through the experimental part.", email: "marco.rossi@ethz.ch", university: "ETH Zurich" },
  { id: "s2", name: "Prof. Elena Bianchi", fields: ["Cybersecurity", "ML"], score: 85, reasoning: "Prof. Bianchi has active research on automated vulnerability detection using machine learning techniques. Her lab has developed open-source tools for static code analysis that you could integrate as a baseline in your work. Her expertise in the cybersecurity domain is complementary to your LLM focus.", email: "elena.bianchi@epfl.ch", university: "EPFL" },
  { id: "s3", name: "Prof. Luigi Verdi", fields: ["Software Engineering", "Testing"], score: 78, reasoning: "Considering you're in the planning phase, Prof. Verdi's experience in software engineering and automated testing could help you structure the experimental pipeline. However, his focus is more oriented toward functional testing than vulnerability detection, which could limit support on the more specific part of the thesis.", email: "luigi.verdi@uzh.ch", university: "UZH" },
];

const MOCK_EXPERTS: MockExpert[] = [
  { id: "e1", name: "Dr. Paolo Ferretti", title: "Security Researcher @ Google", score: 88, reasoning: "Expert in fuzzing and vulnerability research.", offerInterviews: true, email: "p.ferretti@google.com" },
  { id: "e2", name: "Dr. Maria Conti", title: "ML Engineer @ DeepMind", score: 82, reasoning: "Publications on LLMs for code generation.", offerInterviews: true, email: "m.conti@deepmind.com" },
  { id: "e3", name: "Ing. Luca Barbieri", title: "CTO @ CyberNext", score: 75, reasoning: "Industry experience in AI for cybersecurity.", offerInterviews: false, email: "l.barbieri@cybernext.ch" },
];

const MOCK_REFERENCES: MockReference[] = [
  { title: "Large Language Models for Code: Opportunities and Challenges", authors: "Chen et al.", year: "2024", url: "#", category: "foundational", relevance: "Foundational survey on LLMs for code." },
  { title: "VulDeePecker: A Deep Learning-Based System for Vulnerability Detection", authors: "Li et al.", year: "2018", url: "#", category: "methodology", relevance: "First paper to use deep learning for vulnerability detection." },
  { title: "Automated Vulnerability Detection with ML: A Systematic Review", authors: "Zhang, Wang", year: "2025", url: "#", category: "recent", relevance: "Systematic review of ML for vulnerability detection." },
  { title: "The Limits of LLMs in Security Analysis", authors: "Pearce et al.", year: "2025", url: "#", category: "contrarian", relevance: "Critical analysis of LLM limitations in security." },
];

const MOCK_VULNERABILITIES: MockVulnerability[] = [
  { id: "v1", type: "methodology_flaw", title: "Dataset too small to generalize", description: "With only 5000 training samples, the model risks overfitting.", severity: "critical" },
  { id: "v2", type: "logic_gap", title: "Missing non-ML baseline", description: "No comparison with standard SAST approaches.", severity: "high" },
  { id: "v3", type: "superficiality", title: "Related work too generic", description: "Related works list papers without critical analysis.", severity: "medium" },
];

const MOCK_SOCRATE_MESSAGES = [
  { id: "m1", role: "assistant" as const, content: "You have a clear direction: LLMs for vulnerability detection. Great starting point. But tell me: **what makes your approach different** from those who have already fine-tuned models on vulnerability datasets?" },
  { id: "m2", role: "user" as const, content: "I want to combine traditional static analysis with LLMs, creating a hybrid system." },
  { id: "m3", role: "assistant" as const, content: "Interesting. A hybrid SAST + LLM approach has potential, but you need to be precise: **which component does what?** The risk is that the LLM is just a glorified wrapper for static rules. Define the boundary clearly." },
  { id: "m4", role: "user" as const, content: "SAST would do the initial screening, then the LLM would analyze the results to reduce false positives." },
  { id: "m5", role: "assistant" as const, content: "This is a **concrete contribution**: reducing false positives through post-processing with LLMs. It's measurable, useful and publishable. Now the critical question: **do you have access to a dataset with false positive annotations?** Without that, you can't train the model to distinguish them." },
];

const PHASES = [
  { key: "orientation", label: "Orientation", icon: "1" },
  { key: "topic_supervisor", label: "Topic & Supervisor", icon: "2" },
  { key: "planning", label: "Planning", icon: "3" },
  { key: "execution", label: "Execution", icon: "4" },
  { key: "writing", label: "Writing", icon: "5" },
] as const;

const PHASE_COMPLETION: Record<string, number> = {
  orientation: 100, topic_supervisor: 75, planning: 45, execution: 15, writing: 0,
};

const PHASE_CONFIDENCE: Record<string, number> = {
  orientation: 100, topic_supervisor: 82, planning: 60, execution: 25, writing: 0,
};

// ══════════════════════════════════════════════════════
// STEP 1: DEMO LOGIN PAGE
// ══════════════════════════════════════════════════════
function DemoLogin({ onNext }: { onNext: () => void }) {
  const [isSignUp, setIsSignUp] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-white/[0.02] blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-white text-2xl font-bold tracking-[0.15em] uppercase">
            THESIS ALLY
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-white/40 text-sm mt-3">
            {isSignUp ? "Create your account to get started" : "Welcome back"}
          </motion.p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {isSignUp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input defaultValue="Marco" placeholder="First name" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
                </div>
                <input defaultValue="Demo" placeholder="Last name" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input defaultValue="ETH Zurich" placeholder="University" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input defaultValue="MSc Computer Science" placeholder="Degree program" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input defaultValue="Sep 2026" placeholder="Expected graduation" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
                </div>
              </div>
            </motion.div>
          )}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type="email" defaultValue="marco.demo@ethz.ch" placeholder="Email" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input type={showPassword ? "text" : "password"} defaultValue="demo1234" placeholder="Password" className="w-full bg-white/[0.06] border border-white/[0.08] rounded-none px-4 pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/50">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button type="submit" className="w-full bg-white text-black py-3 text-sm font-semibold uppercase tracking-wider hover:bg-white/90 transition-colors flex items-center justify-center gap-2 mt-4">
            {isSignUp ? "Sign Up" : "Sign In"} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-sm text-white/30 mt-6">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-white/60 hover:text-white transition-colors underline underline-offset-4">
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 2: DEMO ONBOARDING
// ══════════════════════════════════════════════════════
const JOURNEY_OPTIONS = [
  { key: "lost", icon: Compass, title: "I'm lost", desc: "I have no idea what to write yet." },
  { key: "vague_idea", icon: Lightbulb, title: "I have a vague idea", desc: "I have a rough topic but need to refine it." },
  { key: "topic_chosen", icon: Target, title: "I've chosen the topic", desc: "I know what I want to write about." },
  { key: "writing", icon: PenTool, title: "I'm already writing", desc: "I need support for writing and revision." },
];

function DemoOnboarding({ onNext }: { onNext: () => void }) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl text-center space-y-8">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">Welcome, Marco</h1>
          <p className="text-muted-foreground mt-2">Where are you in your thesis journey?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
          {JOURNEY_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSelected(opt.key)}
              className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${
                selected === opt.key
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-foreground/20 hover:bg-secondary/30"
              }`}
            >
              <opt.icon className={`w-5 h-5 mt-0.5 shrink-0 ${selected === opt.key ? "text-accent" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={onNext} className="px-8 py-3 bg-foreground text-background text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-foreground/90 transition-colors">
              Continue <ArrowRight className="w-4 h-4 inline ml-2" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 3: DEMO SOCRATE INTRO (abbreviated)
// ══════════════════════════════════════════════════════
function DemoIntro({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"coin" | "text" | "choice">("coin");
  const [subtitle, setSubtitle] = useState("");

  const subtitles = [
    { text: "\"True wisdom lies in knowing you know nothing.\"", delay: 0 },
    { text: "\"An unexamined thesis is not worth writing.\"", delay: 2800 },
    { text: "I am Socrates.", delay: 5600 },
  ];

  useEffect(() => {
    if (phase !== "coin") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    subtitles.forEach(s => timers.push(setTimeout(() => setSubtitle(s.text), s.delay)));
    timers.push(setTimeout(() => setPhase("text"), 7500));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "text") return;
    const t = setTimeout(() => setPhase("choice"), 2000);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        {phase === "coin" && (
          <motion.div key="coin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 2, ease: "easeOut" }}>
              <SocrateCoin size={280} interactive={false} />
            </motion.div>
            <div className="mt-12 h-20 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {subtitle && (
                  <motion.p key={subtitle} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="font-display text-background/90 text-2xl md:text-3xl font-medium text-center px-8 italic leading-snug tracking-tight">
                    {subtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {(phase === "text" || phase === "choice") && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center max-w-xl px-8">
            <motion.div initial={{ scale: 1 }} animate={{ scale: 0.35 }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} className="mb-8">
              <SocrateCoin size={200} interactive={false} />
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="font-display text-background/60 text-base md:text-lg leading-[1.8] text-center mb-10">
              Marco, I'm here to challenge your ideas, find weak points and push you toward a thesis worth defending. Choose how you want to interact.
            </motion.p>

            {phase === "choice" && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex gap-14">
                <button onClick={onNext} className="group flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                    <Mic className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                  </div>
                  <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">Voice</span>
                </button>
                <button onClick={onNext} className="group flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                    <PenTool className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                  </div>
                  <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">Text</span>
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 4: DEMO SOCRATE CONVERSATION
// ══════════════════════════════════════════════════════
function DemoSocrateChat({ onSkip }: { onSkip: () => void }) {
  const [visibleMsgs, setVisibleMsgs] = useState<typeof MOCK_SOCRATE_MESSAGES>([]);
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    if (msgIdx >= MOCK_SOCRATE_MESSAGES.length) return;
    const delay = msgIdx === 0 ? 800 : MOCK_SOCRATE_MESSAGES[msgIdx].role === "assistant" ? 2500 : 1500;
    const timer = setTimeout(() => {
      setVisibleMsgs(prev => [...prev, MOCK_SOCRATE_MESSAGES[msgIdx]]);
      setMsgIdx(prev => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [msgIdx]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <SocrateCoin size={36} interactive={false} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground font-display">Socrate</p>
          <p className="text-[10px] text-muted-foreground">Exploration phase — thesis definition</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        <AnimatePresence>
          {visibleMsgs.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[75%] px-4 py-3 text-xs rounded-2xl ${
                msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"
              }`}>
                <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {msgIdx < MOCK_SOCRATE_MESSAGES.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="flex gap-1.5 px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom bar with Skip button */}
      <div className="border-t border-border px-5 py-3 flex items-center gap-3 shrink-0">
        <input placeholder="Reply to Socrates..." disabled className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground opacity-50" />
        <button disabled className="p-2.5 rounded-full border border-border text-muted-foreground opacity-50"><Mic className="w-4 h-4" /></button>
        <button disabled className="p-2.5 bg-accent text-accent-foreground rounded-full opacity-50"><ArrowRight className="w-4 h-4" /></button>
      </div>

      {/* Skip to my progress button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-20 right-6 z-[60]"
      >
        <button
          onClick={onSkip}
          className="flex items-center gap-2 px-5 py-2.5 bg-foreground text-background text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-foreground/90 transition-all shadow-lg"
        >
          <SkipForward className="w-3.5 h-3.5" />
          Skip to my progress
        </button>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 5: DASHBOARD (existing demo dashboard)
// ══════════════════════════════════════════════════════

// ─── CARD COMPONENT with overflow detection & expand dialog ───
function DemoCard({ title, icon: Icon, children, badge, className = "", maxContentHeight = 200 }: {
  title: string; icon: React.ElementType; children: React.ReactNode; badge?: number | null; className?: string; maxContentHeight?: number;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const check = () => setIsOverflowing(el.scrollHeight > maxContentHeight + 8);
    check();
    const observer = new MutationObserver(check);
    observer.observe(el, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [maxContentHeight, children]);

  return (
    <>
      <div className={`bg-card border border-border rounded-lg flex flex-col h-full ds-card-hover ${className}`}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border shrink-0">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
          {badge != null && badge > 0 && (
            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
          )}
        </div>
        <div className="relative flex-1 min-h-0">
          <div
            ref={contentRef}
            className="px-4 py-2.5 overflow-hidden"
            style={{ maxHeight: maxContentHeight }}
          >
            {children}
          </div>
          {isOverflowing && (
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-10 bg-gradient-to-t from-card to-transparent" />
              <div className="bg-card px-4 pb-2 pt-0">
                <button
                  onClick={() => setExpanded(true)}
                  className="w-full text-center text-[10px] font-medium text-accent hover:text-accent/80 transition-colors py-1"
                >
                  Show all
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded modal */}
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 backdrop-blur-sm z-[60]"
              onClick={() => setExpanded(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-6 lg:inset-x-[15%] lg:inset-y-[10%] z-[61] bg-card border border-border rounded-lg shadow-xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex-1">{title}</span>
                {badge != null && badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-destructive/20 text-destructive">{badge}</span>
                )}
                <button onClick={() => setExpanded(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors ml-2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

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
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Your thesis</span>
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
  const [selected, setSelected] = useState<string | null>(null);
  const [motivation, setMotivation] = useState("");

  return (
    <div className="space-y-2">
      {MOCK_SUPERVISORS.map(sup => {
        const isSelected = selected === sup.id;
        return (
          <div key={sup.id}>
            <div
              className={`flex items-center gap-2.5 p-2.5 rounded-lg transition-colors cursor-pointer ${isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-secondary/50"}`}
              onClick={() => setSelected(isSelected ? null : sup.id)}
            >
              <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                {isSelected ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <GraduationCap className="w-3.5 h-3.5 text-accent" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground">{sup.name}</p>
                <p className="text-[10px] text-muted-foreground">{sup.fields.join(", ")}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-2.5 h-2.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{sup.email}</span>
                </div>
              </div>
              <span className="text-[10px] font-bold text-accent shrink-0">{sup.score}%</span>
            </div>

            <AnimatePresence>
              {isSelected && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pt-2 pb-3 space-y-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{sup.reasoning}</p>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-medium text-muted-foreground">Why this supervisor?</label>
                      <textarea
                        value={motivation}
                        onChange={e => setMotivation(e.target.value)}
                        placeholder="Explain your motivation..."
                        className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:border-accent/30 transition-colors"
                        rows={2}
                      />
                    </div>

                    <button className="px-4 py-2 bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-wider rounded-lg hover:bg-accent/90 transition-colors">
                      Confirm selection
                    </button>
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
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {exp.offerInterviews && <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 font-medium">Interview</span>}
            <span className="text-[10px] font-bold text-accent">{exp.score}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoReferences() {
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
          <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-secondary/30 transition-colors">
            <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground leading-tight">{ref.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{ref.authors} ({ref.year})</p>
            </div>
            <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 rounded ${cat.cls}`}>{cat.text}</span>
          </div>
        );
      })}
    </div>
  );
}

function DemoVulnerabilities() {
  const ranked = [...MOCK_VULNERABILITIES].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  return (
    <div className="space-y-1.5">
      {ranked.map((v, i) => {
        const severityColor = v.severity === "critical" ? "text-destructive" : v.severity === "high" ? "text-warning" : "text-muted-foreground";
        const severityBg = v.severity === "critical" ? "bg-destructive/[0.06]" : v.severity === "high" ? "bg-warning/[0.06]" : "bg-muted/30";
        return (
          <div key={v.id} className={`rounded-lg p-2.5 ${severityBg}`}>
            <div className="flex items-start gap-2.5">
              <span className={`text-[10px] font-bold mt-0.5 shrink-0 w-4 text-center ${severityColor}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{v.description}</p>
              </div>
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColor}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DemoInviteSupervisor({ confirmed }: { confirmed: boolean }) {
  const [invited, setInvited] = useState(false);

  return (
    <div className="space-y-3">
      {!confirmed ? (
        <>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once you've chosen your supervisor, you can invite them to the platform to share your progress in real time.
          </p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-accent/5 border border-accent/10">
            <Share2 className="w-3.5 h-3.5 text-accent shrink-0" />
            <p className="text-[11px] text-foreground leading-snug">
              The supervisor can <strong>view roadmap, tasks and progress</strong>, but won't have access to Socrates.
            </p>
          </div>
        </>
      ) : invited ? (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-accent/5 border border-accent/20">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Prof. Marco Rossi</p>
              <p className="text-[10px] text-accent">Invite sent · marco.rossi@ethz.ch</p>
            </div>
          </div>
          <div className="space-y-1.5 pl-1">
            <p className="text-[10px] font-semibold text-foreground uppercase tracking-wider">What the supervisor can see:</p>
            <div className="flex items-center gap-2 py-1">
              <EyeIcon className="w-3 h-3 text-accent shrink-0" />
              <span className="text-[11px] text-muted-foreground">Roadmap and overall progress</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <BarChart className="w-3 h-3 text-accent shrink-0" />
              <span className="text-[11px] text-muted-foreground">Completed and in-progress tasks</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              <BookOpen className="w-3 h-3 text-accent shrink-0" />
              <span className="text-[11px] text-muted-foreground">References and vulnerabilities</span>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <ShieldAlert className="w-3 h-3 text-muted-foreground shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-snug">
              Conversations with Socrates remain <strong className="text-foreground">private</strong> and are not visible to the supervisor.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Invite your supervisor to follow your progress. They can view roadmap, tasks and milestones, but <strong className="text-foreground">won't have access to Socrates</strong>.
          </p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/50 border border-border">
            <GraduationCap className="w-4 h-4 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">Prof. Marco Rossi</p>
              <p className="text-[10px] text-muted-foreground">marco.rossi@ethz.ch</p>
            </div>
          </div>
          <button
            onClick={() => setInvited(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-accent-foreground text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-accent/90 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite supervisor
          </button>
        </div>
      )}
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
                  {task.due_date && <span className="text-[9px] text-muted-foreground">{new Date(task.due_date).toLocaleDateString("en-US", { day: "numeric", month: "short" })}</span>}
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
      {MOCK_SOCRATE_MESSAGES.map(msg => (
        <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[80%] px-4 py-3 text-xs rounded-2xl ${msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"}`}>
            <p className="leading-relaxed" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// DASHBOARD VIEW
// ══════════════════════════════════════════════════════
function DemoDashboard() {
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(2);
  const [showChat, setShowChat] = useState(false);
  const currentPhase = PHASES[currentPhaseIdx].key;
  const confidence = PHASE_CONFIDENCE[currentPhase] || 0;

  const showTopicSupervisor = currentPhase === "topic_supervisor";
  const showPlanning = currentPhase === "planning";
  const showExecution = currentPhase === "execution";
  const showWriting = currentPhase === "writing";

  const cards: { key: string; component: React.ReactNode; colSpan?: string; delay: number }[] = [];
  let delay = 0.1;

  if (showPlanning || showExecution || showWriting) {
    cards.push({ key: "roadmap", colSpan: "md:col-span-2 lg:col-span-2", delay, component: <DemoCard title="Roadmap" icon={BarChart3}><DemoRoadmap /></DemoCard> });
    delay += 0.05;
  }
  if (showTopicSupervisor) {
    cards.push({ key: "supervisors", delay, component: <DemoCard title="Suggested Supervisors" icon={GraduationCap}><DemoSupervisors /></DemoCard> });
    delay += 0.05;
    cards.push({ key: "career-tree", colSpan: "md:col-span-2", delay, component: <DemoCard title="Possible Directions" icon={TrendingUp}><DemoCareerTree /></DemoCard> });
    delay += 0.05;
  }
  // Invite supervisor is now inline in the header, not a card
  cards.push({ key: "tasks", delay, component: <DemoCard title="Tasks" icon={Target}><DemoTasks phase={currentPhase} /></DemoCard> });
  delay += 0.05;
  cards.push({ key: "rubrica", delay, component: <DemoCard title="Contacts" icon={Users}><DemoExperts /></DemoCard> });
  delay += 0.05;
  cards.push({ key: "references", delay, component: <DemoCard title="Main References" icon={BookOpen} badge={MOCK_REFERENCES.length}><DemoReferences /></DemoCard> });
  delay += 0.05;
  if (showExecution || showWriting) {
    cards.push({ key: "vulnerabilities", delay, component: <DemoCard title="Vulnerabilities" icon={ShieldAlert} badge={MOCK_VULNERABILITIES.length}><DemoVulnerabilities /></DemoCard> });
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Demo banner */}
      <div className="bg-accent/10 border-b border-accent/20 px-4 py-2 text-center shrink-0">
        <span className="text-xs font-semibold text-accent uppercase tracking-wider">Demo Mode — Simulated data — Click phases to navigate</span>
      </div>

      {/* Top: Identity */}
      <div className="flex flex-col items-center pt-6 pb-6 shrink-0 relative gap-5">
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Marco Demo</span>
          {(showTopicSupervisor || showPlanning || showExecution || showWriting) && (
            <button
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors"
              title="Invita il tuo relatore a seguire i progressi"
              onClick={() => {}}
            >
              <UserPlus className="w-3 h-3" />
              Invita relatore
            </button>
          )}
        </div>

        <motion.div className="text-center px-16" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-lg font-bold text-foreground font-display">{MOCK_THESIS}</h1>
            <Link2 className="w-4 h-4 text-muted-foreground" />
          </div>
        </motion.div>

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
          Parla con Socrate
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
                  <p className="text-[10px] text-muted-foreground">Demo — conversazione simulata</p>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <span className="text-muted-foreground text-sm">✕</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <DemoChat />
              </div>
              <div className="border-t border-border px-5 py-3 flex items-center gap-3">
                <input placeholder="Rispondi a Socrate..." disabled className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground opacity-50" />
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

// ══════════════════════════════════════════════════════
// MAIN DEMO ORCHESTRATOR
// ══════════════════════════════════════════════════════
export default function DemoPage() {
  const [step, setStep] = useState<DemoStep>("login");

  return (
    <AnimatePresence mode="wait">
      {step === "login" && (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <DemoLogin onNext={() => setStep("onboarding")} />
        </motion.div>
      )}
      {step === "onboarding" && (
        <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <DemoOnboarding onNext={() => setStep("intro")} />
        </motion.div>
      )}
      {step === "intro" && (
        <motion.div key="intro" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <DemoIntro onNext={() => setStep("socrate")} />
        </motion.div>
      )}
      {step === "socrate" && (
        <motion.div key="socrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <DemoSocrateChat onSkip={() => setStep("dashboard")} />
        </motion.div>
      )}
      {step === "dashboard" && (
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <DemoDashboard />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
