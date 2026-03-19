import { supabase } from "@/integrations/supabase/client";

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  };
}

// Synchronous version using cached token - call refreshAuthToken() on auth state change
let cachedToken = "";

export function AUTH_HEADERS() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cachedToken}`,
  };
}

export function refreshAuthToken(token: string) {
  cachedToken = token;
}

// Initialize token
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) cachedToken = session.access_token;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? "";
});

