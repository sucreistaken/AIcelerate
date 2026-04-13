# AIcelerate Backend

AI-powered learning platform backend.

## Tech Stack
- **Runtime:** Node.js + TypeScript (strict mode)
- **Framework:** Express 5
- **Database:** MongoDB (Mongoose 9)
- **Real-time:** Socket.IO 4.8
- **AI:** Google Gemini (circuit breaker + fallback)
- **Validation:** Zod
- **Auth:** JWT + Refresh Token Rotation
- **Logging:** Pino (Google Cloud Logging compatible)
- **Docs:** Swagger/OpenAPI at `/api-docs`

## Architecture
```
controllers/ → services/ → repositories/ → models/
middleware/  → auth, validation, rate limiting, RBAC
events/      → typed event bus
queues/      → background job processing
sockets/     → Socket.IO handlers (namespace: /collab)
cache/       → TTL + write-through caching
```

## Quick Start
```bash
cp .env.example .env
# Set GEMINI_API_KEY and MONGODB_URI
npm install
npm run dev
```

## Docker
```bash
docker compose up
```

## API Documentation
Available at `http://localhost:4000/api-docs` when server is running.

## Environment Variables
See `.env.example` for all available configuration options.

## Testing
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```
