
# Piano: Socrate Demo Ready — `/demo` self-contained con tutte le sezioni

## Obiettivo

Trasformare la rotta pubblica `/demo` in una **versione completa e navigabile** di Socrate, popolata con dati sintetici coerenti (profilo "Marco Demo"), senza toccare né il flusso autenticato (`/dashboard`, `/socrate`) né le edge function di produzione. Chi apre il link demo vede tutte le sezioni della piattaforma riempite e può passare dall'una all'altra come se fosse un utente reale a metà tesi.

## Stato attuale

- `/demo` (`src/pages/DemoPage.tsx`, 2030 righe) ha già: login fake → chat Socrate → dashboard unificata con career tree, supervisori, vulnerabilità, references, roadmap, expert match, task per fase.
- Sono presenti `MOCK_*` per tutto: tesi, settori, task per fase, supervisori, esperti, references, vulnerabilità, conversazione Socrate, roadmap.
- Manca completamente la **navigazione tra le sezioni satellite** (Contatti, Percorsi, Azioni, Futuro, Suggerimenti, Mercato, Memoria, Editor, Profilo): la demo finisce sulla dashboard.
- Le pagine reali (`ContactsPage`, `PathPage`, `ActionsPage`, `FuturesPage`, ecc.) leggono da Supabase autenticato → non riutilizzabili così come sono.

## Strategia

**Demo come universo parallelo**: zero scrittura su Supabase, zero hook autenticati. Tutto vive dentro un `DemoContext` in memoria con i dati sintetici già esistenti + qualche aggiunta. Le pagine demo sono **viste semplificate** delle pagine reali, costruite per riusare layout e componenti UI ma con dati dal context.

Si preserva ciò che già funziona:
- `/login`, `/dashboard`, `/socrate` invariati
- Edge function `socrate` e `demo-engine` invariate (la chat demo già le usa in modalità stateless)
- Nessuna nuova tabella, nessuna RLS, nessuna migration

## Architettura

```text
/demo                          → DemoPage (entry: login → chat → dashboard)
/demo/dashboard                → DemoDashboard (overview attuale)
/demo/socrate                  → DemoSocrate (chat persistente nel context)
/demo/contacts                 → DemoContacts
/demo/path                     → DemoPath
/demo/actions                  → DemoActions
/demo/futures                  → DemoFutures
/demo/suggestions              → DemoSuggestions
/demo/market                   → DemoMarket
/demo/memory                   → DemoMemory
/demo/editor                   → DemoEditor
/demo/profile                  → DemoProfile
```

Tutto wrappato da un `DemoShell` con sidebar di navigazione (clone semplificato di `AppSidebar`) e un `DemoProvider` che espone profilo, supervisori, esperti, vulnerabilità, references, task, roadmap, messaggi Socrate, memoria, suggerimenti.

## Sezioni — cosa contiene ognuna

| Rotta | Cosa mostra (con dati sintetici già in DemoPage o da aggiungere) |
|---|---|
| **Dashboard** | Quella attuale: tesi, career tree, supervisori top 3, vulnerabilità, references, roadmap |
| **Socrate** | Chat con `MOCK_SOCRATE_MESSAGES` come storico + input live verso edge function in modalità chat |
| **Contatti** | Lista combinata supervisori + esperti (`MOCK_SUPERVISORS`, `MOCK_EXPERTS`) con email pre-generate |
| **Percorsi** | 3-4 percorsi tesi alternativi generati da topic/supervisori (mock statici tematicamente coerenti) |
| **Azioni** | Bozze email per ogni supervisore + task pendenti aggregate da `MOCK_TASKS` |
| **Futuro** | 3 scenari what-if sulla tesi (industria/PhD/startup) — mock statico |
| **Suggerimenti** | Aggregato di references, esperti, supervisori in formato "card suggerimento" |
| **Mercato** | Trend di settore basati su `MOCK_SECTORS` con grafico stats |
| **Memoria** | Timeline di "ricordi" sintetici (decisioni prese, milestones) |
| **Editor** | Anteprima statica di un capitolo tesi (Markdown mock) — sola lettura |
| **Profilo** | Marco Demo, ETH Zurich, skills, topic confermato — sola lettura |

## File da creare

```
src/pages/demo/
  DemoShell.tsx              ← layout + sidebar + routing interno
  DemoProvider.tsx           ← context con tutti i mock
  DemoDashboard.tsx          ← estratto da DemoPage step "dashboard"
  DemoSocrate.tsx            ← estratto da DemoPage step "socrate"
  DemoContacts.tsx
  DemoPath.tsx
  DemoActions.tsx
  DemoFutures.tsx
  DemoSuggestions.tsx
  DemoMarket.tsx
  DemoMemory.tsx
  DemoEditor.tsx
  DemoProfile.tsx
src/data/demo-mocks.ts       ← centralizzazione MOCK_* (estratti da DemoPage)
```

## File da modificare

- `src/App.tsx` — aggiungere `<Route path="/demo/*" element={<DemoShell />} />` mantenendo `/demo` (intro flow) come prima
- `src/pages/DemoPage.tsx` — alla fine dello step "dashboard" mostrare CTA "Esplora tutte le sezioni" → naviga a `/demo/dashboard` dentro `DemoShell`. Estrarre i MOCK_* in `src/data/demo-mocks.ts`.

## Ordine di implementazione

1. Estrarre i mock in `src/data/demo-mocks.ts` (no logic change)
2. Creare `DemoProvider` + `DemoShell` con sidebar e routing `/demo/*`
3. Portare dashboard e socrate dentro lo Shell (riuso componenti già in DemoPage)
4. Costruire le 9 pagine satellite come viste statiche/semi-statiche sui dati del provider
5. Collegare il CTA finale da `DemoPage` allo Shell
6. QA: cliccare ogni voce di sidebar, verificare che nessuna pagina sia vuota e che la chat Socrate continui a funzionare in streaming

## Cosa NON cambia

- `AppShell`, `ProtectedRoute`, `useApp`, hook `useAffinityScores`, `useSocrateSuggestions`, `useDatabaseFilter` → intatti
- Tutte le pagine reali (`ContactsPage`, `PathPage`, …) → intatte
- Edge function `socrate`, `demo-engine`, `dashboard-engine` → intatte
- Schema DB e RLS → intatti
