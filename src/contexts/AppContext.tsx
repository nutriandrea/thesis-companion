import React, { createContext, useContext, useState } from "react";
import type { Student, RoadmapPhase, RoadmapTask } from "@/types/data";
import { mockRoadmap } from "@/data/mock-roadmap";
import studentsData from "@/data/students.json";

interface AppState {
  currentStudent: Student;
  roadmap: RoadmapPhase[];
  toggleTask: (phaseId: string, taskId: string) => void;
  activeSection: string;
  setActiveSection: (s: string) => void;
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
  const [activeSection, setActiveSection] = useState("dashboard");

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

  return (
    <AppContext.Provider value={{ currentStudent, roadmap, toggleTask, activeSection, setActiveSection }}>
      {children}
    </AppContext.Provider>
  );
};
