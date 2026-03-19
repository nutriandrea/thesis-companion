import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const OPENAI_EMBED_URL = "https://api.openai.com/v1/embeddings";
const EMBED_MODEL = "text-embedding-3-small";

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text.slice(0, 8000) }),
  });
  if (!resp.ok) throw new Error(`Embedding API error: ${resp.status}`);
  const data = await resp.json();
  return data.data[0].embedding;
}

async function getBatchEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const inputs = texts.map(t => t.slice(0, 8000));
  const resp = await fetch(OPENAI_EMBED_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: inputs }),
  });
  if (!resp.ok) throw new Error(`Embedding API error: ${resp.status}`);
  const data = await resp.json();
  return data.data.sort((a: any, b: any) => a.index - b.index).map((d: any) => d.embedding);
}

function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }
  return chunks;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { mode } = body;

    // ─── EMBED & STORE ───
    if (mode === "embed") {
      const { content, source_type, source_id, metadata } = body;
      if (!content) throw new Error("content required");

      const chunks = chunkText(content);
      const embeddings: any[] = [];

      const vectors = await getBatchEmbeddings(chunks, OPENAI_API_KEY);
      const embeddings = chunks.map((chunk, i) => ({
        user_id: userId,
        source_type: source_type || "thesis_chunk",
        source_id: source_id || null,
        content: chunk,
        metadata: metadata || {},
        embedding: `[${vectors[i].join(",")}]`,
      }));

      // Delete old embeddings of same source
      if (source_id) {
        await supabase.from("embeddings").delete().eq("user_id", userId).eq("source_id", source_id);
      } else if (source_type) {
        await supabase.from("embeddings").delete().eq("user_id", userId).eq("source_type", source_type);
      }

      const { error } = await supabase.from("embeddings").insert(embeddings);
      if (error) throw new Error(`DB insert error: ${error.message}`);

      return new Response(JSON.stringify({ chunks: embeddings.length, source_type }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SEMANTIC SEARCH ───
    if (mode === "search") {
      const { query, source_type, threshold, limit } = body;
      if (!query) throw new Error("query required");

      const queryEmbedding = await getEmbedding(query, OPENAI_API_KEY);

      const { data, error } = await supabase.rpc("match_embeddings", {
        query_embedding: `[${queryEmbedding.join(",")}]`,
        match_threshold: threshold || 0.65,
        match_count: limit || 10,
        filter_user_id: userId,
        filter_source_type: source_type || null,
      });

      if (error) throw new Error(`Search error: ${error.message}`);

      return new Response(JSON.stringify({ results: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── EMBED THESIS (Google Doc content) ───
    if (mode === "embed_thesis") {
      const { content } = body;
      if (!content || content.length < 50) {
        return new Response(JSON.stringify({ error: "Content too short" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete old thesis chunks
      await supabase.from("embeddings").delete().eq("user_id", userId).eq("source_type", "thesis_chunk");

      const chunks = chunkText(content, 2000, 300);
      const embeddings: any[] = [];

      const vectors = await getBatchEmbeddings(chunks, OPENAI_API_KEY);
      const embeddings = chunks.map((chunk, i) => ({
        user_id: userId,
        source_type: "thesis_chunk",
        source_id: `thesis-chunk-${i}`,
        content: chunk,
        metadata: { chunk_index: i, total_chunks: chunks.length },
        embedding: `[${vectors[i].join(",")}]`,
      }));

      const { error } = await supabase.from("embeddings").insert(embeddings);
      if (error) throw new Error(`DB insert error: ${error.message}`);

      return new Response(JSON.stringify({ chunks: embeddings.length, total_chars: content.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── EMBED CONVERSATION ───
    if (mode === "embed_conversation") {
      const { messages } = body;
      if (!messages?.length) throw new Error("messages required");

      // Combine recent messages into a summary text
      const conversationText = messages
        .slice(-10)
        .map((m: any) => `${m.role}: ${m.content}`)
        .join("\n\n");

      const vector = await getEmbedding(conversationText, OPENAI_API_KEY);

      await supabase.from("embeddings").insert({
        user_id: userId,
        source_type: "conversation",
        source_id: `conv-${Date.now()}`,
        content: conversationText.slice(0, 3000),
        metadata: { messages_count: messages.length, timestamp: new Date().toISOString() },
        embedding: `[${vector.join(",")}]`,
      });

      return new Response(JSON.stringify({ embedded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET CONTEXT (search + assemble for Socrate) ───
    if (mode === "get_context") {
      const { query, include_thesis, include_conversations } = body;
      if (!query) throw new Error("query required");

      const queryEmbedding = await getEmbedding(query, OPENAI_API_KEY);
      const results: any[] = [];

      // Search thesis chunks
      if (include_thesis !== false) {
        const { data } = await supabase.rpc("match_embeddings", {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_threshold: 0.6,
          match_count: 5,
          filter_user_id: userId,
          filter_source_type: "thesis_chunk",
        });
        if (data) results.push(...data.map((r: any) => ({ ...r, category: "thesis" })));
      }

      // Search conversations
      if (include_conversations !== false) {
        const { data } = await supabase.rpc("match_embeddings", {
          query_embedding: `[${queryEmbedding.join(",")}]`,
          match_threshold: 0.6,
          match_count: 3,
          filter_user_id: userId,
          filter_source_type: "conversation",
        });
        if (data) results.push(...data.map((r: any) => ({ ...r, category: "conversation" })));
      }

      // Sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);

      // Assemble context string
      const contextString = results
        .slice(0, 8)
        .map((r) => `[${r.category}] (sim: ${(r.similarity * 100).toFixed(0)}%)\n${r.content}`)
        .join("\n\n---\n\n");

      return new Response(JSON.stringify({ context: contextString, results_count: results.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use: embed, search, embed_thesis, embed_conversation, get_context" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rag-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
