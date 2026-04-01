import { logger } from "../utils/logger";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import readline from "readline";
import { EventEmitter } from "events";
import { env } from "../config/env";
import { getLesson, upsertLesson } from "../controllers/lessonControllers";
import { getModel } from "./aiService";
import { uid } from "../utils/idGenerator";
import { AppError } from "../middleware/errorHandler";

type Job = { emitter: EventEmitter; done: boolean; transcript: string };
const jobs = new Map<string, Job>();

function formatTimestamp(seconds: number): string {
  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function startTranscriptionJob(file: Express.Multer.File, lessonId?: string): string {
  const jobId = uid();
  const emitter = new EventEmitter();
  jobs.set(jobId, { emitter, done: false, transcript: "" });

  const pyPath = path.resolve(__dirname, "..", "transcribe", "run.py");
  const pythonBin = env.PYTHON_BIN;
  logger.info("[STT] start", { jobId, lessonId, file: file.originalname, tmp: file.path, pyPath });

  const PROCESS_TIMEOUT = 5 * 60 * 1000;
  const proc = spawn(pythonBin, [pyPath, file.path, "--lang", "en"], { stdio: ["ignore", "pipe", "pipe"] });

  const killTimer = setTimeout(() => {
    proc.kill("SIGKILL");
    const job = jobs.get(jobId);
    if (job && !job.done) {
      job.done = true;
      emitter.emit("msg", { type: "error", message: "Transcription timed out" });
    }
    try { fs.unlinkSync(file.path); } catch { }
  }, PROCESS_TIMEOUT);

  proc.stderr.on("data", (d) => {
    const msg = String(d || "").trim();
    if (msg) emitter.emit("msg", { type: "log", message: msg.slice(0, 800) });
  });

  const rl = readline.createInterface({ input: proc.stdout });
  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line);
      const job = jobs.get(jobId);
      if (!job) return;
      if (msg.type === "segment" && msg.text) {
        job.transcript += `[${formatTimestamp(msg.start)} – ${formatTimestamp(msg.end)}] ${msg.text}\n`;
      }
      emitter.emit("msg", msg);
    } catch { }
  });

  proc.on("close", (code) => {
    clearTimeout(killTimer);
    const job = jobs.get(jobId);
    if (!job) return;
    job.done = true;
    emitter.emit("msg", { type: "done", progress: 1.0, code });
    try { fs.unlinkSync(file.path); } catch { }
    if (lessonId) {
      const existing = getLesson(lessonId);
      if (existing) upsertLesson({ id: lessonId, transcript: job.transcript });
    }
    setTimeout(() => jobs.delete(jobId), 5 * 60 * 1000);
  });

  return jobId;
}

export function getJob(jobId: string): Job | undefined {
  return jobs.get(jobId);
}

export async function processSlideUpload(file: Express.Multer.File, lessonId: string): Promise<string> {
  const pyPath = path.resolve(__dirname, "..", "ocr_service.py");
  const pythonBin = env.PYTHON_BIN;
  const originalExt = path.extname(file.originalname);
  const newPath = file.path + originalExt;
  fs.renameSync(file.path, newPath);
  file.path = newPath;
  logger.info(`[OCR] Starting for lesson ${lessonId}, file: ${file.path}`);

  return new Promise((resolve, reject) => {
    const OCR_TIMEOUT = 5 * 60 * 1000;
    const proc = spawn(pythonBin, [pyPath, file.path]);
    let stdoutData = "";
    let stderrData = "";

    const ocrTimer = setTimeout(() => {
      proc.kill("SIGKILL");
      try { fs.unlinkSync(file.path); } catch { }
      reject(new AppError(504, "OCR timed out"));
    }, OCR_TIMEOUT);

    proc.stdout.on("data", (data) => { stdoutData += data.toString(); });
    proc.stderr.on("data", (data) => { stderrData += data.toString(); });

    proc.on("close", async (code) => {
      clearTimeout(ocrTimer);
      try { fs.unlinkSync(file.path); } catch { }

      if (code !== 0) {
        return reject(new AppError(500, `OCR script failed: ${stderrData.slice(0, 500)}`));
      }

      try {
        const startMarker = "===OCR_START===";
        const endMarker = "===OCR_END===";
        const startIndex = stdoutData.indexOf(startMarker);
        const endIndex = stdoutData.indexOf(endMarker);
        let extractedText = "";
        if (startIndex !== -1 && endIndex !== -1) {
          extractedText = stdoutData.substring(startIndex + startMarker.length, endIndex).trim();
        } else {
          extractedText = stdoutData.trim();
        }

        // AI image analysis
        extractedText = await processImageMarkers(extractedText);

        const lesson = getLesson(lessonId);
        if (lesson) upsertLesson({ id: lessonId, slideText: extractedText });

        resolve(extractedText);
      } catch (err: any) {
        reject(new AppError(500, `Internal processing error: ${err.message}`));
      }
    });
  });
}

const IMG_CONCURRENCY = 3;
const IMG_MAX_RETRIES = 3;

function readImageAsBase64(imgPath: string) {
  const ext = path.extname(imgPath).toLowerCase().replace(".", "");
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  const data = fs.readFileSync(imgPath).toString("base64");
  return { data, mimeType };
}

