import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard, MessageCircle, BookOpen, Lightbulb,
  Contact, TrendingUp, User, GraduationCap, Route,
  GitBranch, Zap, Brain, Lock, LogOut
} from "lucide-react";

const navSections = [
  {
    label: "Percorso",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "paths", label: "Percorsi AI", icon: Route, badge: "AI" },
      { id: "futures", label: "Futuri Alternativi", icon: GitBranch, badge: "AI" },
    ],
  },
  {
    label: "Strumenti",
    items: [
      { id: "socrate", label: "Socrate Duello", icon: MessageCircle, badge: "AI" },
      { id: "editor", label: "Editor LaTeX", icon: BookOpen },
      { id: "actions", label: "Azioni Autonome", icon: Zap, badge: "AI" },
    ],
  },
  {
    label: "Esplora",
    items: [
      { id: "suggestions", label: "Suggerimenti", icon: Lightbulb },
      { id: "contacts", label: "Rubrica", icon: Contact },
      { id: "market", label: "Mercato", icon: TrendingUp },
    ],
  },
  {
    label: "Personale",
    items: [
      { id: "memory", label: "Memoria", icon: Brain },
      { id: "profile", label: "Profilo", icon: User },
    ],
  },
];

export default function AppSidebar() {
  const { activeSection, setActiveSection, profile, signOut } = useApp();
  const socrateUnlocked = profile?.socrate_done;

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-sidebar-foreground font-display">Thesis AI</h1>
          <p className="text-xs text-sidebar-foreground/50">La tua tesi, guidata</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {navSections.map(section => (
          <div key={section.label}>
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/30 font-semibold px-3 mb-1.5">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => {
                const isActive = activeSection === item.id;
                const isSocrate = item.id === "socrate";
                const isLocked = !isSocrate && !socrateUnlocked;

                return (
                  <button
                    key={item.id}
                    onClick={() => !isLocked && setActiveSection(item.id)}
                    disabled={isLocked}
                    className={`
                      relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isLocked ? "text-sidebar-foreground/30 cursor-not-allowed" :
                        isActive ? "text-sidebar-primary-foreground" :
                        "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}
                    `}
                  >
                    {isActive && (
                      <motion.div layoutId="sidebar-active"
                        className="absolute inset-0 rounded-lg bg-sidebar-accent"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }} />
                    )}
                    <item.icon className="w-4 h-4 relative z-10" />
                    <span className="relative z-10 truncate">{item.label}</span>
                    {isLocked && <Lock className="w-3 h-3 ml-auto relative z-10 text-sidebar-foreground/20" />}
                    {"badge" in item && item.badge && !isLocked && (
                      <span className="ml-auto relative z-10 px-1.5 py-0.5 text-[9px] font-bold rounded bg-ai text-ai-foreground">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-sidebar-border space-y-2">
        {profile && (
          <div className="px-3 py-2">
            <p className="text-xs font-medium text-sidebar-foreground truncate">{profile.first_name} {profile.last_name}</p>
            <p className="text-[10px] text-sidebar-foreground/40 truncate">{profile.email}</p>
          </div>
        )}
        <button onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <LogOut className="w-3.5 h-3.5" /> Esci
        </button>
      </div>
    </aside>
  );
}
