/**
 * Migration script: JSON file storage -> MongoDB
 *
 * Usage:
 *   npx tsx scripts/migrate-json-to-mongo.ts            # full migration
 *   npx tsx scripts/migrate-json-to-mongo.ts --dry-run   # preview only
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
import { Room } from "../models/Room";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { ToolData } from "../models/ToolData";
import { User } from "../models/User";

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const DRY_RUN = process.argv.includes("--dry-run");

interface MigrationResult {
  collection: string;
  jsonCount: number;
  insertedCount: number;
  errorCount: number;
  errors: string[];
}

function readJsonFile<T>(filePath: string): T | null {
  const fullPath = filePath.startsWith("/") ? filePath : path.join(DATA_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
  } catch (err) {
    console.error(`  [error] Failed to parse ${filePath}:`, (err as Error).message);
    return null;
  }
}

async function migrateArray(
  collectionName: string,
  model: mongoose.Model<any>,
  items: Array<{ id?: string; _id?: string; [key: string]: any }>,
  transform?: (item: any) => any
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

  for (const raw of items) {
    try {
      const item = transform ? transform(raw) : raw;
      const id = item.id || item._id;
      const { id: _id, ...rest } = item;
      await model.findByIdAndUpdate(id, { $set: rest }, { upsert: true, new: true });
      result.insertedCount++;
    } catch (err) {
      result.errorCount++;
      const msg = `Item ${raw.id || raw._id}: ${(err as Error).message}`;
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

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/learncraft";
  console.log(`Connecting to ${mongoUri}...`);

  if (!DRY_RUN) {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB\n");
  }

  const results: MigrationResult[] = [];

  // ── 1. Servers → Rooms ──────────────────────────────────────────────────────
  console.log("[1/9] Migrating servers → rooms...");
  const servers = readJsonFile<any[]>("servers.json");
  if (servers && Array.isArray(servers)) {
    results.push(await migrateArray("rooms", Room, servers, (s) => ({
      ...s,
      _id: s.id,
      isPublic: s.settings?.isPublic ?? false,
      maxMembers: s.settings?.maxMembers ?? 50,
      memberRoles: s.memberRoles || {},
      lastActivityAt: s.lastActivityAt ? new Date(s.lastActivityAt) : new Date(),
    })));
  }

  // ── 2. Profiles → Users (merge profile fields into existing users) ──────────
  console.log("[2/9] Migrating profiles → users...");
  const profiles = readJsonFile<any[]>("profiles.json");
  if (profiles && Array.isArray(profiles) && !DRY_RUN) {
    let inserted = 0;
    let errors = 0;
    for (const p of profiles) {
      try {
        await User.findByIdAndUpdate(p.id, {
          $set: {
            status: p.status || "offline",
            roomIds: p.serverIds || [],
            friendIds: p.friendIds || [],
            dmChannelIds: p.dmChannelIds || [],
            "profile.nickname": p.nickname,
            "profile.avatar": p.avatar,
            "profile.bio": p.bio || "",
          },
          $setOnInsert: {
            friendCode: p.friendCode,
          },
        }, { upsert: false });
        inserted++;
      } catch (err) {
        errors++;
        console.error(`  [profiles] Error - ${p.id}: ${(err as Error).message}`);
      }
    }
    console.log(`  [profiles] Updated ${inserted}/${profiles.length}${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "profiles", jsonCount: profiles.length, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  // ── 3. Channels ─────────────────────────────────────────────────────────────
  console.log("[3/9] Migrating channels...");
  const channelsDir = path.join(DATA_DIR, "channels");
  if (fs.existsSync(channelsDir)) {
    const allChannels: any[] = [];
    for (const file of fs.readdirSync(channelsDir).filter((f) => f.endsWith(".json"))) {
      const channels = readJsonFile<any[]>(path.join("channels", file));
      if (channels && Array.isArray(channels)) {
        allChannels.push(...channels.map((c) => ({
          ...c,
          _id: c.id,
          roomId: c.serverId || file.replace(".json", ""),
        })));
      }
    }
    results.push(await migrateArray("channels", Channel, allChannels));
  }

  // ── 4. Messages ─────────────────────────────────────────────────────────────
  console.log("[4/9] Migrating messages...");
  const messagesDir = path.join(DATA_DIR, "messages");
  if (fs.existsSync(messagesDir)) {
    const allMessages: any[] = [];
    for (const file of fs.readdirSync(messagesDir).filter((f) => f.endsWith(".json"))) {
      const messages = readJsonFile<any[]>(path.join("messages", file));
      if (messages && Array.isArray(messages)) {
        allMessages.push(...messages.map((m) => ({ ...m, _id: m.id })));
      }
    }
    results.push(await migrateArray("messages", Message, allMessages));
  }

  // ── 5. Channel Tools ────────────────────────────────────────────────────────
  console.log("[5/9] Migrating channel-tools...");
  const toolsDir = path.join(DATA_DIR, "channel-tools");
  if (fs.existsSync(toolsDir)) {
    const allTools: any[] = [];
    for (const file of fs.readdirSync(toolsDir).filter((f) => f.endsWith(".json"))) {
      const tool = readJsonFile<any>(path.join("channel-tools", file));
      if (tool) {
        allTools.push({
          _id: tool.id || file.replace(".json", ""),
          channelId: tool.channelId || file.replace(".json", ""),
          toolType: tool.toolType || "unknown",
          data: tool,
          version: 1,
        });
      }
    }
    results.push(await migrateArray("tooldata", ToolData, allTools));
  }

  // ── 6-9. Existing migrations (courses, lessons, flashcards, etc.) ───────────
  console.log("[6/9] Migrating courses...");
  const courses = readJsonFile<any[]>("courses.json");
  if (courses && Array.isArray(courses)) {
    results.push(await migrateArray("courses", CourseModel, courses));
  }

  console.log("[7/9] Migrating lessons...");
  const lessonsDir = path.join(DATA_DIR, "lessons");
  let lessons: any[] = [];
  if (fs.existsSync(lessonsDir)) {
    for (const file of fs.readdirSync(lessonsDir).filter((f) => f.endsWith(".json"))) {
      const lesson = readJsonFile<any>(path.join("lessons", file));
      if (lesson) lessons.push(lesson);
    }
  }
  const lessonsFlat = readJsonFile<any[]>("lessons.json");
  if (lessonsFlat && Array.isArray(lessonsFlat)) {
    const existingIds = new Set(lessons.map((l) => l.id));
    for (const l of lessonsFlat) {
      if (!existingIds.has(l.id)) lessons.push(l);
    }
  }
  results.push(await migrateArray("lessons", LessonModel, lessons));

  console.log("[8/9] Migrating flashcards...");
  const flashcards = readJsonFile<any[]>("flashcards.json");
  if (flashcards && Array.isArray(flashcards)) {
    results.push(await migrateArray("flashcards", FlashcardModel, flashcards));
  }

  console.log("[9/9] Migrating shares...");
  const shares = readJsonFile<any[]>("shares.json");
  if (shares && Array.isArray(shares)) {
    const mapped = shares.map((s) => ({ ...s, id: s.shareId || s.id }));
    results.push(await migrateArray("shares", ShareModel, mapped));
  }

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n=== Migration Summary ===");
  let totalJson = 0, totalInserted = 0, totalErrors = 0;

  for (const r of results) {
    totalJson += r.jsonCount;
    totalInserted += r.insertedCount;
    totalErrors += r.errorCount;
    console.log(`  ${r.collection}: ${r.insertedCount}/${r.jsonCount}${r.errorCount > 0 ? " (has errors)" : " OK"}`);
  }

  console.log(`\nTotal: ${totalInserted}/${totalJson} items migrated, ${totalErrors} errors`);

  if (!DRY_RUN && mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }

  console.log("Done.");
  process.exit(totalErrors > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
