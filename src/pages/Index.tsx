import { AppProvider, useApp } from "@/contexts/AppContext";
import AppLayout from "@/components/layout/AppLayout";
import DashboardPage from "@/pages/DashboardPage";
import SocratePage from "@/pages/SocratePage";
import EditorPage from "@/pages/EditorPage";
import SuggestionsPage from "@/pages/SuggestionsPage";
import ContactsPage from "@/pages/ContactsPage";
import MarketPage from "@/pages/MarketPage";
import ProfilePage from "@/pages/ProfilePage";

function PageRouter() {
  const { activeSection } = useApp();

  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />,
    socrate: <SocratePage />,
    editor: <EditorPage />,
    suggestions: <SuggestionsPage />,
    contacts: <ContactsPage />,
    market: <MarketPage />,
    profile: <ProfilePage />,
  };

  return <AppLayout>{pages[activeSection] || <DashboardPage />}</AppLayout>;
}

export default function Index() {
  return (
    <AppProvider>
      <PageRouter />
    </AppProvider>
  );
}
