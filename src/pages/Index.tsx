import { AppProvider, useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import SocrateIntro from "@/components/journey/SocrateIntro";
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
  const { user, profile, loading, activeSection, setActiveSection, setInputMode } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

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

  const pages: Record<string, React.ReactNode> = {
    // Journey stages → Dashboard with stage focus
    "orientation": <DashboardPage />,
    "topic-search": <DashboardPage />,
    "planning": <DashboardPage />,
    "execution": <DashboardPage />,
    "writing": <DashboardPage />,
    // Building blocks
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
