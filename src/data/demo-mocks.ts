// Centralized synthetic data for the /demo experience.
// Profile: Marco Demo @ ETH Zurich — MSc Computer Science, mid-thesis.

export const DEMO_PROFILE = {
  name: "Marco Demo",
  first_name: "Marco",
  last_name: "Demo",
  email: "marco.demo@ethz.ch",
  degree: "MSc Computer Science",
  university: "ETH Zurich",
  expected_graduation: "August 2026",
  skills: ["Python", "Machine Learning", "NLP", "Data Analysis", "PyTorch", "Transformers"],
  thesis_topic:
    "Explainable Vulnerability Detection: Using Chain-of-Thought Prompting to Audit LLM Security Analysis in Source Code",
  current_phase: "planning",
  deep_interests: ["LLM interpretability", "code security", "static analysis"],
  strengths: ["Strong ML foundations", "Systematic analysis", "Fast learner"],
  weaknesses: ["Limited industry experience", "Tendency to over-scope"],
};

export const DEMO_THESIS = DEMO_PROFILE.thesis_topic;

export interface DemoSupervisor {
  id: string;
  name: string;
  fields: string[];
  score: number;
  reasoning: string;
  email: string;
  university: string;
}

export const DEMO_SUPERVISORS: DemoSupervisor[] = [
  { id: "s1", name: "Prof. Marco Rossi", fields: ["NLP", "Code Analysis"], score: 92, reasoning: "Leading European researcher in NLP for software engineering. 40+ papers on automated code analysis, supervised 12 MSc theses on related topics.", email: "marco.rossi@ethz.ch", university: "ETH Zurich" },
  { id: "s2", name: "Prof. Elena Bianchi", fields: ["Cybersecurity", "ML"], score: 85, reasoning: "Active research on ML-based vulnerability detection. Her lab develops open-source SAST tools you could use as baseline.", email: "elena.bianchi@epfl.ch", university: "EPFL" },
  { id: "s3", name: "Prof. Luigi Verdi", fields: ["Software Engineering", "Testing"], score: 78, reasoning: "Strong on experimental pipeline design and automated testing — useful for the methodology chapter.", email: "luigi.verdi@uzh.ch", university: "UZH" },
];

export interface DemoExpert {
  id: string;
  name: string;
  title: string;
  score: number;
  reasoning: string;
  offerInterviews: boolean;
  email: string;
}

export const DEMO_EXPERTS: DemoExpert[] = [
  { id: "e1", name: "Dr. Paolo Ferretti", title: "Security Researcher @ Google", score: 88, reasoning: "Expert in fuzzing and LLM-assisted vulnerability research.", offerInterviews: true, email: "p.ferretti@google.com" },
  { id: "e2", name: "Dr. Maria Conti", title: "ML Engineer @ DeepMind", score: 82, reasoning: "Publications on LLMs for code generation and reasoning.", offerInterviews: true, email: "m.conti@deepmind.com" },
  { id: "e3", name: "Ing. Luca Barbieri", title: "CTO @ CyberNext", score: 75, reasoning: "Industry experience deploying AI for cybersecurity at scale.", offerInterviews: false, email: "l.barbieri@cybernext.ch" },
];

export interface DemoReference {
  title: string;
  authors: string;
  year: string;
  url: string;
  category: "foundational" | "methodology" | "recent" | "contrarian";
  relevance: string;
}

export const DEMO_REFERENCES: DemoReference[] = [
  { title: "Large Language Models for Code: Opportunities and Challenges", authors: "Chen et al.", year: "2024", url: "#", category: "foundational", relevance: "Foundational survey on LLMs for code." },
  { title: "VulDeePecker: A Deep Learning-Based System for Vulnerability Detection", authors: "Li et al.", year: "2018", url: "#", category: "methodology", relevance: "First paper using DL for vulnerability detection." },
  { title: "Automated Vulnerability Detection with ML: A Systematic Review", authors: "Zhang, Wang", year: "2025", url: "#", category: "recent", relevance: "Systematic review of ML for vulnerability detection." },
  { title: "The Limits of LLMs in Security Analysis", authors: "Pearce et al.", year: "2025", url: "#", category: "contrarian", relevance: "Critical analysis of LLM limitations in security." },
  { title: "Chain-of-Thought Prompting Elicits Reasoning in LLMs", authors: "Wei et al.", year: "2022", url: "#", category: "foundational", relevance: "The CoT technique central to your methodology." },
];

