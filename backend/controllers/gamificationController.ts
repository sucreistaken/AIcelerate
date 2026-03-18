import { Request, Response } from "express";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(__dirname, "..", "data", "xp.json");

interface XpEntry {
  action: string;
  amount: number;
  timestamp: number;
}

interface XpData {
  totalXp: number;
  streakDays: number;
  lastActiveDate: string | null;
  history: XpEntry[];
}

function readData(): XpData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    }
  } catch {}
  return { totalXp: 0, streakDays: 0, lastActiveDate: null, history: [] };
}

function writeData(data: XpData) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

const XP_AMOUNTS: Record<string, number> = {
  "quiz-answer": 10,
  "flashcard-review": 5,
  "deep-dive-ask": 3,
  "plan-create": 20,
  "cheat-sheet-create": 15,
  "mindmap-learn": 2,
  "note-create": 2,
};

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export async function addXp(req: Request, res: Response) {
  const { action, amount: customAmount } = req.body;
  if (!action) {
    return res.status(400).json({ ok: false, error: "action is required" });
  }

  const amount = customAmount ?? XP_AMOUNTS[action] ?? 0;
  const data = readData();

  data.totalXp += amount;
  data.history.push({ action, amount, timestamp: Date.now() });

  // Keep only last 500 events
  if (data.history.length > 500) {
    data.history = data.history.slice(-500);
  }

  // Streak logic
  const today = todayStr();
  if (data.lastActiveDate !== today) {
    if (data.lastActiveDate === yesterdayStr()) {
      data.streakDays += 1;
    } else {
      data.streakDays = 1;
    }
    data.lastActiveDate = today;
  }

  writeData(data);

  res.json({
    ok: true,
    totalXp: data.totalXp,
    earned: amount,
    streakDays: data.streakDays,
  });
}

export async function getStats(_req: Request, res: Response) {
  const data = readData();

  // Check if streak is still valid
  const today = todayStr();
  if (data.lastActiveDate && data.lastActiveDate !== today && data.lastActiveDate !== yesterdayStr()) {
    data.streakDays = 0;
  }

  const todayStart = new Date(today).getTime();
  const todayXp = data.history
    .filter((e) => e.timestamp >= todayStart)
    .reduce((sum, e) => sum + e.amount, 0);

  res.json({
    ok: true,
    totalXp: data.totalXp,
    streakDays: data.streakDays,
    todayXp,
    lastActiveDate: data.lastActiveDate,
    recentHistory: data.history.slice(-20),
  });
}
