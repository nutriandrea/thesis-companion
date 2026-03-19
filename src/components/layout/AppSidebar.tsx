import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import {
  Compass, Search, Map, FlaskConical, FileText,
  MessageCircle, BookOpen,
  Contact, TrendingUp, User, Brain,
  Lock, LogOut, ChevronLeft, ChevronRight,
  PenTool, Zap, Target, Users,
} from "lucide-react";

const journeyStages = [
  { id: "orientation", label: "Orientamento", icon: Compass, weeks: "1-4" },
  { id: "topic-search", label: "Topic & Supervisore", icon: Search, weeks: "2-8" },
  { id: "planning", label: "Pianificazione", icon: Map, weeks: "4-10" },
  { id: "execution", label: "Esecuzione", icon: FlaskConical, weeks: "6-20" },
  { id: "writing", label: "Scrittura", icon: FileText, weeks: "16-24" },
];

const buildingBlocks = [
  { id: "socrate", label: "Socrate", icon: MessageCircle, badge: "AI" },
  { id: "suggestions", label: "Topic", icon: Target },
  { id: "contacts", label: "Supervisori", icon: Users },
  { id: "market", label: "Aziende", icon: TrendingUp },
  { id: "editor", label: "Editor", icon: BookOpen },
  { id: "actions", label: "Azioni", icon: Zap, badge: "AI" },
  { id: "memory", label: "Memoria", icon: Brain },
];

const personalItems = [
  { id: "dashboard", label: "Dashboard", icon: Compass },
  { id: "profile", label: "Profilo", icon: User },
];

export default function AppSidebar() {
  const { activeSection, setActiveSection, profile, signOut, sidebarCollapsed, setSidebarCollapsed, roadmap } = useApp();
  const socrateUnlocked = profile?.socrate_done;
  const collapsed = sidebarCollapsed;

  const currentStageIndex = roadmap.findIndex(p => p.progress < 100);
  const currentStageId = currentStageIndex >= 0 ? roadmap[currentStageIndex].id : roadmap[roadmap.length - 1].id;

  const renderNavButton = (item: { id: string; label: string; icon: any; badge?: string }, locked = false) => {
    const isActive = activeSection === item.id;
    return (
      <button
        key={item.id}
        onClick={() => !locked && setActiveSection(item.id)}
        disabled={locked}
        title={collapsed ? item.label : undefined}
        className={`
          relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors duration-150
          ${collapsed ? "justify-center" : ""}
          ${locked ? "text-muted-foreground/30 cursor-not-allowed" :
            isActive ? "text-foreground bg-secondary" :
            "text-sidebar-foreground hover:text-foreground hover:bg-secondary/60"}
        `}
      >
        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-foreground" : ""}`} />
        {!collapsed && (
          <>
            <span className="truncate">{item.label}</span>
            {locked && <Lock className="w-3 h-3 ml-auto text-muted-foreground/20" />}
            {item.badge && !locked && (
              <span className="ml-auto px-1 py-0.5 text-[8px] font-bold rounded bg-ai/10 text-ai ds-badge">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-200 border-r border-border ${
      collapsed ? "w-16" : "w-56"
    } bg-sidebar`}>
      
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-border ${collapsed ? "justify-center" : ""}`}>
        <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center shrink-0">
          <span className="text-[10px] font-bold text-background">S</span>
        </div>
        {!collapsed && (
          <h1 className="text-sm font-semibold text-foreground tracking-tight">Studyond</h1>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-5 overflow-y-auto">
        {/* Journey Stages */}
        <div>
          {!collapsed && (
            <p className="ds-badge text-muted-foreground px-2 mb-2">
              Percorso
            </p>
          )}
          <div className="space-y-0.5">
            {journeyStages.map((stage) => {
              const phaseData = roadmap.find(p => p.id === stage.id);
              const progress = phaseData?.progress || 0;
              const isCurrent = stage.id === currentStageId;
              const isActive = activeSection === stage.id;
              const isLocked = !socrateUnlocked;

              return (
                <button
                  key={stage.id}
                  onClick={() => !isLocked && setActiveSection(stage.id)}
                  disabled={isLocked}
                  title={collapsed ? `${stage.label} (W${stage.weeks})` : undefined}
                  className={`
                    relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors duration-150
                    ${collapsed ? "justify-center" : ""}
                    ${isLocked ? "text-muted-foreground/30 cursor-not-allowed" :
                      isActive ? "text-foreground bg-secondary" :
                      isCurrent ? "text-foreground" :
                      "text-sidebar-foreground hover:text-foreground hover:bg-secondary/60"}
                  `}
                >
                  <stage.icon className={`w-4 h-4 shrink-0 ${isActive || isCurrent ? "text-foreground" : ""}`} />
                  {!collapsed && (
                    <>
                      <div className="flex-1 min-w-0">
                        <span className="block truncate">{stage.label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-px bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-foreground/30 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-muted-foreground shrink-0">W{stage.weeks}</span>
                        </div>
                      </div>
                      {isLocked && <Lock className="w-3 h-3 ml-auto text-muted-foreground/20" />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Building Blocks */}
        <div>
          {!collapsed && (
            <p className="ds-badge text-muted-foreground px-2 mb-1.5">
              Strumenti
            </p>
          )}
          <div className="space-y-0.5">
            {buildingBlocks.map(item => {
              const isLocked = item.id !== "socrate" && !socrateUnlocked;
              return renderNavButton(item, isLocked);
            })}
          </div>
        </div>

        {/* Personal */}
        <div>
          {!collapsed && (
            <p className="ds-badge text-muted-foreground px-2 mb-1.5">
              Personale
            </p>
          )}
          <div className="space-y-0.5">
            {personalItems.map(item => renderNavButton(item, !socrateUnlocked))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border space-y-1">
        {profile && !collapsed && (
          <div className="px-2.5 py-1.5">
            <p className="text-xs font-medium text-foreground truncate">{profile.first_name} {profile.last_name}</p>
            <p className="ds-caption truncate">{profile.university || profile.email}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={signOut}
            title="Esci"
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150 ${collapsed ? "w-full justify-center" : ""}`}>
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && "Esci"}
          </button>
          {!collapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-150"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-150"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </aside>
  );
}
