import React, { createContext, useContext, useState, useCallback } from "react";

export interface Demo2Task {
  id: string;
  title: string;
  description: string;
  section: string;
  priority: string;
  estimated_minutes: number;
  status: string;
}

export interface Demo2Vulnerability {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: string;
}

export interface Demo2Reference {
  title: string;
  authors: string;
  year?: string;
  url: string;
  category: string;
  relevance: string;
}

export interface Demo2CareerSector {
  name: string;
  percentage: number;
  reasoning?: string;
}

export interface Demo2RoadmapTask {
  id: string;
  task_title: string;
  completed: boolean;
  due_date?: string;
}

export interface Demo2RoadmapPhase {
  key: string;
  title: string;
  tasks: Demo2RoadmapTask[];
}

export interface Demo2ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface Demo2Profile {
  first_name: string;
  last_name: string;
  thesis_topic: string;
  university: string;
  degree: string;
  current_phase: string;
  phase_confidence: number;
}

export interface Demo2Supervisor {
  id: string;
  name: string;
  fields: string[];
  score: number;
}

interface Demo2State {
  // Profile
  profile: Demo2Profile;
  setProfile: (p: Demo2Profile) => void;

  // Socrate responses queue
  socrateResponses: string[];
  setSocrateResponses: (r: string[]) => void;
  popResponse: () => string;

  // Chat
  messages: Demo2ChatMsg[];
  setMessages: React.Dispatch<React.SetStateAction<Demo2ChatMsg[]>>;
  addMessage: (msg: Demo2ChatMsg) => void;

  // Tasks
  tasks: Demo2Task[];
  setTasks: (t: Demo2Task[]) => void;

  // Vulnerabilities
  vulnerabilities: Demo2Vulnerability[];
  setVulnerabilities: (v: Demo2Vulnerability[]) => void;

  // References
  references: Demo2Reference[];
  setReferences: (r: Demo2Reference[]) => void;

  // Career
  careerSectors: Demo2CareerSector[];
  setCareerSectors: (s: Demo2CareerSector[]) => void;

  // Roadmap
  roadmapPhases: Demo2RoadmapPhase[];
  setRoadmapPhases: (p: Demo2RoadmapPhase[]) => void;

  // Supervisors
  supervisors: Demo2Supervisor[];
  setSupervisors: (s: Demo2Supervisor[]) => void;

  // View mode
  activeView: "socrate" | "dashboard" | "management";
  setActiveView: (v: "socrate" | "dashboard" | "management") => void;
}

const DEFAULT_PROFILE: Demo2Profile = {
  first_name: "Marco",
  last_name: "Demo",
  thesis_topic: "AI-Driven Optimization of Urban Mobility Systems",
  university: "ETH Zurich",
  degree: "MSc Computer Science",
  current_phase: "planning",
  phase_confidence: 65,
};

const DEFAULT_RESPONSES: string[] = [
  "Interesting perspective. Tell me more about how you arrived at this conclusion. What evidence supports your reasoning?",
  "I see you're moving in the right direction, but have you considered the methodological implications? A stronger foundation might be needed.",
  "That's a valid point. However, I would challenge you to think about the counterargument. What would a skeptic say?",
  "Good progress. Now let's focus on the practical aspects: how would you implement this in your thesis structure?",
  "You're developing critical thinking skills. Let me push you further — what are the ethical implications of your approach?",
];

const DEFAULT_TASKS: Demo2Task[] = [
  { id: "t1", title: "Define research questions", description: "Formalize 2-3 specific research questions based on your thesis topic.", section: "planning", priority: "critical", estimated_minutes: 60, status: "pending" },
  { id: "t2", title: "Literature review outline", description: "Create a structured outline of key papers and their relevance.", section: "planning", priority: "high", estimated_minutes: 120, status: "pending" },
  { id: "t3", title: "Methodology selection", description: "Choose and justify the research methodology.", section: "planning", priority: "medium", estimated_minutes: 90, status: "pending" },
];

const DEFAULT_VULNERABILITIES: Demo2Vulnerability[] = [
  { id: "v1", type: "methodology", title: "Weak methodology justification", description: "The choice of methodology lacks strong academic grounding. Consider referencing seminal works.", severity: "high" },
  { id: "v2", type: "literature", title: "Limited literature scope", description: "Current review covers only 12 papers. Aim for 30+ to establish comprehensive coverage.", severity: "medium" },
];

const DEFAULT_REFERENCES: Demo2Reference[] = [
  { title: "Deep Reinforcement Learning for Traffic Signal Control", authors: "Wei, H. et al.", year: "2019", url: "https://arxiv.org/abs/1904.08117", category: "foundational", relevance: "Core paper on DRL applications in urban mobility." },
  { title: "Urban Computing: Concepts, Methodologies, and Applications", authors: "Zheng, Y.", year: "2014", url: "https://dl.acm.org/doi/10.1145/2629592", category: "methodology", relevance: "Provides methodological framework for urban data analysis." },
];

