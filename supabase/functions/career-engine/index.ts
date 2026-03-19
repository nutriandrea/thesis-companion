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
      const [profileRes, studentRes, tasksRes, vulnsRes, memRes, affinityRes, roadmapRes] = await Promise.all([
        supabase.from("profiles").select("thesis_topic, journey_state, skills").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("current_phase, phase_confidence, phase_history, overall_completion, thesis_quality_score, thesis_stage, selected_supervisor_id, supervisor_motivation").eq("user_id", userId).single(),
        supabase.from("socrate_tasks").select("title, status, section, priority").eq("user_id", userId).limit(30),
        supabase.from("vulnerabilities").select("title, severity").eq("user_id", userId).eq("resolved", false).limit(10),
        supabase.from("memory_entries").select("type, title").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("affinity_scores").select("entity_type, entity_name, score").eq("user_id", userId).order("score", { ascending: false }).limit(10),
        supabase.from("roadmap_items").select("phase_key, completed").eq("user_id", userId),
      ]);

      const profile = profileRes.data;
      const student = studentRes.data as any;
      const tasks = tasksRes.data || [];
      const vulns = vulnsRes.data || [];
      const memories = memRes.data || [];
      const affinities = affinityRes.data || [];
      const roadmapItems = roadmapRes.data || [];
      const rawPhase = student?.current_phase || "orientation";

      const CANONICAL_PHASES = ["orientation", "topic_supervisor", "planning", "execution", "writing"];
      
      // Parse hybrid phase: "phaseA+phaseB" or single phase
      const parsedPhases = rawPhase.includes("+") ? rawPhase.split("+") : [rawPhase];
      const primaryPhase = parsedPhases[0];
      const currentIndex = CANONICAL_PHASES.indexOf(primaryPhase);
      const furthestPhase = parsedPhases.length > 1 ? parsedPhases[1] : primaryPhase;
      const furthestIndex = CANONICAL_PHASES.indexOf(furthestPhase);
      const nextPhase = furthestIndex >= 0 && furthestIndex < CANONICAL_PHASES.length - 1
        ? CANONICAL_PHASES[furthestIndex + 1]
        : furthestPhase;

      const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
      const pendingTasks = tasks.filter((t: any) => t.status !== "completed").length;
      const criticalVulns = vulns.filter((v: any) => v.severity === "critical").length;

      // Compute roadmap completion per phase (same logic as the UI)
      const roadmapByPhase: Record<string, { total: number; completed: number }> = {};
      roadmapItems.forEach((item: any) => {
        if (!roadmapByPhase[item.phase_key]) roadmapByPhase[item.phase_key] = { total: 0, completed: 0 };
        roadmapByPhase[item.phase_key].total++;
        if (item.completed) roadmapByPhase[item.phase_key].completed++;
      });
      const totalRoadmap = roadmapItems.length;
      const completedRoadmap = roadmapItems.filter((i: any) => i.completed).length;
      const roadmapCompletionPct = totalRoadmap > 0 ? Math.round((completedRoadmap / totalRoadmap) * 100) : 0;
      const roadmapPerPhase = Object.entries(roadmapByPhase).map(([k, v]) => `${k}: ${v.completed}/${v.total} (${v.total > 0 ? Math.round(v.completed / v.total * 100) : 0}%)`).join(", ");
      const hasSupervisor = !!student?.selected_supervisor_id;

      // Build all valid phase options including hybrid
      const VALID_PHASES: string[] = [...CANONICAL_PHASES];
      for (let i = 0; i < CANONICAL_PHASES.length - 1; i++) {
        VALID_PHASES.push(`${CANONICAL_PHASES[i]}+${CANONICAL_PHASES[i + 1]}`);
      }

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei il PHASE ENGINE di Socrate. Valuta la fase attuale dello studente e determina se deve avanzare, restare, o trovarsi in una fase IBRIDA.

LE 5 FASI CANONICHE (in ordine):
1. orientation — lo studente esplora argomenti e cerca una direzione
2. topic_supervisor — ha un topic definito, cerca/sceglie il supervisore
3. planning — struttura la tesi, definisce capitoli e metodologia
4. execution — esegue la ricerca, raccoglie dati, sviluppa il progetto
5. writing — scrive, rivede e finalizza la tesi

FASI IBRIDE possibili (quando lo studente è a cavallo tra due fasi adiacenti):
- "orientation+topic_supervisor" — sta iniziando a convergere su un topic ma non ha ancora deciso
- "topic_supervisor+planning" — ha il topic, sta scegliendo supervisore e iniziando a pianificare
- "planning+execution" — sta finalizzando la struttura e già iniziando l'esecuzione
- "execution+writing" — sta eseguendo e già scrivendo alcune sezioni

