import { AppProvider, useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import OnboardingFlow from "@/components/journey/OnboardingFlow";
import DashboardPage from "@/pages/DashboardPage";
import SocratePage from "@/pages/SocratePage";
import EditorPage from "@/pages/EditorPage";
import SuggestionsPage from "@/pages/SuggestionsPage";
import ContactsPage from "@/pages/ContactsPage";
import MarketPage from "@/pages/MarketPage";
import ProfilePage from "@/pages/ProfilePage";
import FuturesPage from "@/pages/FuturesPage";
import ActionsPage from "@/pages/ActionsPage";
import MemoryPage from "@/pages/MemoryPage";
import PathPage from "@/pages/PathPage";

function AppContent() {
  const { user, profile, loading, activeSection } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) return <AuthPage />;

  // Logged in but no onboarding
  if (profile && !profile.onboarding_done) return <OnboardingFlow />;

  // Main app
  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    socrate: <SocratePage />,
    editor: <EditorPage />,
    suggestions: <SuggestionsPage />,
    contacts: <ContactsPage />,
    market: <MarketPage />,
    profile: <ProfilePage />,
    futures: <FuturesPage />,
    actions: <ActionsPage />,
    memory: <MemoryPage />,
    paths: <PathPage />,
  };

  return <AppLayout>{pages[activeSection] || <SocratePage />}</AppLayout>;
}

export default function Index() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
