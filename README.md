# Socrate — AI Thesis Companion

Conversational AI hub that guides university students through their entire thesis journey — from topic exploration to final submission.

Built at the **StartHack 2026** hackathon (Studyond AG challenge) and evolved into a full platform.

## Concept

Socrate uses a **Socratic method** approach: instead of giving direct answers, it asks targeted questions to help students clarify and structure their thoughts. Every conversation enriches the student's profile and dynamically populates all sections of the platform.

> **Socrate is not a feature of the app — it is the app itself.**  
> Everything else is a structured visualization of what emerges from its conversations.

## Key Features

| Feature | Description |
|---|---|
| **Conversational Hub** | AI mentor that explores ideas, challenges reasoning, and guides topic selection |
| **Voice Mode** | Speech-to-text (ElevenLabs Scribe) + TTS with emotional prosody modulation |
| **Background Extraction** | Every 3 exchanges, automatically extracts memories + suggestions silently |
| **Thesis Confirmation** | Hidden markers `[[TESI_PRONTA]]` trigger thesis title confirmation dialog |
| **LLM Knowledge Engine** | Generates real professor/company/book recommendations from Gemini/GPT knowledge (no static DB) |
| **Real-time Sync** | All sections (Contacts, Paths, Market, Future, Editor) update automatically |
| **Multi-language** | Auto-detects student language from text or voice input |
| **Streaming Responses** | Real-time markdown-rendered chat with typing indicator |

## Architecture

```
Frontend (React + Vite + shadcn/ui)
  ├── SocratePage (text/voice chat)
  ├── VoiceConversation (ElevenLabs TTS + Scribe)
  ├── ThesisConfirmDialog
  └── Dashboard sections (Contatti, Percorsi, Mercato, Futuro, Editor)

Backend (Supabase Edge Functions)
  ├── socrate/index.ts
  │   ├── chat          — streaming conversation
  │   ├── extract_memory     — background memory extraction
  │   ├── extract_suggestions — topic/supervisor/company suggestions
  │   ├── report        — session summary
  │   ├── analyze_full  — profile rebuild + affinity scores
  │   └── match_people  — real professor/company matching
  └── elevenlabs-scribe-token / elevenlabs-tts

Database (Supabase PostgreSQL)
  ├── student_profiles
  ├── socrate_messages
  ├── memory_entries
  ├── socrate_suggestions
  └── affinity_scores
```

## Tech Stack

**Frontend:** React 18 · TypeScript · Vite · shadcn/ui · Tailwind CSS · Framer Motion · React Router · TanStack Query · Recharts  
**Backend:** Supabase Edge Functions (Deno) · PostgreSQL  
**AI:** Gemini · GPT · ElevenLabs (Scribe + TTS)

## Quick Start

```bash
npm install
cp .env.example .env   # configure Supabase + Gemini/GPT keys
npm run dev
```

## Project Structure

```
src/
  pages/
    SocratePage.tsx      # Main conversational interface
  components/            # Reusable UI components (shadcn)
  contexts/             # React contexts for global state
  hooks/                # Custom hooks
  lib/                  # Utilities, API clients
  integrations/         # External service integrations
  types/                # TypeScript types
supabase/
  functions/
    socrate/index.ts    # Edge function with 6 operating modes
```

## Environment

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
```
