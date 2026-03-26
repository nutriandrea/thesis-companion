

# Piano: Supporto tesi non-scientifiche + Fix Speech

## Problema 1: Bias verso tesi scientifiche

Il sistema prompt di Socrate e i moduli di analisi sono fortemente orientati verso tesi STEM (LaTeX, metodologia di ricerca, paper accademici, literature review). Studenti di giurisprudenza, economia, design, filosofia, lettere, arte, architettura ecc. ricevono feedback inadeguato.

### Punti da modificare

**A) System prompt principale** (`supabase/functions/socrate/index.ts`, linee 2240-2346)
- Rimuovere riferimenti a "LaTeX" come unico formato (sostituire con "documento di tesi" generico)
- Ampliare le fasi del percorso per includere tesi non-sperimentali (es. tesi argomentative, progettuali, compilative)
- Aggiungere istruzione: "Adatta il tuo approccio al TIPO di tesi: scientifica/sperimentale, argomentativa, progettuale, compilativa, creativa"

**B) Vulnerability categories** (linee 150-235)
- Aggiungere categorie per tesi umanistiche: "weak_argument" (argomentazione debole), "source_bias" (fonti sbilanciate), "structural_incoherence" (incoerenza strutturale)
- Rendere le descrizioni delle categorie esistenti più generiche (es. "methodology_flaw" → vale anche per tesi senza esperimenti)

**C) Task generator** (linee 822-970)
- Espandere le sezioni da "Abstract, Metodologia, Literature Review, Ricerca, Bibliografia" a includere: Introduzione, Capitoli argomentativi, Analisi critica, Casi studio, Progetto, Conclusioni
- Aggiungere istruzione al prompt: "Adatta le sezioni al tipo di tesi dello studente"

**D) LaTeX analyzer** (linee 1696-1958)
- Rinominare da "analyze_latex" a supportare qualsiasi formato documento
- Le sezioni attese (abstract, introduzione, metodologia, risultati, bibliografia) vanno rese dinamiche: "Identifica le sezioni presenti e valutale in base al tipo di tesi"

**E) Report generator** (linee 2067-2103)
- Sezione "📝 Compiti per il LaTeX Editor" → "📝 Prossimi passi per il documento"
- Adattare la struttura del report al tipo di tesi

**F) Reference suggestions** (linee 239-318)
- Espandere da "paper accademici" a includere: libri, sentenze giuridiche, casi aziendali, opere d'arte, progetti di design, codice legislativo, ecc.

**G) Demo engine** (`supabase/functions/demo-engine/index.ts`)
- Il profilo demo è hardcoded come "MSc Computer Science, ETH Zurich, ML/NLP". Va reso più generico o parametrizzabile.

---

## Problema 2: Speech non funzionante

L'infrastruttura TTS/STT è implementata correttamente (ElevenLabs multilingual_v2, Scribe auto-detect). I potenziali problemi:

**A) Welcome message hardcoded in inglese** (`SocratePage.tsx`, linee 92-95)
- Il messaggio di benvenuto è in inglese fisso. In voice mode, il TTS lo legge in inglese anche se l'utente parla italiano.

**B) VoiceConversation `onSwitchToText` non passato** (`SocratePage.tsx`, linee 383-393)
- Manca la prop `onSwitchToText`. Il fallback funziona ma è meglio passarla esplicitamente per chiarezza.

**C) Edge function TTS - voce fissa "Daniel"** (`elevenlabs-tts/index.ts`, linea 29)
- La voce "Daniel" è inglese nativa. Per lingue diverse dall'inglese la qualità potrebbe degradare.
- Soluzione: usare una voce multilingual più neutra o selezionare dinamicamente in base alla lingua rilevata.

**D) Verifica deployment edge functions**
- Verificare che `elevenlabs-tts` e `elevenlabs-scribe-token` siano deployed e funzionanti tramite test diretto.

---

## File da modificare

| File | Modifiche |
|------|-----------|
| `supabase/functions/socrate/index.ts` | Prompt generalizzati per tutti i tipi di tesi, categorie vulnerabilità ampliate, sezioni dinamiche |
| `supabase/functions/elevenlabs-tts/index.ts` | Voce multilingual adattiva (opzionale) |
| `supabase/functions/demo-engine/index.ts` | Profilo demo meno STEM-specifico |
| `src/pages/SocratePage.tsx` | Welcome message multilingua, prop onSwitchToText |

## Ordine di implementazione

1. **Socrate edge function** — Generalizzare tutti i prompt per supportare qualsiasi tipo di tesi
2. **TTS edge function** — Verificare/migliorare supporto multilingua voce
3. **SocratePage** — Fix welcome message e prop mancante
4. **Demo engine** — Aggiornare profilo demo
5. **Test end-to-end** — Deploy e verifica voce funzionante

