# AIcelerate

Online study platform with shared rooms, AI tutoring, and audio lecture transcription.

Originally codenamed LearnCraft AI.

## What it does

Students create a virtual study room, upload course material (PDF or audio), and invite teammates. Inside the room they get a set of tools:

- **Rooms** — Create a room, upload material, invite people. Audio files are transcribed with Whisper. Rooms with no activity for 30 days are archived.
- **Quiz** — Multiple choice and true/false questions generated from your material. Difficulty adjusts to your performance. When you answer wrong, the AI explains why.
- **Flashcards** — Spaced repetition (SM-2). The whole room shares progress on the same deck.
- **Deep Dive** — Chat with the AI about a topic. Threads stay private by default; you can share a thread with the room.
- **Mind Map** — Diagrams generated from your material (Mermaid).
- **Sprint** — Group Pomodoro timer. Everyone in the room sees the same countdown.
- **Notes** — Real-time shared notepad inside the room.

The room owner controls permissions, locks the AI tools when needed, and can save the setup as a template to reuse.

## Tech stack

**Web (`web/`)** React 19, TypeScript, Vite, Zustand, Framer Motion, Mermaid.js, Socket.io client.

**Backend (`backend/`)** Node, Express, TypeScript, MongoDB with Mongoose, Socket.io, Google Generative AI (Gemini).

**AI** Gemini for quiz generation, explanations, mind maps, and chat. Whisper for audio transcription.

**Infrastructure** Docker Compose for local dev.

## Run it locally

You need Node 20+, MongoDB (or use Docker), and a Gemini API key.

```bash
git clone https://github.com/sucreistaken/AIcelerate.git
cd AIcelerate

# Backend
cd backend
cp .env.example .env       # add GEMINI_API_KEY, MONGODB_URI
npm install
npm run dev                # API on :4000

# Frontend, in another terminal
cd ../web
npm install
npm run dev                # Web on :5173
```

Or run everything in containers:

```bash
docker compose up -d
```

## Status

Early stage. Design decisions for the product are written down in `DESIGN_SPEC.md` (around 100 questions answered: onboarding, room rules, tool behavior, permissions, exports, etc.). The app works; the UI is still being polished.

## License

MIT.
