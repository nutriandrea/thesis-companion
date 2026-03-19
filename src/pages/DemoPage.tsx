import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Target, Users, Building2, CheckCircle2, Circle, GraduationCap,
  MessageCircle, ChevronRight, ShieldAlert, BarChart3, BookOpen,
  ExternalLink, ArrowRight, TrendingUp, Link2, Loader2, Mic,
  Mail, Lock, User, Eye, EyeOff, MapPin, Calendar,
  Compass, Lightbulb, PenTool, Sparkles, SkipForward, X, Send,
  UserPlus, Share2, BarChart, Eye as EyeIcon, Volume2, FileText, Keyboard,
} from "lucide-react";
import SocrateCoin from "@/components/shared/SocrateCoin";
import ReactMarkdown from "react-markdown";

// ─── DEMO STEPS ───
type DemoStep = "login" | "onboarding" | "intro" | "socrate" | "dashboard";

// ─── TYPES ───
interface ChatMsg { id: string; role: "user" | "assistant"; content: string; }
interface CareerSector { name: string; percentage: number; reasoning?: string; }
interface MockTask { id: string; title: string; description: string; priority: string; status: string; estimated_minutes: number; }
interface MockVulnerability { id: string; type: string; title: string; description: string; severity: string; }
interface MockReference { title: string; authors: string; year: string; url: string; category: string; relevance: string; }
interface MockSupervisor { id: string; name: string; fields: string[]; score: number; reasoning: string; email: string; university: string; }
interface MockExpert { id: string; name: string; title: string; score: number; reasoning: string; offerInterviews: boolean; email: string; }
interface RoadmapPhase { key: string; title: string; tasks: { id: string; title: string; completed: boolean; due_date?: string }[]; }

// ─── BACKEND URLS ───
const SOCRATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/socrate`;
const DEMO_ENGINE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/demo-engine`;
const DEMO_STUDENT_CONTEXT = `Name: Marco Demo\nDegree: MSc Computer Science\nUniversity: ETH Zurich\nSkills: Python, machine learning, NLP, data analysis\nState: topic_chosen\nTopic: Explainable Vulnerability Detection: Using Chain-of-Thought Prompting to Audit LLM Security Analysis in Source Code`;

// ─── DEMO ENGINE HOOK ───
function useDemoEngine<T>(mode: string, extraParams?: Record<string, any>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(DEMO_ENGINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      body: JSON.stringify({ mode, ...extraParams }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, JSON.stringify(extraParams)]);

  return { data, loading, error };
}

function useDemoChat(initialMessages?: ChatMsg[]) {
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages || []);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);

    const apiMessages = [...messages, userMsg].slice(-20).map(m => ({ role: m.role, content: m.content }));

    try {
      const resp = await fetch(SOCRATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: apiMessages,
          studentContext: DEMO_STUDENT_CONTEXT,
          mode: "chat",
        }),
      });

      if (!resp.ok) {
        setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "Sorry, I couldn't process that. Try again." }]);
        setIsStreaming(false);
        return;
      }

      const assistantId = `a-${Date.now()}`;
      setMessages(prev => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      // Stream the response
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const delta = JSON.parse(jsonStr).choices?.[0]?.delta?.content;
            if (delta) {
              content += delta;
              const cleaned = content.replace(/<!--\s*THESIS_TITLE:.*?-->/g, "").replace(/<!--\s*THESIS_READY\s*-->/g, "").trim();
              setMessages(prev => prev.map(m => m.id === assistantId ? { ...m, content: cleaned } : m));
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: "assistant", content: "Connection error. Try again." }]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, messages]);

  return { messages, setMessages, input, setInput, isStreaming, sendMessage, bottomRef };
}

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
// STEP 2: DEMO ONBOARDING (matches real OnboardingFlow)
// ══════════════════════════════════════════════════════
const JOURNEY_OPTIONS = [
  { key: "lost", icon: Compass, title: "I'm lost", desc: "I have no idea what to write yet. I need inspiration." },
  { key: "vague_idea", icon: Lightbulb, title: "I have a vague idea", desc: "I have a rough topic but need to refine and structure it." },
  { key: "topic_chosen", icon: Target, title: "I've chosen the topic", desc: "I know what I want to write about. I need a roadmap, timeline and supervisor." },
  { key: "writing", icon: PenTool, title: "I'm already writing", desc: "I've started. I need support for writing, revision and defense." },
];