export interface DemoVulnerability {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: "critical" | "high" | "medium";
}

export const DEMO_VULNERABILITIES: DemoVulnerability[] = [
  { id: "v1", type: "methodology_flaw", title: "Dataset too small to generalize", description: "With only 5000 training samples, the model risks overfitting.", severity: "critical" },
  { id: "v2", type: "logic_gap", title: "Missing non-ML baseline", description: "No comparison with standard SAST approaches.", severity: "high" },
  { id: "v3", type: "superficiality", title: "Related work too generic", description: "Related works list papers without critical analysis.", severity: "medium" },
];

export interface DemoSector {
  name: string;
  percentage: number;
  reasoning: string;
}

export const DEMO_SECTORS: DemoSector[] = [
  { name: "AI & Machine Learning", percentage: 42, reasoning: "Core of the thesis" },
  { name: "Cybersecurity", percentage: 28, reasoning: "Application domain" },
  { name: "DevOps & Automation", percentage: 15, reasoning: "CI/CD pipelines" },
  { name: "Academic Research", percentage: 10, reasoning: "Publications" },
  { name: "Tech Consulting", percentage: 5, reasoning: "Enterprise applications" },
];

export interface DemoTask {
  id: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium";
  status: "pending" | "completed";
  estimated_minutes: number;
  phase: string;
}

export const DEMO_TASKS: DemoTask[] = [
  { id: "t1", title: "Set up cloud GPU environment", description: "Configure A100 instance on Lambda Labs for fine-tuning runs.", priority: "critical", status: "pending", estimated_minutes: 120, phase: "planning" },
  { id: "t2", title: "Prepare thesis outline (5 chapters)", description: "Define provisional chapter titles and scope per chapter.", priority: "high", status: "completed", estimated_minutes: 60, phase: "planning" },
  { id: "t3", title: "Collect CWE vulnerability datasets", description: "Download BigVul, Devign and CWE-1000.", priority: "high", status: "pending", estimated_minutes: 90, phase: "planning" },
  { id: "t4", title: "Define evaluation metrics", description: "Precision, recall, F1, and false-positive rate against SAST baseline.", priority: "high", status: "pending", estimated_minutes: 30, phase: "planning" },
  { id: "t5", title: "Email Prof. Rossi about co-supervision", description: "Confirm scope of CoT auditing and weekly checkpoints.", priority: "critical", status: "pending", estimated_minutes: 20, phase: "planning" },
];

export interface DemoRoadmapPhase {
  key: string;
  title: string;
  tasks: { id: string; title: string; completed: boolean; due_date?: string }[];
}

export const DEMO_ROADMAP: DemoRoadmapPhase[] = [
  { key: "planning", title: "Planning", tasks: [
    { id: "r1", title: "Define final research questions", completed: true },
    { id: "r2", title: "Get supervisor approval", completed: true },
    { id: "r3", title: "Set up cloud environment (GPU)", completed: false, due_date: "2026-06-15" },
    { id: "r4", title: "Acquire training dataset", completed: false, due_date: "2026-06-20" },
  ]},
  { key: "execution", title: "Execution", tasks: [
    { id: "r5", title: "Train baseline model", completed: false, due_date: "2026-07-01" },
    { id: "r6", title: "Fine-tune on vulnerability data", completed: false, due_date: "2026-07-15" },
    { id: "r7", title: "Comparative benchmark vs SAST", completed: false, due_date: "2026-07-25" },
    { id: "r8", title: "Ablation study", completed: false, due_date: "2026-08-05" },
  ]},
  { key: "writing", title: "Writing", tasks: [
    { id: "r9", title: "Chapters 1-2 (Intro + SotA)", completed: false, due_date: "2026-08-10" },
    { id: "r10", title: "Chapter 3 (Methodology)", completed: false, due_date: "2026-08-20" },
    { id: "r11", title: "Chapters 4-5 (Results + Conclusion)", completed: false, due_date: "2026-08-25" },
    { id: "r12", title: "Final review with supervisor", completed: false, due_date: "2026-08-28" },
  ]},
];

