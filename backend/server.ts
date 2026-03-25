import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import http from "http";
import { Server as SocketServer } from "socket.io";

import { env } from "./config/env";
import routes from "./routes/index";

import { setupCollabNamespace } from "./socketHandler";
import { errorHandler } from "./middleware/errorHandler";
import { startJobProcessor } from "./queues/jobProcessor";
import { connectDB } from "./config/database";
import { migrateOrphanLessons } from "./controllers/courseController";

// ---- Express app
const app = express();
const ALLOWED_ORIGINS = env.FRONTEND_URL.split(",").map((o) => o.trim());
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
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
});

app.set("io", io);

// ---- Socket.IO: /collab namespace
try {
  setupCollabNamespace(io);
} catch (err) {
  console.error("Failed to setup collab namespace:", err);
}

// ---- Start job processor
try {
  startJobProcessor();
} catch (err) {
  console.error("Failed to start job processor:", err);
}

// ---- Run orphan lesson migration
try {
  migrateOrphanLessons();
} catch (err) {
  console.error("Failed to migrate orphan lessons:", err);
}

// ---- Connect to MongoDB (optional) then start server
connectDB()
  .catch((err) => console.warn("MongoDB connection failed (continuing without DB):", err.message))
  .finally(() => {
    httpServer.listen(env.PORT, "0.0.0.0", () => {
      console.log(`Backend running at http://localhost:${env.PORT}`);
    });
  });

// ---- HTTP server error handler
httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use. Kill the other process or change PORT in .env`);
  } else {
    console.error("HTTP server error:", err);
  }
  process.exit(1);
});

// ---- Global error handlers
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
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
