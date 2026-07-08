[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E)](https://supabase.com/)
[![StartHack](https://img.shields.io/badge/StartHack-2026-FF6F00)](https://starthack.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

# Socrate — AI Thesis Companion

Conversational AI platform that guides university students through their entire thesis journey — from blank-page uncertainty to final submission.

Built at **StartHack 2026** (Studyond AG challenge) and evolved into a production-grade platform with 9 Supabase Edge Functions, voice interface, RAG knowledge engine, and a full profiling system.

## Concept

Socrate uses the **Socratic method**: instead of giving direct answers, it asks targeted questions that help students clarify and structure their thoughts. Every conversation enriches a persistent student profile that dynamically populates all sections of the platform — dashboard, suggestions, tasks, contacts, and thesis editor.

> **Socrate is not a feature of the app — it is the app itself.**
> Everything else is a structured visualization of what emerges from its conversations.

## Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| **State & Routing** | React Router v6 + TanStack React Query |
| **Backend** | 9 Supabase Edge Functions (Deno) |
| **Database** | PostgreSQL (Supabase) with pgvector |
| **AI** | Gemini Flash (primary) + OpenAI GPT (embedding) + Lovable AI Gateway |
| **Speech** | ElevenLabs Scribe (STT) + ElevenLabs TTS |
| **Auth** | Supabase Auth (email/password + magic link) |
| **Testing** | Vitest + Playwright |
| **Animation** | Framer Motion + embla-carousel |

## Features

| Feature | Description |
|---|---|
| **Conversational Hub** | AI mentor with Socratic dialogue, streaming responses, markdown rendering |
| **Voice Mode** | Full-duplex voice conversation: ElevenLabs Scribe STT → AI → TTS with emotional prosody |
| **Background Extraction** | Every 3 exchanges, silently extracts memories + suggestions from conversation |
| **RAG Knowledge Engine** | OpenAI `text-embedding-3-small` → pgvector → context-aware retrieval for Socrate |
| **Report Generator** | Structured session reports that populate dashboard, suggestions, and tasks |
| **Task Management** | AI-generated personalized thesis tasks with priority, estimated time, section mapping |
| **People Matching** | AI-powered professor/expert matching based on thesis topic + student profile |
| **Vulnerability Analysis** | Critical examination of thesis logic, methodology, originality, and argument quality |
| **Reference Suggestions** | Academic reference recommendations with DOI/arXiv links |
| **Deep Profiling** | Multi-source profile fusion: reasoning style, strengths, weaknesses, career fit |
| **Thesis Editor** | Real-time collaborative LaTeX-like editor with auto-save |
| **Progress Dashboard** | Visual thesis progress bar, section completion tracking, estimated days remaining |
| **People Discovery** | Browse professors, companies, and experts relevant to your thesis domain |
| **Demo Mode** | Full exploration sandbox with mock data — no login required |

## Architecture

### Frontend Routes

| Route | Page | Description |
|---|---|---|
| `/login` | `AuthPage` | Auth with email/password or magic link |
| `/` | `SocratePage` | Main conversational hub (the core of the app) |
| `/dashboard` | `DashboardPage` | Progress overview, stats, activity chart |
| `/profile` | `ProfilePage` | Intellectual profile, strengths, weaknesses, interests |
| `/suggestions` | `SuggestionsPage` | AI-generated suggestions (companies, books, professors) |
| `/contacts` | `ContactsPage` | Professor and expert discovery with affinity scores |
| `/actions` | `ActionsPage` | Generated tasks and action items |
| `/memory` | `MemoryPage` | Conversation memory browser |
| `/editor` | `EditorPage` | Thesis document editor |
| `/path` | `PathPage` | Thesis roadmap visualization |
| `/market` | `MarketPage` | Ideas marketplace |
| `/futures` | `FuturesPage` | Career trajectory exploration |
| `/demo` | `DemoPage` | Demo landing page |
| `/demo/explore/*` | `DemoShell` | Full demo sandbox with mock data |

### App Flow

```
User → SocratePage (chat or voice)
         │
         ├── Every 3 exchanges ──► Background extraction
         │                           ├── extract_memory  → memory_entries table
         │                           ├── extract_suggestions → suggestions + profile
         │                           └── event logging → session_events table
         │
         ├── On thesis ready ──► ThesisConfirmDialog
         │                           └── updateProfile + journey_state
         │
         ├── Generate Report ──► Full extraction → populates all sections
         │
         └── "Dashboard" button ──► Progress dashboard with all sections
```

### Data Flow — Chat

```
1. User types message → POST to /functions/v1/socrate
2. Edge Function builds system prompt with:
   - studentContext (profile, degree, university, skills, thesis_topic)
   - latexContent (current thesis document)
   - memoryEntries (last 15 memory items)
   - recentMessages (last 20 exchanges)
3. LLM (Gemini Flash via Lovable gateway) streams response back
4. Response saved to socrate_messages table
5. Every 3 exchanges: silent background extraction runs
```

### Edge Functions

| Function | Purpose | Key Modes |
|---|---|---|
| **socrate** | Main chat + all extraction modes | `chat`, `extract_memory`, `extract_suggestions`, `extract_vulnerabilities`, `suggest_references`, `match_people`, `generate_tasks`, `deep_profile`, `get_profile`, `get_session_stats`, `validate_task` |
| **task-engine** | Independent task generation | `generate`, `complete` |
| **dashboard-engine** | Dashboard stats computation | `stats`, `progress` |
| **career-engine** | Career path recommendations | `analyze`, `suggest` |
| **rag-engine** | Document chunking + embedding + search | `index`, `search`, `delete` |
| **auto-sync-docs** | Scheduled document sync | Cron-triggered |
| **elevenlabs-tts** | Text-to-speech generation | `synthesize` |
| **elevenlabs-scribe-token** | STT auth token generation | `token` |
| **fetch-google-doc** | Google Docs import | Any public Google Doc URL |
| **demo-engine** | Mock data generation for demo mode | `generate` |

### Database Schema (18 migrations)

**Core tables:**
- `profiles` — User profile (name, degree, university, skills, thesis_topic, journey_state)
- `student_profiles` — Intellectual profile (reasoning_style, strengths, weaknesses, deep_interests, research_maturity, thesis_quality_score, sections_progress, overall_completion)
- `socrate_messages` — Chat history (user_id, role, content, created_at)
- `memory_entries` — Extracted memories (type, title, detail)
- `socrate_suggestions` — Generated suggestions (category, title, detail, reason)
- `socrate_tasks` — Generated tasks (title, description, section, priority, estimated_minutes, status)
- `affinity_scores` — People matching (entity_type, entity_id, entity_name, score, reasoning, matched_traits)
- `vulnerabilities` — Thesis vulnerability analysis (type, title, description, severity)
- `session_events` — Activity log (event_type, event_data, section)
- `profile_snapshots` — Versioned profile history

## The Socrate Prompt System

Socrate operates through distinct prompt templates per mode, each with its own system prompt, tool definitions, and temperature:

### Chat Mode
System prompt builds student context + memory context. Response uses OpenAI-compatible streaming (SSE). Hidden markers `<!-- THESIS_TITLE: ... -->` and `<!-- THESIS_READY -->` signal thesis readiness.

### Memory Extraction
Tool-call forced: `save_memory_entries`. Categories: exploration, decision, contact, action, feedback, profile. Runs silently every 3 exchanges.

### Suggestion Engine
Dual function call: `save_suggestions` (9 categories from company to next_step) + `update_profile` (reasoning_style, strengths, weaknesses, deep_interests, research_maturity).

### Vulnerability Analysis
Forced tool call `report_vulnerabilities`. Categories: cliche, logic_gap, methodology_flaw, superficiality, originality_deficit, weak_argument, source_bias, structural_incoherence. Direct, aggressive critique tone.

### Reference Suggestions
Forced tool call `suggest_references`. Categories: foundational, methodology, recent, contrarian. Returns real, verifiable academic references with DOI/Scholar links.

### People Matching
Forced tool call `save_matches`. Uses LLM knowledge base to suggest real professors and experts — no external database. Score range 0-100 with specific reasoning.

### Task Generation
Forced tool call `assign_tasks`. Tasks have section, priority, and estimated_minutes. Only generates NEW tasks (avoids duplicating existing ones).

### Deep Profile
Forced tool call `update_deep_profile`. Analyzes ALL data sources: profile, student_profile, memories, messages, suggestions, tasks, events, affinities, latex content. Outputs profile_summary and recommended_focus_areas.

## Getting Started

```bash
# Clone
git clone https://github.com/nutriandrea/thesis-companion.git
cd thesis-companion

# Install dependencies
npm install

# Environment
cp .env.example .env
# Fill in: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

### Supabase Setup

```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Apply migrations
npx supabase db push

# Deploy Edge Functions
npx supabase functions deploy socrate
npx supabase functions deploy rag-engine
npx supabase functions deploy task-engine
# ... etc for all 10 functions
```

### Required Environment Variables

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
LOVABLE_API_KEY=sk-...        # For AI gateway
OPENAI_API_KEY=sk-...          # For embeddings (RAG)
ELEVENLABS_API_KEY=...         # For TTS/STT
```

## Demo Mode

No hardware or Supabase project needed:

```bash
npm run dev
# Navigate to /demo/explore/socrate
```

The demo shell (`DemoShell`) provides complete mock data — fake messages, memory, suggestions, tasks, and profiles — so you can explore every feature without authentication.

## Testing

```bash
# Unit tests
npm test

# E2E (requires Supabase linked)
npx playwright test
```

## Project Structure

```
src/
├── pages/            # 15 page components
│   ├── demo/         # 11 demo page variants
│   ├── SocratePage   # Main chat interface (488 lines)
│   ├── DashboardPage # Progress & stats
│   ├── EditorPage    # Thesis document editor
│   └── ...
├── components/
│   ├── ui/           # 40+ shadcn/ui components
│   ├── voice/        # VoiceConversation, VoiceWaveform
│   ├── layout/       # AppShell, AppSidebar, AppLayout
│   ├── journey/      # OnboardingFlow, SocrateIntro
│   └── shared/       # SocrateCoin, StatCard, LanguageSwitch
├── contexts/         # AppContext, LanguageContext
├── hooks/            # Custom hooks (useSocrateTasks, useDatabaseFilter)
├── data/             # Mock data JSON files
├── integrations/     # Supabase client + types
└── lib/              # Utilities

supabase/
├── functions/        # 10 Edge Functions
└── migrations/       # 18 SQL migrations
```

## License

MIT — built at StartHack 2026 for the Studyond AG challenge.