function DemoOnboarding({ onNext }: { onNext: () => void }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [degree, setDegree] = useState("MSc Computer Science");
  const [university, setUniversity] = useState("ETH Zurich");
  const [skills, setSkills] = useState("Python, machine learning, NLP, data analysis");
  const [topicInput, setTopicInput] = useState("");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold font-display">Hi, Marco!</h1>
                <p className="text-muted-foreground mt-2 text-lg">Before we begin, Socrates wants to get to know you. Answer a few questions.</p>
              </div>
              <button onClick={() => setStep(1)} className="px-8 py-3 bg-foreground text-background text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-foreground/90 transition-colors inline-flex items-center gap-2">
                Let's begin <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="about" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Tell us about yourself</h2>
                <p className="text-muted-foreground mt-1">This info will help Socrates challenge you better</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Degree program</label>
                    <input value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. MSc Computer Science"
                      className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">University</label>
                    <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. ETH Zurich"
                      className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Skills (comma separated)</label>
                  <input value={skills} onChange={e => setSkills(e.target.value)} placeholder="e.g. Python, machine learning, NLP, data analysis"
                    className="w-full bg-card border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setStep(2)} className="px-8 py-3 bg-foreground text-background text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-foreground/90 transition-colors inline-flex items-center gap-2">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="state" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Where are you?</h2>
                <p className="text-muted-foreground mt-1">Select the state that best describes you</p>
              </div>
              <div className="space-y-3">
                {JOURNEY_OPTIONS.map(opt => (
                  <button key={opt.key} onClick={() => setSelected(opt.key)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left
                      ${selected === opt.key
                        ? "border-accent bg-accent/5 shadow-md ring-2 ring-accent/20"
                        : "border-border bg-card hover:border-accent/40 hover:shadow-sm"}`}>
                    <div className={`p-2.5 rounded-lg shrink-0 ${selected === opt.key ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                      <opt.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{opt.title}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex justify-end">
                <button onClick={() => setStep(3)} disabled={!selected} className="px-8 py-3 bg-foreground text-background text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-foreground/90 transition-colors inline-flex items-center gap-2 disabled:opacity-30">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="topic" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold font-display">Do you have a topic in mind?</h2>
                <p className="text-muted-foreground mt-1">Even a vague idea. Socrates will help you develop it.</p>
              </div>
              <textarea value={topicInput} onChange={e => setTopicInput(e.target.value)}
                placeholder="e.g. 'Applying NLP to automate knowledge discovery' or 'something related to AI and medicine'..."
                className="w-full h-32 bg-card border rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent" />
              <div className="flex justify-between">
                <button onClick={() => setStep(2)} className="px-6 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">Back</button>
                <button onClick={onNext} className="px-8 py-3 bg-accent text-accent-foreground text-sm font-semibold uppercase tracking-wider rounded-lg hover:bg-accent/90 transition-colors inline-flex items-center gap-2">
                  Meet Socrates <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 3: DEMO SOCRATE INTRO (1:1 with SocrateIntro)
// ══════════════════════════════════════════════════════
function DemoIntro({ onNext }: { onNext: () => void }) {
  const [phase, setPhase] = useState<"coin-reveal" | "coin-translate" | "text-appear" | "mode-choice">("coin-reveal");
  const [currentSubtitle, setCurrentSubtitle] = useState("");

  const subtitles = [
    { text: "\"True wisdom lies in knowing you know nothing.\"", delay: 0, duration: 2500 },
    { text: "\"An unexamined thesis is not worth writing.\"", delay: 2800, duration: 2500 },
    { text: "I am Socrates.", delay: 5600, duration: 2000 },
  ];

  const introText = "Marco, I am here for one reason only: to challenge every idea you have, find the weak points, and push you to build a thesis worth defending.\n\nI will not give you easy answers. Instead, I will ask you the questions no one else dares to ask.";

  useEffect(() => {
    if (phase !== "coin-reveal") return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    subtitles.forEach((sub) => {
      timers.push(setTimeout(() => setCurrentSubtitle(sub.text), sub.delay));
    });
    timers.push(setTimeout(() => setPhase("coin-translate"), 8500));
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== "coin-translate") return;
    const timer = setTimeout(() => setPhase("text-appear"), 1500);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "text-appear") return;
    const timer = setTimeout(() => setPhase("mode-choice"), 2000);
    return () => clearTimeout(timer);
  }, [phase]);

  return (
    <div className="fixed inset-0 z-50 bg-foreground overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        {phase === "coin-reveal" && (
          <motion.div
            key="coin-reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="relative flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
            >
              <SocrateCoin size={280} interactive={false} />
            </motion.div>
            <div className="mt-12 h-20 flex items-center justify-center">
              <AnimatePresence mode="wait">
                {currentSubtitle && (
                  <motion.p
                    key={currentSubtitle}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.6 }}
                    className="font-display text-background/90 text-2xl md:text-3xl font-medium text-center px-8 italic leading-snug tracking-tight"
                  >
                    {currentSubtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {(phase === "coin-translate" || phase === "text-appear" || phase === "mode-choice") && (
          <motion.div
            key="main-layout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <motion.div
              initial={{ x: 0, y: 0 }}
              animate={{
                x: typeof window !== "undefined" ? window.innerWidth / 2 - 160 : 300,
                y: typeof window !== "undefined" ? window.innerHeight / 2 - 370 : 0,
              }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="absolute z-10"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: 0.45 }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              >
                <SocrateCoin size={400} interactive={false} />
              </motion.div>
            </motion.div>

            <LayoutGroup>
              <motion.div
                layout
                transition={{ layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
                className="flex flex-col items-center max-w-xl px-8 mt-32"
              >
                {(phase === "text-appear" || phase === "mode-choice") && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: "easeOut", layout: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
                    className="text-center mb-6"
                  >
                    {introText.split("\n\n").map((paragraph, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.4, duration: 0.8 }}
                        className="font-display text-background/60 text-base md:text-lg leading-[1.8] mb-5 last:mb-0"
                      >
                        {paragraph}
                      </motion.p>
                    ))}
                  </motion.div>
                )}

                {phase === "mode-choice" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="flex gap-14 mt-4"
                  >
                    <button
                      onClick={onNext}
                      className="group flex flex-col items-center gap-3 transition-all"
                    >
                      <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                        <Mic className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                      </div>
                      <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">
                        Voice
                      </span>
                    </button>
                    <button
                      onClick={onNext}
                      className="group flex flex-col items-center gap-3 transition-all"
                    >
                      <div className="w-20 h-20 rounded-full border border-background/10 flex items-center justify-center group-hover:border-background/30 group-hover:bg-background/[0.03] transition-all duration-300">
                        <PenTool className="w-6 h-6 text-background/40 group-hover:text-background/70 transition-colors duration-300" />
                      </div>
                      <span className="font-display text-background/30 text-[10px] tracking-[0.2em] uppercase group-hover:text-background/60 transition-colors duration-300">
                        Text
                      </span>
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// STEP 4: DEMO SOCRATE CONVERSATION
// ══════════════════════════════════════════════════════
const DEMO_CONVERSATION_HISTORY: ChatMsg[] = [
  { id: "s1", role: "assistant", content: "You mentioned LLMs for vulnerability detection. That's a crowded space. **What specifically frustrates you** about existing approaches?" },
  { id: "u1", role: "user", content: "Most tools just do pattern matching on known CVEs. They miss zero-days and context-dependent vulnerabilities entirely." },
  { id: "s2", role: "assistant", content: "Interesting. So your intuition is that **semantic understanding** of code flow matters more than signature matching. But how would you prove that empirically? What would your ground truth dataset look like?" },
  { id: "u2", role: "user", content: "I was thinking of using real-world commits that fixed vulnerabilities — the before/after pairs from open source projects." },
  { id: "s3", role: "assistant", content: "Commit-pair datasets like Big-Vul exist already. Your contribution needs to go beyond that. What if you focused on **the reasoning gap** — why does the LLM detect one vulnerability but miss a structurally similar one? That's where the literature is thin." },
  { id: "u3", role: "user", content: "That's a great angle. I could build an interpretability layer that explains the model's decision process for each detection." },
  { id: "s4", role: "assistant", content: "Now we're getting somewhere. An **explainable vulnerability detection pipeline** — combining LLM code analysis with interpretability techniques to expose reasoning failures. That bridges security, NLP, and software engineering.\n\nLet me challenge you: **which interpretability method** would you use? Attention visualization? SHAP? Chain-of-thought prompting?" },
  { id: "u4", role: "user", content: "Chain-of-thought seems most natural for LLMs — forcing the model to articulate why something is a vulnerability before classifying it." },
  { id: "s5", role: "assistant", content: "Strong choice. CoT prompting as an **audit mechanism** for detection confidence. Here's your thesis taking shape:\n\n> **\"Explainable Vulnerability Detection: Using Chain-of-Thought Prompting to Audit LLM Security Analysis in Source Code\"**\n\nThis is focused, novel, and testable. You have a clear research question: *Does CoT prompting improve both detection accuracy and human trust in LLM-based vulnerability analysis?*\n\nI'd say you're ready to move forward. 🎯" },
];

function DemoSocrateChat({ onSkip }: { onSkip: () => void }) {
  const [mode, setMode] = useState<"text" | "voice">("text");
  const [visibleCount, setVisibleCount] = useState(0);
  const [autoPlaying, setAutoPlaying] = useState(true);
  const { messages, setMessages, input, setInput, isStreaming, sendMessage, bottomRef } = useDemoChat([]);

  // Auto-reveal messages quickly to simulate a fast conversation recap
  useEffect(() => {
    if (!autoPlaying || visibleCount >= DEMO_CONVERSATION_HISTORY.length) {
      if (visibleCount >= DEMO_CONVERSATION_HISTORY.length) setAutoPlaying(false);
      return;
    }
    const msg = DEMO_CONVERSATION_HISTORY[visibleCount];
    const delay = visibleCount === 0 ? 600 : msg.role === "assistant" ? 1200 : 700;
    const timer = setTimeout(() => {
      setMessages(prev => [...prev, DEMO_CONVERSATION_HISTORY[visibleCount]]);
      setVisibleCount(prev => prev + 1);
    }, delay);
    return () => clearTimeout(timer);
  }, [visibleCount, autoPlaying, setMessages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAutoPlaying(false);
    if (visibleCount < DEMO_CONVERSATION_HISTORY.length) {
      setMessages([...DEMO_CONVERSATION_HISTORY]);
      setVisibleCount(DEMO_CONVERSATION_HISTORY.length);
    }
    sendMessage(input);
  };

  if (mode === "voice") {
    return <DemoVoiceView messages={messages} onSwitchToText={() => setMode("text")} onSkip={onSkip} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
        <SocrateCoin size={36} interactive={false} />
        <div className="flex-1">
          <p className="text-sm font-bold text-foreground font-display">Socrates</p>
          <p className="text-[10px] text-muted-foreground">Exploration phase — thesis definition</p>
        </div>
        <button onClick={() => setMode("voice")}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title="Switch to voice mode">
          <Mic className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4">
        {messages.map(msg => (
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
              <div className="leading-relaxed prose prose-xs prose-foreground max-w-none">
                <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Typing indicator during auto-play or streaming */}
        {((autoPlaying && visibleCount < DEMO_CONVERSATION_HISTORY.length) || (isStreaming && messages[messages.length - 1]?.content === "")) && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        {/* Thesis chosen banner */}
        {!autoPlaying && visibleCount >= DEMO_CONVERSATION_HISTORY.length && !isStreaming && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="mx-auto max-w-sm bg-accent/10 border border-accent/20 rounded-xl px-5 py-4 text-center space-y-2"
          >
            <div className="flex items-center justify-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              <p className="text-xs font-bold text-accent uppercase tracking-wider">Thesis defined</p>
            </div>
            <p className="text-[11px] text-foreground/80 leading-relaxed italic">
              "Explainable Vulnerability Detection: Using Chain-of-Thought Prompting to Audit LLM Security Analysis in Source Code"
            </p>
            <button
              onClick={onSkip}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-wider rounded-full hover:bg-accent/90 transition-colors"
            >
              <ArrowRight className="w-3 h-3" /> See my dashboard
            </button>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-border pt-4 pb-4 px-5 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-full bg-secondary border border-border flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-foreground">M</span>
        </div>
        <div className="flex-1 flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(e as any); } }}
            placeholder="Reply to Socrates..." disabled={isStreaming}
            className="flex-1 bg-card border border-border rounded-full px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          <button onClick={() => setMode("voice")}
            className="px-3 py-3 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Switch to voice mode">
            <Mic className="w-4 h-4" />
          </button>
          <button onClick={() => handleSubmit({ preventDefault: () => {} } as any)} disabled={!input.trim() || isStreaming}
            className="px-4 py-3 bg-accent text-accent-foreground rounded-full hover:bg-accent/90 transition-colors disabled:opacity-30">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Skip button */}
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

// ─── DEMO VOICE VIEW (visual simulation of voice mode) ───
type DemoVoiceState = "listening" | "speaking";

function DemoVoiceView({ messages, onSwitchToText, onSkip }: {
  messages: ChatMsg[];
  onSwitchToText: () => void;
  onSkip: () => void;
}) {
  const [voiceState, setVoiceState] = useState<DemoVoiceState>("speaking");
  const [showTranscript, setShowTranscript] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Cycle between speaking and listening to simulate a conversation
  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceState(prev => prev === "speaking" ? "listening" : "speaking");
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, showTranscript]);

  const lastAssistant = messages.filter(m => m.role === "assistant").slice(-1)[0]?.content || "";
  const stateLabel = voiceState === "speaking" ? "Speaking" : "Listening...";

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col select-none overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Mic className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className={`p-2 rounded-full transition-colors ${showTranscript ? "text-foreground bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            title="Toggle transcript">
            <FileText className="w-4 h-4" />
          </button>
          <button onClick={onSwitchToText}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Switch to text chat">
            <Keyboard className="w-4 h-4" />
          </button>
          <button onClick={onSwitchToText}
            className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Central area — coin hero */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <div className="relative flex items-center justify-center">
          {/* Speaking rings */}
          {voiceState === "speaking" && (
            <>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-foreground/[0.08]"
                  style={{ width: 200, height: 200 }}
                  initial={{ scale: 1, opacity: 0 }}
                  animate={{
                    scale: [1, 1.3 + i * 0.2, 1.5 + i * 0.3],
                    opacity: [0.3 - i * 0.08, 0.15, 0],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6, ease: "easeOut" }}
                />
              ))}
            </>
          )}

          {/* Listening pulse */}
          {voiceState === "listening" && (
            <motion.div
              className="absolute rounded-full border border-foreground/10"
              style={{ width: 200, height: 200 }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.15, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Coin */}
          <motion.div
            animate={
              voiceState === "speaking"
                ? { scale: [1, 1.03, 1] }
                : { scale: [1, 1.01, 1] }
            }
            transition={
              voiceState === "speaking"
                ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                : { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <SocrateCoin size={180} interactive={false} isActive={true} />
          </motion.div>
        </div>

        {/* State label */}
        <motion.p
          key={stateLabel}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-xs text-muted-foreground uppercase tracking-[0.2em] font-medium"
        >
          {stateLabel}
        </motion.p>

        {/* Simulated live transcript when listening */}
        <AnimatePresence>
          {voiceState === "listening" && (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 text-sm text-foreground/50 italic text-center max-w-md px-6"
            >
              I think the key differentiator is...
            </motion.p>
          )}
        </AnimatePresence>

        {/* Last assistant message below coin */}
        <AnimatePresence>
          {lastAssistant && !showTranscript && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-8 max-w-lg px-8 text-center"
            >
              <div className="text-sm text-foreground/40 leading-relaxed line-clamp-4">
                <ReactMarkdown>{lastAssistant}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transcript panel */}
      <AnimatePresence>
        {showTranscript && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm border-t border-border max-h-[50vh] flex flex-col"
          >
            <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Transcript</p>
              <button onClick={() => setShowTranscript(false)} className="p-1 rounded hover:bg-secondary">
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 text-xs rounded-lg ${
                    msg.role === "assistant"
                      ? "bg-secondary/30 text-foreground/70"
                      : "bg-accent/5 text-foreground/60"
                  }`}>
                    <div className="prose prose-xs max-w-none [&_p]:my-0.5 [&_strong]:text-foreground/80">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="fixed bottom-6 right-6 z-[60]"
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

function DemoLoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 p-2">
          <div className="w-3 h-3 rounded-full bg-secondary" />
          <div className="flex-1 space-y-1">
            <div className="h-3 bg-secondary rounded w-3/4" />
            <div className="h-2 bg-secondary/60 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DemoTasks({ phase }: { phase: string }) {
  const { data, loading } = useDemoEngine<{ tasks: MockTask[] }>("generate_tasks", { phase });
  const tasks = data?.tasks?.length ? data.tasks : (MOCK_TASKS[phase] || MOCK_TASKS.orientation);
  const priorityLabel = (p: string) => {
    switch (p) {
      case "critical": return { text: "Critical", cls: "bg-destructive/10 text-destructive" };
      case "high": return { text: "High", cls: "bg-warning/10 text-warning" };
      case "medium": return { text: "Medium", cls: "bg-accent/10 text-accent" };
      default: return { text: "Low", cls: "bg-muted text-muted-foreground" };
    }
  };
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (loading) return <DemoLoadingSkeleton lines={3} />;

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
  const { data, loading } = useDemoEngine<{ sectors: CareerSector[] }>("compute_career");
  const sectors = data?.sectors?.length ? data.sectors : MOCK_SECTORS;
  const [expanded, setExpanded] = useState<string | null>(null);
  const COLORS = ["hsl(var(--accent))", "hsl(var(--destructive))", "hsl(142 50% 40%)", "hsl(var(--warning))", "hsl(270 60% 55%)"];

  if (loading) return <DemoLoadingSkeleton lines={4} />;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 pb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
        <span className="text-[10px] font-bold text-foreground uppercase tracking-wider">Your thesis</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      {sectors.map((sector, i) => {
        const color = COLORS[i % COLORS.length];
        const isExpanded = expanded === sector.name;
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
                {sector.reasoning && <p className="text-[10px] text-muted-foreground mt-0.5">{sector.reasoning}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: color }} initial={{ width: 0 }} animate={{ width: `${sector.percentage}%` }} transition={{ duration: 0.6, delay: i * 0.08 }} />
                </div>
                <span className="text-[11px] font-bold w-8 text-right" style={{ color }}>{sector.percentage}%</span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function DemoSupervisors() {
  const { data, loading } = useDemoEngine<{ supervisors: MockSupervisor[] }>("match_supervisors");
  const sups = data?.supervisors?.length ? data.supervisors : MOCK_SUPERVISORS;
  const [selecting, setSelecting] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [confirmedName, setConfirmedName] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [motivation, setMotivation] = useState("");

  if (loading) return <DemoLoadingSkeleton lines={3} />;

  // Confirmation animation
  if (confirming && confirmedName) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-8 space-y-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <CheckCircle2 className="w-7 h-7 text-accent" />
          </motion.div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center space-y-1"
        >
          <p className="text-xs font-bold text-foreground">Supervisor confirmed</p>
          <p className="text-[11px] text-accent font-medium">{confirmedName}</p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="flex items-center gap-2 text-[10px] text-muted-foreground"
        >
          <motion.div
            animate={{ x: [0, 4, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowRight className="w-3 h-3" />
          </motion.div>
          <span>Moving to next phase...</span>
        </motion.div>
      </motion.div>
    );
  }

  const handleConfirm = (sup: MockSupervisor) => {
    setConfirming(true);
    setConfirmedName(sup.name);
    setTimeout(() => {
      setConfirmed(sup.id);
      setSelecting(null);
      setMotivation("");
    }, 2200);
  };

  return (
    <div className="space-y-2">
      {sups.map(sup => (
        <div key={sup.id}>
          <div
            className={`flex items-center gap-2.5 p-2 rounded-lg transition-colors cursor-pointer ${
              confirmed === sup.id ? "bg-accent/10 border border-accent/20" : "hover:bg-secondary/50"
            }`}
            onClick={() => setSelecting(selecting === sup.id ? null : sup.id)}
          >
            <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
              {confirmed === sup.id ? <CheckCircle2 className="w-3.5 h-3.5 text-accent" /> : <GraduationCap className="w-3.5 h-3.5 text-accent" />}
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

          {/* Motivation input */}
          <AnimatePresence>
            {selecting === sup.id && confirmed !== sup.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-2 py-2 space-y-2">
                  {sup.reasoning && (
                    <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Suggested reasoning</p>
                      <p className="text-[11px] text-foreground/80 leading-relaxed break-words whitespace-pre-wrap">{sup.reasoning}</p>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground">Why this supervisor?</p>
                  <textarea
                    value={motivation}
                    onChange={e => setMotivation(e.target.value)}
                    placeholder="Explain your motivation..."
                    className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-accent"
                    rows={2}
                  />
                  <button
                    onClick={() => handleConfirm(sup)}
                    disabled={!motivation.trim()}
                    className="text-[10px] font-medium px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-30"
                  >
                    Confirm selection
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function DemoExperts() {
  const { data, loading } = useDemoEngine<{ experts: MockExpert[] }>("match_experts");
  const exps = data?.experts?.length ? data.experts : MOCK_EXPERTS;

  if (loading) return <DemoLoadingSkeleton lines={3} />;

  return (
    <div className="space-y-1.5">
      {exps.map(exp => (
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
  const { data, loading } = useDemoEngine<{ references: MockReference[] }>("generate_references");
  const refs = data?.references?.length ? data.references : MOCK_REFERENCES;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const categoryLabel: Record<string, { text: string; cls: string }> = {
    foundational: { text: "Foundational", cls: "bg-accent/10 text-accent" },
    methodology: { text: "Method", cls: "bg-warning/10 text-warning" },
    recent: { text: "Recent", cls: "bg-green-500/10 text-green-600" },
    contrarian: { text: "Critical", cls: "bg-destructive/10 text-destructive" },
  };

  if (loading) return <DemoLoadingSkeleton lines={4} />;

  return (
    <div className="space-y-1.5">
      {refs.map((ref, i) => {
        const cat = categoryLabel[ref.category] || categoryLabel.foundational;
        const isExpanded = expandedIdx === i;
        const isSaved = savedUrls.has(ref.url + i);
        return (
          <div key={i} className="rounded-lg hover:bg-secondary/30 transition-colors">
            <div className="flex items-start">
              <button
                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                className="flex-1 flex items-start gap-2.5 p-2.5 text-left"
              >
                <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0 text-accent" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground leading-tight">{ref.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ref.authors} ({ref.year})</p>
                </div>
                <span className={`px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wider shrink-0 rounded ${cat.cls}`}>{cat.text}</span>
              </button>
              <button
                onClick={() => setSavedUrls(prev => {
                  const next = new Set(prev);
                  const key = ref.url + i;
                  if (next.has(key)) next.delete(key); else next.add(key);
                  return next;
                })}
                className={`p-2.5 shrink-0 transition-colors ${isSaved ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`}
              >
                {isSaved ? <span className="text-sm">⭐</span> : <span className="text-sm opacity-50">☆</span>}
              </button>
            </div>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2 pl-8">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{ref.relevance}</p>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" /> Open source
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

function DemoVulnerabilities({ onResolve }: { onResolve?: (title: string) => void }) {
  const { data, loading } = useDemoEngine<{ vulnerabilities: MockVulnerability[] }>("extract_vulnerabilities");
  const vulns = data?.vulnerabilities?.length ? data.vulnerabilities : MOCK_VULNERABILITIES;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const ranked = [...vulns].sort((a, b) => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  });

  if (loading) return <DemoLoadingSkeleton lines={3} />;

  return (
    <div className="space-y-1.5">
      {ranked.map((v, i) => {
        const isExpanded = expandedId === v.id;
        const severityColor = v.severity === "critical" ? "text-destructive" : v.severity === "high" ? "text-warning" : "text-muted-foreground";
        const severityBg = v.severity === "critical" ? "bg-destructive/[0.06]" : v.severity === "high" ? "bg-warning/[0.06]" : "bg-muted/30";
        return (
          <div key={v.id} className={`rounded-lg transition-colors ${severityBg}`}>
            <button
              onClick={() => setExpandedId(isExpanded ? null : v.id)}
              className="w-full flex items-start gap-2.5 p-2.5 text-left"
            >
              <span className={`text-[10px] font-bold mt-0.5 shrink-0 w-4 text-center ${severityColor}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground leading-tight">{v.title}</p>
                {!isExpanded && (
                  <p className="text-[10px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">{v.description}</p>
                )}
              </div>
              <ShieldAlert className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${severityColor}`} />
            </button>
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-2.5 pb-2.5 pt-0 space-y-2">
                    <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">{v.description}</p>
                    {onResolve && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onResolve(v.title); }}
                        className="ml-6 text-[10px] text-accent hover:text-accent/80 font-medium transition-colors"
                      >
                        Tell Socrates it's resolved →
                      </button>
                    )}
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
  const { data, loading } = useDemoEngine<{ phases: RoadmapPhase[] }>("generate_roadmap");
  const initialItems = data?.phases?.length ? data.phases : MOCK_ROADMAP;
  const [items, setItems] = useState(MOCK_ROADMAP);
  useEffect(() => { if (data?.phases?.length) setItems(data.phases); }, [data]);
  const toggleTask = (phaseKey: string, taskId: string) => {
    setItems(prev => prev.map(phase =>
      phase.key === phaseKey
        ? { ...phase, tasks: phase.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t) }
        : phase
    ));
  };

  if (loading) return <DemoLoadingSkeleton lines={5} />;

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

function DemoChatOverlay({ onClose }: { onClose: () => void }) {
  const welcomeMsg: ChatMsg = {
    id: "dash-welcome", role: "assistant",
    content: "What would you like to discuss? I can help with your research methodology, review your approach, or challenge your assumptions.",
  };
  const { messages, input, setInput, isStreaming, sendMessage, bottomRef } = useDemoChat([welcomeMsg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-foreground/10 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
          <SocrateCoin size={32} interactive={false} />
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground font-display">Socrates</p>
            <p className="text-[10px] text-muted-foreground">Demo — interactive conversation</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-3 text-xs rounded-2xl ${msg.role === "assistant" ? "bg-secondary/50 border border-border" : "bg-accent/10 border border-accent/20"}`}>
                <div className="leading-relaxed prose prose-xs prose-foreground max-w-none">
                  <ReactMarkdown>{msg.content || "…"}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <div className="flex gap-1.5 px-4 py-3">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSubmit} className="border-t border-border px-5 py-3 flex items-center gap-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Reply to Socrates..."
            disabled={isStreaming}
            className="flex-1 bg-secondary/50 border border-border rounded-full px-4 py-2.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent/30 transition-colors disabled:opacity-50"
          />
          <button type="submit" disabled={isStreaming || !input.trim()} className="p-2.5 bg-accent text-accent-foreground rounded-full disabled:opacity-50 hover:bg-accent/90 transition-colors">
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </motion.div>
    </>
  );
}

// ══════════════════════════════════════════════════════
// DASHBOARD VIEW
// ══════════════════════════════════════════════════════
function DemoDashboard() {
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(2);
  const [showChat, setShowChat] = useState(false);
  const [chatMode, setChatMode] = useState<"text" | "voice">("text");
  const currentPhase = PHASES[currentPhaseIdx].key;
  const confidence = PHASE_CONFIDENCE[currentPhase] || 0;

  const showTopicSupervisor = currentPhase === "topic_supervisor";
  const showPlanning = currentPhase === "planning";
  const showExecution = currentPhase === "execution";
  const showWriting = currentPhase === "writing";

  const handleResolveVuln = (vulnTitle: string) => {
    setShowChat(true);
    setChatMode("text");
  };

  const cards: { key: string; component: React.ReactNode; colSpan?: string; delay: number }[] = [];
  let delay = 0.1;

  if (showPlanning || showExecution || showWriting) {
    const roadmapTitle = showPlanning && !showExecution ? "Roadmap (in progress)" : "Roadmap";
    cards.push({ key: "roadmap", colSpan: !showTopicSupervisor ? "md:col-span-2 lg:col-span-2" : undefined, delay, component: <DemoCard title={roadmapTitle} icon={BarChart3}><DemoRoadmap /></DemoCard> });
    delay += 0.05;
  }
  if (showTopicSupervisor) {
    cards.push({ key: "supervisors", delay, component: <DemoCard title="Suggested Supervisors" icon={GraduationCap}><DemoSupervisors /></DemoCard> });
    delay += 0.05;
    cards.push({ key: "career-tree", colSpan: !showPlanning ? "md:col-span-2" : undefined, delay, component: <DemoCard title="Possible Directions" icon={TrendingUp}><DemoCareerTree /></DemoCard> });
    delay += 0.05;
  }
  cards.push({ key: "tasks", delay, component: <DemoCard title="Tasks" icon={Target}><DemoTasks phase={currentPhase} /></DemoCard> });
  delay += 0.05;
  cards.push({ key: "rubrica", delay, component: <DemoCard title={showTopicSupervisor ? "Interview Partners" : "Contacts"} icon={Users}><DemoExperts /></DemoCard> });
  delay += 0.05;
  cards.push({ key: "references", delay, component: <DemoCard title="Main References" icon={BookOpen} badge={MOCK_REFERENCES.length}><DemoReferences /></DemoCard> });
  delay += 0.05;
  if (showExecution || showWriting) {
    cards.push({ key: "vulnerabilities", delay, component: <DemoCard title="Vulnerabilities" icon={ShieldAlert} badge={MOCK_VULNERABILITIES.length}><DemoVulnerabilities onResolve={handleResolveVuln} /></DemoCard> });
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
              title="Invite your supervisor to follow your progress"
              onClick={() => {}}
            >
              <UserPlus className="w-3 h-3" />
              Invite supervisor
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
          onClick={() => {
            setChatMode("voice");
            setShowChat(true);
          }}
          className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        >
          <MessageCircle className="w-4 h-4" />
          Talk to Socrates
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
          <button
            onClick={() => {
              const nextIdx = Math.min(currentPhaseIdx + 1, PHASES.length - 1);
              setCurrentPhaseIdx(nextIdx);
            }}
            className="ml-4 p-2 rounded-full bg-foreground/10 text-foreground hover:bg-foreground/20 transition-colors shrink-0"
            title="Evaluate phase"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chat overlay */}
      <AnimatePresence>
        {showChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/10 z-40"
              onClick={() => setShowChat(false)}
            />
            {chatMode === "voice" ? (
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                className="fixed inset-4 lg:inset-x-[15%] lg:inset-y-8 z-50 flex flex-col bg-background border border-border rounded-lg shadow-lg overflow-hidden"
              >
                <DemoVoiceView
                  messages={MOCK_SOCRATE_MESSAGES}
                  onSwitchToText={() => setChatMode("text")}
                  onSkip={() => setShowChat(false)}
                />
              </motion.div>
            ) : (
              <DemoChatOverlay onClose={() => setShowChat(false)} />
            )}
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