export const DEMO_SOCRATE_HISTORY = [
  { id: "m1", role: "assistant" as const, content: "You have a clear direction: LLMs for vulnerability detection. Great starting point. But tell me: **what makes your approach different** from those who have already fine-tuned models on vulnerability datasets?" },
  { id: "m2", role: "user" as const, content: "I want to combine traditional static analysis with LLMs, creating a hybrid system." },
  { id: "m3", role: "assistant" as const, content: "Interesting. A hybrid SAST + LLM approach has potential, but you need to be precise: **which component does what?** The risk is that the LLM is just a glorified wrapper for static rules." },
  { id: "m4", role: "user" as const, content: "SAST would do the initial screening, then the LLM would analyze the results to reduce false positives." },
  { id: "m5", role: "assistant" as const, content: "This is a **concrete contribution**: reducing false positives through post-processing with LLMs. It's measurable, useful and publishable. Now the critical question: **do you have access to a dataset with false positive annotations?**" },
];

export interface DemoPath {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  difficulty: "low" | "medium" | "high";
  fits: string;
}

export const DEMO_PATHS: DemoPath[] = [
  {
    id: "p1",
    title: "Hybrid SAST + LLM pipeline (recommended)",
    summary: "Build a two-stage detector: SonarQube for initial screening, GPT-4 + CoT for false-positive reduction.",
    steps: [
      "Reproduce SonarQube baseline on BigVul",
      "Design CoT prompt template for vulnerability audit",
      "Fine-tune on labeled FP/TP pairs",
      "Benchmark precision lift on Devign",
    ],
    difficulty: "medium",
    fits: "Matches Prof. Rossi's lab and your ML strengths.",
  },
  {
    id: "p2",
    title: "Pure LLM agentic detection",
    summary: "Use a multi-agent LLM system (planner + reviewer + critic) on raw source code, no static analysis.",
    steps: [
      "Design 3-agent loop architecture",
      "Curate evaluation harness on CWE-Top-25",
      "Compare against zero-shot GPT-4 baseline",
      "Analyse reasoning chain coherence",
    ],
    difficulty: "high",
    fits: "Higher novelty but harder to evaluate rigorously.",
  },
  {
    id: "p3",
    title: "Interpretability-first study",
    summary: "Don't build a detector — analyse where LLMs fail at security reasoning and publish a taxonomy.",
    steps: [
      "Collect 200 vulnerable snippets across CWE classes",
      "Probe 5 frontier LLMs with CoT",
      "Cluster failure modes",
      "Propose mitigation guidelines",
    ],
    difficulty: "low",
    fits: "Lower engineering load, strong fit for a humanities-style critical thesis.",
  },
];

export interface DemoFuture {
  id: string;
  scenario: string;
  description: string;
  probability: number;
  steps_now: string[];
}

export const DEMO_FUTURES: DemoFuture[] = [
  {
    id: "f1",
    scenario: "Industry — Security Researcher",
    description: "Join Google Project Zero or a similar industrial lab. Thesis becomes a portfolio piece for the fuzzing + LLM intersection.",
    probability: 62,
    steps_now: ["Reach out to Dr. Ferretti for an informational chat", "Open-source the SAST+LLM pipeline", "Submit to BlackHat Arsenal"],
  },
  {
    id: "f2",
    scenario: "PhD — LLM Interpretability",
    description: "Continue at ETH or move to MIT CSAIL. Thesis evolves into a first-year qualifying project on chain-of-thought reliability.",
    probability: 24,
    steps_now: ["Co-author a workshop paper with Prof. Rossi", "Apply to 4 PhD programs by December", "Attend NeurIPS"],
  },
  {
    id: "f3",
    scenario: "Startup — DevSecOps SaaS",
    description: "Spin up a company that sells the false-positive-reduction layer as an IDE plugin.",
    probability: 14,
    steps_now: ["Validate with 10 senior engineers", "File provisional patent on the CoT prompt template", "Apply to Y Combinator W27"],
  },
];

export interface DemoMemoryEntry {
  id: string;
  type: "decision" | "insight" | "milestone" | "blocker";
  title: string;
  detail: string;
  date: string;
}

export const DEMO_MEMORY: DemoMemoryEntry[] = [
  { id: "mem1", type: "milestone", title: "Thesis topic confirmed", detail: "Locked scope on Explainable Vulnerability Detection with CoT.", date: "2026-05-02" },
  { id: "mem2", type: "decision", title: "Chose Prof. Rossi as supervisor", detail: "His NLP-for-code background aligns with the methodology.", date: "2026-05-08" },
  { id: "mem3", type: "insight", title: "False-positive reduction is the angle", detail: "Discovered during a duel with Socrate — measurable, publishable, original.", date: "2026-05-10" },
  { id: "mem4", type: "blocker", title: "Need labeled FP/TP dataset", detail: "BigVul lacks FP annotations — must build a synthetic split.", date: "2026-05-14" },
  { id: "mem5", type: "decision", title: "Excluded pure agentic approach", detail: "Too hard to evaluate within 4 months — parked as future work.", date: "2026-05-18" },
];

