// This file is kept for backward compatibility but routing is now handled by App.tsx
// If imported directly, it just re-exports via the AppProvider wrapper
import { Navigate } from "react-router-dom";

export default function Index() {
  return <Navigate to="/dashboard" replace />;
}
