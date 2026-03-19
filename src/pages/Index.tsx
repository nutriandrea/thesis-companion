import { useState, useCallback } from "react";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AuthPage from "@/pages/AuthPage";
import SocrateIntro from "@/components/journey/SocrateIntro";
import ThesisTransition from "@/components/journey/ThesisTransition";
import UnifiedDashboard from "@/pages/UnifiedDashboard";
import SocratePage from "@/pages/SocratePage";
import DemoPage from "@/pages/DemoPage";

function AppContent() {
  const { user, profile, loading, setActiveSection, setInputMode } = useApp();
  const { t } = useLanguage();
  const [showTransition, setShowTransition] = useState(false);

  // Check if URL has ?demo param
  const isDemo = new URLSearchParams(window.location.search).has("demo");

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

  // After signup: if onboarding not done, show SocrateIntro (coin animation → text → voice/text choice)
  if (profile && !profile.onboarding_done) {
    return (
      <SocrateIntro
        onComplete={(mode) => {
          setInputMode(mode);
          setActiveSection("socrate");
        }}
      />
    );
  }

  // Thesis transition animation
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
      <div className="min-h-screen bg-background">
        <SocratePage
          explorationMode
          onThesisConfirmed={() => setShowTransition(true)}
        />
      </div>
    );
  }

  // CONSTRUCTION: Unified single-screen dashboard
  return <UnifiedDashboard />;
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
