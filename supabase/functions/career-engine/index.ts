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
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !data?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = data.claims.sub as string;

    const body = await req.json();
    const { mode } = body;
    const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };

    // ─── COMPUTE CAREER DISTRIBUTION ───
    if (mode === "compute_career") {
      const [profileRes, memRes, msgRes, studentRes] = await Promise.all([
        supabase.from("profiles").select("thesis_topic, skills, degree, field_ids").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("type, title, detail").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("socrate_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("student_profiles").select("deep_interests, strengths, career_distribution").eq("user_id", userId).single(),
      ]);

      const profile = profileRes.data;
      const memories = memRes.data || [];
      const messages = (msgRes.data || []).reverse();
      const thesisContent = body.thesis_content || "";

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei un analista di carriera. Analizza il profilo dello studente e distribuisci le probabilità di carriera tra settori lavorativi.

PROFILO:
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Competenze: ${JSON.stringify(profile?.skills || [])}
- Corso: ${profile?.degree || "N/A"}
- Interessi profondi: ${JSON.stringify((studentRes.data as any)?.deep_interests || [])}
- Punti di forza: ${JSON.stringify((studentRes.data as any)?.strengths || [])}

MEMORIA: ${JSON.stringify(memories.slice(0, 15).map(m => ({ type: m.type, title: m.title })))}

CONVERSAZIONE RECENTE: ${JSON.stringify(messages.slice(-10).map(m => ({ role: m.role, content: m.content.substring(0, 200) })))}

${thesisContent ? `CONTENUTO TESI (estratto): ${thesisContent.substring(0, 3000)}` : ""}

Analizza TUTTO e restituisci la distribuzione percentuale verso settori lavorativi reali. Le percentuali devono sommare a 100.
Usa settori specifici come: Cybersecurity, Data Science, AI/ML, Software Engineering, Cloud Computing, DevOps, Fintech, Consulting, Research/Academia, ecc.
Massimo 6 settori.`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "set_career_distribution",
              description: "Set career sector distribution",
              parameters: {
                type: "object",
                properties: {
                  sectors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        percentage: { type: "number" },
                        reasoning: { type: "string" },
                      },
                      required: ["name", "percentage", "reasoning"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sectors"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "set_career_distribution" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let sectors: any[] = [];
      if (toolCall?.function?.arguments) {
        try { sectors = JSON.parse(toolCall.function.arguments).sectors || []; } catch { sectors = []; }
      }

      // Save to student_profiles
      const distribution: Record<string, number> = {};
      sectors.forEach((s: any) => { distribution[s.name] = s.percentage; });

      await supabase.from("student_profiles").update({
        career_distribution: distribution,
      }).eq("user_id", userId);

      return new Response(JSON.stringify({ sectors, distribution }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── EVALUATE PHASE TRANSITION ───
    if (mode === "evaluate_phase") {
      const [profileRes, studentRes, tasksRes, vulnsRes] = await Promise.all([
        supabase.from("profiles").select("thesis_topic, journey_state").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("current_phase, phase_confidence, phase_history, overall_completion, thesis_quality_score, thesis_stage").eq("user_id", userId).single(),
        supabase.from("socrate_tasks").select("title, status, section, priority").eq("user_id", userId).limit(30),
        supabase.from("vulnerabilities").select("title, severity").eq("user_id", userId).eq("resolved", false).limit(10),
      ]);

      const profile = profileRes.data;
      const student = studentRes.data as any;
      const tasks = tasksRes.data || [];
      const vulns = vulnsRes.data || [];
      const currentPhase = student?.current_phase || "exploration";

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei il PHASE ENGINE di Socrate. Valuta se lo studente è pronto a passare alla fase successiva della tesi.

FASI: exploration → convergence → thesis_defined → refinement → writing → revision

STATO ATTUALE:
- Fase: ${currentPhase}
- Confidence: ${student?.phase_confidence || 0}%
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Completamento: ${student?.overall_completion || 0}%
- Qualità: ${student?.thesis_quality_score || 0}/10

TASK: ${JSON.stringify(tasks.slice(0, 15).map(t => ({ title: t.title, status: t.status, priority: t.priority })))}
VULNERABILITÀ NON RISOLTE: ${JSON.stringify(vulns.map(v => ({ title: v.title, severity: v.severity })))}

REGOLE DI TRANSIZIONE:
- exploration → convergence: ha esplorato almeno 3 aree, ha una direzione
- convergence → thesis_defined: topic chiaro, obiettivo definito, problema articolato
- thesis_defined → refinement: struttura base, capitoli identificati
- refinement → writing: task chiave completati, nessuna vulnerabilità critica
- writing → revision: bozza completa, qualità > 5/10
- revision: fase finale, rifinitura

Valuta RIGOROSAMENTE. NON avanzare se le condizioni non sono soddisfatte.`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "evaluate_transition",
              description: "Evaluate phase transition readiness",
              parameters: {
                type: "object",
                properties: {
                  can_advance: { type: "boolean" },
                  new_phase: { type: "string" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" },
                  blockers: {
                    type: "array",
                    items: { type: "string" },
                  },
                  socrate_comment: { type: "string" },
                },
                required: ["can_advance", "new_phase", "confidence", "reasoning", "blockers", "socrate_comment"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "evaluate_transition" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let result: any = {};
      if (toolCall?.function?.arguments) {
        try { result = JSON.parse(toolCall.function.arguments); } catch { result = {}; }
      }

      // Update phase if advancing
      if (result.can_advance && result.new_phase !== currentPhase) {
        const history = student?.phase_history || [];
        history.push({
          from: currentPhase,
          to: result.new_phase,
          timestamp: new Date().toISOString(),
          reasoning: result.reasoning,
        });

        await supabase.from("student_profiles").update({
          current_phase: result.new_phase,
          phase_confidence: result.confidence,
          phase_history: history,
          thesis_stage: result.new_phase,
        }).eq("user_id", userId);

        // Also update journey_state in profiles
        const stateMap: Record<string, string> = {
          exploration: "lost",
          convergence: "vague_idea",
          thesis_defined: "topic_chosen",
          refinement: "topic_chosen",
          writing: "writing",
          revision: "writing",
        };
        if (stateMap[result.new_phase]) {
          await supabase.from("profiles").update({
            journey_state: stateMap[result.new_phase],
          }).eq("user_id", userId);
        }
      } else {
        await supabase.from("student_profiles").update({
          phase_confidence: result.confidence,
        }).eq("user_id", userId);
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── SELECT SUPERVISOR ───
    if (mode === "select_supervisor") {
      const { supervisor_id, supervisor_name, motivation } = body;
      if (!supervisor_id || !motivation) throw new Error("supervisor_id and motivation required");

      await supabase.from("student_profiles").update({
        selected_supervisor_id: supervisor_id,
        supervisor_motivation: motivation,
        supervisor_selected_at: new Date().toISOString(),
      }).eq("user_id", userId);

      // Generate Socrate's critical response about the choice
      const [profileRes] = await Promise.all([
        supabase.from("profiles").select("thesis_topic, first_name").eq("user_id", userId).single(),
      ]);

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei Socrate. Lo studente ${profileRes.data?.first_name} ha scelto il supervisore "${supervisor_name}".
La sua motivazione: "${motivation}"
Topic tesi: "${profileRes.data?.thesis_topic || "Non definito"}"

Rispondi con 2-3 frasi CRITICHE e provocatorie:
- Metti in dubbio la scelta
- Chiedi cosa si aspetta
- Evidenzia potenziali problemi
Sii diretto, non cattivo.`,
          }],
        }),
      });

      let socrateResponse = "";
      if (response.ok) {
        const data = await response.json();
        socrateResponse = data.choices?.[0]?.message?.content || "";
      }

      return new Response(JSON.stringify({
        saved: true,
        socrate_response: socrateResponse,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET COMPANIES BY SECTOR ───
    if (mode === "get_companies_by_sector") {
      const { sector } = body;

      const [studentRes, profileRes] = await Promise.all([
        supabase.from("student_profiles").select("career_distribution").eq("user_id", userId).single(),
        supabase.from("profiles").select("thesis_topic, skills").eq("user_id", userId).single(),
      ]);

      const distribution = (studentRes.data as any)?.career_distribution || {};

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Dato il settore "${sector || "tutti"}" e la distribuzione di carriera dello studente:
${JSON.stringify(distribution)}
Topic tesi: ${profileRes.data?.thesis_topic || "N/A"}
Competenze: ${JSON.stringify(profileRes.data?.skills || [])}

Suggerisci 5-8 aziende REALI (italiane e internazionali) che operano in questo settore e che sarebbero rilevanti per questo studente.
Per ogni azienda fornisci: nome, settore, cosa fanno, tecnologie, tipo di profili cercati, e un punteggio di coerenza con la tesi (0-100).`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "suggest_companies",
              description: "Suggest companies",
              parameters: {
                type: "object",
                properties: {
                  companies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        sector: { type: "string" },
                        description: { type: "string" },
                        technologies: { type: "array", items: { type: "string" } },
                        profiles_sought: { type: "array", items: { type: "string" } },
                        thesis_coherence: { type: "number" },
                      },
                      required: ["name", "sector", "description", "technologies", "profiles_sought", "thesis_coherence"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["companies"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_companies" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let companies: any[] = [];
      if (toolCall?.function?.arguments) {
        try { companies = JSON.parse(toolCall.function.arguments).companies || []; } catch { companies = []; }
      }

      return new Response(JSON.stringify({ companies, sector: sector || "all" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use: compute_career, evaluate_phase, select_supervisor, get_companies_by_sector" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("career-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