export interface DemoSuggestion {
  id: string;
  category: "professor" | "topic" | "company" | "book";
  title: string;
  detail: string;
  reason: string;
}

export const DEMO_SUGGESTIONS: DemoSuggestion[] = [
  { id: "sg1", category: "professor", title: "Prof. Brendan Dolan-Gavitt (NYU)", detail: "PI of the Capture-the-Flag team, runs research on LLM security.", reason: "Could be an external thesis examiner — emerging authority on LLMs + security." },
  { id: "sg2", category: "topic", title: "Prompt injection in code-review agents", detail: "Adjacent open problem — could become Chapter 4 future work.", reason: "Hot in 2026, few rigorous studies, fits your toolchain." },
  { id: "sg3", category: "company", title: "Snyk", detail: "Israeli/UK DevSecOps unicorn, hiring ML security engineers.", reason: "Their false-positive triage problem matches your contribution 1:1." },
  { id: "sg4", category: "company", title: "Semgrep", detail: "SF startup, rule-based SAST with an emerging ML team.", reason: "Open to research partnerships, often hires from thesis projects." },
  { id: "sg5", category: "book", title: "The Tangled Web — Michal Zalewski", detail: "Canonical reference on browser security models.", reason: "Frames the threat model your detector should target." },
  { id: "sg6", category: "book", title: "Pattern Recognition and Machine Learning — Bishop", detail: "Bayesian foundations for the evaluation chapter.", reason: "You'll need it for calibration and uncertainty analysis." },
];

export interface DemoMarketTrend {
  sector: string;
  growth_pct_2026: number;
  open_roles_eu: number;
  median_salary_chf: number;
  signal: string;
}

export const DEMO_MARKET: DemoMarketTrend[] = [
  { sector: "AI Security / DevSecOps", growth_pct_2026: 38, open_roles_eu: 1240, median_salary_chf: 142000, signal: "Snyk, Semgrep and GitHub are hiring aggressively in Zurich and London." },
  { sector: "ML Engineering — Code Models", growth_pct_2026: 27, open_roles_eu: 2100, median_salary_chf: 158000, signal: "Cursor, Anthropic and Mistral lead demand; foundational ML required." },
  { sector: "Academic Research (Security)", growth_pct_2026: 8, open_roles_eu: 86, median_salary_chf: 82000, signal: "Few funded postdoc seats; strong publication record needed." },
  { sector: "DevOps & Cloud Automation", growth_pct_2026: 12, open_roles_eu: 3400, median_salary_chf: 118000, signal: "Stable demand, lower ML intensity, broader entry path." },
];

export const DEMO_EDITOR_CHAPTER = {
  title: "Chapter 3 — Methodology",
  updated_at: "2026-05-20",
  word_count: 4820,
  body: `## 3.1 Research design

This thesis adopts a **two-stage empirical methodology** combining static analysis (SAST) and chain-of-thought (CoT) prompting of large language models. The objective is to quantify the false-positive reduction enabled by LLM post-processing on a controlled vulnerability detection benchmark.

## 3.2 Dataset

We use **BigVul** (188,636 functions, 91 CWE categories) as the primary training corpus, augmented with **Devign** for cross-domain evaluation. False-positive annotations are generated through a semi-automated labelling protocol: SonarQube findings are reviewed by two annotators with a Cohen's κ of 0.81.

## 3.3 Pipeline

\`\`\`
source → SonarQube → candidate set → GPT-4 (CoT) → final verdict
\`\`\`

The CoT prompt template (Appendix A) instructs the model to (i) restate the rule fired, (ii) reason about exploitability, and (iii) emit a binary verdict with a confidence score.

## 3.4 Evaluation

Primary metrics: **precision, recall, F1, false-positive rate**. We compare three configurations: SonarQube-only (baseline), zero-shot GPT-4, and our fine-tuned CoT pipeline. Statistical significance is assessed with McNemar's test (α = 0.05).

## 3.5 Threats to validity

The annotation protocol introduces label noise; the LLM is non-deterministic at T > 0; the benchmark is biased toward C/C++ memory safety. Each is discussed in §3.6.`,
};
