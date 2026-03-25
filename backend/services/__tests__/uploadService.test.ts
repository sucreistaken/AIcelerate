import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// Mock env
vi.mock("../../config/env", () => ({
  env: { GEMINI_API_KEY: "test-key", PYTHON_BIN: "python3" },
}));

// Mock logger to suppress output during tests
vi.mock("../../utils/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock lessonControllers
const mockGetLesson = vi.fn();
const mockUpsertLesson = vi.fn();
vi.mock("../../controllers/lessonControllers", () => ({
  getLesson: (...args: any[]) => mockGetLesson(...args),
  upsertLesson: (...args: any[]) => mockUpsertLesson(...args),
}));

// Mock idGenerator
let uidCounter = 0;
vi.mock("../../utils/idGenerator", () => ({
  uid: vi.fn(() => `job-${++uidCounter}`),
}));

// Mock errorHandler
vi.mock("../../middleware/errorHandler", () => ({
  AppError: class AppError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.statusCode = statusCode;
      this.name = "AppError";
    }
  },
}));

// Mock aiService
const mockGenerateContent = vi.fn();
vi.mock("../aiService", () => ({
  getModel: vi.fn(() => ({
    generateContent: mockGenerateContent,
  })),
}));

// Track spawned processes for control
let spawnCallbacks: Record<string, (...args: any[]) => void> = {};
let mockProc: any;

vi.mock("child_process", () => ({
  spawn: vi.fn(() => {
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    mockProc = {
      stdout,
      stderr,
      on: vi.fn((event: string, cb: (...args: any[]) => void) => {
        spawnCallbacks[event] = cb;
      }),
      kill: vi.fn(),
    };
    return mockProc;
  }),
}));

// Mock readline
vi.mock("readline", () => ({
  default: {
    createInterface: vi.fn(({ input }: any) => {
      const emitter = new EventEmitter();
      // Forward stdout data lines to readline
      input.on("data", (chunk: string) => {
        const lines = chunk.toString().split("\n").filter(Boolean);
        for (const line of lines) {
          emitter.emit("line", line);
        }
      });
      return emitter;
    }),
  },
}));

// Mock fs - only mock the functions we need
const mockExistsSync = vi.fn(() => true);
const mockUnlinkSync = vi.fn();
const mockRenameSync = vi.fn();
const mockReadFileSync = vi.fn(() => Buffer.from("fake-image-data"));
const mockWriteFileSync = vi.fn();
const mockMkdirSync = vi.fn();

vi.mock("fs", () => ({
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
    renameSync: (...args: any[]) => mockRenameSync(...args),
    readFileSync: (...args: any[]) => mockReadFileSync(...args),
    writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
    mkdirSync: (...args: any[]) => mockMkdirSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
  renameSync: (...args: any[]) => mockRenameSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  mkdirSync: (...args: any[]) => mockMkdirSync(...args),
}));

import { startTranscriptionJob, getJob } from "../uploadService";

describe("uploadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    spawnCallbacks = {};
    mockProc = null;
    uidCounter = 0;
    mockGetLesson.mockReturnValue(null);
    mockUpsertLesson.mockReturnValue({});
  });

  describe("startTranscriptionJob", () => {
    it("returns a job ID", () => {
      const file = { originalname: "audio.mp3", path: "/tmp/audio.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      expect(jobId).toBe("job-1");
    });

    it("creates a trackable job", () => {
      const file = { originalname: "test.wav", path: "/tmp/test.wav" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);
      expect(job).toBeDefined();
      expect(job!.done).toBe(false);
      expect(job!.transcript).toBe("");
    });

    it("emits messages from stdout segments", () => {
      const file = { originalname: "lecture.mp3", path: "/tmp/lecture.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);
      expect(job).toBeDefined();

      const messages: any[] = [];
      job!.emitter.on("msg", (msg: any) => messages.push(msg));

      // Simulate a segment coming from stdout
      const segment = JSON.stringify({ type: "segment", text: "Hello world", start: 0, end: 5 });
      mockProc.stdout.emit("data", segment + "\n");

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("segment");
      expect(job!.transcript).toContain("Hello world");
    });

    it("accumulates transcript from segments with timestamps", () => {
      const file = { originalname: "lec.mp3", path: "/tmp/lec.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);

      const seg1 = JSON.stringify({ type: "segment", text: "First part", start: 0, end: 10 });
      const seg2 = JSON.stringify({ type: "segment", text: "Second part", start: 10, end: 25 });
      mockProc.stdout.emit("data", seg1 + "\n");
      mockProc.stdout.emit("data", seg2 + "\n");

      expect(job!.transcript).toContain("[00:00:00");
      expect(job!.transcript).toContain("First part");
      expect(job!.transcript).toContain("Second part");
    });

    it("marks job as done on process close", () => {
      const file = { originalname: "done.mp3", path: "/tmp/done.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);

      // Simulate process close
      spawnCallbacks["close"]?.(0);

      expect(job!.done).toBe(true);
    });

    it("saves transcript to lesson on close when lessonId provided", () => {
      mockGetLesson.mockReturnValue({ id: "lec-1", title: "Test" });
      const file = { originalname: "save.mp3", path: "/tmp/save.mp3" } as Express.Multer.File;
      startTranscriptionJob(file, "lec-1");

      // Simulate a segment then close
      const seg = JSON.stringify({ type: "segment", text: "Saved text", start: 0, end: 5 });
      mockProc.stdout.emit("data", seg + "\n");
      spawnCallbacks["close"]?.(0);

      expect(mockUpsertLesson).toHaveBeenCalledWith(
        expect.objectContaining({ id: "lec-1" })
      );
    });

    it("emits stderr as log messages", () => {
      const file = { originalname: "err.mp3", path: "/tmp/err.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);

      const messages: any[] = [];
      job!.emitter.on("msg", (msg: any) => messages.push(msg));

      mockProc.stderr.emit("data", "Loading model...");

      expect(messages).toHaveLength(1);
      expect(messages[0].type).toBe("log");
      expect(messages[0].message).toContain("Loading model");
    });
  });

  describe("getJob", () => {
    it("returns undefined for non-existent job", () => {
      expect(getJob("nonexistent")).toBeUndefined();
    });

    it("returns the job after it is created", () => {
      const file = { originalname: "get.mp3", path: "/tmp/get.mp3" } as Express.Multer.File;
      const jobId = startTranscriptionJob(file);
      const job = getJob(jobId);
      expect(job).toBeDefined();
      expect(job!.emitter).toBeInstanceOf(EventEmitter);
    });
  });
});
