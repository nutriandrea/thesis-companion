import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id || null;
    }
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { mode } = body;
    const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };

    // ─── GENERATE TASKS ───
    if (mode === "generate") {
      const [profileRes, studentRes, memRes, msgRes, existingTasksRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("socrate_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("socrate_tasks").select("title, status, section, priority").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

      const profile = profileRes.data;
      const studentProfile = studentRes.data;
      const memories = memRes.data || [];
      const recentMessages = (msgRes.data || []).reverse();
      const existingTasks = existingTasksRes.data || [];

      // Get RAG context if available
      let ragContext = "";
      if (body.rag_context) ragContext = body.rag_context;

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei il TASK ENGINE di Socrate. Genera compiti concreti, personalizzati e azionabili.

CONTESTO:
- Nome: ${profile?.first_name} ${profile?.last_name}
- Corso: ${profile?.degree || "N/A"}, Università: ${profile?.university || "N/A"}
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Stato: ${profile?.journey_state || "N/A"}

PROFILO INTELLETTUALE:
${studentProfile ? JSON.stringify({
  reasoning_style: studentProfile.reasoning_style,
  strengths: studentProfile.strengths,
  weaknesses: studentProfile.weaknesses,
  research_maturity: studentProfile.research_maturity,
  thesis_stage: studentProfile.thesis_stage,
  thesis_quality_score: studentProfile.thesis_quality_score,
  overall_completion: studentProfile.overall_completion,
}) : "Non profilato"}

MEMORIA: ${JSON.stringify(memories.slice(0, 10).map((m: any) => ({ type: m.type, title: m.title })))}
CONVERSAZIONE: ${JSON.stringify(recentMessages.slice(-8).map((m: any) => ({ role: m.role, content: m.content.substring(0, 150) })))}
${ragContext ? `CONTESTO RAG:\n${ragContext}` : ""}
TASK ESISTENTI: ${JSON.stringify(existingTasks.map((t: any) => ({ title: t.title, status: t.status })))}

Genera 5-8 compiti NUOVI, concreti, verificabili. Priorità realistiche. Tempo stimato in minuti.`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "assign_tasks",
              description: "Assign tasks",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        section: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        estimated_minutes: { type: "integer" },
                      },
                      required: ["title", "description", "section", "priority", "estimated_minutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "assign_tasks" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let tasks: any[] = [];
      if (toolCall?.function?.arguments) {
        try { tasks = JSON.parse(toolCall.function.arguments).tasks || []; } catch { tasks = []; }
      }

      if (tasks.length > 0) {
        await supabase.from("socrate_tasks").insert(
          tasks.map((t: any) => ({
            user_id: userId, title: t.title, description: t.description,
            section: t.section, priority: t.priority, estimated_minutes: t.estimated_minutes, source: "task_engine",
          }))
        );
      }

      return new Response(JSON.stringify({ tasks, count: tasks.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AUTO-GENERATE (from conversation context) ───
    if (mode === "auto_generate") {
      const { messages, thesis_content } = body;

      const [existingTasksRes, profileRes] = await Promise.all([
        supabase.from("socrate_tasks").select("title, status").eq("user_id", userId).eq("status", "pending").limit(10),
        supabase.from("profiles").select("thesis_topic, journey_state, first_name").eq("user_id", userId).single(),
      ]);

      const existingTasks = existingTasksRes.data || [];
      const profile = profileRes.data;

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Analizza la conversazione recente e genera 2-3 task concreti e immediati.
Topic tesi: ${profile?.thesis_topic || "Non definito"}
Task già attivi: ${JSON.stringify(existingTasks.map((t: any) => t.title))}
${thesis_content ? `Contenuto tesi (estratto): ${thesis_content.substring(0, 2000)}` : ""}
Genera SOLO task NUOVI e non duplicati.`,
          }, ...(messages || []).slice(-6)],
          tools: [{
            type: "function",
            function: {
              name: "assign_tasks",
              description: "Assign tasks",
              parameters: {
                type: "object",
                properties: {
                  tasks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        section: { type: "string" },
                        priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                        estimated_minutes: { type: "integer" },
                      },
                      required: ["title", "description", "section", "priority", "estimated_minutes"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["tasks"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "assign_tasks" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let tasks: any[] = [];
      if (toolCall?.function?.arguments) {
        try { tasks = JSON.parse(toolCall.function.arguments).tasks || []; } catch { tasks = []; }
      }

      if (tasks.length > 0) {
        await supabase.from("socrate_tasks").insert(
          tasks.map((t: any) => ({
            user_id: userId, title: t.title, description: t.description,
            section: t.section, priority: t.priority, estimated_minutes: t.estimated_minutes, source: "auto_task_engine",
          }))
        );
      }

      return new Response(JSON.stringify({ tasks, count: tasks.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use: generate, auto_generate" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("task-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
