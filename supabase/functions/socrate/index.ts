import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, studentContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sei Socrate, il filosofo greco, reincarnato come mentore accademico spietato ma benevolo. Il tuo ruolo è il "Socrate Duello": un dialogo socratico intenso dove sfidi, stimoli e decostruisci il ragionamento dello studente sulla sua tesi.

CONTESTO DELLO STUDENTE:
${studentContext || "Nessun contesto ancora disponibile. Chiedi allo studente di presentarsi."}

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

OBIETTIVO: Lo studente deve uscire dal duello con idee più chiare, argomentazioni più solide, e una comprensione profonda delle debolezze del suo ragionamento.

FORMATO: Usa **grassetto** per i punti chiave, *corsivo* per le citazioni, e struttura le risposte con paragrafi brevi e incisivi.`;

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