const DEFAULT_SECTORS: Demo2CareerSector[] = [
  { name: "AI & Machine Learning", percentage: 35, reasoning: "Strong alignment with thesis methodology" },
  { name: "Smart Mobility", percentage: 28, reasoning: "Direct application domain" },
  { name: "Urban Planning Tech", percentage: 20, reasoning: "Secondary application area" },
  { name: "Data Engineering", percentage: 17, reasoning: "Supporting technical skills" },
];

const DEFAULT_ROADMAP: Demo2RoadmapPhase[] = [
  {
    key: "planning", title: "Pianificazione",
    tasks: [
      { id: "r1", task_title: "Definire domande di ricerca", completed: true },
      { id: "r2", task_title: "Revisione letteratura (30+ paper)", completed: false },
      { id: "r3", task_title: "Scegliere metodologia", completed: false },
      { id: "r4", task_title: "Creare timeline di progetto", completed: false },
    ],
  },
  {
    key: "execution", title: "Esecuzione",
    tasks: [
      { id: "r5", task_title: "Raccolta dati", completed: false },
      { id: "r6", task_title: "Implementazione modello", completed: false },
      { id: "r7", task_title: "Validazione risultati", completed: false },
    ],
  },
  {
    key: "writing", title: "Scrittura",
    tasks: [
      { id: "r8", task_title: "Stesura introduzione", completed: false },
      { id: "r9", task_title: "Stesura capitoli centrali", completed: false },
      { id: "r10", task_title: "Conclusioni e revisione", completed: false },
    ],
  },
];

const DEFAULT_SUPERVISORS: Demo2Supervisor[] = [
  { id: "sup1", name: "Prof. Dr. Elena Rossi", fields: ["AI", "Optimization"], score: 92 },
  { id: "sup2", name: "Prof. Dr. Marco Bianchi", fields: ["Urban Computing", "Data Science"], score: 85 },
  { id: "sup3", name: "Prof. Dr. Anna Müller", fields: ["Machine Learning", "Transport"], score: 78 },
];

const Demo2Context = createContext<Demo2State | null>(null);

export const useDemo2 = () => {
  const ctx = useContext(Demo2Context);
  if (!ctx) throw new Error("useDemo2 must be used within Demo2Provider");
  return ctx;
};

export const Demo2Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<Demo2Profile>(DEFAULT_PROFILE);
  const [socrateResponses, setSocrateResponses] = useState<string[]>(DEFAULT_RESPONSES);
  const [messages, setMessages] = useState<Demo2ChatMsg[]>([
    { id: "welcome", role: "assistant", content: "Welcome. I am Socrate, your critical mentor. Tell me — where do you stand in your thesis journey?" },
  ]);
  const [tasks, setTasks] = useState<Demo2Task[]>(DEFAULT_TASKS);
  const [vulnerabilities, setVulnerabilities] = useState<Demo2Vulnerability[]>(DEFAULT_VULNERABILITIES);
  const [references, setReferences] = useState<Demo2Reference[]>(DEFAULT_REFERENCES);
  const [careerSectors, setCareerSectors] = useState<Demo2CareerSector[]>(DEFAULT_SECTORS);
  const [roadmapPhases, setRoadmapPhases] = useState<Demo2RoadmapPhase[]>(DEFAULT_ROADMAP);
  const [supervisors, setSupervisors] = useState<Demo2Supervisor[]>(DEFAULT_SUPERVISORS);
  const [activeView, setActiveView] = useState<"socrate" | "dashboard" | "management">("socrate");

  const responseIndex = React.useRef(0);

  const popResponse = useCallback(() => {
    if (socrateResponses.length === 0) return "I have no more prepared responses. Add more in the management panel.";
    const resp = socrateResponses[responseIndex.current % socrateResponses.length];
    responseIndex.current += 1;
    return resp;
  }, [socrateResponses]);

  const addMessage = useCallback((msg: Demo2ChatMsg) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  return (
    <Demo2Context.Provider value={{
      profile, setProfile,
      socrateResponses, setSocrateResponses, popResponse,
      messages, setMessages, addMessage,
      tasks, setTasks,
      vulnerabilities, setVulnerabilities,
      references, setReferences,
      careerSectors, setCareerSectors,
      roadmapPhases, setRoadmapPhases,
      supervisors, setSupervisors,
      activeView, setActiveView,
    }}>
      {children}
    </Demo2Context.Provider>
  );
};
