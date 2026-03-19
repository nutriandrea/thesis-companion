import { useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthPage from "@/pages/AuthPage";
import SocrateIntro from "@/components/journey/SocrateIntro";
import ThesisTransition from "@/components/journey/ThesisTransition";
import UnifiedDashboard from "@/pages/UnifiedDashboard";
import SocratePage from "@/pages/SocratePage";
import DemoPage from "@/pages/DemoPage";

/**
 * Determines a unique view key for AnimatePresence so that
 * exit animations play before the next view mounts.
 */
function getViewKey(
  user: any,
  profile: any,
  showTransition: boolean,
  showIntroOverlay: boolean
): string {
  if (!user) return "auth";
  if (!profile) return "loading";
  if (showIntroOverlay) return "intro";
  if (!profile.onboarding_done) return "intro";
  if (showTransition) return "transition";
  if (!profile.thesis_topic) return "exploration";
  return "dashboard";
}

function AppContent() {
  const { user, profile, loading, setActiveSection, setInputMode } = useApp();
  const { t } = useLanguage();
  const [showTransition, setShowTransition] = useState(false);
  // Overlay state prevents destination from rendering until intro exit animation completes
  const [showIntroOverlay, setShowIntroOverlay] = useState(false);
  const pendingModeRef = useRef<"voice" | "text">("text");

  const isDemo = new URLSearchParams(window.location.search).has("demo");

  const handleIntroComplete = useCallback((mode: "voice" | "text") => {
    pendingModeRef.current = mode;
    // Keep intro visible; AnimatePresence exit will fire, then onExitComplete unmounts it
    setShowIntroOverlay(true);
  }, []);

  const handleIntroExitComplete = useCallback(() => {
    // Intro exit animation done — now switch to destination
    setInputMode(pendingModeRef.current);
    setActiveSection("socrate");
    setShowIntroOverlay(false);
  }, [setActiveSection, setInputMode]);

  const handleTransitionComplete = useCallback(() => {
    setShowTransition(false);
    setActiveSection("dashboard");
  }, [setActiveSection]);

  if (isDemo) return <DemoPage />;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Intro overlay: profile updated but we keep showing intro for exit animation
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

  // Onboarding intro (coin animation → text → voice/text choice)
  if (profile && !profile.onboarding_done) {
    return <SocrateIntro onComplete={handleIntroComplete} />;
  }

  // Thesis transition (full-screen cinematic)
  if (showTransition && profile?.thesis_topic) {
    return (
      <ThesisTransition
        thesisTopic={profile.thesis_topic}
        onComplete={handleTransitionComplete}
      />
    );
  }

  const isExplorationPhase = !profile?.thesis_topic;

  // EXPLORATION: Socrate-only, no sidebar/dashboard
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

  // CONSTRUCTION: Unified single-screen dashboard
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <UnifiedDashboard />
    </motion.div>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
