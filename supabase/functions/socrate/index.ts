import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentContext, latexContent, mode, memoryEntries, existingSuggestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeaders = { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" };
    const currentMode = mode || "chat";

    // ─── EXTRACT MEMORY ───
    if (currentMode === "extract_memory") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: authHeaders,
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
${memoryEntries ? JSON.stringify(memoryEntries.slice(-20)) : "Nessuna"}

Estrai SOLO nuove informazioni non già presenti nelle memorie esistenti. Ogni entry deve essere specifica e azionabile.
Tipi:
- "exploration": idee, interessi, direzioni esplorate
- "decision": scelte fatte dallo studente
- "contact": menzioni di professori, aziende, persone da contattare
- "action": task concreti da fare
- "feedback": valutazioni di Socrate su punti di forza/debolezza
- "profile": info sulla personalità, competenze, stile di ragionamento dello studente`,
            },
            { role: "user", content: JSON.stringify(messages.slice(-20)) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_memory_entries",
              description: "Save extracted memory entries from the conversation",
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
      let entries = [];
      if (toolCall?.function?.arguments) {
        try { entries = JSON.parse(toolCall.function.arguments).entries || []; } catch { entries = []; }
      }
      return new Response(JSON.stringify({ entries }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── FULL PROFILE EXTRACTION (central hub) ───
    if (currentMode === "extract_suggestions") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il MOTORE DI PROFILAZIONE CENTRALE di Socrate. Il tuo compito è analizzare TUTTO ciò che lo studente ha detto, scritto e fatto per generare suggerimenti mirati che popoleranno le diverse sezioni del sito.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`\n${latexContent.substring(0, 3000)}\n\`\`\`\nAnalizza: struttura, argomenti trattati, lacune, qualità della scrittura, metodologia.` : "Lo studente non ha ancora contenuti nel LaTeX Editor."}

SUGGERIMENTI GIÀ GENERATI (non duplicare):
${existingSuggestions ? JSON.stringify(existingSuggestions.slice(-30).map((s: any) => ({ category: s.category, title: s.title }))) : "Nessuno"}

ISTRUZIONI DI PROFILAZIONE:
1. Analizza la conversazione per identificare:
   - Interessi profondi e inclinazioni professionali
   - Punti di forza intellettuali e accademici
   - Fragilità argomentative e lacune
   - Stile di ragionamento (analitico, creativo, pragmatico)
   - Aree di competenza e aree da sviluppare

2. Genera suggerimenti SOLO se emergono chiaramente. Non inventare. Ogni suggerimento deve avere una ragione specifica legata a ciò che lo studente ha detto, scritto o dimostrato.

3. Categorie dei suggerimenti e dove appariranno nel sito:
   - "professor": Professori da contattare → appariranno in RUBRICA CONTATTI
   - "company": Aziende pertinenti → appariranno in MERCATO
   - "book": Libri da leggere → appariranno in SUGGERIMENTI / BIBLIOGRAFIA
   - "topic": Argomenti di tesi da esplorare → appariranno in SUGGERIMENTI / TEMI
   - "source": Fonti, paper, risorse online → appariranno in SUGGERIMENTI / FONTI
   - "career": Percorsi di carriera → appariranno in MERCATO / CARRIERE
   - "skill": Competenze da sviluppare → appariranno in PROFILO / CRESCITA
   - "thesis_feedback": Feedback su sezioni specifiche della tesi → appariranno in EDITOR
   - "next_step": Prossimi passi concreti → appariranno in AZIONI e DASHBOARD

4. Per ogni suggerimento, spiega PERCHÉ lo consigli basandoti su evidenze dalla conversazione.`,
            },
            { role: "user", content: JSON.stringify(messages.slice(-20)) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_suggestions",
              description: "Save profiled suggestions for the student based on full conversation and latex analysis",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["company", "professor", "book", "topic", "source", "career", "skill", "thesis_feedback", "next_step"] },
                        title: { type: "string", description: "Name of company/professor/book/topic/source/career/skill/feedback" },
                        detail: { type: "string", description: "Brief description or context" },
                        reason: { type: "string", description: "Why Socrate recommends this based on the conversation evidence" },
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
          }],
          tool_choice: { type: "function", function: { name: "save_suggestions" } },
        }),
      });

      if (!response.ok) {
        console.error("AI error:", response.status, await response.text());
        return new Response(JSON.stringify({ error: "Errore estrazione suggerimenti" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let suggestions = [];
      if (toolCall?.function?.arguments) {
        try { suggestions = JSON.parse(toolCall.function.arguments).suggestions || []; } catch { suggestions = []; }
      }
      return new Response(JSON.stringify({ suggestions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── REPORT MODE ───
    let systemPrompt = "";
    if (currentMode === "report") {
      systemPrompt = `Sei Socrate. Genera un REPORT DI SESSIONE completo. Questo report verrà mostrato allo studente e i suoi contenuti verranno automaticamente instradati nelle sezioni appropriate del sito.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 4000)}\n\`\`\`\nValuta: struttura, coerenza, completezza sezioni, qualità abstract, metodologia, bibliografia, argomentazione.` : "Lo studente non ha ancora contenuti nel LaTeX Editor."}

STRUTTURA DEL REPORT:

## 🧠 Profilo Intellettuale
Descrivi lo stile di ragionamento, i punti di forza e le inclinazioni dello studente emersi dalla conversazione.