STATO ATTUALE:
- Fase corrente: ${rawPhase} (${parsedPhases.length > 1 ? "ibrida" : "singola"})
- Prossima fase possibile: ${nextPhase}
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Supervisore scelto: ${hasSupervisor ? "Sì" : "No"}
- Completamento: ${student?.overall_completion || 0}%
- Qualità tesi: ${student?.thesis_quality_score || 0}/10
- Task completati: ${completedTasks}/${completedTasks + pendingTasks}
- Vulnerabilità critiche: ${criticalVulns}

MEMORIE RECENTI: ${JSON.stringify(memories.slice(0, 10).map((m: any) => m.title))}
AFFINITÀ: ${JSON.stringify(affinities.slice(0, 5).map((a: any) => ({ type: a.entity_type, name: a.entity_name, score: a.score })))}

REGOLE:
- Se lo studente soddisfa PARZIALMENTE i criteri per avanzare, usa una fase IBRIDA
- Se li soddisfa COMPLETAMENTE, avanza alla fase successiva piena
- Se non li soddisfa, resta nella fase corrente
- orientation → topic_supervisor: RICHIEDE topic tesi definito
- topic_supervisor → planning: RICHIEDE supervisore scelto E topic solido
- planning → execution: RICHIEDE struttura definita, no vulnerabilità critiche
- execution → writing: RICHIEDE progresso >50%, task chiave completati

IMPORTANTE:
- new_phase DEVE essere uno di: ${VALID_PHASES.join(", ")}
- Preferisci le fasi ibride quando lo studente mostra segni di transizione ma non è completamente pronto`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "evaluate_transition",
              description: "Evaluate phase transition readiness",
              parameters: {
                type: "object",
                properties: {
                  can_advance: { type: "boolean", description: "True if phase changes (including to hybrid)" },
                  new_phase: { type: "string", description: "New phase: single (e.g. 'planning') or hybrid (e.g. 'planning+execution')" },
                  confidence: { type: "number" },
                  reasoning: { type: "string" },
                  blockers: {
                    type: "array",
                    items: { type: "string" },
                  },
                  socrate_comment: { type: "string" },
                  completion_estimate: { type: "number", description: "Overall completion % estimate (0-100)" },
                },
                required: ["can_advance", "new_phase", "confidence", "reasoning", "blockers", "socrate_comment", "completion_estimate"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "evaluate_transition" } },
        }),
      });

      if (!response.ok) throw new Error(`AI error: ${response.status}`);

      const aiData = await response.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      let result: any = {};
      if (toolCall?.function?.arguments) {
        try { result = JSON.parse(toolCall.function.arguments); } catch { result = {}; }
      }

      // Validate new_phase is valid (single or hybrid)
      if (!VALID_PHASES.includes(result.new_phase)) {
        result.new_phase = rawPhase;
        result.can_advance = false;
      }

      // Update phase if changed
      if (result.can_advance && result.new_phase !== rawPhase) {
        const history = student?.phase_history || [];
        history.push({
          from: rawPhase,
          to: result.new_phase,
          timestamp: new Date().toISOString(),
          reasoning: result.reasoning,
        });

        // Completion estimate based on furthest phase reached
        const newPhaseParts = result.new_phase.split("+");
        const furthest = newPhaseParts[newPhaseParts.length - 1];
        const newCompletion = result.completion_estimate || Math.min(
          (CANONICAL_PHASES.indexOf(furthest) + 1) / CANONICAL_PHASES.length * 100,
          100
        );

        await supabase.from("student_profiles").update({
          current_phase: result.new_phase,
          thesis_stage: result.new_phase,
          phase_confidence: result.confidence,
          phase_history: history,
          overall_completion: Math.round(newCompletion),
        }).eq("user_id", userId);

        // Map to profiles.journey_state using the primary phase
        const primary = newPhaseParts[0];
        const stateMap: Record<string, string> = {
          orientation: "lost",
          topic_supervisor: "topic_chosen",
          planning: "topic_chosen",
          execution: "writing",
          writing: "writing",
        };
        if (stateMap[primary]) {
          await supabase.from("profiles").update({
            journey_state: stateMap[primary],
          }).eq("user_id", userId);
        }
      } else {
        const updates: any = { phase_confidence: result.confidence };
        if (result.completion_estimate) updates.overall_completion = Math.round(result.completion_estimate);
        await supabase.from("student_profiles").update(updates).eq("user_id", userId);
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
