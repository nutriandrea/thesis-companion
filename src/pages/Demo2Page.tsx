import { Demo2Provider, useDemo2 } from "@/contexts/Demo2Context";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Demo2Dashboard from "@/components/demo2/Demo2Dashboard";
import Demo2Socrate from "@/components/demo2/Demo2Socrate";
import Demo2Management from "@/components/demo2/Demo2Management";
import { MessageCircle, LayoutDashboard, Settings } from "lucide-react";
import LanguageSwitch from "@/components/shared/LanguageSwitch";

function Demo2Inner() {
  const { activeView, setActiveView } = useDemo2();

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top nav tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-1 flex-1">
          <TabBtn active={activeView === "socrate"} onClick={() => setActiveView("socrate")} icon={MessageCircle} label="Socrate" />
          <TabBtn active={activeView === "dashboard"} onClick={() => setActiveView("dashboard")} icon={LayoutDashboard} label="Dashboard" />
          <TabBtn active={activeView === "management"} onClick={() => setActiveView("management")} icon={Settings} label="Gestione" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-accent uppercase tracking-wider px-2 py-0.5 bg-accent/10 rounded-full">DEMO2</span>
          <LanguageSwitch />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === "socrate" && <Demo2Socrate />}
        {activeView === "dashboard" && <Demo2Dashboard />}
        {activeView === "management" && <Demo2Management />}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: React.ElementType; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
        active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default function Demo2Page() {
  return (
    <Demo2Provider>
      <Demo2Inner />
    </Demo2Provider>
  );
}
