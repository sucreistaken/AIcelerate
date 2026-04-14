import { vi } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted runs at the same hoisting level as vi.mock, BEFORE any other
// top-level code. This ensures env vars are set before config/env.ts is
// resolved by the mock factory graph.
// ---------------------------------------------------------------------------
vi.hoisted(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-api-key";
  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "e2e-test-secret-key-32-chars-long!!";
  process.env.MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017/test";
  process.env.NODE_ENV = "test";
});

// ---------------------------------------------------------------------------
// Mock database layer — no real MongoDB needed
// ---------------------------------------------------------------------------
vi.mock("../../config/database", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  const mockSession = {
    withTransaction: vi.fn(async (fn: () => Promise<void>) => fn()),
    endSession: vi.fn(),
  };
  return {
    ...(actual as any),
    default: {
      ...(actual as any).default,
      connection: { readyState: 1 },
      connect: vi.fn(),
      startSession: vi.fn(() => Promise.resolve(mockSession)),
    },
  };
});

// ---------------------------------------------------------------------------
// Mock file I/O — prevents reading/writing to the data directory
// ---------------------------------------------------------------------------
vi.mock("../../utils/fileHandler", () => ({
  readJSON: vi.fn().mockReturnValue(null),
  writeJSON: vi.fn(),
  ensureDir: vi.fn(),
  ensureDataFiles: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mock cache layer — returns empty data by default
// ---------------------------------------------------------------------------
vi.mock("../../cache", () => {
  const makeFakeDataCache = () => ({
    get: vi.fn().mockReturnValue(null),
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    setAll: vi.fn(),
    delete: vi.fn().mockReturnValue(false),
    flush: vi.fn().mockResolvedValue(undefined),
    addIndex: vi.fn().mockReturnThis(),
    getByIndex: vi.fn().mockReturnValue([]),
    find: vi.fn().mockReturnValue(null),
    filter: vi.fn().mockReturnValue([]),
  });

  const makeFakeComputedCache = () => ({
    get: vi.fn().mockReturnValue(null),
    getOrCompute: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    invalidate: vi.fn(),
    clear: vi.fn(),
  });

  return {
    lessonCache: makeFakeDataCache(),
    courseCache: makeFakeDataCache(),
    flashcardCache: makeFakeDataCache(),
    weaknessCache: makeFakeDataCache(),
    courseProgressCache: makeFakeComputedCache(),
    knowledgeIndexCache: makeFakeComputedCache(),
    weaknessSummaryCache: makeFakeComputedCache(),
    connectionsCache: makeFakeComputedCache(),
    invalidateLessonCaches: vi.fn(),
    invalidateFlashcardCaches: vi.fn(),
    flushAllCaches: vi.fn().mockResolvedValue(undefined),
    initAllCaches: vi.fn().mockResolvedValue(undefined),
  };
});

// ---------------------------------------------------------------------------
// Mock Mongoose models used by authService — prevent real DB calls
// ---------------------------------------------------------------------------
vi.mock("../../models/User", () => ({
  User: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    exists: vi.fn(),
  },
}));

vi.mock("../../models/RefreshToken", () => ({
  RefreshToken: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("../../models/Room", () => {
  function chainable(val: unknown) {
    const obj: Record<string, unknown> = {};
    obj.lean = vi.fn().mockReturnValue(obj);
    obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(val).then(resolve);
    return obj;
  }
  return {
    Room: {
      find: vi.fn().mockReturnValue(chainable([])),
      findByIdAndUpdate: vi.fn(),
      findByIdAndDelete: vi.fn(),
      updateMany: vi.fn(),
      bulkWrite: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
});

vi.mock("../../models/Channel", () => ({
  Channel: { deleteMany: vi.fn() },
}));

vi.mock("../../models/Message", () => ({
  Message: { deleteMany: vi.fn(), updateMany: vi.fn() },
}));

vi.mock("../../models/Notification", () => ({
  Notification: { deleteMany: vi.fn() },
}));

vi.mock("../../models/AppNotification", () => ({
  AppNotificationModel: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
      sort: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue(null),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 0 }),
    countDocuments: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ _id: "notif-1", type: "test" }),
  },
}));

vi.mock("../../models/Xp", () => ({
  XpModel: {
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    findOneAndUpdate: vi.fn().mockResolvedValue({ totalXp: 0, streakDays: 0, history: [] }),
  },
}));

// ---------------------------------------------------------------------------
// Mock models used by lessonControllers (GlobalMemory), shareService (Share),
// schedulerService (Schedule), and sprintService (Sprint)
// ---------------------------------------------------------------------------
vi.mock("../../models/GlobalMemory", () => ({
  GlobalMemoryModel: {
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../models/Share", () => ({
  ShareModel: {
    deleteMany: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(null),
    findByIdAndUpdate: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findByIdAndDelete: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../models/Schedule", () => ({
  ScheduleModel: {
    findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    findOneAndUpdate: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../models/Sprint", () => ({
  SprintModel: {
    findOneAndUpdate: vi.fn().mockResolvedValue({
      studyDurationMin: 25,
      breakDurationMin: 5,
      longBreakDurationMin: 15,
      sessionsUntilLongBreak: 4,
    }),
  },
}));

// Mock sprintController — used via require("./sprintController") in schedulerController
vi.mock("../../controllers/sprintController", () => ({
  getSettings: vi.fn().mockResolvedValue({
    studyDurationMin: 25,
    breakDurationMin: 5,
    longBreakDurationMin: 15,
    sessionsUntilLongBreak: 4,
  }),
}));

// Also mock the sprint service + model it depends on
vi.mock("../../services/sprintService", () => ({
  sprintService: {
    getSettings: vi.fn().mockResolvedValue({
      studyDurationMin: 25,
      breakDurationMin: 5,
      longBreakDurationMin: 15,
      sessionsUntilLongBreak: 4,
    }),
  },
}));

// ---------------------------------------------------------------------------
// Disable rate limiter — tests hit the same endpoints many times
// ---------------------------------------------------------------------------
vi.mock("../../middleware/rateLimiter", () => ({
  rateLimiter: () => (_req: any, _res: any, next: any) => next(),
  checkSocketRateLimit: () => true,
}));

// ---------------------------------------------------------------------------
// Imports (AFTER all mocks are declared)
// ---------------------------------------------------------------------------
import supertest from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import { requestContext } from "../../middleware/requestContext";
import { errorHandler } from "../../middleware/errorHandler";
import routes from "../../routes/index";

/**
 * Creates a test Express app with all middleware but without DB/Socket.IO.
 */
export function createTestApp() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(requestContext);
  app.use(routes);
  app.use(errorHandler);
  return app;
}

/**
 * Creates a supertest agent bound to the test app.
 */
export function createAgent() {
  return supertest(createTestApp());
}

/**
 * Generates a valid Bearer token string for testing protected routes.
 * Uses the same JWT secret that the auth middleware will verify against.
 */
export function getAuthHeader(userId = "test-user-id"): string {
  const jwt = require("jsonwebtoken");
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });
  return `Bearer ${token}`;
}
