import { NavLink, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, MessageCircle, Users, Route as RouteIcon, Zap,
  Compass, Sparkles, BarChart3, Brain, FileText, User, ArrowLeft,
} from "lucide-react";
import DemoDashboard from "./DemoDashboard";
import DemoSocrate from "./DemoSocrate";
import DemoContacts from "./DemoContacts";
import DemoPath from "./DemoPath";
import DemoActions from "./DemoActions";
import DemoFutures from "./DemoFutures";
import DemoSuggestions from "./DemoSuggestions";
import DemoMarket from "./DemoMarket";
import DemoMemory from "./DemoMemory";
import DemoEditor from "./DemoEditor";
import DemoProfile from "./DemoProfile";
import { DEMO_PROFILE } from "@/data/demo-mocks";

const NAV = [
  { to: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "socrate", label: "Socrate", icon: MessageCircle },
  { to: "contacts", label: "Contatti", icon: Users },
  { to: "path", label: "Percorsi", icon: RouteIcon },
  { to: "actions", label: "Azioni", icon: Zap },
  { to: "futures", label: "Futuro", icon: Compass },
  { to: "suggestions", label: "Suggerimenti", icon: Sparkles },
  { to: "market", label: "Mercato", icon: BarChart3 },
  { to: "memory", label: "Memoria", icon: Brain },
  { to: "editor", label: "Editor", icon: FileText },
  { to: "profile", label: "Profilo", icon: User },
];

export default function DemoShell() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex w-full bg-background">
      <aside className="w-60 border-r border-border bg-secondary/30 flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-border">
          <button
            onClick={() => navigate("/demo")}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-3 h-3" /> Demo entry
          </button>
          <h1 className="text-sm font-bold tracking-[0.15em] uppercase text-foreground">
            Thesis Ally
          </h1>
          <p className="text-[10px] text-muted-foreground mt-1">
            {DEMO_PROFILE.name} · {DEMO_PROFILE.university}
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-xs transition-colors ${
                  isActive
                    ? "bg-foreground text-background font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-3 border-t border-border">
          <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
            Demo Mode · Synthetic data
          </p>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Routes>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DemoDashboard />} />
            <Route path="socrate" element={<DemoSocrate />} />
            <Route path="contacts" element={<DemoContacts />} />
            <Route path="path" element={<DemoPath />} />
            <Route path="actions" element={<DemoActions />} />
            <Route path="futures" element={<DemoFutures />} />
            <Route path="suggestions" element={<DemoSuggestions />} />
            <Route path="market" element={<DemoMarket />} />
            <Route path="memory" element={<DemoMemory />} />
            <Route path="editor" element={<DemoEditor />} />
            <Route path="profile" element={<DemoProfile />} />
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </motion.div>
      </main>
    </div>
  );
}

export function DemoPageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border px-8 py-6 bg-background sticky top-0 z-10">
      <h2 className="text-2xl font-bold font-display text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
