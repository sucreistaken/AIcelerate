import mongoose, { Schema, Document } from "mongoose";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface IXpEntry {
  action: string;
  amount: number;
  timestamp: number;
}

export interface IXpData extends Document {
  userId: string;
  totalXp: number;
  streakDays: number;
  lastActiveDate: string | null;
  history: IXpEntry[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const xpEntrySchema = new Schema<IXpEntry>(
  {
    action: { type: String, required: true },
    amount: { type: Number, required: true },
    timestamp: { type: Number, required: true },
  },
  { _id: false }
);

const xpSchema = new Schema<IXpData>(
  {
    userId: { type: String, required: true, unique: true },
    totalXp: { type: Number, default: 0 },
    streakDays: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null },
    history: { type: [xpEntrySchema], default: [] },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
xpSchema.index({ totalXp: -1 });                // Leaderboard queries
xpSchema.index({ streakDays: -1 });              // Streak leaderboard
xpSchema.index({ lastActiveDate: 1 });           // Active user queries

export const XpModel = mongoose.model<IXpData>("Xp", xpSchema);
