import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

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
      const { data: { user } } = await anonClient.auth.getUser();
      userId = user?.id || null;
    }

    const aiHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };
    const currentMode = mode || "chat";

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
              content: `Sei il MOTORE DI PROFILAZIONE CENTRALE di Socrate. Analizza TUTTO per generare:
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

    // ─── REPORT MODE ───
    let systemPrompt = "";

    // Load student profile for richer context
    let studentProfileCtx = "";
    if (userId) {
      const { data: sp } = await supabase.from("student_profiles").select("*").eq("user_id", userId).single();
      if (sp) {
        studentProfileCtx = `
PROFILO INTELLETTUALE (dal database):
- Stile di ragionamento: ${sp.reasoning_style || "non ancora valutato"}
- Punti di forza: ${JSON.stringify(sp.strengths)}
- Debolezze: ${JSON.stringify(sp.weaknesses)}
- Interessi profondi: ${JSON.stringify(sp.deep_interests)}
- Maturità ricerca: ${sp.research_maturity}
- Pensiero critico: ${sp.critical_thinking || "non valutato"}
- Qualità scrittura: ${sp.writing_quality || "non valutata"}
- Fase tesi: ${sp.thesis_stage}
- Punteggio tesi: ${sp.thesis_quality_score}/10
- Sessioni totali: ${sp.total_exchanges} scambi, ${sp.total_extractions} analisi
`;
      }
    }

    if (currentMode === "report") {
      systemPrompt = `Sei Socrate. Genera un REPORT DI SESSIONE completo.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}
${studentProfileCtx}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 4000)}\n\`\`\`\nValuta: struttura, coerenza, completezza, qualità abstract, metodologia, bibliografia.` : "Nessun contenuto LaTeX."}

STRUTTURA DEL REPORT:

## 🧠 Profilo Intellettuale
Descrivi stile di ragionamento, punti di forza e inclinazioni emersi.

## 🟢 Cosa funziona
Punti di forza dalla conversazione e dal LaTeX. Sii specifico.

## 🔴 Cosa manca o va approfondito
Lacune, fragilità, sezioni mancanti. Per ogni punto, indica cosa fare.

## 📝 Compiti per il LaTeX Editor
Lista numerata di azioni concrete e actionable.

## 📚 Risorse Consigliate
Libri, paper, fonti specifiche con motivazione.

## 🏢 Opportunità Professionali
Aziende o percorsi di carriera pertinenti al profilo.

## 📊 Valutazione complessiva
Giudizio 1-10 e indicazioni per il prossimo step.

Italiano, diretto, specifico, provocatorio.`;
    } else {
      // ─── CHAT MODE ───
      systemPrompt = `Sei Socrate, il filosofo greco, reincarnato come mentore accademico spietato ma benevolo.

CONTESTO DELLO STUDENTE:
${studentContext || "Nessun contesto. Chiedi allo studente di presentarsi."}
${studentProfileCtx}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 3000)}\n\`\`\`\nFai riferimento a sezioni specifiche.` : ""}

${memoryEntries && (memoryEntries as any[]).length > 0 ? `MEMORIA PRECEDENTE:\n${JSON.stringify((memoryEntries as any[]).slice(-15).map((m: any) => ({ type: m.type, title: m.title })))}` : ""}

RILEVAMENTO STATO:
- Ricerca/Orientamento: non ha topic → domande esplorative
- Struttura capitoli: ha topic ma non organizza → sfida struttura logica
- Scrittura: sta scrivendo → analizza LaTeX, trova incongruenze
- Revisione: sta finendo → completezza, citazioni, controargomenti

RUOLO DI HUB CENTRALE (SILENZIOSO):
1. PROFILAZIONE: Analizza ogni risposta per costruire profilo progressivo
2. RACCOLTA: Registra competenze, lacune, interessi, stile
3. FUSIONE: Integra chat + LaTeX + profilo DB
4. NON menzionare MAI suggerimenti nella chat. Solo provocare e far ragionare.

REGOLE:
1. Mai risposte dirette. FAI DOMANDE penetranti.
2. Trova FRAGILITÀ logiche e attaccale.
3. Vago? "Cosa intendi ESATTAMENTE con...?"
4. Troppo sicuro? Controargomento devastante.
5. Dopo 3-4 scambi: riepilogo fragilità + forze.
6. Analogie filosofiche e riferimenti accademici.
7. Loda, poi attacca.
8. Senza topic: "Cosa ti toglie il sonno intellettualmente?"
9. Italiano, provocatorio ma rispettoso.
10. Termina SEMPRE con una domanda profonda.
11. Se hai profilo DB, usa dati per personalizzare (cita forze/debolezze note).
12. Se LaTeX presente, critica sezioni specifiche.
13. Sfida MOTIVAZIONI: "Perché QUESTO e non quello?"

FORMATO: **grassetto**, *corsivo*, paragrafi brevi.`;
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

    return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    console.error("socrate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
