import React, { createContext, useContext, useState, useCallback } from "react";
import type { Student, RoadmapPhase } from "@/types/data";
import { mockRoadmap } from "@/data/mock-roadmap";
import studentsData from "@/data/students.json";

// Student journey states
export type JourneyState = "lost" | "vague_idea" | "topic_chosen" | "finding_contacts" | "writing";

export interface MemoryEntry {
  id: string;
  type: "exploration" | "decision" | "contact" | "action" | "feedback";
  title: string;
  detail: string;
  timestamp: Date;
}

export interface GeneratedAction {
  id: string;
  type: "email_draft" | "proposal" | "roadmap" | "contact_search";
  title: string;
  content: string;
  status: "pending" | "done";
  timestamp: Date;
}

interface AppState {
  currentStudent: Student;
  roadmap: RoadmapPhase[];
  toggleTask: (phaseId: string, taskId: string) => void;
  activeSection: string;
  setActiveSection: (s: string) => void;
  // Journey
  journeyState: JourneyState;
  setJourneyState: (s: JourneyState) => void;
  onboardingDone: boolean;
  setOnboardingDone: (v: boolean) => void;
  thesisTopic: string;
  setThesisTopic: (t: string) => void;
  // Memory
  memory: MemoryEntry[];
  addMemory: (entry: Omit<MemoryEntry, "id" | "timestamp">) => void;
  // Actions
  actions: GeneratedAction[];
  addAction: (action: Omit<GeneratedAction, "id" | "timestamp" | "status">) => void;
  markActionDone: (id: string) => void;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStudent] = useState<Student>((studentsData as Student[])[0]);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>(mockRoadmap);
  const [activeSection, setActiveSection] = useState("journey");
  const [journeyState, setJourneyState] = useState<JourneyState>("lost");
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [thesisTopic, setThesisTopic] = useState("");
  const [memory, setMemory] = useState<MemoryEntry[]>([
    { id: "m0", type: "exploration", title: "Prima sessione avviata", detail: "Lo studente ha iniziato il percorso sulla piattaforma.", timestamp: new Date("2026-03-15") },
  ]);
  const [actions, setActions] = useState<GeneratedAction[]>([]);

  const toggleTask = (phaseId: string, taskId: string) => {
    setRoadmap(prev =>
      prev.map(phase => {
        if (phase.id !== phaseId) return phase;
        const tasks = phase.tasks.map(t =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const progress = Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
        return { ...phase, tasks, progress };
      })
    );
  };

  const addMemory = useCallback((entry: Omit<MemoryEntry, "id" | "timestamp">) => {
    setMemory(prev => [...prev, { ...entry, id: `m-${Date.now()}`, timestamp: new Date() }]);
  }, []);

  const addAction = useCallback((action: Omit<GeneratedAction, "id" | "timestamp" | "status">) => {
    setActions(prev => [...prev, { ...action, id: `a-${Date.now()}`, timestamp: new Date(), status: "pending" }]);
  }, []);

  const markActionDone = useCallback((id: string) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: "done" } : a));
  }, []);

  return (
    <AppContext.Provider value={{
      currentStudent, roadmap, toggleTask, activeSection, setActiveSection,
      journeyState, setJourneyState, onboardingDone, setOnboardingDone,
      thesisTopic, setThesisTopic,
      memory, addMemory, actions, addAction, markActionDone,
    }}>
      {children}
    </AppContext.Provider>
  );
};
