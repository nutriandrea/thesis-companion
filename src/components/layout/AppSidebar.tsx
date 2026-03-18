import { useApp } from "@/contexts/AppContext";
import { motion } from "framer-motion";
import {
  LayoutDashboard, MessageCircle, BookOpen, Lightbulb,
  Contact, TrendingUp, User, GraduationCap
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "socrate", label: "Socrate Duello", icon: MessageCircle },
  { id: "editor", label: "Editor LaTeX", icon: BookOpen },
  { id: "suggestions", label: "Suggerimenti", icon: Lightbulb },
  { id: "contacts", label: "Rubrica", icon: Contact },
  { id: "market", label: "Mercato", icon: TrendingUp },
  { id: "profile", label: "Profilo", icon: User },
];

export default function AppSidebar() {
  const { activeSection, setActiveSection } = useApp();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-accent-foreground" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-sidebar-foreground font-display">Thesis AI</h1>
          <p className="text-xs text-sidebar-foreground/50">La tua tesi, guidata</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? "text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className="w-4.5 h-4.5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
              {item.id === "socrate" && (
                <span className="ml-auto relative z-10 px-1.5 py-0.5 text-[10px] font-semibold rounded bg-ai text-ai-foreground">AI</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-foreground/40 text-center">Studyond © 2026</p>
      </div>
    </aside>
  );
}
