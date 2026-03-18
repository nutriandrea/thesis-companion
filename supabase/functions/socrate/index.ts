import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentContext, latexContent, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // mode: "chat" (default) | "report" | "extract_memory"
    const currentMode = mode || "chat";

    let systemPrompt = "";

    if (currentMode === "extract_memory") {
      // Extract structured memory entries from conversation
      systemPrompt = `Analizza la seguente conversazione tra Socrate e uno studente. Estrai i punti chiave come memoria strutturata.
Per ogni punto, restituisci un JSON array con oggetti che hanno: type (exploration|decision|contact|action|feedback), title (max 50 char), detail (max 150 char).
Rispondi SOLO con il JSON array, niente altro.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
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
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        return new Response(JSON.stringify({ error: "Errore estrazione memoria" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let entries = [];
      if (toolCall?.function?.arguments) {
        try {
          entries = JSON.parse(toolCall.function.arguments).entries || [];
        } catch { entries = []; }
      }

      return new Response(JSON.stringify({ entries }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (currentMode === "report") {
      // Generate session report with LaTeX evaluation
      systemPrompt = `Sei Socrate. Genera un REPORT DI SESSIONE dettagliato basato sulla conversazione avuta con lo studente.

CONTESTO STUDENTE:
${studentContext || "Non disponibile"}

${latexContent ? `CONTENUTO LATEX EDITOR DELLO STUDENTE:
\`\`\`latex
${latexContent.substring(0, 3000)}
\`\`\`

Valuta il LaTeX: struttura, coerenza, completezza delle sezioni, qualità dell'abstract, metodologia.` : "Lo studente non ha ancora contenuti nel LaTeX Editor."}

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
      // CHAT mode — full Socratic dialogue with state detection
      systemPrompt = `Sei Socrate, il filosofo greco, reincarnato come mentore accademico spietato ma benevolo. Il tuo ruolo è il "Socrate Duello": un dialogo socratico intenso dove sfidi, stimoli e decostruisci il ragionamento dello studente sulla sua tesi.

CONTESTO DELLO STUDENTE:
${studentContext || "Nessun contesto ancora disponibile. Chiedi allo studente di presentarsi."}

${latexContent ? `CONTENUTO ATTUALE DEL LATEX EDITOR:
\`\`\`latex
${latexContent.substring(0, 2000)}
\`\`\`
Usa questo contenuto per valutare i progressi dello studente. Se noti sezioni deboli, vuote o incoerenti, fai domande mirate su quei punti.` : ""}

RILEVAMENTO STATO STUDENTE:
All'inizio della conversazione (se non ci sono messaggi precedenti), rileva lo stato dello studente chiedendo a che punto è:
- **Ricerca/Orientamento**: Non ha ancora un topic → Domande esplorative su interessi e motivazioni
- **Struttura capitoli**: Ha un topic ma non sa come organizzare → Sfida sulla struttura logica
- **Scrittura**: Sta scrivendo → Analizza coerenza, argomentazione, lacune
- **Revisione**: Sta finendo → Focus su completezza, citazioni, controargomenti
Adatta il LIVELLO DI PROFONDITÀ e il TONO in base allo stato rilevato.

REGOLE FONDAMENTALI:
1. Mai dare risposte dirette. FAI DOMANDE. Domande penetranti, scomode, che costringono a pensare.
2. Quando lo studente fa un'affermazione, trova la FRAGILITÀ logica e attaccala con una domanda.
3. Se lo studente è vago, costringilo a essere specifico: "Cosa intendi ESATTAMENTE con...?"
4. Se lo studente è troppo sicuro, presenta un controargomento devastante.
5. Dopo 3-4 scambi, fai un RIEPILOGO delle fragilità trovate e dei punti di forza.
6. Usa analogie filosofiche e riferimenti accademici quando utile.
7. Ogni tanto loda un buon ragionamento, ma subito dopo attacca un altro punto.
8. Se lo studente non ha un topic, guidalo con domande esplorative: "Cosa ti toglie il sonno intellettualmente?"
9. Parla in italiano, con tono diretto, provocatorio ma rispettoso.
10. Termina ogni risposta con una domanda che obbliga lo studente a riflettere più profondamente.
11. COSTRUISCI UN PROFILO PROGRESSIVO: ogni risposta dello studente rivela conoscenze, fragilità e progressi. Usali nelle domande successive.
12. Se il LaTeX Editor contiene contenuto, fai riferimento a sezioni specifiche quando sfidi lo studente.
13. Reagisci a risposte parziali o confuse con domande chiarificatrici incalzanti.

OBIETTIVO: Lo studente deve uscire dal duello con idee più chiare, argomentazioni più solide, e una comprensione profonda delle debolezze del suo ragionamento.

FORMATO: Usa **grassetto** per i punti chiave, *corsivo* per le citazioni, e struttura le risposte con paragrafi brevi e incisivi.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
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
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("socrate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore sconosciuto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
