import { AppProvider, useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import OnboardingFlow from "@/components/journey/OnboardingFlow";
import JourneyIndicator from "@/components/journey/JourneyIndicator";
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

function PageRouter() {
  const { activeSection, onboardingDone } = useApp();

  if (!onboardingDone) return <OnboardingFlow />;

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

  // Pages that should NOT show the journey indicator
  const noIndicator = ["socrate", "editor"];

  return (
    <AppLayout>
      {!noIndicator.includes(activeSection) && <JourneyIndicator />}
      {pages[activeSection] || <DashboardPage />}
    </AppLayout>
  );
}

export default function Index() {
  return (
    <AppProvider>
      <PageRouter />
    </AppProvider>
  );
}
