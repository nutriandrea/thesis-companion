import React from "react";
import { useApp } from "@/contexts/AppContext";
import AppSidebar from "./AppSidebar";
import ProgressBar from "./ProgressBar";
import { AnimatePresence, motion } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed, activeSection } = useApp();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <ProgressBar />
      <main className={`min-h-screen transition-all duration-300 pr-12 ${
        sidebarCollapsed ? "ml-16" : "ml-56"
      }`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="p-6 lg:p-8 max-w-6xl"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
