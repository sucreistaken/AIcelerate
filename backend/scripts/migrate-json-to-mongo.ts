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
import "../models/Quiz";
import "../models/Schedule";
import { ShareModel } from "../models/Share";
import { Room } from "../models/Room";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { ToolData } from "../models/ToolData";
import { User } from "../models/User";
import { XpModel } from "../models/Xp";
import { SprintModel } from "../models/Sprint";
import { AppNotificationModel } from "../models/AppNotification";
import { GlobalMemoryModel } from "../models/GlobalMemory";
import { WorkspaceModel } from "../models/Workspace";
import { WeaknessModel } from "../models/Weakness";
import { AuditLogModel } from "../models/AuditLog";
import { SystemSettingsModel } from "../models/SystemSettings";
import { AdminRoleModel } from "../models/AdminRole";

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
  console.log("[1/16] Migrating servers → rooms...");
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
  console.log("[2/16] Migrating profiles → users...");
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
  console.log("[3/16] Migrating channels...");
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
  console.log("[4/16] Migrating messages...");
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
  console.log("[5/16] Migrating channel-tools...");
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
  console.log("[6/16] Migrating courses...");
  const courses = readJsonFile<any[]>("courses.json");
  if (courses && Array.isArray(courses)) {
    results.push(await migrateArray("courses", CourseModel, courses));
  }

  console.log("[7/16] Migrating lessons...");
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

  console.log("[8/16] Migrating flashcards...");
  const flashcards = readJsonFile<any[]>("flashcards.json");
  if (flashcards && Array.isArray(flashcards)) {
    results.push(await migrateArray("flashcards", FlashcardModel, flashcards));
  }

  console.log("[9/16] Migrating shares...");
  const shares = readJsonFile<any[]>("shares.json");
  if (shares && Array.isArray(shares)) {
    const mapped = shares.map((s) => ({ ...s, id: s.shareId || s.id }));
    results.push(await migrateArray("shares", ShareModel, mapped));
  }

  // ── 10. XP / Gamification ──────────────────────────────────────────────────
  console.log("[10/16] Migrating XP data...");
  const xpData = readJsonFile<any>("xp.json");
  if (xpData && !DRY_RUN) {
    try {
      // XP data is a single object (not an array), keyed per user (or global)
      const userId = xpData.userId || "global";
      await XpModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            totalXp: xpData.totalXp || 0,
            streakDays: xpData.streakDays || 0,
            lastActiveDate: xpData.lastActiveDate || null,
            history: (xpData.history || []).slice(-500),
          },
        },
        { upsert: true }
      );
      console.log("  [xp] Migrated 1 XP record");
      results.push({ collection: "xp", jsonCount: 1, insertedCount: 1, errorCount: 0, errors: [] });
    } catch (err) {
      console.error("  [xp] Error:", (err as Error).message);
      results.push({ collection: "xp", jsonCount: 1, insertedCount: 0, errorCount: 1, errors: [(err as Error).message] });
    }
  }

  // ── 11. Sprint ─────────────────────────────────────────────────────────────
  console.log("[11/16] Migrating sprint data...");
  const sprintData = readJsonFile<any>("sprint.json");
  if (sprintData && !DRY_RUN) {
    try {
      const userId = sprintData.userId || "global";
      await SprintModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            settings: sprintData.settings || { studyDurationMin: 40, breakDurationMin: 10, intensiveMode: false },
            sessions: (sprintData.sessions || []).slice(0, 50),
          },
        },
        { upsert: true }
      );
      console.log("  [sprint] Migrated 1 sprint record");
      results.push({ collection: "sprint", jsonCount: 1, insertedCount: 1, errorCount: 0, errors: [] });
    } catch (err) {
      console.error("  [sprint] Error:", (err as Error).message);
      results.push({ collection: "sprint", jsonCount: 1, insertedCount: 0, errorCount: 1, errors: [(err as Error).message] });
    }
  }

  // ── 12. App Notifications ──────────────────────────────────────────────────
  console.log("[12/16] Migrating app notifications...");
  const appNotifs = readJsonFile<any[]>("notifications.json");
  if (appNotifs && Array.isArray(appNotifs) && !DRY_RUN) {
    let inserted = 0, errors = 0;
    for (const n of appNotifs) {
      try {
        await AppNotificationModel.create({
          userId: n.userId || "global",
          type: n.type,
          title: n.title,
          message: n.message,
          severity: n.severity || "info",
          dismissed: n.dismissed || false,
          dismissedAt: n.dismissedAt ? new Date(n.dismissedAt) : undefined,
          actionTarget: n.actionTarget,
          metadata: n.metadata,
          createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        });
        inserted++;
      } catch (err) {
        errors++;
      }
    }
    console.log(`  [app-notifications] Migrated ${inserted}/${appNotifs.length}${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "app-notifications", jsonCount: appNotifs.length, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  // ── 13. Global Memory ──────────────────────────────────────────────────────
  console.log("[13/16] Migrating global memory...");
  const memoryData = readJsonFile<any>("memory.json");
  if (memoryData && !DRY_RUN) {
    try {
      const userId = memoryData.userId || "global";
      await GlobalMemoryModel.findOneAndUpdate(
        { userId },
        {
          $set: {
            recurringConcepts: memoryData.recurringConcepts || [],
            recentEmphases: memoryData.recentEmphases || [],
            connections: memoryData.connections || [],
            lastUpdated: memoryData.lastUpdated || new Date().toISOString(),
          },
        },
        { upsert: true }
      );
      console.log("  [global-memory] Migrated 1 memory record");
      results.push({ collection: "global-memory", jsonCount: 1, insertedCount: 1, errorCount: 0, errors: [] });
    } catch (err) {
      console.error("  [global-memory] Error:", (err as Error).message);
      results.push({ collection: "global-memory", jsonCount: 1, insertedCount: 0, errorCount: 1, errors: [(err as Error).message] });
    }
  }

  // ── 14. Workspaces ─────────────────────────────────────────────────────────
  console.log("[14/16] Migrating workspaces...");
  const workspacesDir = path.join(DATA_DIR, "workspaces");
  if (fs.existsSync(workspacesDir) && !DRY_RUN) {
    let inserted = 0, errors = 0;
    for (const file of fs.readdirSync(workspacesDir).filter((f) => f.endsWith(".json"))) {
      try {
        const roomId = file.replace(".json", "");
        const wsData = readJsonFile<any>(path.join("workspaces", file));
        if (!wsData) continue;

        await WorkspaceModel.findOneAndUpdate(
          { roomId },
          {
            $set: {
              deepDive: wsData.deepDive || { messages: [], savedInsights: [] },
              flashcards: wsData.flashcards || [],
              mindMapAnnotations: wsData.mindMapAnnotations || [],
              notes: wsData.notes || [],
            },
          },
          { upsert: true }
        );
        inserted++;
      } catch (err) {
        errors++;
        console.error(`  [workspaces] Error - ${file}: ${(err as Error).message}`);
      }
    }
    console.log(`  [workspaces] Migrated ${inserted} workspace(s)${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "workspaces", jsonCount: inserted + errors, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  // ── 15. Weakness data ──────────────────────────────────────────────────────
  console.log("[15/16] Migrating weakness data...");
  const weaknessData = readJsonFile<any[]>("weakness.json");
  if (weaknessData && Array.isArray(weaknessData) && !DRY_RUN) {
    let inserted = 0, errors = 0;
    for (const w of weaknessData) {
      try {
        await WeaknessModel.findOneAndUpdate(
          { userId: w.userId || "global", lessonId: w.lessonId },
          {
            $set: {
              lessonTitle: w.lessonTitle || "",
              topics: w.topics || [],
              analyzedAt: w.analyzedAt || new Date().toISOString(),
            },
          },
          { upsert: true }
        );
        inserted++;
      } catch (err) {
        errors++;
      }
    }
    console.log(`  [weakness] Migrated ${inserted}/${weaknessData.length}${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "weakness", jsonCount: weaknessData.length, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  // ── 16. Admin data (audit log, roles, settings) ───────────────────────────
  console.log("[16/16] Migrating admin data...");
  const auditLog = readJsonFile<any[]>("audit-log.json");
  if (auditLog && Array.isArray(auditLog) && !DRY_RUN) {
    let inserted = 0, errors = 0;
    for (const entry of auditLog) {
      try {
        await AuditLogModel.create({
          userId: entry.userId,
          action: entry.action,
          resource: entry.resource,
          details: entry.details,
          ip: entry.ip || "",
          timestamp: entry.timestamp,
        });
        inserted++;
      } catch (err) { errors++; }
    }
    console.log(`  [audit-log] Migrated ${inserted}/${auditLog.length}${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "audit-log", jsonCount: auditLog.length, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  const rolesData = readJsonFile<any[]>("roles.json");
  if (rolesData && Array.isArray(rolesData) && !DRY_RUN) {
    let inserted = 0, errors = 0;
    for (const role of rolesData) {
      try {
        await AdminRoleModel.findOneAndUpdate(
          { name: role.name },
          { $set: { description: role.description, permissions: role.permissions, isSystem: role.isSystem } },
          { upsert: true }
        );
        inserted++;
      } catch (err) { errors++; }
    }
    console.log(`  [roles] Migrated ${inserted}/${rolesData.length}${errors > 0 ? ` (${errors} errors)` : ""}`);
    results.push({ collection: "roles", jsonCount: rolesData.length, insertedCount: inserted, errorCount: errors, errors: [] });
  }

  const settingsData = readJsonFile<any[]>("settings.json");
  if (settingsData && Array.isArray(settingsData) && settingsData.length > 0 && !DRY_RUN) {
    try {
      const s = settingsData[0];
      await SystemSettingsModel.findOneAndUpdate(
        { key: "system-settings" },
        {
          $set: {
            rateLimitPerMinute: s.rateLimitPerMinute ?? 200,
            maxUploadSizeMb: s.maxUploadSizeMb ?? 10,
            maintenanceMode: s.maintenanceMode ?? false,
            allowRegistration: s.allowRegistration ?? true,
          },
        },
        { upsert: true }
      );
      console.log("  [settings] Migrated 1 settings record");
      results.push({ collection: "settings", jsonCount: 1, insertedCount: 1, errorCount: 0, errors: [] });
    } catch (err) {
      console.error("  [settings] Error:", (err as Error).message);
      results.push({ collection: "settings", jsonCount: 1, insertedCount: 0, errorCount: 1, errors: [(err as Error).message] });
    }
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
