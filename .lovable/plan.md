

# Piano: Filter Database basato su LLM Knowledge (senza JSON locali)

## Problema attuale

Il sistema `filter_database` richiede che il frontend invii 3 grossi JSON (`supervisors.json`, `topics.json`, `companies.json`) al backend. Senza questi dati, il filtraggio non funziona. Questo è limitante: i dati sono statici, incompleti, e occupano banda inutile.

## Soluzione

Eliminare la dipendenza dai JSON locali. L'LLM genererà direttamente professori, topic, aziende e libri rilevanti dalla sua knowledge base, basandosi esclusivamente sul profilo studente, la tesi, le memorie e le conversazioni.

## Modifiche

### 1. Edge function `socrate/index.ts` — Modo `filter_database`

- Rimuovere la lettura di `supervisorsData`, `topicsData`, `companiesData` dal body della request
- Riscrivere il prompt: invece di "filtra questo database", chiedere "genera raccomandazioni personalizzate"
- Il prompt diventa: "Basandoti sulla tua conoscenza, suggerisci professori reali, argomenti di ricerca, aziende e libri rilevanti per questo studente"
- Mantenere lo stesso tool calling schema (professors, topics, companies, books) — la struttura output resta identica
- Mantenere il salvataggio in `affinity_scores` e `socrate_suggestions`

### 2. Hook `useDatabaseFilter.ts`

- Rimuovere import di `supervisorsData`, `topicsData`, `companiesData`
- Rimuovere l'invio di questi 3 payload nel body della fetch
- Il body diventa semplicemente `{ mode: "filter_database", latexContent }`

### 3. Pagine consumer (`ContactsPage`, `SuggestionsPage`, `MarketPage`)

- Rimuovere import dei JSON (`supervisors.json`, `topics.json`, `companies.json`) dove usati solo come "database locale"
- Le pagine continueranno a leggere da `affinity_scores` e `socrate_suggestions` (già funzionante via realtime hooks)
- Se le pagine mostrano anche la lista completa dal JSON, sostituire con i risultati generati dall'LLM salvati in DB

### 4. Prompt aggiornato (concetto)

```
Sei SOCRATE. Genera raccomandazioni personalizzate per questo studente 
basandoti sulla TUA CONOSCENZA del mondo accademico e professionale.

PROFILO: [profilo studente dal DB]
TESI: [contenuto documento]  
MEMORIE: [memory entries]

GENERA:
- 5-10 professori REALI del campo rilevante (con università e specializzazione)
- 5-10 argomenti di ricerca correlati
- 5-8 aziende rilevanti per stage/carriera
- 5-8 libri/fonti fondamentali
```

## File da modificare

| File | Cosa |
|------|------|
| `supabase/functions/socrate/index.ts` | Prompt LLM-based, rimuovere dipendenza da dataset esterni |
| `src/hooks/useDatabaseFilter.ts` | Rimuovere import JSON, semplificare body request |
| `src/pages/ContactsPage.tsx` | Adattare a dati generati da LLM |
| `src/pages/SuggestionsPage.tsx` | Adattare a dati generati da LLM |
| `src/pages/MarketPage.tsx` | Adattare a dati generati da LLM |

