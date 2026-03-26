import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const reqBody = await req.json();
    const { messages, studentContext, latexContent, mode, memoryEntries, existingSuggestions, datasetSummary } = reqBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Extract user from auth header for DB operations
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ")) {
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } });
      try {
        // Try getClaims first (faster, available in newer versions)
        const { data, error: claimsErr } = await (anonClient.auth as any).getClaims(authHeader.replace("Bearer ", ""));
        if (!claimsErr && data?.claims?.sub) {
          userId = data.claims.sub as string;
        } else {
          // Fallback to getUser
          const { data: userData } = await anonClient.auth.getUser();
          if (userData?.user?.id) userId = userData.user.id;
        }
      } catch {
        // getClaims not available, use getUser
        const { data: userData } = await anonClient.auth.getUser();
        if (userData?.user?.id) userId = userData.user.id;
      }
    }

    const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };
    const currentMode = mode || "chat";

    // Helper: log session event
    const logEvent = async (eventType: string, eventData: any = {}, section?: string) => {
      if (!userId) return;
      try {
        await supabase.from("session_events").insert({
          user_id: userId, event_type: eventType, event_data: eventData, section: section || currentMode,
        });
      } catch (e) { console.error("Event log error:", e); }
    };

    // Helper: update progress on student_profiles
    const updateProgress = async (sectionProgress?: any, overallCompletion?: number, estimatedDays?: number) => {
      if (!userId) return;
      const update: any = { last_active_at: new Date().toISOString() };
      if (sectionProgress !== undefined) update.sections_progress = sectionProgress;
      if (overallCompletion !== undefined) update.overall_completion = overallCompletion;
      if (estimatedDays !== undefined) update.estimated_days_remaining = estimatedDays;
      await supabase.from("student_profiles").update(update).eq("user_id", userId);
    };

    // ─── EXTRACT MEMORY ───
    if (currentMode === "extract_memory") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Analizza la conversazione tra Socrate e lo studente. Estrai i punti chiave come memoria strutturata.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX:\n${latexContent.substring(0, 2000)}` : ""}

MEMORIE GIÀ ESISTENTI (non duplicare):
${memoryEntries ? JSON.stringify((memoryEntries as any[]).slice(-20)) : "Nessuna"}

Estrai SOLO nuove informazioni non già presenti. Ogni entry deve essere specifica e azionabile.
Tipi:
- "exploration": idee, interessi, direzioni esplorate
- "decision": scelte fatte dallo studente
- "contact": menzioni di professori, aziende, persone
- "action": task concreti da fare
- "feedback": valutazioni su punti di forza/debolezza
- "profile": info su personalità, competenze, stile di ragionamento`,
            },
            { role: "user", content: JSON.stringify((messages as any[]).slice(-20)) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_memory_entries",
              description: "Save extracted memory entries",
              parameters: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["exploration", "decision", "contact", "action", "feedback", "profile"] },
                        title: { type: "string" },
                        detail: { type: "string" },
                      },
                      required: ["type", "title", "detail"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["entries"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_memory_entries" } },
        }),
      });

      if (!response.ok) {
        console.error("AI error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore estrazione memoria" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let entries: any[] = [];
      if (toolCall?.function?.arguments) {
        try { entries = JSON.parse(toolCall.function.arguments).entries || []; } catch { entries = []; }
      }
      return new Response(JSON.stringify({ entries }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── EXTRACT VULNERABILITIES ───
    if (currentMode === "extract_vulnerabilities") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei l'analista critico del sistema Socrate. Identifica VULNERABILITÀ nella tesi e nel ragionamento dello studente.
ADATTA la tua analisi al TIPO di tesi: scientifica/sperimentale, argomentativa, compilativa, progettuale, creativa, giuridica, economica, umanistica, artistica.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO DOCUMENTO TESI:\n${latexContent.substring(0, 3000)}` : ""}

Categorie:
- "cliche": frasi fatte, idee banali, argomenti già sentiti mille volte
- "logic_gap": buchi logici, salti argomentativi, premesse non dimostrate
- "methodology_flaw": errori metodologici o di approccio (vale per qualsiasi tipo di tesi: metodo sperimentale, framework analitico, approccio critico, analisi casistica, progetto creativo)
- "superficiality": trattazione superficiale, mancanza di profondità
- "originality_deficit": niente di nuovo rispetto alla letteratura esistente
- "weak_argument": argomentazione debole, tesi non supportata, conclusioni non derivate dalle premesse
- "source_bias": fonti sbilanciate, mancanza di prospettive opposte, cherry-picking
- "structural_incoherence": incoerenza strutturale, capitoli non collegati, filo logico assente

Severity: "critical" (blocca la tesi), "high" (serio), "medium" (da migliorare)

Sii DIRETTO, AGGRESSIVO, BRUTALE. Non addolcire.
Esempio: "Questa introduzione potrebbe essere in qualsiasi tesi. Zero identità."
Esempio: "Stai riscrivendo Wikipedia, non stai facendo ricerca."
Esempio (tesi umanistica): "Citi solo autori che supportano la tua tesi. Dov'è il contraddittorio?"
Esempio (tesi progettuale): "Il tuo progetto non ha metriche di validazione. Come dimostri che funziona?"`,
            },
            { role: "user", content: JSON.stringify((messages as any[]).slice(-20)) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "report_vulnerabilities",
              description: "Report thesis vulnerabilities",
              parameters: {
                type: "object",
                properties: {
                  vulnerabilities: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["cliche", "logic_gap", "methodology_flaw", "superficiality", "originality_deficit", "weak_argument", "source_bias", "structural_incoherence"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["critical", "high", "medium"] },
                      },
                      required: ["type", "title", "description", "severity"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["vulnerabilities"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "report_vulnerabilities" } },
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Errore estrazione vulnerabilità" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let vulnerabilities: any[] = [];
      if (toolCall?.function?.arguments) {
        try { vulnerabilities = JSON.parse(toolCall.function.arguments).vulnerabilities || []; } catch { vulnerabilities = []; }
      }

      if (userId && vulnerabilities.length > 0) {
        await supabase.from("vulnerabilities").insert(
          vulnerabilities.map((v: any) => ({
            user_id: userId, type: v.type, title: v.title, description: v.description, severity: v.severity, source: "socrate",
          }))
        );
        await logEvent("vulnerability_extraction", { count: vulnerabilities.length });
      }

      return new Response(JSON.stringify({ vulnerabilities }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── SUGGEST REFERENCES ───
    if (currentMode === "suggest_references") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei un ricercatore esperto. Basandoti sul contesto dello studente, suggerisci risorse fondamentali per la sua tesi.
ADATTA i riferimenti al TIPO di tesi e disciplina dello studente.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO DOCUMENTO TESI:\n${latexContent.substring(0, 2000)}` : ""}

CONVERSAZIONE RECENTE:
${JSON.stringify((messages as any[]).slice(-10).map((m: any) => ({ role: m.role, content: m.content.substring(0, 300) })))}

Regole:
- Suggerisci 4-6 riferimenti REALI e verificabili
- Tipi di risorse (adatta alla disciplina): paper accademici, libri, monografie, sentenze giuridiche, casi aziendali, rapporti di settore, opere d'arte/design, codice legislativo, standard tecnici, documentari, archivi storici, dataset
- Includi link diretti quando possibile (DOI, arXiv, Google Scholar, SSRN, siti ufficiali, archivi giuridici)
- Per ogni riferimento spiega BREVEMENTE perché è rilevante per la tesi dello studente
- Categorie: "foundational" (basi teoriche), "methodology" (approccio metodologico), "recent" (stato dell'arte recente), "contrarian" (prospettive opposte)
- Se non conosci un link preciso, usa il formato Google Scholar search: https://scholar.google.com/scholar?q=QUERY
- Prioritizza fonti seminali e review/survey recenti`,
            },
            { role: "user", content: "Suggerisci i riferimenti principali per la mia tesi." },
          ],
          tools: [{
            type: "function",
            function: {
              name: "suggest_references",
              description: "Return academic references with links",
              parameters: {
                type: "object",
                properties: {
                  references: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Paper/article title" },
                        authors: { type: "string", description: "Author names" },
                        year: { type: "string", description: "Publication year" },
                        url: { type: "string", description: "Direct link (DOI, arXiv, or Google Scholar search)" },
                        category: { type: "string", enum: ["foundational", "methodology", "recent", "contrarian"] },
                        relevance: { type: "string", description: "Why this is relevant (1-2 sentences)" },
                      },
                      required: ["title", "authors", "url", "category", "relevance"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["references"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "suggest_references" } },
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ error: "Errore suggerimento riferimenti" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let references: any[] = [];
      if (toolCall?.function?.arguments) {
        try { references = JSON.parse(toolCall.function.arguments).references || []; } catch { references = []; }
      }

      await logEvent("reference_suggestion", { count: references.length });

      return new Response(JSON.stringify({ references }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── FULL PROFILE EXTRACTION + PERSISTENCE ───
    if (currentMode === "extract_suggestions") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il MOTORE DI PROFILAZIONE CENTRALE di Socrate. ADATTA la profilazione al tipo di tesi (scientifica, argomentativa, compilativa, progettuale, creativa, giuridica, economica, umanistica, artistica). Analizza TUTTO per generare:
1. Suggerimenti mirati per le sezioni del sito
2. Un aggiornamento del profilo intellettuale dello studente

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`\n${latexContent.substring(0, 3000)}\n\`\`\`` : "Nessun contenuto LaTeX."}

SUGGERIMENTI GIÀ GENERATI (non duplicare):
${existingSuggestions ? JSON.stringify((existingSuggestions as any[]).slice(-30).map((s: any) => ({ category: s.category, title: s.title }))) : "Nessuno"}

ISTRUZIONI:
1. Analizza la conversazione per identificare interessi, punti di forza, fragilità, stile di ragionamento
2. Genera suggerimenti SOLO se emergono chiaramente dalla conversazione
3. Categorie: "professor", "company", "book", "topic", "source", "career", "skill", "thesis_feedback", "next_step"
4. Aggiorna il profilo intellettuale con le nuove scoperte

Chiama ENTRAMBE le funzioni: save_suggestions e update_profile.`,
            },
            { role: "user", content: JSON.stringify((messages as any[]).slice(-20)) },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "save_suggestions",
                description: "Save profiled suggestions for the student",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string", enum: ["company", "professor", "book", "topic", "source", "career", "skill", "thesis_feedback", "next_step"] },
                          title: { type: "string" },
                          detail: { type: "string" },
                          reason: { type: "string" },
                        },
                        required: ["category", "title", "detail", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "update_profile",
                description: "Update the student's centralized intellectual profile based on conversation analysis",
                parameters: {
                  type: "object",
                  properties: {
                    reasoning_style: { type: "string", description: "e.g. analitico, creativo, pragmatico, teorico" },
                    strengths: { type: "array", items: { type: "string" }, description: "Intellectual/academic strengths" },
                    weaknesses: { type: "array", items: { type: "string" }, description: "Areas needing improvement" },
                    deep_interests: { type: "array", items: { type: "string" }, description: "Core intellectual interests" },
                    research_maturity: { type: "string", enum: ["beginner", "developing", "intermediate", "advanced"] },
                    methodology_awareness: { type: "string", description: "Brief assessment of methodology understanding" },
                    writing_quality: { type: "string", description: "Brief assessment of writing quality" },
                    critical_thinking: { type: "string", description: "Brief assessment of critical thinking" },
                    career_interests: { type: "array", items: { type: "string" } },
                    thesis_stage: { type: "string", enum: ["exploration", "topic_chosen", "structuring", "writing", "revision"] },
                    thesis_quality_score: { type: "integer", description: "1-10 score of thesis quality" },
                  },
                  required: ["reasoning_style", "strengths", "weaknesses", "deep_interests", "research_maturity"],
                  additionalProperties: false,
                },
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("AI error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore estrazione" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];

      let suggestions: any[] = [];
      let profileUpdate: any = null;

      for (const tc of toolCalls) {
        if (tc.function?.name === "save_suggestions") {
          try { suggestions = JSON.parse(tc.function.arguments).suggestions || []; } catch { suggestions = []; }
        }
        if (tc.function?.name === "update_profile") {
          try { profileUpdate = JSON.parse(tc.function.arguments); } catch { profileUpdate = null; }
        }
      }

      // Persist profile update to DB
      if (profileUpdate && userId) {
        // First, snapshot current profile
        const { data: currentProfile } = await supabase
          .from("student_profiles")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (currentProfile) {
          // Save snapshot
          await supabase.from("profile_snapshots").insert({
            user_id: userId,
            profile_data: currentProfile,
            trigger_event: "extraction",
            version: currentProfile.version || 1,
          });

          // Update profile
          await supabase.from("student_profiles").update({
            reasoning_style: profileUpdate.reasoning_style || currentProfile.reasoning_style,
            strengths: profileUpdate.strengths || currentProfile.strengths,
            weaknesses: profileUpdate.weaknesses || currentProfile.weaknesses,
            deep_interests: profileUpdate.deep_interests || currentProfile.deep_interests,
            research_maturity: profileUpdate.research_maturity || currentProfile.research_maturity,
            methodology_awareness: profileUpdate.methodology_awareness || currentProfile.methodology_awareness,
            writing_quality: profileUpdate.writing_quality || currentProfile.writing_quality,
            critical_thinking: profileUpdate.critical_thinking || currentProfile.critical_thinking,
            career_interests: profileUpdate.career_interests || currentProfile.career_interests,
            thesis_stage: profileUpdate.thesis_stage || currentProfile.thesis_stage,
            thesis_quality_score: profileUpdate.thesis_quality_score || currentProfile.thesis_quality_score,
            total_extractions: (currentProfile.total_extractions || 0) + 1,
            last_extraction_at: new Date().toISOString(),
          }).eq("user_id", userId);
        } else {
          // Create profile if not exists
          await supabase.from("student_profiles").insert({
            user_id: userId,
            ...profileUpdate,
            total_extractions: 1,
            last_extraction_at: new Date().toISOString(),
          });
        }
      }

      // Increment exchange count
      if (userId) {
        const { data: sp } = await supabase.from("student_profiles").select("total_exchanges").eq("user_id", userId).single();
        if (sp) {
          await supabase.from("student_profiles").update({
            total_exchanges: (sp.total_exchanges || 0) + (messages as any[]).length,
          }).eq("user_id", userId);
        }
      }

      await logEvent("extraction", { suggestions: suggestions.length, profileUpdated: !!profileUpdate }, "socrate");

      return new Response(JSON.stringify({ suggestions, profileUpdate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET PROFILE (for frontend) ───
    if (currentMode === "get_profile") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const [profileRes, affinityRes] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("affinity_scores").select("*").eq("user_id", userId).order("score", { ascending: false }),
      ]);

      return new Response(JSON.stringify({ profile: profileRes.data, affinities: affinityRes.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GET SESSION STATS ───
    if (currentMode === "get_session_stats") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const [eventsRes, profileRes, msgCountRes] = await Promise.all([
        supabase.from("session_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
        supabase.from("student_profiles").select("overall_completion, estimated_days_remaining, sections_progress, last_active_at, thesis_stage, total_exchanges, total_extractions").eq("user_id", userId).single(),
        supabase.from("socrate_messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);

      const events = eventsRes.data || [];
      const studentProfile = profileRes.data;
      const totalMessages = msgCountRes.count || 0;

      // Compute stats from events
      const chatEvents = events.filter((e: any) => e.event_type === "chat_exchange");
      const latexEvents = events.filter((e: any) => e.event_type === "latex_analysis");
      const fusionEvents = events.filter((e: any) => e.event_type === "fusion_analysis");

      // Activity by day (last 14 days)
      const activityByDay: Record<string, number> = {};
      const now = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        activityByDay[d.toISOString().split("T")[0]] = 0;
      }
      events.forEach((e: any) => {
        const day = e.created_at.split("T")[0];
        if (activityByDay[day] !== undefined) activityByDay[day]++;
      });

      // Session durations (group events by day)
      const uniqueSessionDays = new Set(events.map((e: any) => e.created_at.split("T")[0]));

      return new Response(JSON.stringify({
        stats: {
          totalMessages,
          totalChatSessions: chatEvents.length,
          totalLatexAnalyses: latexEvents.length,
          totalFusionAnalyses: fusionEvents.length,
          totalSessions: uniqueSessionDays.size,
          totalExtractions: studentProfile?.total_extractions || 0,
        },
        progress: {
          overallCompletion: studentProfile?.overall_completion || 0,
          estimatedDaysRemaining: studentProfile?.estimated_days_remaining,
          sectionsProgress: studentProfile?.sections_progress || {},
          thesisStage: studentProfile?.thesis_stage,
          lastActiveAt: studentProfile?.last_active_at,
        },
        activityByDay,
        recentEvents: events.slice(0, 20).map((e: any) => ({
          type: e.event_type,
          section: e.section,
          data: e.event_data,
          createdAt: e.created_at,
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── MATCH PEOPLE (experts + supervisors) ───
    if (currentMode === "match_people") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather context
      const [profileRes, studentRes, msgRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("socrate_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(15),
      ]);
      const profile = profileRes.data;
      const studentProfile = studentRes.data;
      const recentMessages = (msgRes.data || []).reverse();

      const resolvedCtx = studentContext || (profile ? `Nome: ${profile.first_name} ${profile.last_name}\nCorso: ${profile.degree || "N/A"}\nUniversità: ${profile.university || "N/A"}\nArgomento: ${profile.thesis_topic || "Non definito"}` : "");
      const thesisStage = studentProfile?.thesis_stage || "exploration";

      // Experts and supervisors datasets (passed from frontend or hardcoded)
      const { expertsData, supervisorsData, fieldsData } = reqBody;

      // Pre-compute datasets for the prompt
      const expertsForPrompt = JSON.stringify((expertsData || []).map((e: any) => ({
        id: e.id, name: e.firstName + " " + e.lastName, title: e.title, about: e.about, fieldIds: e.fieldIds, offerInterviews: e.offerInterviews,
      })));
      const supervisorsForPrompt = JSON.stringify((supervisorsData || []).map((s: any) => ({
        id: s.id, name: s.title + " " + s.firstName + " " + s.lastName, researchInterests: s.researchInterests, about: s.about, fieldIds: s.fieldIds,
      })));
      const conversationCtx = recentMessages.slice(-10).map((m: any) => m.role + ": " + m.content.substring(0, 150)).join("\n");
      const thesisCtx = latexContent ? "CONTENUTO TESI:\n" + latexContent.substring(0, 3000) : "Nessun contenuto tesi disponibile.";

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il MOTORE DI MATCHING di Socrate. Il tuo compito è trovare corrispondenze REALI e SPECIFICHE tra il percorso di tesi dello studente e le persone nel database.

CONTESTO STUDENTE:
${resolvedCtx}

PROFILO INTELLETTUALE:
- Interessi profondi: ${JSON.stringify(studentProfile?.deep_interests || [])}
- Punti di forza: ${JSON.stringify(studentProfile?.strengths || [])}
- Interessi di carriera: ${JSON.stringify(studentProfile?.career_interests || [])}
- Fase tesi: ${thesisStage}
- Maturità ricerca: ${studentProfile?.research_maturity || "beginner"}

${thesisCtx}

CONVERSAZIONE RECENTE:
${conversationCtx}

DATABASE ESPERTI (interview partners):
${expertsForPrompt}

DATABASE SUPERVISORI:
${supervisorsForPrompt}

CAMPI DI STUDIO:
${JSON.stringify(fieldsData || [])}

ISTRUZIONI:
1. Analizza il contenuto della tesi, il profilo e la conversazione per estrarre: topic principali, keyword, area accademica, direzione (teorica vs applicativa).
2. Per ogni persona nel database, calcola un RELEVANCE SCORE (0-100) basato su:
   - Quanto i loro ambiti di ricerca/competenza si allineano ai topic della tesi
   - Quanto il loro campo (fieldIds) corrisponde agli interessi dello studente
   - Per gli esperti: se offrono interviste (priorità più alta)
   - Per i supervisori: quanto i loro interessi di ricerca si sovrappongono
3. FASE TESI: ${thesisStage === "exploration" || thesisStage === "topic_chosen" ? "Dai PIÙ PESO ai supervisori" : "Dai PIÙ PESO agli esperti/interview partners"}
4. Restituisci SOLO match con score >= 40. Se nessuno supera la soglia, restituisci array vuoti.
5. Per ogni match, scrivi una MOTIVAZIONE SPECIFICA (2-3 frasi) che colleghi chiaramente la persona alla tesi dello studente. NO motivazioni generiche.
6. matched_traits deve contenere i tratti/keyword specifici che hanno generato il match.

FILTRI DI QUALITÀ:
- Se un match non ha un collegamento CHIARO e SPECIFICO alla tesi → SCARTALO
- Se la motivazione potrebbe applicarsi a qualsiasi studente → SCARTALO
- Ogni motivazione DEVE menzionare elementi specifici della tesi dello studente`,
            },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_matches",
              description: "Save matched experts and supervisors with scores and motivations",
              parameters: {
                type: "object",
                properties: {
                  experts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        entity_id: { type: "string" },
                        entity_name: { type: "string" },
                        score: { type: "integer", description: "0-100 relevance score" },
                        reasoning: { type: "string", description: "Specific motivation linking this person to the thesis" },
                        matched_traits: { type: "array", items: { type: "string" } },
                      },
                      required: ["entity_id", "entity_name", "score", "reasoning", "matched_traits"],
                      additionalProperties: false,
                    },
                  },
                  supervisors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        entity_id: { type: "string" },
                        entity_name: { type: "string" },
                        score: { type: "integer" },
                        reasoning: { type: "string" },
                        matched_traits: { type: "array", items: { type: "string" } },
                      },
                      required: ["entity_id", "entity_name", "score", "reasoning", "matched_traits"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["experts", "supervisors"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_matches" } },
        }),
      });

      if (!response.ok) {
        console.error("AI match error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore matching" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let experts: any[] = [];
      let matchedSupervisors: any[] = [];
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          experts = parsed.experts || [];
          matchedSupervisors = parsed.supervisors || [];
        } catch { /* ignore */ }
      }

      // Persist to affinity_scores (upsert by user_id + entity_id)
      const allMatches = [
        ...experts.map((e: any) => ({ user_id: userId, entity_type: "expert", entity_id: e.entity_id, entity_name: e.entity_name, score: e.score, reasoning: e.reasoning, matched_traits: e.matched_traits })),
        ...matchedSupervisors.map((s: any) => ({ user_id: userId, entity_type: "supervisor", entity_id: s.entity_id, entity_name: s.entity_name, score: s.score, reasoning: s.reasoning, matched_traits: s.matched_traits })),
      ];

      if (allMatches.length > 0) {
        // Delete old scores and insert fresh ones
        await supabase.from("affinity_scores").delete().eq("user_id", userId).in("entity_type", ["expert", "supervisor"]);
        await supabase.from("affinity_scores").insert(allMatches);
        await logEvent("people_matching", { experts: experts.length, supervisors: matchedSupervisors.length });
      }

      return new Response(JSON.stringify({ experts, supervisors: matchedSupervisors }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (currentMode === "validate_task") {
      const { task } = reqBody;
      if (!task) {
        return new Response(JSON.stringify({ approved: true, feedback: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get recent conversation context for validation
      let recentContext = "";
      if (userId) {
        const { data: msgs } = await supabase
          .from("socrate_messages")
          .select("role, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        if (msgs) recentContext = msgs.reverse().map((m: any) => `${m.role}: ${m.content.substring(0, 200)}`).join("\n");
      }

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [{
            role: "system",
            content: `Sei Socrate. Uno studente dice di aver completato un task. Valuta se è plausibile basandoti sul contesto della conversazione.

TASK:
- Titolo: ${task.title}
- Descrizione: ${task.description}
- Sezione: ${task.section}

CONVERSAZIONE RECENTE:
${recentContext || "Nessun contesto disponibile."}

Rispondi SOLO con JSON: {"approved": true/false, "feedback": "breve commento"}
- approved=true se il task è ragionevolmente completabile e il contesto suggerisce che lo studente ci sta lavorando
- approved=false SOLO se è chiaramente impossibile che sia stato fatto (es: non ne ha mai parlato e il task richiede output concreto)
- Sii ragionevole: nel dubbio, approva. Non bloccare lo studente senza motivo.
- Il feedback deve essere breve, diretto, in italiano.`,
          }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        return new Response(JSON.stringify({ approved: true, feedback: "" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return new Response(JSON.stringify({ approved: !!parsed.approved, feedback: parsed.feedback || "" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {}

      return new Response(JSON.stringify({ approved: true, feedback: "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── GENERATE TASKS: Socrate's personalized tasks ───
    if (currentMode === "generate_tasks") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather all context
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

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il TASK MANAGER di Socrate. Genera compiti concreti, personalizzati e azionabili per lo studente.
ADATTA i compiti al TIPO di tesi dello studente (scientifica, argomentativa, compilativa, progettuale, creativa, giuridica, economica, umanistica, artistica).

CONTESTO STUDENTE:
- Nome: ${profile?.first_name} ${profile?.last_name}
- Corso: ${profile?.degree || "N/A"}
- Università: ${profile?.university || "N/A"}
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Stato journey: ${profile?.journey_state || "N/A"}

PROFILO INTELLETTUALE:
${studentProfile ? JSON.stringify({
  reasoning_style: studentProfile.reasoning_style,
  strengths: studentProfile.strengths,
  weaknesses: studentProfile.weaknesses,
  deep_interests: studentProfile.deep_interests,
  research_maturity: studentProfile.research_maturity,
  writing_quality: studentProfile.writing_quality,
  critical_thinking: studentProfile.critical_thinking,
  thesis_stage: studentProfile.thesis_stage,
  thesis_quality_score: studentProfile.thesis_quality_score,
  sections_progress: studentProfile.sections_progress,
  overall_completion: studentProfile.overall_completion,
  estimated_days_remaining: studentProfile.estimated_days_remaining,
}) : "Non ancora profilato"}

MEMORIA (ultimi eventi):
${JSON.stringify(memories.slice(0, 15).map((m: any) => ({ type: m.type, title: m.title, detail: m.detail })))}

CONVERSAZIONE RECENTE:
${JSON.stringify(recentMessages.slice(-10).map((m: any) => ({ role: m.role, content: m.content.substring(0, 200) })))}

CONTENUTO DOCUMENTO TESI:
${latexContent ? latexContent.substring(0, 3000) : "Nessun contenuto documento."}

COMPITI GIÀ ASSEGNATI (evita duplicati):
${JSON.stringify(existingTasks.map((t: any) => ({ title: t.title, status: t.status, section: t.section })))}

ISTRUZIONI:
- Genera 5-8 compiti concreti e personalizzati
- Ogni compito deve mirare a un miglioramento specifico della tesi o della preparazione
- Assegna priorità realistiche basate sullo stato attuale
- Stima il tempo in minuti (15, 30, 45, 60, 90, 120, 180)
- Indica la sezione della tesi o l'area tematica
- SEZIONI POSSIBILI (adatta al tipo di tesi): Introduzione, Capitoli argomentativi, Analisi critica, Casi studio, Metodologia, Literature Review, Ricerca, Progetto, Framework teorico, Analisi dati, Risultati, Discussione, Conclusioni, Bibliografia, Abstract
- I compiti devono essere NUOVI (non ripetere quelli già assegnati)
- Adatta i compiti al livello di maturità dello studente`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "assign_tasks",
                description: "Assign personalized tasks to the student",
                parameters: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Short task title" },
                          description: { type: "string", description: "Detailed action description" },
                          section: { type: "string", description: "Thesis section or topic area (e.g. Introduzione, Metodologia, Literature Review, Analisi critica, Casi studio, Progetto, Framework teorico, Risultati, Discussione, Conclusioni, Bibliografia, Abstract)" },
                          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                          estimated_minutes: { type: "integer", description: "Estimated time in minutes" },
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
            },
          ],
          tool_choice: { type: "function", function: { name: "assign_tasks" } },
        }),
      });

      if (!response.ok) {
        console.error("Task generation error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore generazione compiti" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
      let tasks: any[] = [];

      for (const tc of toolCalls) {
        if (tc.function?.name === "assign_tasks") {
          try { tasks = JSON.parse(tc.function.arguments).tasks || []; } catch { tasks = []; }
        }
      }

      // Persist tasks
      if (tasks.length > 0) {
        await supabase.from("socrate_tasks").insert(
          tasks.map((t: any) => ({
            user_id: userId,
            title: t.title,
            description: t.description,
            section: t.section,
            priority: t.priority,
            estimated_minutes: t.estimated_minutes,
            source: "socrate",
          }))
        );
      }

      await logEvent("tasks_generated", { count: tasks.length }, "tasks");

      return new Response(JSON.stringify({ tasks, count: tasks.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── DEEP PROFILE: Comprehensive student profiling ───
    if (currentMode === "deep_profile") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather ALL available data
      const [profileRes, studentRes, memRes, msgRes, sugRes, taskRes, eventRes, affinityRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("socrate_messages").select("role, content, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(40),
        supabase.from("socrate_suggestions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("socrate_tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("session_events").select("event_type, event_data, section, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("affinity_scores").select("*").eq("user_id", userId).order("score", { ascending: false }).limit(20),
      ]);

      const profile = profileRes.data;
      const studentProfile = studentRes.data;
      const memories = memRes.data || [];
      const recentMessages = (msgRes.data || []).reverse();
      const suggestions = sugRes.data || [];
      const tasks = taskRes.data || [];
      const events = eventRes.data || [];
      const affinities = affinityRes.data || [];

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il MOTORE DI PROFILAZIONE PROFONDA di Socrate. Analizza TUTTE le fonti dati disponibili per costruire il profilo più completo e accurato possibile dello studente.

DATI DISPONIBILI:

A) PROFILO BASE:
- Nome: ${profile?.first_name} ${profile?.last_name}
- Email: ${profile?.email}
- Corso: ${profile?.degree || "N/A"}
- Università: ${profile?.university || "N/A"}
- Competenze: ${profile?.skills?.join(", ") || "N/A"}
- Topic: ${profile?.thesis_topic || "Non definito"}
- Stato: ${profile?.journey_state}

B) PROFILO INTELLETTUALE ATTUALE:
${studentProfile ? JSON.stringify(studentProfile) : "Non ancora creato"}

C) MEMORIA (${memories.length} entries):
${JSON.stringify(memories.slice(0, 30).map((m: any) => ({ type: m.type, title: m.title, detail: m.detail })))}

D) CONVERSAZIONE (${recentMessages.length} messaggi):
${JSON.stringify(recentMessages.slice(-20).map((m: any) => ({ role: m.role, content: m.content.substring(0, 300) })))}

E) SUGGERIMENTI GENERATI (${suggestions.length}):
${JSON.stringify(suggestions.slice(0, 15).map((s: any) => ({ category: s.category, title: s.title })))}

F) COMPITI ASSEGNATI (${tasks.length}):
${JSON.stringify(tasks.slice(0, 15).map((t: any) => ({ title: t.title, status: t.status, section: t.section, priority: t.priority })))}

G) ATTIVITÀ (${events.length} eventi):
${JSON.stringify(events.slice(0, 20).map((e: any) => ({ type: e.event_type, section: e.section, date: e.created_at })))}

H) AFFINITÀ CALCOLATE (${affinities.length}):
${JSON.stringify(affinities.slice(0, 10).map((a: any) => ({ entity: a.entity_name, type: a.entity_type, score: a.score })))}

I) CONTENUTO LATEX:
${latexContent ? latexContent.substring(0, 4000) : "Nessun contenuto LaTeX."}

ISTRUZIONI:
1. Analizza TUTTE le fonti per costruire un profilo unificato e profondo
2. Valuta: stile di ragionamento, punti di forza, debolezze, interessi, maturità, qualità scrittura, pensiero critico
3. Identifica pattern comportamentali dalle interazioni
4. Valuta affinità professionali e accademiche
5. Determina lo stage della tesi e la qualità complessiva
6. Genera un summary narrativo del profilo`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "update_deep_profile",
                description: "Update the comprehensive student profile",
                parameters: {
                  type: "object",
                  properties: {
                    reasoning_style: { type: "string", description: "How the student thinks and argues" },
                    strengths: { type: "array", items: { type: "string" }, description: "Academic and intellectual strengths" },
                    weaknesses: { type: "array", items: { type: "string" }, description: "Areas needing improvement" },
                    deep_interests: { type: "array", items: { type: "string" }, description: "Core intellectual interests" },
                    research_maturity: { type: "string", enum: ["beginner", "developing", "intermediate", "advanced"] },
                    methodology_awareness: { type: "string", description: "Understanding of research methods" },
                    writing_quality: { type: "string", description: "Assessment of thesis writing quality" },
                    critical_thinking: { type: "string", description: "Critical thinking assessment" },
                    career_interests: { type: "array", items: { type: "string" } },
                    industry_fit: { type: "array", items: { type: "string" } },
                    thesis_stage: { type: "string", enum: ["exploration", "topic_chosen", "structuring", "writing", "revision"] },
                    thesis_quality_score: { type: "integer", description: "0-100 quality score" },
                    profile_summary: { type: "string", description: "Narrative summary of the student's profile (3-5 sentences)" },
                    recommended_focus_areas: { type: "array", items: { type: "string" }, description: "Top areas the student should focus on" },
                    learning_patterns: { type: "string", description: "How the student learns and interacts" },
                  },
                  required: ["reasoning_style", "strengths", "weaknesses", "deep_interests", "research_maturity", "thesis_stage", "thesis_quality_score", "profile_summary", "recommended_focus_areas"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "update_deep_profile" } },
        }),
      });

      if (!response.ok) {
        console.error("Deep profile error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore profilazione" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
      let profileUpdate: any = null;

      for (const tc of toolCalls) {
        if (tc.function?.name === "update_deep_profile") {
          try { profileUpdate = JSON.parse(tc.function.arguments); } catch { profileUpdate = null; }
        }
      }

      if (profileUpdate) {
        const profileSummary = profileUpdate.profile_summary;
        const recommendedFocusAreas = profileUpdate.recommended_focus_areas;
        const learningPatterns = profileUpdate.learning_patterns;

        // Remove non-DB fields before update
        delete profileUpdate.profile_summary;
        delete profileUpdate.recommended_focus_areas;
        delete profileUpdate.learning_patterns;

        if (studentProfile) {
          // Snapshot before update
          await supabase.from("profile_snapshots").insert({
            user_id: userId,
            profile_data: studentProfile,
            trigger_event: "deep_profile",
            version: studentProfile.version || 1,
          });
          await supabase.from("student_profiles").update({
            ...profileUpdate,
            total_extractions: (studentProfile.total_extractions || 0) + 1,
            last_extraction_at: new Date().toISOString(),
            version: (studentProfile.version || 1) + 1,
          }).eq("user_id", userId);
        } else {
          await supabase.from("student_profiles").insert({
            user_id: userId,
            ...profileUpdate,
            total_extractions: 1,
            last_extraction_at: new Date().toISOString(),
            version: 1,
          });
        }

        // Store summary and focus areas as memory entries
        await supabase.from("memory_entries").insert([
          { user_id: userId, type: "profile_summary", title: "Profilo aggiornato", detail: profileSummary || "" },
          { user_id: userId, type: "focus_areas", title: "Aree di focus", detail: (recommendedFocusAreas || []).join(", ") },
        ]);

        // Restore fields for response
        profileUpdate.profile_summary = profileSummary;
        profileUpdate.recommended_focus_areas = recommendedFocusAreas;
        profileUpdate.learning_patterns = learningPatterns;
      }

      await logEvent("deep_profile", { updated: !!profileUpdate }, "profile");

      return new Response(JSON.stringify({ profile: profileUpdate }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── FILTER DATABASE: Intelligent filtering based on student profile ───
    if (currentMode === "filter_database") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather student context
      const [profileRes, studentRes, memRes, msgRes, existingAffinityRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).single(),
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("socrate_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
        supabase.from("affinity_scores").select("entity_id, entity_type, score").eq("user_id", userId),
      ]);

      const profile = profileRes.data;
      const studentProfile = studentRes.data;
      const memories = memRes.data || [];
      const recentMessages = (msgRes.data || []).reverse();
      const existingAffinities = existingAffinityRes.data || [];

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei SOCRATE, motore di raccomandazione personalizzata.

OBIETTIVO: Genera raccomandazioni personalizzate per questo studente basandoti sulla TUA CONOSCENZA del mondo accademico e professionale. NON hai bisogno di un database esterno — usa la tua knowledge base per suggerire professori REALI, argomenti di ricerca, aziende e libri.

PROFILO STUDENTE:
- Nome: ${profile?.first_name} ${profile?.last_name}
- Corso: ${profile?.degree || "N/A"}
- Università: ${profile?.university || "N/A"}
- Competenze: ${profile?.skills?.join(", ") || "N/A"}
- Topic tesi: ${profile?.thesis_topic || "Non definito"}
- Stato: ${profile?.journey_state || "N/A"}

PROFILO INTELLETTUALE:
${studentProfile ? JSON.stringify({
  reasoning_style: studentProfile.reasoning_style,
  strengths: studentProfile.strengths,
  weaknesses: studentProfile.weaknesses,
  deep_interests: studentProfile.deep_interests,
  research_maturity: studentProfile.research_maturity,
  writing_quality: studentProfile.writing_quality,
  critical_thinking: studentProfile.critical_thinking,
  career_interests: studentProfile.career_interests,
  industry_fit: studentProfile.industry_fit,
  thesis_stage: studentProfile.thesis_stage,
  thesis_quality_score: studentProfile.thesis_quality_score,
  sections_progress: studentProfile.sections_progress,
}) : "Non ancora profilato"}

MEMORIA RILEVANTE:
${JSON.stringify(memories.slice(0, 15).map((m: any) => ({ type: m.type, title: m.title, detail: m.detail })))}

CONVERSAZIONE RECENTE:
${JSON.stringify(recentMessages.slice(-10).map((m: any) => ({ role: m.role, content: m.content.substring(0, 200) })))}

CONTENUTO DOCUMENTO TESI:
${latexContent ? latexContent.substring(0, 3000) : "Nessun contenuto disponibile."}

AFFINITÀ ESISTENTI (per confronto):
${JSON.stringify(existingAffinities.slice(0, 10).map((a: any) => ({ id: a.entity_id, type: a.entity_type, score: a.score })))}

ISTRUZIONI DI GENERAZIONE:
1. PROFESSORI: Suggerisci 5-10 professori REALI (esistenti nel mondo accademico) rilevanti per il tema della tesi. Includi nome completo, università, e specializzazione. Genera un entity_id univoco (es. "prof-generated-1").
2. ARGOMENTI: Suggerisci 5-10 argomenti di ricerca correlati alla tesi che lo studente potrebbe esplorare. Genera un entity_id univoco.
3. AZIENDE: Suggerisci 5-8 aziende REALI dove lo studente potrebbe fare stage o iniziare la carriera, basandoti sul suo campo. Genera un entity_id univoco.
4. LIBRI/FONTI: Suggerisci 5-8 libri o fonti fondamentali (libri, paper, manuali, sentenze, codici, opere). Devono essere REALI e pubblicati.
5. Mantieni 1-2 suggerimenti "esplorativi" per ogni categoria (exploration_flag = true).
6. Adatta al TIPO di tesi: scientifica, umanistica, progettuale, argomentativa, compilativa.
7. Ogni entry deve avere: relevance_score (0-100), reason (breve motivazione personalizzata), matched_traits (competenze/interessi dello studente che matchano).`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "filter_results",
                description: "Return filtered and ranked database results",
                parameters: {
                  type: "object",
                  properties: {
                    professors: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          entity_id: { type: "string" },
                          entity_name: { type: "string" },
                          relevance_score: { type: "integer" },
                          reason: { type: "string" },
                          matched_traits: { type: "array", items: { type: "string" } },
                          exploration_flag: { type: "boolean" },
                        },
                        required: ["entity_id", "entity_name", "relevance_score", "reason", "matched_traits"],
                        additionalProperties: false,
                      },
                    },
                    topics: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          entity_id: { type: "string" },
                          entity_name: { type: "string" },
                          relevance_score: { type: "integer" },
                          reason: { type: "string" },
                          matched_traits: { type: "array", items: { type: "string" } },
                          exploration_flag: { type: "boolean" },
                        },
                        required: ["entity_id", "entity_name", "relevance_score", "reason", "matched_traits"],
                        additionalProperties: false,
                      },
                    },
                    companies: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          entity_id: { type: "string" },
                          entity_name: { type: "string" },
                          relevance_score: { type: "integer" },
                          reason: { type: "string" },
                          matched_traits: { type: "array", items: { type: "string" } },
                          exploration_flag: { type: "boolean" },
                        },
                        required: ["entity_id", "entity_name", "relevance_score", "reason", "matched_traits"],
                        additionalProperties: false,
                      },
                    },
                    books: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string" },
                          author: { type: "string" },
                          relevance_score: { type: "integer" },
                          reason: { type: "string" },
                          category: { type: "string", enum: ["textbook", "reference", "methodology", "domain_specific"] },
                          exploration_flag: { type: "boolean" },
                        },
                        required: ["title", "author", "relevance_score", "reason", "category"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["professors", "topics", "companies", "books"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "filter_results" } },
        }),
      });

      if (!response.ok) {
        console.error("Filter DB error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore filtraggio database" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];
      let filterResult: any = null;

      for (const tc of toolCalls) {
        if (tc.function?.name === "filter_results") {
          try { filterResult = JSON.parse(tc.function.arguments); } catch { filterResult = null; }
        }
      }

      if (filterResult) {
        // Update affinity_scores with filtered results
        const allAffinities = [
          ...(filterResult.professors || []).map((p: any) => ({
            user_id: userId, entity_type: "supervisor", entity_id: p.entity_id,
            entity_name: p.entity_name, score: p.relevance_score,
            reasoning: p.reason, matched_traits: p.matched_traits,
          })),
          ...(filterResult.topics || []).map((t: any) => ({
            user_id: userId, entity_type: "topic", entity_id: t.entity_id,
            entity_name: t.entity_name, score: t.relevance_score,
            reasoning: t.reason, matched_traits: t.matched_traits,
          })),
          ...(filterResult.companies || []).map((c: any) => ({
            user_id: userId, entity_type: "company", entity_id: c.entity_id,
            entity_name: c.entity_name, score: c.relevance_score,
            reasoning: c.reason, matched_traits: c.matched_traits,
          })),
        ];

        if (allAffinities.length > 0) {
          await supabase.from("affinity_scores").delete().eq("user_id", userId);
          await supabase.from("affinity_scores").insert(allAffinities);
        }

        // Save books as suggestions
        if (filterResult.books?.length > 0) {
          await supabase.from("socrate_suggestions").delete().eq("user_id", userId).eq("category", "book");
          await supabase.from("socrate_suggestions").insert(
            filterResult.books.map((b: any) => ({
              user_id: userId,
              category: "book",
              title: `${b.title} — ${b.author}`,
              detail: `Categoria: ${b.category}${b.exploration_flag ? " · 🔍 Esplorazione" : ""}`,
              reason: b.reason,
            }))
          );
        }

        // Save professors as suggestions
        if (filterResult.professors?.length > 0) {
          await supabase.from("socrate_suggestions").delete().eq("user_id", userId).eq("category", "professor");
          await supabase.from("socrate_suggestions").insert(
            filterResult.professors.map((p: any) => ({
              user_id: userId,
              category: "professor",
              title: p.entity_name,
              detail: `Rilevanza: ${p.relevance_score}%${p.exploration_flag ? " · 🔍 Esplorazione" : ""} · ${p.matched_traits?.join(", ") || ""}`,
              reason: p.reason,
            }))
          );
        }

        // Save topics as suggestions
        if (filterResult.topics?.length > 0) {
          await supabase.from("socrate_suggestions").delete().eq("user_id", userId).eq("category", "topic");
          await supabase.from("socrate_suggestions").insert(
            filterResult.topics.map((t: any) => ({
              user_id: userId,
              category: "topic",
              title: t.entity_name,
              detail: `Rilevanza: ${t.relevance_score}%${t.exploration_flag ? " · 🔍 Esplorazione" : ""} · ${t.matched_traits?.join(", ") || ""}`,
              reason: t.reason,
            }))
          );
        }

        // Save companies as suggestions
        if (filterResult.companies?.length > 0) {
          await supabase.from("socrate_suggestions").delete().eq("user_id", userId).eq("category", "company");
          await supabase.from("socrate_suggestions").insert(
            filterResult.companies.map((c: any) => ({
              user_id: userId,
              category: "company",
              title: c.entity_name,
              detail: `Rilevanza: ${c.relevance_score}%${c.exploration_flag ? " · 🔍 Esplorazione" : ""} · ${c.matched_traits?.join(", ") || ""}`,
              reason: c.reason,
            }))
          );
        }
      }

      await logEvent("filter_database", {
        professors: filterResult?.professors?.length || 0,
        topics: filterResult?.topics?.length || 0,
        companies: filterResult?.companies?.length || 0,
        books: filterResult?.books?.length || 0,
      }, "filter");

      return new Response(JSON.stringify({
        ...filterResult,
        summary: {
          professors: filterResult?.professors?.length || 0,
          topics: filterResult?.topics?.length || 0,
          companies: filterResult?.companies?.length || 0,
          books: filterResult?.books?.length || 0,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ANALYZE FULL: Fusion Engine ───
    if (currentMode === "analyze_full") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather ALL data sources
      const [profileRes, memRes, sugRes, msgRes] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("socrate_suggestions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("socrate_messages").select("role, content").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      ]);

      const existingProfile = profileRes.data;
      const allMemories = memRes.data || [];
      const allSuggestions = sugRes.data || [];
      const recentMessages = (msgRes.data || []).reverse();

      // Dataset summaries (from request body)

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il MOTORE DI FUSIONE CENTRALE di Socrate. Hai accesso a TUTTE le fonti dati dello studente. Il tuo compito è:

1. FONDERE tutte le informazioni in un profilo unico e coerente
2. CALCOLARE affinità con entità del dataset (aziende, professori, topic)
3. AGGIORNARE il profilo intellettuale con una valutazione completa

FONTI DATI DISPONIBILI:

A) PROFILO BASE:
${studentContext || "Non disponibile"}

B) PROFILO INTELLETTUALE ATTUALE (dal database):
${existingProfile ? JSON.stringify({
  reasoning_style: existingProfile.reasoning_style,
  strengths: existingProfile.strengths,
  weaknesses: existingProfile.weaknesses,
  deep_interests: existingProfile.deep_interests,
  research_maturity: existingProfile.research_maturity,
  career_interests: existingProfile.career_interests,
  thesis_stage: existingProfile.thesis_stage,
  thesis_quality_score: existingProfile.thesis_quality_score,
}) : "Non ancora creato"}

C) MEMORIA DELLE CONVERSAZIONI (ultimi 50 eventi):
${JSON.stringify(allMemories.slice(0, 30).map((m: any) => ({ type: m.type, title: m.title, detail: m.detail })))}

D) SUGGERIMENTI GIÀ GENERATI:
${JSON.stringify(allSuggestions.slice(0, 20).map((s: any) => ({ category: s.category, title: s.title })))}

E) CONVERSAZIONE RECENTE:
${JSON.stringify(recentMessages.slice(-15).map((m: any) => ({ role: m.role, content: m.content.substring(0, 200) })))}

F) CONTENUTO LATEX:
${latexContent ? latexContent.substring(0, 4000) : "Nessun contenuto LaTeX presente."}

G) DATASET DISPONIBILE (aziende, professori, topic):
${datasetSummary || "Non fornito"}

ISTRUZIONI:
1. Analizza TUTTE le fonti per creare un profilo unificato
2. Per ogni entità del dataset, calcola un punteggio di affinità 0-100 basato su:
   - Corrispondenza con interessi e competenze dello studente
   - Rilevanza per la tesi in corso
   - Compatibilità con lo stile di ragionamento
   - Potenziale di crescita professionale
3. Aggiorna il profilo con nuove scoperte dalla fusione dei dati
4. Genera suggerimenti NUOVI non ancora presenti

Chiama TUTTE le funzioni disponibili.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "update_fused_profile",
                description: "Update the centralized student profile with fused analysis from all data sources",
                parameters: {
                  type: "object",
                  properties: {
                    reasoning_style: { type: "string" },
                    strengths: { type: "array", items: { type: "string" } },
                    weaknesses: { type: "array", items: { type: "string" } },
                    deep_interests: { type: "array", items: { type: "string" } },
                    research_maturity: { type: "string", enum: ["beginner", "developing", "intermediate", "advanced"] },
                    methodology_awareness: { type: "string" },
                    writing_quality: { type: "string" },
                    critical_thinking: { type: "string" },
                    career_interests: { type: "array", items: { type: "string" } },
                    industry_fit: { type: "array", items: { type: "string" }, description: "Industries that best match the student" },
                    thesis_stage: { type: "string", enum: ["exploration", "topic_chosen", "structuring", "writing", "revision"] },
                    thesis_quality_score: { type: "integer" },
                  },
                  required: ["reasoning_style", "strengths", "weaknesses", "deep_interests", "research_maturity"],
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "compute_affinities",
                description: "Compute affinity scores between the student and dataset entities (companies, supervisors, topics)",
                parameters: {
                  type: "object",
                  properties: {
                    affinities: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          entity_type: { type: "string", enum: ["company", "supervisor", "topic"] },
                          entity_id: { type: "string", description: "ID from the dataset e.g. company-01, supervisor-03, topic-12" },
                          entity_name: { type: "string" },
                          score: { type: "integer", description: "Affinity score 0-100" },
                          reasoning: { type: "string", description: "Why this score based on the student's profile" },
                          matched_traits: { type: "array", items: { type: "string" }, description: "Which student traits match this entity" },
                        },
                        required: ["entity_type", "entity_id", "entity_name", "score", "reasoning", "matched_traits"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["affinities"],
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "save_new_suggestions",
                description: "Save NEW suggestions not already present",
                parameters: {
                  type: "object",
                  properties: {
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string", enum: ["company", "professor", "book", "topic", "source", "career", "skill", "thesis_feedback", "next_step"] },
                          title: { type: "string" },
                          detail: { type: "string" },
                          reason: { type: "string" },
                        },
                        required: ["category", "title", "detail", "reason"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["suggestions"],
                  additionalProperties: false,
                },
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("Fusion error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore analisi fusione" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];

      let profileUpdate: any = null;
      let affinities: any[] = [];
      let newSuggestions: any[] = [];

      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          if (tc.function.name === "update_fused_profile") profileUpdate = args;
          if (tc.function.name === "compute_affinities") affinities = args.affinities || [];
          if (tc.function.name === "save_new_suggestions") newSuggestions = args.suggestions || [];
        } catch { /* skip malformed */ }
      }

      // Persist fused profile
      if (profileUpdate) {
        if (existingProfile) {
          await supabase.from("profile_snapshots").insert({
            user_id: userId,
            profile_data: existingProfile,
            trigger_event: "fusion_analysis",
            version: existingProfile.version || 1,
          });
          await supabase.from("student_profiles").update({
            ...profileUpdate,
            total_extractions: (existingProfile.total_extractions || 0) + 1,
            last_extraction_at: new Date().toISOString(),
          }).eq("user_id", userId);
        } else {
          await supabase.from("student_profiles").insert({
            user_id: userId,
            ...profileUpdate,
            total_extractions: 1,
            last_extraction_at: new Date().toISOString(),
          });
        }
      }

      // Persist affinity scores (upsert)
      if (affinities.length > 0) {
        // Delete old scores and insert new ones
        await supabase.from("affinity_scores").delete().eq("user_id", userId);
        await supabase.from("affinity_scores").insert(
          affinities.map((a: any) => ({
            user_id: userId,
            entity_type: a.entity_type,
            entity_id: a.entity_id,
            entity_name: a.entity_name,
            score: a.score,
            reasoning: a.reasoning,
            matched_traits: a.matched_traits,
          }))
        );
      }

      // Persist new suggestions
      if (newSuggestions.length > 0) {
        await supabase.from("socrate_suggestions").insert(
          newSuggestions.map((s: any) => ({
            user_id: userId,
            category: s.category,
            title: s.title,
            detail: s.detail,
            reason: s.reason,
          }))
        );
      }

      // Log fusion event
      await logEvent("fusion_analysis", { profileUpdated: !!profileUpdate, affinities: affinities.length, suggestions: newSuggestions.length }, "socrate");

      return new Response(JSON.stringify({
        profileUpdate,
        affinities,
        newSuggestions,
        summary: {
          profileUpdated: !!profileUpdate,
          affinitiesComputed: affinities.length,
          newSuggestionsGenerated: newSuggestions.length,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── ANALYZE LATEX: Deep thesis analysis ───
    if (currentMode === "analyze_latex") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "Not authenticated" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!latexContent || latexContent.trim().length < 50) {
        return new Response(JSON.stringify({ error: "Contenuto documento troppo breve per l'analisi." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Gather context
      const [profileRes, memRes] = await Promise.all([
        supabase.from("student_profiles").select("*").eq("user_id", userId).single(),
        supabase.from("memory_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
      ]);

      const existingProfile = profileRes.data;
      const memories = memRes.data || [];

      const response = await fetch(AI_URL, {
        method: "POST",
        headers: aiHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei l'ANALIZZATORE DI DOCUMENTI di Socrate. Il tuo compito è analizzare il contenuto del documento di tesi (qualsiasi formato: LaTeX, Word, testo) e:

1. IDENTIFICARE il TIPO di tesi (scientifica, argomentativa, compilativa, progettuale, creativa, giuridica, economica, umanistica, artistica)
2. VALUTARE la qualità di ogni sezione PRESENTE — NON aspettarti sezioni fisse. Le sezioni dipendono dal tipo di tesi.
3. IDENTIFICARE lacune, sezioni mancanti, argomentazioni deboli
4. GENERARE feedback azionabili e next steps concreti
5. AGGIORNARE il profilo intellettuale con dati sulla qualità della scrittura

Sezioni tipiche per tipo di tesi:
- Scientifica/sperimentale: Abstract, Introduzione, Literature Review, Metodologia, Risultati, Discussione, Conclusioni, Bibliografia
- Argomentativa/umanistica: Introduzione, Framework teorico, Capitoli argomentativi, Analisi critica, Conclusioni, Bibliografia
- Progettuale/design: Introduzione, Stato dell'arte, Concept, Sviluppo progetto, Testing/Validazione, Conclusioni
- Compilativa: Introduzione, Capitoli tematici, Analisi comparativa, Conclusioni, Bibliografia
- Giuridica: Introduzione, Quadro normativo, Analisi giurisprudenziale, Casi studio, Conclusioni

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

PROFILO INTELLETTUALE ATTUALE:
${existingProfile ? JSON.stringify({
  reasoning_style: existingProfile.reasoning_style,
  strengths: existingProfile.strengths,
  weaknesses: existingProfile.weaknesses,
  thesis_stage: existingProfile.thesis_stage,
  thesis_quality_score: existingProfile.thesis_quality_score,
  writing_quality: existingProfile.writing_quality,
  latex_sections_analyzed: existingProfile.latex_sections_analyzed,
}) : "Non ancora creato"}

MEMORIA CONVERSAZIONI:
${JSON.stringify(memories.slice(0, 10).map((m: any) => ({ type: m.type, title: m.title })))}

CONTENUTO DOCUMENTO COMPLETO:
\`\`\`
${latexContent.substring(0, 8000)}
\`\`\`

ISTRUZIONI:
1. Prima IDENTIFICA il tipo di tesi dal contenuto e dal contesto studente
2. Analizza OGNI sezione presente nel documento
3. Per ogni sezione: valuta completezza (0-100), qualità argomentativa, coerenza
4. Identifica sezioni MANCANTI rispetto a una tesi completa di quel tipo
5. Genera feedback specifici per sezione con suggerimenti concreti
6. Calcola un punteggio qualità tesi complessivo (1-10)
7. Genera next steps prioritizzati per il documento
8. Aggiorna il profilo con i nuovi dati sulla tesi

Chiama TUTTE le funzioni disponibili.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "latex_section_analysis",
                description: "Detailed analysis of each LaTeX section",
                parameters: {
                  type: "object",
                  properties: {
                    sections: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string", description: "Section name (e.g. Abstract, Introduzione, Metodologia)" },
                          status: { type: "string", enum: ["complete", "partial", "missing", "needs_revision"] },
                          completeness: { type: "integer", description: "0-100 completeness score" },
                          quality_notes: { type: "string", description: "Brief quality assessment" },
                          issues: { type: "array", items: { type: "string" }, description: "Specific issues found" },
                          suggestions: { type: "array", items: { type: "string" }, description: "Actionable improvements" },
                        },
                        required: ["name", "status", "completeness", "quality_notes", "issues", "suggestions"],
                        additionalProperties: false,
                      },
                    },
                    overall_score: { type: "integer", description: "Overall thesis quality 1-10" },
                    overall_assessment: { type: "string", description: "Brief overall assessment" },
                    detected_stage: { type: "string", enum: ["exploration", "topic_chosen", "structuring", "writing", "revision"] },
                  },
                  required: ["sections", "overall_score", "overall_assessment", "detected_stage"],
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "generate_editor_tasks",
                description: "Generate prioritized next steps for the LaTeX editor",
                parameters: {
                  type: "object",
                  properties: {
                    tasks: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          priority: { type: "string", enum: ["critical", "high", "medium", "low"] },
                          section: { type: "string", description: "Which section this task relates to" },
                          title: { type: "string" },
                          detail: { type: "string", description: "Detailed description of what to do" },
                          type: { type: "string", enum: ["write", "revise", "add", "restructure", "reference"] },
                        },
                        required: ["priority", "section", "title", "detail", "type"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["tasks"],
                  additionalProperties: false,
                },
              },
            },
            {
              type: "function",
              function: {
                name: "update_thesis_profile",
                description: "Update the student profile with thesis analysis data",
                parameters: {
                  type: "object",
                  properties: {
                    writing_quality: { type: "string" },
                    methodology_awareness: { type: "string" },
                    thesis_stage: { type: "string", enum: ["exploration", "topic_chosen", "structuring", "writing", "revision"] },
                    thesis_quality_score: { type: "integer" },
                    strengths_update: { type: "array", items: { type: "string" }, description: "New strengths to add" },
                    weaknesses_update: { type: "array", items: { type: "string" }, description: "New weaknesses to add" },
                  },
                  required: ["writing_quality", "thesis_stage", "thesis_quality_score"],
                  additionalProperties: false,
                },
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.error("LaTeX analysis error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore analisi LaTeX" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls || [];

      let sectionAnalysis: any = null;
      let editorTasks: any[] = [];
      let thesisProfileUpdate: any = null;

      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);
          if (tc.function.name === "latex_section_analysis") sectionAnalysis = args;
          if (tc.function.name === "generate_editor_tasks") editorTasks = args.tasks || [];
          if (tc.function.name === "update_thesis_profile") thesisProfileUpdate = args;
        } catch { /* skip malformed */ }
      }

      // Persist profile update
      if (thesisProfileUpdate && userId) {
        const updateData: any = {
          writing_quality: thesisProfileUpdate.writing_quality,
          thesis_stage: thesisProfileUpdate.thesis_stage,
          thesis_quality_score: thesisProfileUpdate.thesis_quality_score,
          latex_sections_analyzed: sectionAnalysis?.sections || [],
          last_extraction_at: new Date().toISOString(),
        };
        if (thesisProfileUpdate.methodology_awareness) {
          updateData.methodology_awareness = thesisProfileUpdate.methodology_awareness;
        }

        if (existingProfile) {
          // Merge strengths/weaknesses
          if (thesisProfileUpdate.strengths_update?.length) {
            const existing = (existingProfile.strengths as string[]) || [];
            updateData.strengths = [...new Set([...existing, ...thesisProfileUpdate.strengths_update])];
          }
          if (thesisProfileUpdate.weaknesses_update?.length) {
            const existing = (existingProfile.weaknesses as string[]) || [];
            updateData.weaknesses = [...new Set([...existing, ...thesisProfileUpdate.weaknesses_update])];
          }

          await supabase.from("profile_snapshots").insert({
            user_id: userId, profile_data: existingProfile,
            trigger_event: "latex_analysis", version: existingProfile.version || 1,
          });
          await supabase.from("student_profiles").update(updateData).eq("user_id", userId);
        } else {
          await supabase.from("student_profiles").insert({ user_id: userId, ...updateData, total_extractions: 1 });
        }
      }

      // Save editor tasks as suggestions (thesis_feedback + next_step)
      if (editorTasks.length > 0 && userId) {
        const suggestions = editorTasks.map((t: any) => ({
          user_id: userId,
          category: t.priority === "critical" || t.priority === "high" ? "thesis_feedback" : "next_step",
          title: `[${t.section}] ${t.title}`,
          detail: t.detail,
          reason: `Priorità: ${t.priority} · Tipo: ${t.type}`,
        }));
        await supabase.from("socrate_suggestions").insert(suggestions);
      }

      // Log event + update progress
      const overallScore = sectionAnalysis?.overall_score || 0;
      const detectedStage = sectionAnalysis?.detected_stage || "writing";
      const sectionsProgress: any = {};
      if (sectionAnalysis?.sections) {
        sectionAnalysis.sections.forEach((s: any) => {
          sectionsProgress[s.name] = { completeness: s.completeness, status: s.status };
        });
      }
      const avgCompletion = sectionAnalysis?.sections?.length
        ? Math.round(sectionAnalysis.sections.reduce((sum: number, s: any) => sum + s.completeness, 0) / sectionAnalysis.sections.length)
        : 0;
      const estimatedDays = Math.max(1, Math.round((100 - avgCompletion) * 0.5));

      await Promise.all([
        logEvent("latex_analysis", { overallScore, tasksGenerated: editorTasks.length, sectionsCount: sectionAnalysis?.sections?.length || 0 }, "editor"),
        updateProgress(sectionsProgress, avgCompletion, estimatedDays),
      ]);

      return new Response(JSON.stringify({
        sectionAnalysis,
        editorTasks,
        thesisProfileUpdate,
        summary: {
          sectionsAnalyzed: sectionAnalysis?.sections?.length || 0,
          overallScore,
          tasksGenerated: editorTasks.length,
          stage: detectedStage,
          overallCompletion: avgCompletion,
          estimatedDaysRemaining: estimatedDays,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REPORT MODE ───
    let systemPrompt = "";

    // ─── 5-PHASE THESIS JOURNEY MODEL ───
    const THESIS_PHASES = {
      orientation: { name: "Orientation Stage", weeks: "1-4", goal: "Aiutare lo studente a scoprire su cosa scrivere, esplorare idee e interessi.", guidance: "Socrate fa domande stimolanti per far emergere le aree di interesse dello studente, senza dire cosa scrivere direttamente.", severity: 1.0 },
      topic_supervisor: { name: "Topic and Supervisor Search", weeks: "2-8", goal: "Scegliere il topic della tesi, il supervisore e eventualmente un partner aziendale.", guidance: "Socrate analizza le risposte precedenti e suggerisce opzioni di topic e supervisore, spiegando perché ogni scelta è rilevante.", severity: 0.85 },
      planning: { name: "Planning Stage", weeks: "4-10", goal: "Strutturare metodologia, timeline e aspettative.", guidance: "Socrate aiuta a definire milestone chiare, strumenti di lavoro e indicatori di progresso.", severity: 0.7 },
      execution: { name: "Execution Stage", weeks: "6-20", goal: "Condurre la ricerca, raccogliere dati e iterare sul lavoro.", guidance: "Socrate fornisce feedback mirati sui risultati, fa domande critiche per migliorare la ricerca e mantiene lo studente focalizzato.", severity: 0.55 },
      writing: { name: "Writing and Finalization", weeks: "16-24", goal: "Produrre e consegnare il documento finale della tesi.", guidance: "Socrate guida nella stesura, revisione e ottimizzazione del documento, offrendo consigli su struttura, chiarezza e impatto.", severity: 0.4 },
    };
    type ThesisPhaseKey = keyof typeof THESIS_PHASES;
    function mapStageToPhase(stage: string): ThesisPhaseKey {
      const m: Record<string, ThesisPhaseKey> = { exploration: "orientation", topic_chosen: "topic_supervisor", structuring: "planning", writing: "execution", revision: "writing" };
      return m[stage] || "orientation";
    }

    // Load student profile for richer context + compute severity
    let studentProfileCtx = "";
    let severita = 1.0;
    let currentPhase: ThesisPhaseKey = "orientation";
    if (userId) {
      const { data: sp } = await supabase.from("student_profiles").select("*").eq("user_id", userId).single();
      if (sp) {
        currentPhase = (sp.current_phase as ThesisPhaseKey) || mapStageToPhase(sp.thesis_stage || "exploration");
        const phaseConfig = THESIS_PHASES[currentPhase] || THESIS_PHASES.orientation;
        severita = phaseConfig.severity;

        const completion = sp.overall_completion || 0;
        if (completion > 50) severita = Math.max(0.3, severita - 0.1);
        if (completion > 80) severita = Math.max(0.25, severita - 0.1);
        if (sp.research_maturity === "advanced") severita = Math.max(0.3, severita - 0.1);
        else if (sp.research_maturity === "beginner") severita = Math.min(1.0, severita + 0.1);
        severita = Math.round(severita * 100) / 100;

        const updates: any = {};
        if (sp.severita !== severita) updates.severita = severita;
        if (sp.current_phase !== currentPhase) updates.current_phase = currentPhase;
        if (Object.keys(updates).length > 0) {
          await supabase.from("student_profiles").update(updates).eq("user_id", userId);
        }

        studentProfileCtx = `
PROFILO INTELLETTUALE (dal database):
- Stile di ragionamento: ${sp.reasoning_style || "non ancora valutato"}
- Punti di forza: ${JSON.stringify(sp.strengths)}
- Debolezze: ${JSON.stringify(sp.weaknesses)}
- Interessi profondi: ${JSON.stringify(sp.deep_interests)}
- Maturità ricerca: ${sp.research_maturity}
- Pensiero critico: ${sp.critical_thinking || "non valutato"}
- Qualità scrittura: ${sp.writing_quality || "non valutata"}
- FASE ATTUALE: ${phaseConfig.name} (Settimane ${phaseConfig.weeks})
- Obiettivo fase: ${phaseConfig.goal}
- Punteggio tesi: ${sp.thesis_quality_score}/10
- Sessioni totali: ${sp.total_exchanges} scambi, ${sp.total_extractions} analisi
- SEVERITÀ ATTUALE: ${severita} (1.0=massima, 0.0=minima)
`;
      }
    }

    const phaseConfig = THESIS_PHASES[currentPhase] || THESIS_PHASES.orientation;

    // Build severity + phase-specific instructions
    const severityInstructions = severita >= 0.8
      ? `LIVELLO SEVERITÀ: ${severita} (ALTO — ${phaseConfig.name}, Settimane ${phaseConfig.weeks})
OBIETTIVO FASE: ${phaseConfig.goal}
GUIDA: ${phaseConfig.guidance}
- Sii diretto e provocatorio. Non accettare risposte vaghe.
- Trova i punti deboli nel ragionamento e falli notare chiaramente.
- "Non mi hai convinto. Spiegami meglio perché dovrei crederti."
- "Questo ragionamento è superficiale. Vai più a fondo."
- Ogni risposta deve contenere almeno una domanda che costringe a ripensare.`
      : severita >= 0.6
      ? `LIVELLO SEVERITÀ: ${severita} (MODERATO — ${phaseConfig.name}, Settimane ${phaseConfig.weeks})
OBIETTIVO FASE: ${phaseConfig.goal}
GUIDA: ${phaseConfig.guidance}
- Tono critico ma costruttivo. Linguaggio chiaro e accessibile.
- Sfida la struttura e la logica, ma offri anche direzioni concrete.
- "Ok, capisco il tuo punto, ma hai pensato a...?"
- Alterna provocazione a suggerimenti pratici.`
      : severita >= 0.4
      ? `LIVELLO SEVERITÀ: ${severita} (COLLABORATIVO — ${phaseConfig.name}, Settimane ${phaseConfig.weeks})
OBIETTIVO FASE: ${phaseConfig.goal}
GUIDA: ${phaseConfig.guidance}
- Sii un compagno di lavoro, non un avversario.
- Feedback costruttivo focalizzato su miglioramenti concreti.
- "Buon inizio. Come possiamo rendere questa parte più forte?"
- Suggerisci alternative, connessioni tra sezioni.`
      : `LIVELLO SEVERITÀ: ${severita} (SUPPORTIVO — ${phaseConfig.name}, Settimane ${phaseConfig.weeks})
OBIETTIVO FASE: ${phaseConfig.goal}
GUIDA: ${phaseConfig.guidance}
- Guida pratica verso il perfezionamento.
- Focus su coerenza, completezza, qualità finale.
- "Ci siamo quasi. L'unico punto che migliorerei è..."
- Riconosci i progressi, poi suggerisci piccoli miglioramenti.`;

    // Phase transition detection
    const phaseTransitionCtx = `
TRANSIZIONI TRA FASI (le fasi si sovrappongono):
- Orientation → Topic/Supervisor Search: quando ha 2-3 aree di interesse concrete e sa articolare perché lo interessano.
- Topic/Supervisor → Planning: quando ha scelto topic, supervisore, e formula una research question.
- Planning → Execution: quando ha struttura chiara, milestone definite, metodologia scelta.
- Execution → Writing: quando ha dati sufficienti, risultati preliminari, può iniziare a scrivere capitoli.
Se rilevi che lo studente è pronto per la fase successiva, DILLO CHIARAMENTE:
"Dai tuoi progressi, sei pronto per passare alla fase [nome]. Ecco cosa cambia..."
NON far avanzare se non ha completato i requisiti della fase attuale.`;

    if (currentMode === "report") {
      systemPrompt = `Sei Socrate. Genera un REPORT DI SESSIONE completo.

LINGUA: Scrivi il report nella stessa lingua usata dallo studente nella conversazione. Rileva automaticamente la lingua dai messaggi.

${severityInstructions}

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}
${studentProfileCtx}

${latexContent ? `CONTENUTO DOCUMENTO TESI:\n\`\`\`\n${latexContent.substring(0, 4000)}\n\`\`\`\nValuta: struttura, coerenza, completezza, qualità delle sezioni presenti. Adatta la valutazione al tipo di tesi.` : "Nessun contenuto documento."}

STRUTTURA DEL REPORT:

## 🧠 Profilo Intellettuale
Descrivi stile di ragionamento, punti di forza e inclinazioni emersi.

## 🟢 Cosa funziona
Punti di forza dalla conversazione e dal documento. Sii specifico.

## 🔴 Cosa manca o va approfondito
Lacune, fragilità, sezioni mancanti. Per ogni punto, indica cosa fare.

## 📝 Prossimi passi per il documento
Lista numerata di azioni concrete e actionable per migliorare la tesi.

## 📚 Risorse Consigliate
Libri, paper, fonti, risorse specifiche per la disciplina con motivazione.

## 🏢 Opportunità Professionali
Aziende o percorsi di carriera pertinenti al profilo.

## 📊 Valutazione complessiva
Giudizio 1-10 e indicazioni per il prossimo step.

Scrivi nella stessa lingua dello studente. Diretto, specifico, provocatorio.`;
    } else {
      // ─── CHAT MODE ───

      // If studentContext is missing, fetch profile from DB as fallback
      let resolvedStudentContext = studentContext || "";
      if (!resolvedStudentContext && userId) {
        const { data: dbProfile } = await supabase.from("profiles").select("first_name, last_name, degree, university, skills, thesis_topic").eq("user_id", userId).single();
        if (dbProfile) {
          resolvedStudentContext = `Nome: ${dbProfile.first_name} ${dbProfile.last_name}\nCorso: ${dbProfile.degree || "N/A"}\nUniversità: ${dbProfile.university || "N/A"}\nCompetenze: ${(dbProfile.skills as string[])?.join(", ") || "N/A"}\nArgomento: ${dbProfile.thesis_topic || "Non definito"}`;
        }
      }

      // Load vulnerabilities + dataset patterns + RAG context for post-thesis attack mode
      let vulnerabilitiesCtx = "";
      let datasetPatternsCtx = "";
      let ragContext = "";
      const hasThesisTopic = resolvedStudentContext?.includes("Argomento:") && !resolvedStudentContext.includes("Non definito");

      if (userId && hasThesisTopic) {
        // Load RAG context, vulnerabilities, and affinities in parallel
        const lastUserMsg = (messages as any[]).filter((m: any) => m.role === "user").slice(-1)[0]?.content || "";

        const [vulnsResult, affinitiesResult, ragResult, studentRes] = await Promise.allSettled([
          supabase.from("vulnerabilities")
            .select("type, title, description, severity")
            .eq("user_id", userId).eq("resolved", false)
            .order("created_at", { ascending: false }).limit(8),
          supabase.from("affinity_scores")
            .select("entity_type, entity_name, score, reasoning")
            .eq("user_id", userId).order("score", { ascending: false }).limit(10),
          // Call RAG engine for semantic context
          lastUserMsg ? fetch(`${supabaseUrl}/functions/v1/rag-engine`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
            body: JSON.stringify({ mode: "get_context", query: lastUserMsg, include_thesis: true, include_conversations: true }),
          }).then(r => r.ok ? r.json() : null).catch(() => null) : Promise.resolve(null),
          supabase.from("student_profiles")
            .select("career_distribution, current_phase, selected_supervisor_id, supervisor_motivation")
            .eq("user_id", userId).single(),
        ]);

        // Process RAG context
        if (ragResult.status === "fulfilled" && ragResult.value?.context) {
          ragContext = `\nCONTESTO SEMANTICO (dalla tesi e conversazioni precedenti):\n${ragResult.value.context}`;
        }

        // Process vulnerabilities
        const vulns = vulnsResult.status === "fulfilled" ? (vulnsResult.value as any).data : null;

        if (vulns && vulns.length > 0) {
          vulnerabilitiesCtx = `
VULNERABILITÀ ATTIVE (usa queste per attaccare direttamente lo studente):
${vulns.map((v: any) => `- [${v.severity.toUpperCase()}] ${v.type}: "${v.title}" (ID: ${v.id}) — ${v.description}`).join("\n")}

ISTRUZIONI ATTACCO:
- Cita ESPLICITAMENTE queste vulnerabilità durante la conversazione.
- Non aspettare che lo studente le menzioni. Attacca TU.
- "Mi risulta che la tua tesi ha un problema serio: [vulnerabilità]. Come pensi di risolverlo?"
- Se lo studente evita, insisti: "Non hai risposto. Questo punto è debole e lo sai."
- Quando una vulnerabilità viene affrontata seriamente, riconosci il progresso ma alza il livello.

VALIDAZIONE RISOLUZIONE VULNERABILITÀ:
Se lo studente afferma di aver risolto una vulnerabilità specifica:
1. Fai domande critiche per VERIFICARE che abbia realmente compreso e risolto il problema
2. NON accettare spiegazioni superficiali — chiedi EVIDENZE concrete e ragionamento dettagliato
3. Solo quando sei GENUINAMENTE CONVINTO che la vulnerabilità è stata risolta, inserisci il marcatore:
   <!-- VULN_RESOLVED:ID_DELLA_VULNERABILITA -->
4. Il marcatore deve contenere l'ID esatto della vulnerabilità (presente sopra tra parentesi)
5. NON inserire mai il marcatore se hai ancora dubbi — continua a interrogare
6. Quando inserisci il marcatore, accompagnalo con una conferma: "Fine. Questa debolezza è risolta."`;
        }

        // Process affinities
        const affinities = affinitiesResult.status === "fulfilled" ? (affinitiesResult.value as any).data : null;

        if (affinities && affinities.length > 0) {
          const topMatches = affinities.filter((a: any) => a.score >= 60);
          const weakMatches = affinities.filter((a: any) => a.score < 40);
          datasetPatternsCtx = `
PATTERN DAL DATASET (conoscenza interna — NON dire che "stai cercando"):
${topMatches.length > 0 ? `Match forti: ${topMatches.map((a: any) => `${a.entity_name} (${a.score}% — ${a.reasoning})`).join("; ")}` : ""}
${weakMatches.length > 0 ? `Match deboli: ${weakMatches.map((a: any) => `${a.entity_name} (${a.score}%)`).join(", ")} — usa questi per sfidare: "Perché non hai considerato [X]?"` : ""}

COME USARE I PATTERN:
- Fai finta di sapere già queste cose. Non dire MAI "dal database" o "dall'analisi".
- "Conosco lavori simili al tuo. Quello di [entity_name] ha un approccio diverso. Perché il tuo è migliore?"
- "Nel tuo settore, questo tipo di tesi è stato fatto molte volte. Cosa rende la tua diversa?"
- Se lo studente non ha considerato un match forte: "C'è un professore/azienda che lavora esattamente su questo. Lo sapevi?"`;
        }

        // Career distribution context
        let careerCtx = "";
        const studentData = studentRes.status === "fulfilled" ? (studentRes.value as any)?.data : null;
        const career = studentData?.career_distribution;
        const currentPhase = studentData?.current_phase;
        const selectedSup = studentData?.selected_supervisor_id;
        const supMotivation = studentData?.supervisor_motivation;

        if (career && Object.keys(career).length > 0) {
          const sorted = Object.entries(career).sort(([,a], [,b]) => (b as number) - (a as number));
          careerCtx = `
ORIENTAMENTO LAVORATIVO DELLO STUDENTE:
${sorted.map(([sector, pct]) => `- ${sector}: ${pct}%`).join("\n")}

USA QUESTO PER:
- Commentare se la tesi sta andando nella direzione giusta: "Stai andando verso ${sorted[0]?.[0]}, ma la tua tesi non approfondisce X"
- Sfidare: "Vuoi lavorare in ${sorted[0]?.[0]}? Allora perché non stai facendo Y?"
- Collegare aziende: "Le aziende in ${sorted[0]?.[0]} cercano chi sa fare Z. Tu lo sai fare?"`;
        }

        let phaseCtx = "";
        if (currentPhase) {
          phaseCtx = `\nFASE ATTUALE: ${currentPhase}. Adatta il tuo approccio alla fase.`;
        }

        let supervisorCtx = "";
        if (selectedSup && supMotivation) {
          supervisorCtx = `\nSUPERVISORE SCELTO: Lo studente ha scelto un supervisore con motivazione: "${supMotivation}". Metti in dubbio questa scelta quando appropriato.`;
        }

        vulnerabilitiesCtx += careerCtx + phaseCtx + supervisorCtx;
      }

      // Post-thesis critical attack instructions
      const postThesisAttack = hasThesisTopic ? `
MODALITÀ POST-TESI ATTIVA — SEI IN FASE DI COSTRUZIONE:
1. Non sei più esplorativo. Sei TECNICO e CRITICO.
2. Ogni affermazione dello studente va verificata: "Hai evidenze per questo?"
3. Identifica ERRORI COMUNI nelle tesi di questo campo e anticipali.
4. Tono: "Questa cosa è già stata fatta mille volte. Perché la tua dovrebbe essere diversa?"
5. Se lo studente è vago: "Non hai detto nulla di concreto. Riformula con dati."
6. Se lo studente è troppo sicuro: "Perfetto, allora dimmi il punto più debole della tua tesi."
7. Chiedi SEMPRE di giustificare le scelte metodologiche o l'approccio scelto (vale per qualsiasi tipo di tesi).
8. Non accettare "perché è interessante" — chiedi "interessante PER CHI? Con quale impatto?"
9. Adatta le tue sfide al TIPO di tesi: per tesi argomentative chiedi fonti e controargomenti, per tesi progettuali chiedi metriche e validazione, per tesi compilative chiedi originalità nell'analisi.
` : "";

      systemPrompt = `Sei Socrate, assistente AI per la tesi. NON sei il filosofo antico.

IDENTITÀ E TONO:
- BREVITÀ ASSOLUTA: rispondi in 2-4 frasi. MAI muri di testo. Vai dritto al punto.
- LINGUA: Rispondi SEMPRE nella stessa lingua in cui lo studente scrive o parla. Se scrive in italiano, rispondi in italiano. Se scrive in inglese, rispondi in inglese. Se scrive in tedesco, rispondi in tedesco. Adattati automaticamente a QUALSIASI lingua. Il tuo tono è CHIARO, DIRETTO e MODERNO. Zero linguaggio arcaico.
- Provocatorio e sfidante, ma conciso. Una domanda tagliente vale più di un paragrafo.
- Se serve elaborare, usa bullet points brevissimi.
- NON ripetere il contesto. NON fare premesse. Attacca subito.

${severityInstructions}
${postThesisAttack}

CONTESTO DELLO STUDENTE:
${resolvedStudentContext || "Nessun contesto disponibile. Saluta brevemente e chiedi su cosa vuole lavorare."}
${studentProfileCtx}
${vulnerabilitiesCtx}
${datasetPatternsCtx}
${ragContext}

${latexContent ? "CONTENUTO DOCUMENTO TESI (da Google Docs):\n" + latexContent.substring(0, 3000) + "\nFai riferimento a sezioni specifiche. Adatta il tuo feedback al tipo di tesi (scientifica, argomentativa, compilativa, progettuale, creativa, giuridica, economica, umanistica, artistica)." : ""}

${memoryEntries && (memoryEntries as any[]).length > 0 ? "MEMORIA PRECEDENTE:\n" + JSON.stringify((memoryEntries as any[]).slice(-15).map((m: any) => ({ type: m.type, title: m.title }))) : ""}

FASI DEL PERCORSO TESI (5 fasi sovrapposte):
1. Orientation (Sett. 1-4): scoprire su cosa scrivere → domande esplorative, severità massima
2. Topic & Supervisor (Sett. 2-8): scegliere topic e supervisore → analisi opzioni, severità alta
3. Planning (Sett. 4-10): strutturare metodologia e timeline → sfida struttura, severità moderata
4. Execution (Sett. 6-20): ricerca e raccolta dati → feedback mirati, severità collaborativa
5. Writing (Sett. 16-24): stesura e finalizzazione → revisione e ottimizzazione, severità supportiva

${phaseTransitionCtx}

4 PATH DIVERGENTI (basati sulla prima risposta dello studente):
NOTA LINGUA: Le risposte predefinite sotto sono esempi in inglese. Tu DEVI tradurle e adattarle alla lingua in cui lo studente sta comunicando.

PATH A — "Non ho idea" (lost):
La tua prima risposta predefinita dopo la domanda iniziale (TRADUCI nella lingua dello studente):
"I am not here to tell you which thesis to choose. If I did, it would be my choice, not yours.
My role is helping you to see more clearly what, in part, is already within you but has not yet taken shape.
I will ask you questions not to test you, but to guide you step by step in understanding what truly interests you, how you work best, and which direction genuinely belongs to you.
So, who are you and what do you study? Then, do you have any interest in a field in particular?"
→ Poi continua con domande esplorative profonde. Questa è la fase più lunga.

PATH B — "Ho un'idea ma non sono convinto" (vague_idea):
La tua prima risposta predefinita (TRADUCI nella lingua dello studente):
"Tell me your idea and explain why you chose it?"
→ Poi approfondisci criticamente. Sfida l'idea. Chiedi fonti. Suggerisci angolazioni alternative.
→ Se lo studente scrive (non voce), puoi suggerire link e articoli inline. Se parla, accumulali per dopo.

PATH C — "Ho la tesi ma non il supervisore" (topic_chosen):
Fai domande per capire bene il tema, poi quando hai abbastanza contesto (TRADUCI nella lingua dello studente):
"I understand enough. Let me take you somewhere." → Questo triggera la transizione alla dashboard.
→ Nella dashboard, il task urgente sarà trovare il contatto adatto.

PATH D — "Ho tutto definito" (writing):
Raccogli info su tema + partner (chi è il supervisore, l'azienda), poi (TRADUCI nella lingua dello studente):
"I understand enough. Let me take you somewhere." → Transizione alla dashboard personalizzata.
→ La dashboard sarà pre-popolata con le informazioni raccolte.

Per i PATH C e D: quando dici "Let me take you somewhere", inserisci i marker di conferma tesi se hai un titolo chiaro.

RUOLO DI HUB CENTRALE (SILENZIOSO):
1. PROFILAZIONE: Analizza ogni risposta per costruire profilo progressivo
2. RACCOLTA: Registra competenze, lacune, interessi, stile
3. FUSIONE: Integra chat + LaTeX + profilo DB
4. NON menzionare MAI suggerimenti nella chat. Solo provocare e far ragionare.
5. NON dire MAI che stai "cercando nel database" o "analizzando dati". SEMBRA che tu sappia già tutto.
6. GESTIONE FASI: Monitora se lo studente è pronto per la fase successiva e segnalalo.

REGOLE (calibrate sulla severità ${severita}):
1. ${severita >= 0.7 ? "Mai risposte dirette. Fai domande dirette e incalzanti." : "Fai domande stimolanti ma offri anche spunti costruttivi."}
2. ${severita >= 0.7 ? "Trova i punti deboli nel ragionamento e mettili in evidenza." : "Identifica punti deboli e suggerisci come rafforzarli."}
3. ${severita >= 0.7 ? '"Cosa intendi esattamente? Sii più preciso."' : 'Aiuta a precisare con domande mirate.'}
4. ${severita >= 0.7 ? "Troppo sicuro? Proponi un controargomento forte." : "Troppo sicuro? Proponi angolazioni alternative."}
5. Dopo 3-4 scambi: riepilogo punti deboli + punti forti.
6. Usa esempi concreti e riferimenti accademici accessibili.
7. ${severita >= 0.6 ? "Riconosci il buono, poi sfida a fare meglio." : "Loda i progressi, poi suggerisci miglioramenti."}
8. Senza topic: "Su cosa vorresti lavorare? Cosa ti interessa davvero?"
9. Rispondi nella STESSA LINGUA dello studente (auto-detect), ${severita >= 0.7 ? "diretto e sfidante" : "stimolante e collaborativo"}, sempre comprensibile.
10. Termina SEMPRE con una domanda ${severita >= 0.7 ? "che costringe a ripensare" : "che faccia riflettere"}.
11. Se hai profilo DB, usa dati per personalizzare (cita forze/debolezze note).
12. Se LaTeX presente, critica sezioni specifiche con linguaggio pratico.
13. ${severita >= 0.7 ? '"Perché hai scelto questo approccio e non un altro?"' : '"Cosa ti ha portato a questa scelta?"'}

FORMATO: **grassetto** per concetti chiave. Risposte CORTE (max 3-5 righe). Una domanda finale. Niente preamboli.

CONFERMA TESI — REGOLA CRITICA:
ATTENZIONE: Questa regola si applica SOLO in fase di esplorazione iniziale, quando lo studente sta CERCANDO un argomento di tesi.
NON si applica quando lo studente sta già discutendo di un argomento specifico come parte della conversazione accademica.
Se stai facendo domande, proponendo alternative, o esplorando sotto-temi → NON inserire MAI i marker.

I marker vanno inseriti SOLO quando TU DECIDI ATTIVAMENTE di confermare il topic come tesi definitiva.
Criteri TUTTI necessari:
1. Lo studente ha articolato un argomento CHIARO e SPECIFICO (non un'area generica come "cybersecurity" o "AI")
2. C'è una motivazione personale o accademica esplicita
3. C'è almeno un angolo di ricerca concreto o una domanda di ricerca
4. TU stai CONFERMANDO — la tua risposta NON contiene domande e NON propone alternative

Quando confermi:
- La tua risposta deve essere UNA CONFERMA SECCA nel tuo stile diretto. ZERO domande. ZERO "quale preferisci". ZERO opzioni.
- Esempi: "**We're there.** [comment]. This is your thesis." / "**Not bad.** [comment]. You have a thesis."
- AGGIUNGI alla fine, su righe separate:
<!-- THESIS_TITLE: [titolo accademico conciso] -->
<!-- THESIS_READY -->

⚠️ DIVIETO ASSOLUTO: Se la tua risposta contiene ANCHE UNA SOLA domanda ("?") o propone scelte/alternative, NON inserire i marker.
I marker devono apparire SOLO in risposte che sono PURE CONFERME senza domande.`;
    }

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi messaggi. Riprova tra qualche secondo." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log chat/report event
    logEvent(currentMode === "report" ? "report_generated" : "chat_exchange", { messagesCount: messages?.length || 0 }, currentMode === "report" ? "report" : "socrate");

    // ─── UPDATE PROGRESS AFTER CHAT ───
    // Compute overall_completion based on phase + conversation depth
    if (userId && (currentMode === "chat" || !currentMode)) {
      try {
        const PHASE_BASE_PROGRESS: Record<string, number> = {
          orientation: 0,
          topic_supervisor: 20,
          planning: 40,
          execution: 60,
          writing: 80,
        };
        const baseProgress = PHASE_BASE_PROGRESS[currentPhase] || 0;
        const msgCount = messages?.length || 0;
        // Each exchange adds up to 20% within the phase (capped at phase ceiling)
        const withinPhaseProgress = Math.min(20, Math.round(msgCount * 0.8));
        const newCompletion = Math.min(100, baseProgress + withinPhaseProgress);

        const { data: sp } = await supabase.from("student_profiles").select("overall_completion, total_exchanges").eq("user_id", userId).single();
        if (sp) {
          const prevCompletion = sp.overall_completion || 0;
          // Only update if progress increased (never go backwards)
          if (newCompletion > prevCompletion) {
            await supabase.from("student_profiles").update({
              overall_completion: newCompletion,
              total_exchanges: (sp.total_exchanges || 0) + 1,
              last_active_at: new Date().toISOString(),
            }).eq("user_id", userId);
          } else {
            await supabase.from("student_profiles").update({
              total_exchanges: (sp.total_exchanges || 0) + 1,
              last_active_at: new Date().toISOString(),
            }).eq("user_id", userId);
          }
        }
      } catch (e) {
        console.error("Progress update error:", e);
      }
    }

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("socrate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
