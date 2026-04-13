import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketServer } from "socket.io";

import { env } from "./config/env";
import routes from "./routes/index";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

import { setupCollabNamespace } from "./socketHandler";
import { errorHandler } from "./middleware/errorHandler";
import { requestContext } from "./middleware/requestContext";
import { httpLogger } from "./middleware/httpLogger";
import { startJobProcessor, stopJobProcessor } from "./queues/jobProcessor";
import { connectDB } from "./config/database";
import { connectRedis, disconnectRedis, redisPub, redisSub, isRedisReady } from "./config/redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { migrateOrphanLessons } from "./controllers/courseController";
import { roleRepo } from "./repositories/roleRepo";
import { flushAllCaches, initAllCaches } from "./cache";
import { logger } from "./utils/logger";

// ── Express app ────────────────────────────────────────────────────────────────
const app = express();
const ALLOWED_ORIGINS = env.FRONTEND_URL.split(",").map((o) => o.trim());

// Security headers (XSS, clickjacking, MIME sniffing, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for API-only server (no HTML served)
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources for frontend
}));

// Gzip/Brotli response compression
app.use(compression({
  threshold: 1024, // Skip compression for responses < 1KB
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
      else cb(new Error("CORS not allowed"));
    },
    credentials: true,
  })
);

// Body parsing + cookies
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Request context (requestId + child logger)
app.use(requestContext);

// Structured HTTP logging
app.use(httpLogger);

// Disable X-Powered-By (redundant with helmet but explicit)
app.disable("x-powered-by");

// ── API Documentation ─────────────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "AIcelerate API Documentation",
}));
app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use(routes);

// ── Error handler (must be last middleware) ────────────────────────────────────
app.use(errorHandler);

// Export app for E2E testing (supertest)
export { app };

// ── HTTP server + Socket.IO ────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, credentials: true },
  pingTimeout: 20000,
  pingInterval: 25000,
});

app.set("io", io);

// ── Socket.IO: /collab namespace ───────────────────────────────────────────────
try {
  setupCollabNamespace(io);
} catch (err) {
  logger.error("Failed to setup collab namespace:", err);
}

// ── Start job processor ────────────────────────────────────────────────────────
try {
  startJobProcessor();
} catch (err) {
  logger.error("Failed to start job processor:", err);
}

// ── Run orphan lesson migration ────────────────────────────────────────────────
try {
  migrateOrphanLessons();
} catch (err) {
  logger.error("Failed to migrate orphan lessons:", err);
}

// ── Start server (wait for DB + Redis connection first) ───────────────────────
(async () => {
  await connectDB();
  await connectRedis();

  // Apply Redis adapter for Socket.IO if Redis connected successfully
  if (isRedisReady()) {
    io.adapter(createAdapter(redisPub, redisSub));
    logger.info("Socket.IO Redis adapter applied");
  } else {
    logger.info("Socket.IO using in-memory adapter (Redis unavailable)");
  }

  await roleRepo.seedDefaults();
  await initAllCaches();
  httpServer.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`Backend running at http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });
})();

// ── HTTP server error handler ──────────────────────────────────────────────────
httpServer.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.error(`Port ${env.PORT} is already in use. Kill the other process or change PORT in .env`);
  } else {
    logger.error("HTTP server error:", err);
  }
  process.exit(1);
});

// ── Global error handlers ──────────────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception:", err);
  process.exit(1);
});

// ── Graceful shutdown ──────────────────────────────────────────────────────────
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`${signal} received — starting graceful shutdown…`);

  // 1. Stop the job processor interval
  stopJobProcessor();

  // 2. Stop accepting new connections
  httpServer.close(() => {
    logger.info("HTTP server closed");
  });

  // 3. Close Socket.IO (disconnect all clients gracefully)
  io.close(() => {
    logger.info("Socket.IO closed");
  });

  // 4. Wait for in-flight requests (max 10s)
  const forceTimeout = setTimeout(() => {
    logger.warn("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
  forceTimeout.unref();

  // 5. Flush all data caches to disk before exit
  try {
    await flushAllCaches();
    logger.info("Data caches flushed to disk");
  } catch (err) {
    logger.error("Failed to flush caches:", err);
  }

  // 6. Close Redis connections
  try {
    await disconnectRedis();
  } catch {
    // Already closed or never connected
  }

  // 7. Close DB connection if open
  try {
    const mongoose = await import("mongoose");
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    }
  } catch {
    // DB not connected, skip
  }

  logger.info("Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
