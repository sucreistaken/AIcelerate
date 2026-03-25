/**
 * Migration script: JSON file storage -> MongoDB
 *
 * Usage:
 *   npx ts-node scripts/migrate-json-to-mongo.ts            # full migration
 *   npx ts-node scripts/migrate-json-to-mongo.ts --dry-run   # preview only
 *
 * Reads all JSON data files from backend/data/ and inserts them into MongoDB.
 * Individual item failures are logged but do not abort the migration.
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { CourseModel } from "../models/Course";
import { LessonModel } from "../models/Lesson";
import { FlashcardModel } from "../models/Flashcard";
import { QuizModel } from "../models/Quiz";
import { ScheduleModel } from "../models/Schedule";
import { ShareModel } from "../models/Share";

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const DRY_RUN = process.argv.includes("--dry-run");

interface MigrationResult {
  collection: string;
  jsonCount: number;
  insertedCount: number;
  errorCount: number;
  errors: string[];
}

function readJsonFile<T>(fileName: string): T | null {
  const filePath = path.join(DATA_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`  [skip] ${fileName} not found`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`  [error] Failed to parse ${fileName}:`, (err as Error).message);
    return null;
  }
}

async function migrateArray(
  collectionName: string,
  model: mongoose.Model<any>,
  items: Array<{ id: string; [key: string]: any }>
): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: collectionName,
    jsonCount: items.length,
    insertedCount: 0,
    errorCount: 0,
    errors: [],
  };

  if (items.length === 0) {
    console.log(`  [${collectionName}] No items to migrate`);
    return result;
  }

  if (DRY_RUN) {
    console.log(`  [${collectionName}] DRY RUN: would insert ${items.length} items`);
    return result;
  }

  for (const item of items) {
    try {
      const { id, ...rest } = item;
      await model.findByIdAndUpdate(id, { $set: rest }, { upsert: true, new: true });
      result.insertedCount++;
    } catch (err) {
      result.errorCount++;
      const msg = `Item ${item.id}: ${(err as Error).message}`;
      result.errors.push(msg);
      console.error(`  [${collectionName}] Error -`, msg);
    }
  }

  console.log(
    `  [${collectionName}] Inserted ${result.insertedCount}/${result.jsonCount}` +
      (result.errorCount > 0 ? ` (${result.errorCount} errors)` : "")
  );

  return result;
}

async function main() {
  console.log("=== LearnCraft JSON -> MongoDB Migration ===");
  console.log(`Data directory: ${DATA_DIR}`);
  if (DRY_RUN) console.log("MODE: DRY RUN (no writes)\n");
  else console.log("MODE: LIVE MIGRATION\n");

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/learncraft";
  console.log(`Connecting to ${mongoUri}...`);

  if (!DRY_RUN) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB\n");
  } else {
    console.log("Skipping MongoDB connection (dry run)\n");
  }

  const results: MigrationResult[] = [];

  // 1. Courses
  console.log("[1/6] Migrating courses...");
  const courses = readJsonFile<Array<{ id: string }>> ("courses.json");
  if (courses && Array.isArray(courses)) {
    results.push(await migrateArray("courses", CourseModel, courses));
  }

  // 2. Lessons (stored in individual files or as lessons.json)
  console.log("[2/6] Migrating lessons...");
  const lessonsDir = path.join(DATA_DIR, "lessons");
  let lessons: Array<{ id: string }> = [];
  if (fs.existsSync(lessonsDir)) {
    // Individual lesson files
    const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const lesson = readJsonFile<{ id: string }>(path.join("lessons", file));
      if (lesson) lessons.push(lesson);
    }
  }
  // Also check lessons.json (flat array)
  const lessonsFlat = readJsonFile<Array<{ id: string }>>("lessons.json");
  if (lessonsFlat && Array.isArray(lessonsFlat)) {
    // Merge, preferring individual files (by id)
    const existingIds = new Set(lessons.map((l) => l.id));
    for (const l of lessonsFlat) {
      if (!existingIds.has(l.id)) lessons.push(l);
    }
  }
  results.push(await migrateArray("lessons", LessonModel, lessons));

  // 3. Flashcards
  console.log("[3/6] Migrating flashcards...");
  const flashcards = readJsonFile<Array<{ id: string }>>("flashcards.json");
  if (flashcards && Array.isArray(flashcards)) {
    results.push(await migrateArray("flashcards", FlashcardModel, flashcards));
  }

  // 4. Quiz packs
  console.log("[4/6] Migrating quiz packs...");
  const quizStore = readJsonFile<{ packs: Array<{ id: string }> }>("quiz.json");
  if (quizStore?.packs && Array.isArray(quizStore.packs)) {
    results.push(await migrateArray("quizzes", QuizModel, quizStore.packs));
  }

  // 5. Schedules
  console.log("[5/6] Migrating schedules...");
  const scheduleData = readJsonFile<Record<string, any>>("schedules.json");
  if (scheduleData && typeof scheduleData === "object" && !Array.isArray(scheduleData)) {
    // schedules.json is a single object, wrap with an id
    const scheduleItem = { id: "default-schedule", ...scheduleData };
    results.push(await migrateArray("schedules", ScheduleModel, [scheduleItem]));
  }

  // 6. Shares
  console.log("[6/6] Migrating shares...");
  const shares = readJsonFile<Array<{ shareId: string; [key: string]: any }>>("shares.json");
  if (shares && Array.isArray(shares)) {
    // Map shareId -> id for consistency
    const mapped = shares.map((s) => {
      const { shareId, ...rest } = s;
      return { id: shareId, ...rest };
    });
    results.push(await migrateArray("shares", ShareModel, mapped));
  }

  // Summary
  console.log("\n=== Migration Summary ===");
  let totalJson = 0;
  let totalInserted = 0;
  let totalErrors = 0;

  for (const r of results) {
    totalJson += r.jsonCount;
    totalInserted += r.insertedCount;
    totalErrors += r.errorCount;
    const status = r.errorCount > 0 ? " (has errors)" : " OK";
    console.log(`  ${r.collection}: ${r.insertedCount}/${r.jsonCount}${status}`);
  }

  console.log(`\nTotal: ${totalInserted}/${totalJson} items migrated, ${totalErrors} errors`);

  // Verification: count documents in each collection
  if (!DRY_RUN && mongoose.connection.readyState === 1) {
    console.log("\n=== Verification (document counts) ===");
    const models = [
      { name: "courses", model: CourseModel },
      { name: "lessons", model: LessonModel },
      { name: "flashcards", model: FlashcardModel },
      { name: "quizzes", model: QuizModel },
      { name: "schedules", model: ScheduleModel },
      { name: "shares", model: ShareModel },
    ];
    for (const { name, model } of models) {
      const count = await model.countDocuments();
      console.log(`  ${name}: ${count} documents`);
    }
  }

  if (!DRY_RUN) {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }

  console.log("Done.");
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
