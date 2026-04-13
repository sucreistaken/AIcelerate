import Redis, { type RedisOptions } from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

/**
 * Shared Redis client for rate limiting, lockout, caching.
 * Dedicated pub/sub pair for Socket.IO adapter.
 *
 * Fail-open: when Redis is unavailable callers fall back to in-memory.
 */

// Command client: fail-fast, no offline queueing (rate limiting wants instant pass/fail)
const CMD_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  lazyConnect: true,
  enableOfflineQueue: false,
  connectTimeout: 5000,
  commandTimeout: 2000,
  retryStrategy(times: number) {
    if (times > 4) return null;
    return Math.min(times * 200, 2000);
  },
};

// Pub/sub clients: tolerate brief disconnects (Socket.IO adapter needs buffering)
const PUBSUB_OPTIONS: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
  enableOfflineQueue: true,
  connectTimeout: 5000,
  retryStrategy(times: number) {
    if (times > 10) return null;
    return Math.min(times * 200, 5000);
  },
};

// ── Shared command client ─────────────────────────────────────────────────────
export const redis = new Redis(env.REDIS_URL, CMD_OPTIONS);

redis.on("error", (err) => logger.warn({ err: err.message }, "Redis command client error"));
redis.on("connect", () => logger.info("Redis command client connected"));
redis.on("ready", () => logger.info("Redis command client ready"));

// ── Pub/Sub pair for Socket.IO adapter ────────────────────────────────────────
export const redisPub = new Redis(env.REDIS_URL, PUBSUB_OPTIONS);
export const redisSub = new Redis(env.REDIS_URL, PUBSUB_OPTIONS);

redisPub.on("error", (err) => logger.warn({ err: err.message }, "Redis pub client error"));
redisSub.on("error", (err) => logger.warn({ err: err.message }, "Redis sub client error"));

// ── Health check ──────────────────────────────────────────────────────────────
let _redisReady = false;

redis.on("ready", () => { _redisReady = true; });
redis.on("close", () => { _redisReady = false; });
redis.on("end", () => { _redisReady = false; });

export function isRedisReady(): boolean {
  return _redisReady;
}

// ── Connect all clients ───────────────────────────────────────────────────────
export async function connectRedis(): Promise<void> {
  try {
    await Promise.all([redis.connect(), redisPub.connect(), redisSub.connect()]);
    logger.info("All Redis clients connected");
  } catch (err) {
    logger.warn({ err: (err as Error).message }, "Redis connection failed — running without Redis (in-memory fallback)");
  }
}

// ── Graceful shutdown ─────────────────────────────────────────────────────────
export async function disconnectRedis(): Promise<void> {
  try {
    await Promise.all([redis.quit(), redisPub.quit(), redisSub.quit()]);
    logger.info("Redis connections closed");
  } catch {
    // Already closed or never connected
  }
}
