import { logger } from "../utils/logger";
import path from "path";
import os from "os";
import fs from "fs";
import { spawn } from "child_process";
import { env } from "../config/env";
import { getLesson, upsertLesson } from "./lessonDataService";
import { notFound, badRequest, AppError } from "../middleware/errorHandler";
import type { DeviationResult } from "../types/index";

export async function analyzeDeviation(
  lessonId: string,
  forceReanalyze: boolean = false
): Promise<{ deviation: DeviationResult; cached: boolean }> {
  const lesson = getLesson(lessonId);
  if (!lesson) throw notFound("Lesson not found");

  const transcript = String(lesson.transcript || "").trim();
  const slideText = String(lesson.slideText || "").trim();
  if (!transcript || !slideText) {
    throw badRequest("Transcript and slideText are required.");
  }

  if (!forceReanalyze && lesson.deviation?.segments?.length) {
    return { deviation: lesson.deviation, cached: true };
  }

  const tmpDir = path.join(os.tmpdir(), "learncraft_deviation");
  fs.mkdirSync(tmpDir, { recursive: true });
  const trPath = path.join(tmpDir, `${lessonId}.transcript.txt`);
  const slPath = path.join(tmpDir, `${lessonId}.slides.txt`);
  fs.writeFileSync(trPath, transcript, "utf-8");
  fs.writeFileSync(slPath, slideText, "utf-8");

  let pyPath = path.join(process.cwd(), "backend", "transcribe", "deviation.py");
  if (!fs.existsSync(pyPath)) pyPath = path.join(process.cwd(), "transcribe", "deviation.py");
  const pythonBin = env.PYTHON_BIN;

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonBin, [
      pyPath, "--transcript", trPath, "--slides", slPath,
      "--title", lesson.title || "Untitled Lesson",
    ], { stdio: ["ignore", "pipe", "pipe"] });

    let out = "";
    let err = "";
    let killed = false;

    // Timeout: kill the process if it runs too long
    const PYTHON_TIMEOUT_MS = 60_000;
    const timeout = setTimeout(() => {
      killed = true;
      proc.kill("SIGTERM");
      // Give it 5s to clean up, then force kill
      const forceKill = setTimeout(() => proc.kill("SIGKILL"), 5000);
      forceKill.unref();
    }, PYTHON_TIMEOUT_MS);
    timeout.unref();

    // Stdout size limit to prevent memory exhaustion
    const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB
    let stdoutSize = 0;

    proc.stdout.on("data", (data: Buffer) => {
      stdoutSize += data.length;
      if (stdoutSize > MAX_OUTPUT_SIZE) {
        killed = true;
        proc.kill("SIGTERM");
        reject(new AppError(500, "Python script output exceeded maximum size"));
        return;
      }
      out += data.toString();
    });
    proc.stderr.on("data", (data) => (err += data.toString()));

    proc.on("close", async (code) => {
      clearTimeout(timeout);
      try { fs.unlinkSync(trPath); } catch { }
      try { fs.unlinkSync(slPath); } catch { }

      if (killed) {
        return reject(new AppError(500, "Deviation script timed out or was killed"));
      }

      if (code !== 0) {
        return reject(new AppError(500, `Deviation script failed: ${(err || out || "Unknown error").slice(0, 500)}`));
      }

      let result: DeviationResult;
      try { result = JSON.parse(out) as DeviationResult; } catch {
        return reject(new AppError(500, "Failed to parse deviation script output"));
      }

      if (!result.ok) {
        return reject(new AppError(500, result.error || "Deviation script returned error"));
      }

      await upsertLesson({ id: lessonId, deviation: result });
      logger.info(`[DEVIATION] lessonId=${lessonId}`);
      resolve({ deviation: result, cached: false });
    });
  });
}
