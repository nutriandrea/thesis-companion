import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractDocId(input: string): string | null {
  // Accepts full URL or just ID
  const match = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // If it looks like a raw ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim();
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { google_doc_url } = body;

    if (!google_doc_url) {
      return new Response(JSON.stringify({ error: "google_doc_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const docId = extractDocId(google_doc_url);
    if (!docId) {
      return new Response(JSON.stringify({ error: "Invalid Google Doc URL or ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch as plain text (doc must be shared as "anyone with the link can view")
    const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
    const docResp = await fetch(exportUrl);

    if (!docResp.ok) {
      return new Response(
        JSON.stringify({
          error: "Cannot fetch document. Make sure the Google Doc is shared with 'Anyone with the link can view'.",
          status: docResp.status,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = await docResp.text();

    // Truncate to ~30k chars to stay within token limits
    const truncated = content.length > 30000 ? content.slice(0, 30000) + "\n\n[... documento troncato per limiti di contesto ...]" : content;

    return new Response(
      JSON.stringify({ content: truncated, length: content.length, truncated: content.length > 30000 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("fetch-google-doc error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
