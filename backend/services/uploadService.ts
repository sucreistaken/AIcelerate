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

async function processImageMarkers(text: string): Promise<string> {
  const markerRegex = /\[\[\[IMAGE_ANALYSIS_REQUIRED:(.*?)\]\]\]/g;
  const matches = [...text.matchAll(markerRegex)];
  if (matches.length === 0) return text;

  logger.info(`[AI Analysis] Found ${matches.length} images to analyze...`);
  let result = text;

  await Promise.all(matches.map(async (match) => {
    const marker = match[0];
    const imgPath = match[1].trim();
    if (!fs.existsSync(imgPath)) {
      result = result.replace(marker, "");
      return;
    }

    try {
      const ext = path.extname(imgPath).toLowerCase().replace(".", "");
      const mimeType = ext === "png" ? "image/png" : "image/jpeg";
      const imgData = fs.readFileSync(imgPath).toString("base64");
      const prompt = `Analyze the visual content of this slide image. If irrelevant, output "SKIP".

> **[Visual Analysis]**
> - Visual type: {diagram|table|code|chart|photograph|mixed}
> - Content summary: {1-2 sentences}
> - Academic value: {high|medium|low|none}`;

      const aiResult = await getModel().generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }, { inlineData: { data: imgData, mimeType } }] }],
        generationConfig: { maxOutputTokens: 500 },
      });
      const description = aiResult.response.text().trim();
      if (description === "SKIP") result = result.replace(marker, "");
      else result = result.replace(marker, `\n${description}\n`);
      fs.unlinkSync(imgPath);
    } catch (err) {
      logger.error(`[AI Analysis Error] ${imgPath}:`, err);
      result = result.replace(marker, "\n[Görsel Analizi Başarısız]\n");
    }
  }));

  return result;
}