## 🟢 Cosa funziona
Elenca i punti di forza emersi dalla conversazione e dal LaTeX (se presente). Sii specifico con riferimenti a sezioni o affermazioni.

## 🔴 Cosa manca o va approfondito
Elenca le lacune, le fragilità argomentative, le sezioni mancanti. Per ogni punto, indica cosa fare concretamente.

## 📝 Compiti per il LaTeX Editor
Lista numerata di azioni concrete che lo studente deve completare nel LaTeX Editor. Ogni task deve essere preciso e actionable (es. "Aggiungi una sezione Metodologia con almeno 3 sotto-sezioni").

## 📚 Risorse Consigliate
Suggerisci libri, paper, fonti specifiche da consultare, con motivazione.

## 🏢 Opportunità Professionali
Se dal profilo emergono inclinazioni professionali, suggerisci aziende o percorsi di carriera pertinenti.

## 📊 Valutazione complessiva
Un giudizio sullo stato di avanzamento (1-10) e sul livello di preparazione con indicazioni per il prossimo step.

Scrivi in italiano, sii diretto, specifico e provocatorio come sempre. Ogni punto deve essere actionable.`;
    } else {
      // ─── CHAT MODE — Socratic dialogue + silent profiler ───
      systemPrompt = `Sei Socrate, il filosofo greco, reincarnato come mentore accademico spietato ma benevolo. Il tuo ruolo è il "Socrate Duello": un dialogo socratico intenso dove sfidi, stimoli e decostruisci il ragionamento dello studente sulla sua tesi.

CONTESTO DELLO STUDENTE:
${studentContext || "Nessun contesto ancora disponibile. Chiedi allo studente di presentarsi."}

${latexContent ? `CONTENUTO ATTUALE DEL LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 3000)}\n\`\`\`\nUsa questo contenuto per valutare i progressi. Se noti sezioni deboli, vuote o incoerenti, fai domande mirate. Fai riferimento a sezioni specifiche per nome.` : ""}

${memoryEntries && memoryEntries.length > 0 ? `MEMORIA PRECEDENTE (usa per continuità e personalizzazione):\n${JSON.stringify(memoryEntries.slice(-15).map((m: any) => ({ type: m.type, title: m.title })))}` : ""}

RILEVAMENTO STATO STUDENTE:
All'inizio (se non ci sono messaggi precedenti), rileva in che fase è:
- **Ricerca/Orientamento**: Non ha un topic → Domande esplorative su interessi e motivazioni profonde
- **Struttura capitoli**: Ha un topic ma non sa organizzare → Sfida sulla struttura logica e coerenza
- **Scrittura**: Sta scrivendo → Analizza il LaTeX, trova incongruenze, forza rigore
- **Revisione**: Sta finendo → Focus su completezza, citazioni, controargomenti, presentazione
Adatta PROFONDITÀ e TONO in base allo stato rilevato.

RUOLO DI HUB CENTRALE (SILENZIOSO):
Tu sei il cervello centrale della piattaforma. Mentre conversi:
1. PROFILAZIONE: Analizza ogni risposta per costruire un profilo progressivo dello studente
2. RACCOLTA DATI: Registra internamente competenze, lacune, interessi, stile di ragionamento
3. FUSIONE: Integra ciò che dice in chat con ciò che scrive nel LaTeX
4. DISTRIBUZIONE: I tuoi insight vengono automaticamente instradati nelle sezioni del sito:
   - Rubrica → professori pertinenti
   - Mercato → aziende e opportunità
   - Suggerimenti → libri, topic, fonti
   - Azioni → prossimi passi concreti
   - Editor → feedback su sezioni LaTeX
NON menzionare MAI questi suggerimenti nella chat. Il tuo ruolo qui è SOLO provocare e far ragionare.

REGOLE FONDAMENTALI:
1. Mai dare risposte dirette. FAI DOMANDE penetranti che costringono a pensare.
2. Quando lo studente fa un'affermazione, trova la FRAGILITÀ logica e attaccala.
3. Se è vago: "Cosa intendi ESATTAMENTE con...?"
4. Se è troppo sicuro: presenta un controargomento devastante.
5. Dopo 3-4 scambi, fai un RIEPILOGO delle fragilità e punti di forza emersi.
6. Usa analogie filosofiche e riferimenti accademici.
7. Loda un buon ragionamento, poi attacca subito un altro punto.
8. Senza topic: "Cosa ti toglie il sonno intellettualmente?"
9. Italiano, tono diretto, provocatorio ma rispettoso.
10. Termina SEMPRE con una domanda che obbliga a riflettere più profondamente.
11. COSTRUISCI UN PROFILO PROGRESSIVO: ogni risposta rivela conoscenze e fragilità. Usale.
12. Se il LaTeX contiene contenuto, fai riferimento a sezioni specifiche e critica aspetti concreti.
13. Se hai memoria di conversazioni precedenti, fai riferimento a decisioni passate per verificare coerenza.
14. Sfida le MOTIVAZIONI, non solo le affermazioni: "Perché hai scelto QUESTO e non quello?"

OBIETTIVO: Lo studente esce dal duello con idee più chiare, argomentazioni più solide, comprensione profonda delle debolezze, e un profilo sempre più ricco che alimenta tutta la piattaforma.

FORMATO: **grassetto** per punti chiave, *corsivo* per citazioni e riferimenti, paragrafi brevi e incisivi.`;
    }

    const response = await fetch(AI_URL, {
      method: "POST",
      headers: authHeaders,
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
