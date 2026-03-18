import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import {
  Compass, Search, Map, FlaskConical, FileText,
  MessageCircle, BookOpen, Lightbulb,
  Contact, TrendingUp, User, Brain,
  Lock, LogOut, ChevronLeft, ChevronRight,
  Mic, PenTool, Zap, Target, Users, Database,
  CalendarDays, BookMarked, HeartHandshake
} from "lucide-react";
import socrateImg from "@/assets/socrate.png";

// 5 thesis journey stages
const journeyStages = [
  { id: "orientation", label: "Orientamento", icon: Compass, weeks: "1-4" },
  { id: "topic-search", label: "Topic & Supervisore", icon: Search, weeks: "2-8" },
  { id: "planning", label: "Pianificazione", icon: Map, weeks: "4-10" },
  { id: "execution", label: "Esecuzione", icon: FlaskConical, weeks: "6-20" },
  { id: "writing", label: "Scrittura", icon: FileText, weeks: "16-24" },
];

// Building blocks (tools/resources)
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
  { id: "dashboard", label: "Dashboard", icon: Lightbulb },
  { id: "profile", label: "Profilo", icon: User },
];

export default function AppSidebar() {
  const { activeSection, setActiveSection, profile, signOut, sidebarCollapsed, setSidebarCollapsed, inputMode, setInputMode, roadmap } = useApp();
  const socrateUnlocked = profile?.socrate_done;
  const collapsed = sidebarCollapsed;

  // Find current stage based on roadmap progress
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
          relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all
          ${collapsed ? "justify-center" : ""}
          ${locked ? "text-muted-foreground/30 cursor-not-allowed" :
            isActive ? "text-accent-foreground" :
            "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"}
        `}
      >
        {isActive && (
          <motion.div layoutId="sidebar-active"
            className="absolute inset-0 rounded-md bg-accent/10 border border-accent/20"
            transition={{ type: "spring", stiffness: 350, damping: 30 }} />
        )}
        <item.icon className={`w-4 h-4 relative z-10 shrink-0 ${isActive ? "text-accent" : ""}`} />
        {!collapsed && (
          <>
            <span className="relative z-10 truncate">{item.label}</span>
            {locked && <Lock className="w-3 h-3 ml-auto relative z-10 text-muted-foreground/20" />}
            {item.badge && !locked && (
              <span className="ml-auto relative z-10 px-1 py-0.5 text-[8px] font-bold rounded bg-accent/20 text-accent">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  return (
    <aside className={`fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300 border-r border-border ${
      collapsed ? "w-16" : "w-56"
    } bg-sidebar`}>
      
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-border ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-accent/20 shrink-0">
          <img src={socrateImg} alt="S" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-sm font-semibold text-foreground font-display">Thesis AI</h1>
          </motion.div>
        )}
      </div>

      {/* Input Mode Toggle */}
      <div className={`px-3 py-2.5 border-b border-border ${collapsed ? "flex justify-center" : ""}`}>
        {collapsed ? (
          <button
            onClick={() => setInputMode(inputMode === "text" ? "voice" : "text")}
            className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {inputMode === "text" ? <PenTool className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <div className="flex bg-secondary rounded-md p-0.5">
            <button
              onClick={() => setInputMode("text")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-all ${
                inputMode === "text" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenTool className="w-3 h-3" /> Testo
            </button>
            <button
              onClick={() => setInputMode("voice")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium transition-all ${
                inputMode === "voice" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className="w-3 h-3" /> Voce
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {/* Journey Stages */}
        <div>
          {!collapsed && (
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-2 mb-2">
              Percorso Tesi
            </p>
          )}
          <div className="space-y-0.5">
            {journeyStages.map((stage, i) => {
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
                    relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all
                    ${collapsed ? "justify-center" : ""}
                    ${isLocked ? "text-muted-foreground/30 cursor-not-allowed" :
                      isActive ? "text-accent-foreground" :
                      isCurrent ? "text-foreground" :
                      "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent"}
                  `}
                >
                  {isActive && (
                    <motion.div layoutId="sidebar-active"
                      className="absolute inset-0 rounded-md bg-accent/10 border border-accent/20"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                  )}
                  <div className="relative z-10 shrink-0">
                    <stage.icon className={`w-4 h-4 ${isActive ? "text-accent" : isCurrent ? "text-accent" : ""}`} />
                  </div>
                  {!collapsed && (
                    <>
                      <div className="relative z-10 flex-1 min-w-0">
                        <span className="block truncate">{stage.label}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex-1 h-0.5 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent rounded-full transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-[8px] text-muted-foreground shrink-0">W{stage.weeks}</span>
                        </div>
                      </div>
                      {isLocked && <Lock className="w-3 h-3 ml-auto relative z-10 text-muted-foreground/20" />}
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
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-2 mb-1.5">
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
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold px-2 mb-1.5">
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
            <p className="text-[10px] text-muted-foreground truncate">{profile.university || profile.email}</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={signOut}
            title="Esci"
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors ${collapsed ? "w-full justify-center" : ""}`}>
            <LogOut className="w-3.5 h-3.5" />
            {!collapsed && "Esci"}
          </button>
          {!collapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="ml-auto p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setSidebarCollapsed(false)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </aside>
  );
}
