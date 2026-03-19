import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all profiles with a google_doc_url
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id, google_doc_url, thesis_topic")
      .not("google_doc_url", "is", null)
      .neq("google_doc_url", "");

    if (error) throw error;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ synced: 0, message: "No docs to sync" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let synced = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      try {
        // Fetch the Google Doc content
        const docId = extractDocId(profile.google_doc_url);
        if (!docId) continue;

        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        const resp = await fetch(exportUrl);
        if (!resp.ok) {
          errors.push(`Doc ${docId}: HTTP ${resp.status}`);
          continue;
        }

        const content = await resp.text();
        if (!content || content.length < 50) continue;

        // Embed in RAG via internal call
        const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
        if (OPENAI_API_KEY && content.length > 100) {
          // Generate embedding and upsert
          const embResp = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "text-embedding-3-small", input: content.substring(0, 8000) }),
          });

          if (embResp.ok) {
            const embData = await embResp.json();
            const embedding = embData.data?.[0]?.embedding;
            if (embedding) {
              // Upsert thesis embedding
              const { error: upsertErr } = await supabase
                .from("embeddings")
                .upsert({
                  user_id: profile.user_id,
                  source_type: "thesis",
                  source_id: docId,
                  content: content.substring(0, 10000),
                  embedding: JSON.stringify(embedding),
                  metadata: { synced_at: new Date().toISOString(), length: content.length },
                }, { onConflict: "user_id,source_type,source_id" });

              if (!upsertErr) synced++;
            }
          }
        } else {
          synced++;
        }
      } catch (e) {
        errors.push(`User ${profile.user_id}: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }

    console.log(`Auto-sync complete: ${synced}/${profiles.length} synced, ${errors.length} errors`);

    return new Response(JSON.stringify({ synced, total: profiles.length, errors: errors.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-sync error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractDocId(url: string): string | null {
  const match = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}
