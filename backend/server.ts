import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketServer } from "socket.io";

import routes from "./routes/index";
// DISABLED: import { setupSocketHandler } from "./socketHandler";
import { setupCollabNamespace } from "./socketHandler-v2";
import { errorHandler } from "./middleware/errorHandler";
import { startJobProcessor } from "./queues/jobProcessor";
import { connectDB } from "./config/database";

// ---- ENV check
const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY is missing. Please add it to backend/.env.");
  process.exit(1);
}

// ---- Express app
const app = express();
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
      else cb(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// ---- Routes (all delegated to ./routes/)
app.use(routes);

// ---- Error handler (must be last middleware)
app.use(errorHandler);

// ---- HTTP server + Socket.IO
const PORT = Number(process.env.PORT || 4000);
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

app.set("io", io);

// DISABLED: Socket.IO legacy rooms (v1)
// setupSocketHandler(io);

// ---- Socket.IO V2: /collab namespace
setupCollabNamespace(io);

// ---- Start job processor
startJobProcessor();

// ---- Connect to MongoDB (optional) then start server
connectDB().finally(() => {
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running at http://localhost:${PORT}`);
  });
});

// ---- Graceful shutdown
function shutdown(signal: string) {
  console.log(`\n${signal} received – shutting down…`);
  io.close();
  httpServer.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
