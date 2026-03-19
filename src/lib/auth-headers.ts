import { supabase } from "@/integrations/supabase/client";

let cachedToken = "";

// Initialize and keep token in sync
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.access_token) cachedToken = session.access_token;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedToken = session?.access_token ?? "";
});

// Use as: headers: AUTH_HEADERS  (it's a Proxy that always returns fresh headers)
export const AUTH_HEADERS: Record<string, string> = new Proxy({} as Record<string, string>, {
  get(_target, prop: string) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cachedToken}`,
    };
    return headers[prop];
  },
  ownKeys() {
    return ["Content-Type", "Authorization"];
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop === "Content-Type" || prop === "Authorization") {
      return { configurable: true, enumerable: true, value: this.get!(_target, prop, _target) };
    }
    return undefined;
  },
  has(_target, prop: string) {
    return prop === "Content-Type" || prop === "Authorization";
  },
});

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  };
}
