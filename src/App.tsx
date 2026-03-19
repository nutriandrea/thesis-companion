import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppProvider } from "@/contexts/AppContext";
import AuthPage from "@/pages/AuthPage";
import Demo2Page from "@/pages/Demo2Page";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";
import DemoPage from "@/pages/DemoPage";

const App = () => (
  <BrowserRouter>
    <LanguageProvider>
      <AppProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/demo2" element={<Demo2Page />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            />
          </Routes>
        </TooltipProvider>
      </AppProvider>
    </LanguageProvider>
  </BrowserRouter>
);

export default App;
