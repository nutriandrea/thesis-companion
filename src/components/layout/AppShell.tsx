import { useCallback, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import SocrateIntro from "@/components/journey/SocrateIntro";
import ThesisTransition from "@/components/journey/ThesisTransition";
import UnifiedDashboard from "@/pages/UnifiedDashboard";
import SocratePage from "@/pages/SocratePage";

export default function AppShell() {
  const { profile, setActiveSection, setInputMode } = useApp();
  const navigate = useNavigate();
  const [showTransition, setShowTransition] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);
  const pendingModeRef = useRef<"voice" | "text">("text");

  const handleIntroComplete = useCallback((mode: "voice" | "text") => {
    pendingModeRef.current = mode;
    setShowIntroOverlay(true);
  }, []);

  const handleIntroExitComplete = useCallback(() => {
    setInputMode(pendingModeRef.current);
    setActiveSection("socrate");
    setShowIntroOverlay(false);
    navigate("/socrate", { replace: true });
  }, [setActiveSection, setInputMode, navigate]);

  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
    setActiveSection("dashboard");
    navigate("/dashboard", { replace: true });
  }, [setActiveSection, navigate]);

  // Intro overlay fade-out
  if (showIntroOverlay) {
    return (
      <motion.div
        key="intro-exit"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, ease: "easeInOut" }}
        onAnimationComplete={handleIntroExitComplete}
        className="fixed inset-0 z-[200] bg-foreground"
      />
    );
  }

  // Onboarding
  if (profile && !profile.onboarding_done) {
    return <SocrateIntro onComplete={handleIntroComplete} />;
  }

  // Thesis transition cinematic
  if (showTransition && profile?.thesis_topic) {
    return (
      <ThesisTransition
        thesisTopic={profile.thesis_topic}
        onComplete={handleTransitionComplete}
      />
    );
  }

  const isExplorationPhase = !profile?.thesis_topic;

  // During exploration, force Socrate page
  if (isExplorationPhase) {
    return (
      <motion.div
        key="exploration"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="min-h-screen bg-background"
      >
        <SocratePage
          explorationMode
          onThesisConfirmed={() => setShowTransition(true)}
        />
      </motion.div>
    );
  }

  // Main app routes
  return (
    <Routes>
      <Route path="/dashboard" element={
        <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <UnifiedDashboard />
        </motion.div>
      } />
      <Route path="/socrate" element={
        <motion.div key="socrate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <SocratePage />
        </motion.div>
      } />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
