import { Router } from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { asyncHandler } from "../utils/asyncHandler";
import { rateLimiter } from "../middleware/rateLimiter";
import { badRequest, notFound } from "../middleware/errorHandler";
import { startTranscriptionJob, getJob, processSlideUpload } from "../services/uploadService";

const router = Router();
const upload = multer({
  dest: path.join(os.tmpdir(), "learncraft_uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
});

// POST /api/transcribe/start
router.post("/transcribe/start", rateLimiter("transcribe", 3, 60_000), upload.single("file"), asyncHandler(async (req, res) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw badRequest("file is required");
  const { lessonId } = req.body as { lessonId?: string };
  const jobId = startTranscriptionJob(file, lessonId);
  res.json({ ok: true, jobId });
}));

// POST /api/slides/upload
router.post("/slides/upload", rateLimiter("slides-upload", 5, 60_000), upload.single("file"), asyncHandler(async (req, res) => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) throw badRequest("No file uploaded");
  const { lessonId } = req.body as { lessonId?: string };
  if (!lessonId) throw badRequest("lessonId is required");
  const text = await processSlideUpload(file, lessonId);
  res.json({ ok: true, text });
}));

// GET /api/transcribe/stream/:jobId (SSE)
router.get("/transcribe/stream/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) throw notFound("Job not found");

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  (res as any).flushHeaders?.();

  const send = (msg: any) => { res.write(`data: ${JSON.stringify(msg)}\n\n`); };
  const heartbeat = setInterval(() => { res.write(`: ping\n\n`); }, 15000);
  heartbeat.unref(); // Don't block shutdown
  const onMsg = (msg: any) => send(msg);
  job.emitter.on("msg", onMsg);
  req.on("close", () => { clearInterval(heartbeat); job.emitter.off("msg", onMsg); res.end(); });
});

export default router;
