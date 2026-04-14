import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import multer from "multer";
import path from "path";
import os from "os";
import fs from "fs";
import { fromFile } from "file-type";
import { asyncHandler } from "../utils/asyncHandler";
import { rateLimiter } from "../middleware/rateLimiter";
import { badRequest, notFound } from "../middleware/errorHandler";
import { validate } from "../middleware/validate";
import { transcribeStartSchema, slidesUploadSchema } from "../validators/uploadSchemas";
import { startTranscriptionJob, getJob, processSlideUpload } from "../services/uploadService";

const router = Router();

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/webm", "audio/ogg", "audio/flac",
  "video/mp4", "video/webm", // Video files for audio extraction
]);

const ALLOWED_SLIDE_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png", "image/jpeg", "image/webp",
]);

// Magic byte MIME types that are acceptable for each upload category
const AUDIO_MAGIC_MIMES = new Set([
  "audio/mpeg", "audio/wav", "audio/mp4", "audio/x-flac", "audio/flac",
  "audio/ogg", "video/ogg", "audio/webm", "video/webm", "video/mp4",
]);

const SLIDE_MAGIC_MIMES = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp",
  "application/zip", // PPTX/DOCX are ZIP archives
  "application/x-cfb", // Legacy .ppt/.doc (Compound File Binary)
]);

async function validateMagicBytes(
  filePath: string,
  allowedMimes: Set<string>,
): Promise<void> {
  const detected = await fromFile(filePath);
  if (!detected) {
    // file-type couldn't detect (e.g. plain text) — reject
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    throw badRequest("Unable to determine file type from content");
  }
  if (!allowedMimes.has(detected.mime)) {
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    throw badRequest(`File content type mismatch: detected ${detected.mime}`);
  }
}

const uploadAudio = multer({
  dest: path.join(os.tmpdir(), "learncraft_uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AUDIO_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio file type: ${file.mimetype}`));
    }
  },
});

const uploadSlides = multer({
  dest: path.join(os.tmpdir(), "learncraft_uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_SLIDE_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported slide file type: ${file.mimetype}`));
    }
  },
});

// POST /api/transcribe/start
router.post("/transcribe/start", requireAuth, rateLimiter("transcribe", 3, 60_000), uploadAudio.single("file"), validate(transcribeStartSchema), asyncHandler(async (req, res) => {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw badRequest("file is required");
  await validateMagicBytes(file.path, AUDIO_MAGIC_MIMES);
  const { lessonId } = req.body as { lessonId?: string };
  const jobId = startTranscriptionJob(file, lessonId);
  res.json({ ok: true, jobId });
}));

// POST /api/slides/upload
router.post("/slides/upload", requireAuth, rateLimiter("slides-upload", 5, 60_000), uploadSlides.single("file"), validate(slidesUploadSchema), asyncHandler(async (req, res) => {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw badRequest("No file uploaded");
  await validateMagicBytes(file.path, SLIDE_MAGIC_MIMES);
  const { lessonId } = req.body as { lessonId?: string };
  if (!lessonId) throw badRequest("lessonId is required");
  const text = await processSlideUpload(file, lessonId);
  res.json({ ok: true, text });
}));

// GET /api/transcribe/stream/:jobId (SSE)
router.get("/transcribe/stream/:jobId", requireAuth, asyncHandler(async (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) throw notFound("Job not found");

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.flushHeaders?.();

  const send = (msg: unknown) => { res.write(`data: ${JSON.stringify(msg)}\n\n`); };
  const heartbeat = setInterval(() => { res.write(`: ping\n\n`); }, 15000);
  heartbeat.unref(); // Don't block shutdown
  const onMsg = (msg: unknown) => send(msg);
  job.emitter.on("msg", onMsg);
  req.on("close", () => { clearInterval(heartbeat); job.emitter.off("msg", onMsg); res.end(); });
}));

export default router;
