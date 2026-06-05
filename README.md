# AIcelerate

**Real-time collaborative study platform with AI transcription and adaptive learning tools.**

A virtual study-room workspace where students learn together (or solo) with AI-powered quizzes, flashcards, mind maps, deep-dive chat, and shared notes. Built around the metaphor of a study room — create one, drop in your material (PDF or audio), invite teammates, and the room becomes a shared brain.

> Originally codenamed **LearnCraft AI**.

---

## What it does

| Surface | What you do |
|---|---|
| **Rooms** | Create a virtual study room, upload course material (PDF / audio with Whisper transcription), invite up to N teammates. Room sessions persist; 30+ day idle rooms auto-archive. |
| **Quiz** | Adaptive multiple-choice + true/false. Difficulty climbs as you answer correctly. Wrong answers → Gemini writes a detailed explanation, not just "the answer is X". |
| **Flashcards** | SM-2 spaced repetition, shared progress across the room. AI generates explanatory visuals for cards. |
| **Deep Dive** | Subject-grounded AI chat (Gemini). Threaded by topic. Default answers are private; one click promotes a thread to the whole room. |
| **Mind Maps** | Auto-generated Mermaid diagrams that break complex topics into branches you can navigate. |
| **Sprint (Pomodoro)** | Group-synced timer — when one person starts a focus block, everyone in the room sees the same countdown. |
| **Notes** | Real-time shared notepad inside each room, Google-Docs-style sync via Socket.io. |

Members get role-based permissions (owner edits AI content + locks the room; members watch when locked). All tools export to PDF / CSV / image. Last 5 versions of every tool's state are kept for rollback.

## Tech Stack

**Frontend (`web/`)** React 19 · TypeScript · Vite · Zustand · Framer Motion · Mermaid.js · Socket.io client

**Backend (`backend/`)** Node.js · Express · TypeScript · MongoDB + Mongoose · Socket.io · Google Generative AI (Gemini)

**AI services** Gemini for chat/explanations/quiz generation/visual prompts · Whisper for audio transcription (Python service)

**Infra** Docker Compose for local stack (api, web, mongo)

## Quick start

Requirements: Node 20+, MongoDB (or use the bundled docker compose), a Gemini API key.

```bash
git clone https://github.com/sucreistaken/AIcelerate.git
cd AIcelerate

# Backend
cd backend
cp .env.example .env   # fill GEMINI_API_KEY, MONGODB_URI
npm install
npm run dev            # api :4000

# Frontend (separate terminal)
cd ../web
npm install
npm run dev            # web :5173
```

Or boot the full stack with Docker:

```bash
docker compose up -d
```

## Status

Early product. Design spec (`DESIGN_SPEC.md`) documents 100+ resolved UX questions across onboarding, room management, tools, permissions, exports, and offline behavior. Build is functional; UI polish in progress.

## License

MIT.