async function analyzeImage(imgPath: string): Promise<string> {
  const { data, mimeType } = readImageAsBase64(imgPath);
  const prompt = `Analyze the visual content of this slide image. If irrelevant, output "SKIP".

> **[Visual Analysis]**
> - Visual type: {diagram|table|code|chart|photograph|mixed}
> - Content summary: {1-2 sentences}
> - Academic value: {high|medium|low|none}`;

  const aiResult = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data, mimeType } }] }],
    generationConfig: { maxOutputTokens: 500 },
  });
  return aiResult.response.text().trim();
}

async function ocrImage(imgPath: string): Promise<string> {
  const { data, mimeType } = readImageAsBase64(imgPath);
  const prompt = `Extract ALL text from this slide image exactly as written.
Preserve formatting: bullet points (●), code blocks, terminal commands.
For terminal/code screenshots, reproduce the exact text including prompts ($ or >).
Output the text only, no commentary.`;

  const aiResult = await getModel().generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data, mimeType } }] }],
    generationConfig: { maxOutputTokens: 2000 },
  });
  return aiResult.response.text().trim();
}

async function analyzeWithRetry(imgPath: string, fn: (p: string) => Promise<string> = analyzeImage): Promise<string> {
  for (let attempt = 0; attempt < IMG_MAX_RETRIES; attempt++) {
    try {
      return await fn(imgPath);
    } catch (err: any) {
      const status = err?.status ?? err?.httpCode ?? 0;
      const isRetryable = status === 429 || status >= 500;
      if (!isRetryable || attempt === IMG_MAX_RETRIES - 1) throw err;

      // Use API-suggested delay for 429, exponential backoff otherwise
      const apiDelay = status === 429 ? parseRetryDelay(err) : 0;
      const delay = apiDelay || 2000 * Math.pow(2, attempt);
      logger.warn(`[AI Analysis] Retry ${attempt + 1}/${IMG_MAX_RETRIES} for ${path.basename(imgPath)} in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error("Unreachable");
}

function parseRetryDelay(err: any): number {
  try {
    const details = err?.errorDetails ?? [];
    for (const d of details) {
      if (d?.["@type"]?.includes("RetryInfo") && d.retryDelay) {
        const seconds = parseInt(String(d.retryDelay).replace(/s$/, ""), 10);
        if (seconds > 0) return seconds * 1000;
      }
    }
  } catch { /* ignore */ }
  return 0;
}

function tryUnlink(filePath: string) {
  try { fs.unlinkSync(filePath); } catch { /* already deleted */ }
}

type MarkerJob = { marker: string; imgPath: string; type: "ocr" | "image"; slideLabel?: string };

async function processImageMarkers(text: string): Promise<string> {
  const jobs: MarkerJob[] = [];

  // Collect OCR markers: [[[OCR_REQUIRED:slide_5:/path/to/img.png]]]
  for (const m of text.matchAll(/\[\[\[OCR_REQUIRED:(slide_\d+):(.*?)\]\]\]/g)) {
    jobs.push({ marker: m[0], imgPath: m[2].trim(), type: "ocr", slideLabel: m[1] });
  }

  // Collect image analysis markers: [[[IMAGE_ANALYSIS_REQUIRED:/path/to/img.png]]]
  for (const m of text.matchAll(/\[\[\[IMAGE_ANALYSIS_REQUIRED:(.*?)\]\]\]/g)) {
    jobs.push({ marker: m[0], imgPath: m[1].trim(), type: "image" });
  }

  if (jobs.length === 0) return text;

  const ocrCount = jobs.filter(j => j.type === "ocr").length;
  const imgCount = jobs.filter(j => j.type === "image").length;
  logger.info(`[AI Analysis] Processing ${ocrCount} OCR pages + ${imgCount} images...`);
  let result = text;

  // Manual concurrency limiter
  const queue = [...jobs];
  const results: Promise<void>[] = [];

  function next(): Promise<void> | undefined {
    const job = queue.shift();
    if (!job) return;
    const p = (async () => {
      if (!fs.existsSync(job.imgPath)) {
        result = result.replace(job.marker, "");
        return;
      }
      try {
        if (job.type === "ocr") {
          const ocrText = await analyzeWithRetry(job.imgPath, ocrImage);
          const label = job.slideLabel?.replace("slide_", "Slide ") ?? "Slide";
          result = result.replace(job.marker, `--- ${label} (AI OCR) ---\n${ocrText}\n`);
        } else {
          const description = await analyzeWithRetry(job.imgPath, analyzeImage);
          if (description === "SKIP") result = result.replace(job.marker, "");
          else result = result.replace(job.marker, `\n${description}\n`);
        }
      } catch (err) {
        logger.error(`[AI ${job.type} Error] ${job.imgPath}:`, err);
        if (job.type === "ocr") {
          const label = job.slideLabel?.replace("slide_", "Slide ") ?? "Slide";
          result = result.replace(job.marker, `--- ${label} (OCR Failed) ---\n`);
        } else {
          result = result.replace(job.marker, "\n[Görsel Analizi Başarısız]\n");
        }
      } finally {
        tryUnlink(job.imgPath);
      }
    })().finally(() => {
      const n = next();
      if (n) results.push(n);
    });
    return p;
  }

  // Kick off initial batch
  for (let i = 0; i < IMG_CONCURRENCY && queue.length > 0; i++) {
    const p = next();
    if (p) results.push(p);
  }
  await Promise.all(results);

  return result;
}
