import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { RoadmapPhase } from "@/types/data";
import { mockRoadmap } from "@/data/mock-roadmap";

export type JourneyState = "lost" | "vague_idea" | "topic_chosen" | "finding_contacts" | "writing";
export type InputMode = "voice" | "text";

export interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  degree: string;
  university: string;
  expected_graduation: string;
  skills: string[];
  field_ids: string[];
  thesis_topic: string;
  journey_state: JourneyState;
  onboarding_done: boolean;
  socrate_done: boolean;
  google_doc_url: string;
}

interface AppState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  activeSection: string;
  setActiveSection: (s: string) => void;
  inputMode: InputMode;
  setInputMode: (m: InputMode) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  roadmap: RoadmapPhase[];
  toggleTask: (phaseId: string, taskId: string) => void;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  overallProgress: number;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("socrate");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [roadmap, setRoadmap] = useState<RoadmapPhase[]>(mockRoadmap);

  const totalTasks = roadmap.flatMap(p => p.tasks).length;
  const completedTasks = roadmap.flatMap(p => p.tasks).filter(t => t.completed).length;
  const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Auth listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchProfile(session.user.id), 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (data) {
      setProfile({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        degree: data.degree || "",
        university: data.university || "",
        skills: data.skills || [],
        field_ids: data.field_ids || [],
        thesis_topic: data.thesis_topic || "",
        journey_state: data.journey_state as JourneyState,
        onboarding_done: data.onboarding_done,
        socrate_done: data.socrate_done,
        google_doc_url: data.google_doc_url || "",
      });

      if (!data.onboarding_done) {
        setActiveSection("onboarding");
      } else if (!data.socrate_done) {
        setActiveSection("socrate");
      }
    }
    setLoading(false);
  };

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!user) return;
    await supabase.from("profiles").update(updates).eq("user_id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

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
    <AppContext.Provider value={{
      user, profile, loading, activeSection, setActiveSection,
      inputMode, setInputMode, sidebarCollapsed, setSidebarCollapsed,
      roadmap, toggleTask, updateProfile, signOut, overallProgress,
    }}>
      {children}
    </AppContext.Provider>
  );
};
