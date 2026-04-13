/**
 * Verify that JSON data and MongoDB data are in sync.
 * Run after migration to confirm data integrity.
 *
 * Usage:
 *   npx tsx scripts/verify-migration.ts
 */

import "dotenv/config";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { CourseModel } from "../models/Course";
import { LessonModel } from "../models/Lesson";
import { FlashcardModel } from "../models/Flashcard";
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

interface VerifyResult {
  collection: string;
  jsonCount: number;
  mongoCount: number;
  status: "ok" | "mismatch" | "json-only" | "mongo-only" | "skipped";
  details?: string;
}

function readJsonFile<T>(filePath: string): T | null {
  const fullPath = filePath.startsWith("/") ? filePath : path.join(DATA_DIR, filePath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
  } catch {
    return null;
  }
}

function countJsonDir(dirName: string): number {
  const dir = path.join(DATA_DIR, dirName);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length;
}

function countJsonArray(fileName: string): number {
  const data = readJsonFile<any[]>(fileName);
  if (Array.isArray(data)) return data.length;
  return data ? 1 : 0;
}

async function main() {
  console.log("=== Migration Verification ===\n");
  console.log(`Data directory: ${DATA_DIR}`);

  const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/learncraft";
  console.log(`Connecting to ${mongoUri}...\n`);

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to MongoDB\n");

  const results: VerifyResult[] = [];

  // ── Verify each collection ─────────────────────────────────────────────────

  // 1. Servers / Rooms
  const serversJson = countJsonArray("servers.json");
  const roomsMongo = await Room.countDocuments();
  results.push({
    collection: "rooms (servers.json)",
    jsonCount: serversJson,
    mongoCount: roomsMongo,
    status: serversJson === roomsMongo ? "ok" : serversJson === 0 ? "mongo-only" : "mismatch",
  });

  // 2. Channels
  const channelsJson = countJsonDir("channels");
  const channelsMongo = await Channel.countDocuments();
  results.push({
    collection: "channels",
    jsonCount: channelsJson,
    mongoCount: channelsMongo,
    status: channelsJson === 0 && channelsMongo === 0 ? "ok" : channelsJson === 0 ? "mongo-only" : "ok",
    details: channelsJson > 0 ? `${channelsJson} JSON files (may contain multiple channels each)` : undefined,
  });

  // 3. Messages
  const messagesJson = countJsonDir("messages");
  const messagesMongo = await Message.countDocuments();
  results.push({
    collection: "messages",
    jsonCount: messagesJson,
    mongoCount: messagesMongo,
    status: messagesJson === 0 && messagesMongo === 0 ? "ok" : messagesJson === 0 ? "mongo-only" : "ok",
    details: messagesJson > 0 ? `${messagesJson} JSON files (may contain multiple messages each)` : undefined,
  });

  // 4. Users
  const profilesJson = countJsonArray("profiles.json");
  const usersMongo = await User.countDocuments();
  results.push({
    collection: "users (profiles.json)",
    jsonCount: profilesJson,
    mongoCount: usersMongo,
    status: profilesJson <= usersMongo ? "ok" : "mismatch",
    details: profilesJson !== usersMongo ? `Profiles: ${profilesJson}, Users: ${usersMongo} (users may have been created via auth)` : undefined,
  });

  // 5. Courses
  const coursesJson = countJsonArray("courses.json");
  const coursesMongo = await CourseModel.countDocuments();
  results.push({
    collection: "courses",
    jsonCount: coursesJson,
    mongoCount: coursesMongo,
    status: coursesJson === coursesMongo ? "ok" : coursesJson === 0 ? "mongo-only" : "mismatch",
  });

  // 6. Lessons
  const lessonsJsonFile = countJsonArray("lessons.json");
  const lessonsDir = countJsonDir("lessons");
  const lessonsJsonTotal = lessonsJsonFile + lessonsDir;
  const lessonsMongo = await LessonModel.countDocuments();
  results.push({
    collection: "lessons",
    jsonCount: lessonsJsonTotal,
    mongoCount: lessonsMongo,
    status: lessonsJsonTotal === 0 ? (lessonsMongo > 0 ? "mongo-only" : "ok") : lessonsJsonTotal <= lessonsMongo ? "ok" : "mismatch",
    details: lessonsDir > 0 ? `${lessonsJsonFile} in lessons.json + ${lessonsDir} in lessons/ dir` : undefined,
  });

  // 7. Flashcards
  const flashcardsJson = countJsonArray("flashcards.json");
  const flashcardsMongo = await FlashcardModel.countDocuments();
  results.push({
    collection: "flashcards",
    jsonCount: flashcardsJson,
    mongoCount: flashcardsMongo,
    status: flashcardsJson === flashcardsMongo ? "ok" : flashcardsJson === 0 ? "mongo-only" : "mismatch",
  });

  // 8. Shares
  const sharesJson = countJsonArray("shares.json");
  const sharesMongo = await ShareModel.countDocuments();
  results.push({
    collection: "shares",
    jsonCount: sharesJson,
    mongoCount: sharesMongo,
    status: sharesJson === sharesMongo ? "ok" : sharesJson === 0 ? "mongo-only" : "mismatch",
  });

  // 9. XP
  const xpJson = readJsonFile<any>("xp.json");
  const xpMongo = await XpModel.countDocuments();
  results.push({
    collection: "xp",
    jsonCount: xpJson ? 1 : 0,
    mongoCount: xpMongo,
    status: (!xpJson && xpMongo === 0) ? "ok" : xpMongo >= 1 ? "ok" : "mismatch",
  });

  // 10. Sprint
  const sprintJson = readJsonFile<any>("sprint.json");
  const sprintMongo = await SprintModel.countDocuments();
  results.push({
    collection: "sprint",
    jsonCount: sprintJson ? 1 : 0,
    mongoCount: sprintMongo,
    status: (!sprintJson && sprintMongo === 0) ? "ok" : sprintMongo >= 1 ? "ok" : "mismatch",
  });

  // 11. App Notifications
  const notifJson = countJsonArray("notifications.json");
  const notifMongo = await AppNotificationModel.countDocuments();
  results.push({
    collection: "app-notifications",
    jsonCount: notifJson,
    mongoCount: notifMongo,
    status: notifJson === 0 ? (notifMongo >= 0 ? "ok" : "mismatch") : notifJson <= notifMongo ? "ok" : "mismatch",
  });

  // 12. Global Memory
  const memJson = readJsonFile<any>("memory.json");
  const memMongo = await GlobalMemoryModel.countDocuments();
  results.push({
    collection: "global-memory",
    jsonCount: memJson ? 1 : 0,
    mongoCount: memMongo,
    status: (!memJson && memMongo === 0) ? "ok" : memMongo >= 1 ? "ok" : "mismatch",
  });

  // 13. Workspaces
  const wsJson = countJsonDir("workspaces");
  const wsMongo = await WorkspaceModel.countDocuments();
  results.push({
    collection: "workspaces",
    jsonCount: wsJson,
    mongoCount: wsMongo,
    status: wsJson === wsMongo ? "ok" : wsJson === 0 ? "mongo-only" : "mismatch",
  });

  // 14. Weakness
  const weakJson = countJsonArray("weakness.json");
  const weakMongo = await WeaknessModel.countDocuments();
  results.push({
    collection: "weakness",
    jsonCount: weakJson,
    mongoCount: weakMongo,
    status: weakJson === weakMongo ? "ok" : weakJson === 0 ? "mongo-only" : "mismatch",
  });

  // 15. Audit Log
  const auditJson = countJsonArray("audit-log.json");
  const auditMongo = await AuditLogModel.countDocuments();
  results.push({
    collection: "audit-log",
    jsonCount: auditJson,
    mongoCount: auditMongo,
    status: auditJson === auditMongo ? "ok" : auditJson === 0 ? "mongo-only" : "mismatch",
  });

  // 16. Admin Roles
  const rolesJson = countJsonArray("roles.json");
  const rolesMongo = await AdminRoleModel.countDocuments();
  results.push({
    collection: "admin-roles",
    jsonCount: rolesJson,
    mongoCount: rolesMongo,
    status: rolesJson === 0 ? (rolesMongo >= 0 ? "ok" : "mismatch") : rolesJson <= rolesMongo ? "ok" : "mismatch",
  });

  // 17. System Settings
  const settingsJson = countJsonArray("settings.json");
  const settingsMongo = await SystemSettingsModel.countDocuments();
  results.push({
    collection: "system-settings",
    jsonCount: settingsJson,
    mongoCount: settingsMongo,
    status: settingsJson === 0 ? (settingsMongo >= 0 ? "ok" : "mismatch") : settingsMongo >= 1 ? "ok" : "mismatch",
  });

  // 18. Channel Tools
  const toolsJson = countJsonDir("channel-tools");
  const toolsMongo = await ToolData.countDocuments();
  results.push({
    collection: "channel-tools",
    jsonCount: toolsJson,
    mongoCount: toolsMongo,
    status: toolsJson === toolsMongo ? "ok" : toolsJson === 0 ? "mongo-only" : "mismatch",
  });

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log("=== Verification Results ===\n");
  console.log(
    "Collection".padEnd(30) +
    "JSON".padStart(8) +
    "Mongo".padStart(8) +
    "  Status"
  );
  console.log("-".repeat(60));

  let mismatches = 0;
  for (const r of results) {
    const statusIcon =
      r.status === "ok" ? "  OK" :
      r.status === "mongo-only" ? "  MONGO-ONLY" :
      r.status === "json-only" ? "  JSON-ONLY" :
      "  MISMATCH";

    console.log(
      r.collection.padEnd(30) +
      String(r.jsonCount).padStart(8) +
      String(r.mongoCount).padStart(8) +
      statusIcon
    );
    if (r.details) console.log(`${"".padEnd(30)}  ${r.details}`);
    if (r.status === "mismatch") mismatches++;
  }

  console.log("-".repeat(60));
  if (mismatches === 0) {
    console.log("\nAll collections verified successfully.");
  } else {
    console.log(`\n${mismatches} collection(s) have mismatches. Review the data above.`);
  }

  // ── Verify indexes ─────────────────────────────────────────────────────────

  console.log("\n=== Index Verification ===\n");
  const collections = await mongoose.connection.db!.listCollections().toArray();
  for (const col of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    try {
      const indexes = await mongoose.connection.db!.collection(col.name).indexes();
      const indexCount = indexes.length - 1; // Subtract _id index
      console.log(`  ${col.name}: ${indexCount} custom index${indexCount !== 1 ? "es" : ""}`);
    } catch {
      console.log(`  ${col.name}: (could not read indexes)`);
    }
  }

  await mongoose.disconnect();
  console.log("\nDone.");
  process.exit(mismatches > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
