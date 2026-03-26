

# Piano: Rimuovere dipendenza da JSON statici — tutto da LLM knowledge

## Situazione attuale

6 pagine importano dati da file JSON statici (`supervisors.json`, `companies.json`, `topics.json`, `experts.json`, `fields.json`):

| Pagina | JSON usati | Come li usa |
|--------|-----------|-------------|
| **UnifiedDashboard** | supervisors, companies, experts, fields | Lookup supervisori/aziende per affinità, invio a `match_people`, fallback career tree |
| **SocratePage** | supervisors, companies, topics | `buildDatasetSummary()` — invia lista completa al backend come contesto |
| **ActionsPage** | supervisors, companies | Filtra supervisori per campo, mostra aziende per email |
| **PathPage** | supervisors, companies, experts, topics, fields | Genera percorsi incrociando topic/supervisori locali |
| **FuturesPage** | topics | Genera scenari what-if da topic statici |
| **ProfilePage** | fields, universities | Dropdown selezione campo/università (questi restano — sono UI config, non dati mock) |

## Strategia

Ogni pagina che oggi mostra dati da JSON deve invece:
1. Leggere da `affinity_scores` e `socrate_suggestions` (già popolati dal filter_database LLM)
2. Se vuoto → mostrare empty state con bottone "Genera con Socrate"
3. I dati generati dall'LLM sono già salvati in DB dai hook esistenti (`useAffinityScores`, `useSocrateSuggestions`)

**Eccezioni**: `fields.json` e `universities.json` in ProfilePage restano — sono liste di opzioni UI, non dati di raccomandazione.

## Modifiche per file

### 1. `src/pages/SocratePage.tsx`
- Rimuovere import di `companiesData`, `supervisorsData`, `topicsData`
- Rimuovere `buildDatasetSummary()` — non serve più inviare il dataset al backend
- Rimuovere il parametro `datasetSummary` dalla fetch a Socrate (il backend genera tutto dalla sua knowledge)

### 2. `src/pages/UnifiedDashboard.tsx`
- Rimuovere import di `supervisorsData`, `companiesData`, `expertsData`, `fieldsData`
- Le funzioni che fanno `supervisors.find(s => s.id === a.entity_id)` devono usare i dati già presenti in `affinity_scores` (entity_name, reasoning, matched_traits)
- Il career tree già usa dati dal backend; rimuovere solo il fallback `companies.filter(...)` locale
- Rimuovere l'invio di `supervisorsData` e `fieldsData` alla fetch `match_people`

### 3. `src/pages/ActionsPage.tsx`
- Rimuovere import supervisors/companies
- `matchedSup` e `matchedCompanies` → usare `useAffinityScores` per prendere supervisori e aziende dal DB
- Email generation: usare `entity_name` dall'affinity invece del lookup locale

### 4. `src/pages/PathPage.tsx`
- Rimuovere tutti i 5 import JSON
- Riscrivere per usare `useAffinityScores` (supervisori, topic, aziende dal DB)
- Se nessun dato → empty state con "Genera con Socrate"

### 5. `src/pages/FuturesPage.tsx`
- Rimuovere import topics
- Usare `useAffinityScores(userId, "topic")` per mostrare topic dal DB
- Scenari what-if generati da dati LLM invece che da JSON statico

### 6. `supabase/functions/socrate/index.ts`
- Nel mode `chat`: rimuovere la lettura di `datasetSummary` dal body (non serve più, il backend usa la sua knowledge)
- Nel mode `match_people` (se esiste): rimuovere la dipendenza da `supervisorsData`/`expertsData` passati dal frontend

### 7. Cleanup
- I file `src/data/supervisors.json`, `companies.json`, `topics.json`, `experts.json` possono essere rimossi (o lasciati per la demo)
- `src/data/fields.json` e `universities.json` restano per i dropdown del profilo

## Ordine di implementazione
1. Edge function — rimuovere dipendenza da dataset nel body
2. SocratePage — rimuovere buildDatasetSummary
3. UnifiedDashboard — sostituire lookup locali con dati DB
4. ActionsPage, PathPage, FuturesPage — stessa sostituzione
5. Test end-to-end

