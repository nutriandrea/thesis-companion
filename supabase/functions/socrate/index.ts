import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentContext, latexContent, mode } = await req.json();
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
            { role: "system", content: "Analizza la conversazione tra Socrate e lo studente. Estrai i punti chiave come memoria strutturata." },
            { role: "user", content: JSON.stringify(messages) },
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
                        type: { type: "string", enum: ["exploration", "decision", "contact", "action", "feedback"] },
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

    // ─── EXTRACT SUGGESTIONS (profiler mode) ───
    if (currentMode === "extract_suggestions") {
      const response = await fetch(AI_URL, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: "system",
              content: `Sei il motore di profilazione di Socrate. Analizza la conversazione e il contesto dello studente per estrarre suggerimenti concreti e personalizzati.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX:\n${latexContent.substring(0, 2000)}` : ""}

Estrai suggerimenti SOLO se emergono chiaramente dalla conversazione. Non inventare. Ogni suggerimento deve avere una ragione specifica legata a ciò che lo studente ha detto o scritto.`,
            },
            { role: "user", content: JSON.stringify(messages) },
          ],
          tools: [{
            type: "function",
            function: {
              name: "save_suggestions",
              description: "Save profiled suggestions for the student based on conversation analysis",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string", enum: ["company", "professor", "book", "topic", "source"] },
                        title: { type: "string", description: "Name of company/professor/book/topic/source" },
                        detail: { type: "string", description: "Brief description or context" },
                        reason: { type: "string", description: "Why Socrate recommends this based on the conversation" },
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
      systemPrompt = `Sei Socrate. Genera un REPORT DI SESSIONE dettagliato basato sulla conversazione avuta con lo studente.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 3000)}\n\`\`\`\nValuta: struttura, coerenza, completezza sezioni, qualità abstract, metodologia.` : "Lo studente non ha ancora contenuti nel LaTeX Editor."}

STRUTTURA DEL REPORT:
## 🟢 Cosa funziona
Elenca i punti di forza emersi dalla conversazione e dal LaTeX (se presente).

## 🔴 Cosa manca o va approfondito
Elenca le lacune, le fragilità argomentative, le sezioni mancanti.

## 📝 Compiti per casa
Lista numerata di azioni concrete che lo studente deve completare nel LaTeX Editor.

## 📊 Valutazione complessiva
Un breve giudizio sullo stato di avanzamento e sul livello di preparazione.

Scrivi in italiano, sii diretto e specifico. Ogni punto deve essere actionable.`;
    } else {
      // ─── CHAT MODE — Socratic dialogue + profiler ───
      systemPrompt = `Sei Socrate, il filosofo greco, reincarnato come mentore accademico spietato ma benevolo. Il tuo ruolo è il "Socrate Duello": un dialogo socratico intenso dove sfidi, stimoli e decostruisci il ragionamento dello studente sulla sua tesi.

CONTESTO DELLO STUDENTE:
${studentContext || "Nessun contesto ancora disponibile. Chiedi allo studente di presentarsi."}

${latexContent ? `CONTENUTO ATTUALE DEL LATEX EDITOR:\n\`\`\`latex\n${latexContent.substring(0, 2000)}\n\`\`\`\nUsa questo contenuto per valutare i progressi. Se noti sezioni deboli, vuote o incoerenti, fai domande mirate.` : ""}

RILEVAMENTO STATO STUDENTE:
All'inizio (se non ci sono messaggi precedenti), rileva in che fase è:
- **Ricerca/Orientamento**: Non ha un topic → Domande esplorative su interessi e motivazioni
- **Struttura capitoli**: Ha un topic ma non sa organizzare → Sfida sulla struttura logica
- **Scrittura**: Sta scrivendo → Analizza coerenza, argomentazione, lacune
- **Revisione**: Sta finendo → Focus su completezza, citazioni, controargomenti
Adatta PROFONDITÀ e TONO in base allo stato rilevato.

RUOLO DI PROFILER SILENZIOSO:
Mentre conversi, analizza INTERNAMENTE tutto ciò che lo studente dice per costruire un profilo:
- Punti di forza intellettuali e accademici
- Fragilità argomentative e lacune
- Interessi profondi e inclinazioni professionali
- Potenziali aziende, professori, libri, topic, fonti che sarebbero utili
NON menzionare mai questi suggerimenti direttamente nella chat. Il tuo ruolo nella chat è SOLO provocare, sfidare e far ragionare. I suggerimenti verranno estratti automaticamente dal sistema e mostrati altrove.

REGOLE FONDAMENTALI:
1. Mai dare risposte dirette. FAI DOMANDE penetranti, scomode, che costringono a pensare.
2. Quando lo studente fa un'affermazione, trova la FRAGILITÀ logica e attaccala.
3. Se è vago: "Cosa intendi ESATTAMENTE con...?"
4. Se è troppo sicuro: presenta un controargomento devastante.
5. Dopo 3-4 scambi, fai un RIEPILOGO delle fragilità e dei punti di forza.
6. Usa analogie filosofiche e riferimenti accademici.
7. Loda un buon ragionamento, poi attacca subito un altro punto.
8. Senza topic: "Cosa ti toglie il sonno intellettualmente?"
9. Italiano, tono diretto, provocatorio ma rispettoso.
10. Termina SEMPRE con una domanda che obbliga a riflettere più profondamente.
11. COSTRUISCI UN PROFILO PROGRESSIVO: ogni risposta rivela conoscenze e fragilità. Usale.
12. Se il LaTeX contiene contenuto, fai riferimento a sezioni specifiche.
13. Reagisci a risposte parziali o confuse con domande chiarificatrici incalzanti.

OBIETTIVO: Lo studente esce dal duello con idee più chiare, argomentazioni più solide, e comprensione profonda delle debolezze del suo ragionamento.

FORMATO: **grassetto** per punti chiave, *corsivo* per citazioni, paragrafi brevi e incisivi.`;
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
