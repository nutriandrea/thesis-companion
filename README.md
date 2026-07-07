[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6)]
[![React](https://img.shields.io/badge/React-19-61DAFB)]
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E)]
[![StartHack](https://img.shields.io/badge/StartHack-2026-FF6F00)]
[![License](https://img.shields.io/badge/License-MIT-yellow)]

# Socrate — AI Thesis Companion

Conversational AI hub that guides university students through their entire thesis journey — from topic exploration to final submission.

Built at the **StartHack 2026** hackathon (Studyond AG challenge) and evolved into a full platform.

## Concept

Socrate uses a **Socratic method** approach: instead of giving direct answers, it asks targeted questions to help students clarify and structure their thoughts. Every conversation enriches the student profile and dynamically populates all sections of the platform.

> **Socrate is not a feature of the app — it is the app itself.**
> Everything else is a structured visualization of what emerges from its conversations.

## Key Features

| Feature | Description |
|---|---|
| **Conversational Hub** | AI mentor that explores ideas, challenges reasoning, and guides topic selection |
| **Voice Mode** | Speech-to-text (ElevenLabs Scribe) + TTS with emotional prosody modulation |
| **Background Extraction** | Every 3 exchanges, automatically extracts memories + suggestions silently |
| **LLM Knowledge Engine** | Dual LLM (Gemini/GPT): real-time RAG over student context, no static DB |
| **Report Generator** | Structured thesis documents from conversation data |
| **People Matching** | Connect students with professors based on research interests |

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Backend | Supabase Edge Functions (6 modes) |
| Database | PostgreSQL (Supabase) |
| AI | Gemini / GPT LLMs |
| Speech | ElevenLabs Scribe (STT) + TTS |

## Architecture

```
User → SocratePage.tsx
         ├── VoiceConversation (voice mode)
         ├── Streaming text (chat mode)
         └── Auto-refresh every 3 exchanges
               ├── extract_memory → memories table
               └── extract_suggestions → suggestions table
```
