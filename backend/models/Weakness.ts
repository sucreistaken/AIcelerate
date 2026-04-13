import mongoose, { Schema, Document } from "mongoose";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ITopicScore {
  topicName: string;
  moduleIndex?: number;
  loId?: string;
  totalQuestions: number;
  correctAnswers: number;
  ratio: number;
  isWeak: boolean;
  sources: string[];
  lastAttemptDate: string;
  trend: "improving" | "stable" | "declining";
}

export interface IWeaknessAnalysis extends Document {
  lessonId: string;
  lessonTitle: string;
  userId: string;
  topics: ITopicScore[];
  analyzedAt: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const topicScoreSchema = new Schema<ITopicScore>(
  {
    topicName: { type: String, required: true },
    moduleIndex: Number,
    loId: String,
    totalQuestions: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    ratio: { type: Number, default: 0 },
    isWeak: { type: Boolean, default: false },
    sources: { type: [String], default: [] },
    lastAttemptDate: String,
    trend: { type: String, enum: ["improving", "stable", "declining"], default: "stable" },
  },
  { _id: false }
);

const weaknessAnalysisSchema = new Schema<IWeaknessAnalysis>(
  {
    lessonId: { type: String, required: true },
    lessonTitle: { type: String, default: "" },
    userId: { type: String, required: true },
    topics: { type: [topicScoreSchema], default: [] },
    analyzedAt: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Primary query: weakness analysis for a specific user's lesson
weaknessAnalysisSchema.index({ userId: 1, lessonId: 1 }, { unique: true });
// Weak topics query: find all weak topics across lessons
weaknessAnalysisSchema.index({ userId: 1, "topics.isWeak": 1 });
// Sort by analysis time
weaknessAnalysisSchema.index({ analyzedAt: -1 });

export const WeaknessModel = mongoose.model<IWeaknessAnalysis>("Weakness", weaknessAnalysisSchema);
