import mongoose, { Schema, Document } from "mongoose";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ISprintSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  lessonId?: string;
  status: "studying" | "break" | "completed" | "abandoned";
  pomodorosCompleted: number;
  topicsCovered: string[];
  totalStudyMinutes: number;
}

export interface ISprintSettings {
  studyDurationMin: number;
  breakDurationMin: number;
  examDate?: string;
  intensiveMode: boolean;
}

export interface ISprint extends Document {
  userId: string;
  settings: ISprintSettings;
  sessions: ISprintSession[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const sprintSessionSchema = new Schema<ISprintSession>(
  {
    id: { type: String, required: true },
    startedAt: { type: String, required: true },
    endedAt: String,
    lessonId: String,
    status: {
      type: String,
      enum: ["studying", "break", "completed", "abandoned"],
      default: "studying",
    },
    pomodorosCompleted: { type: Number, default: 0 },
    topicsCovered: { type: [String], default: [] },
    totalStudyMinutes: { type: Number, default: 0 },
  },
  { _id: false }
);

const sprintSettingsSchema = new Schema<ISprintSettings>(
  {
    studyDurationMin: { type: Number, default: 40 },
    breakDurationMin: { type: Number, default: 10 },
    examDate: String,
    intensiveMode: { type: Boolean, default: false },
  },
  { _id: false }
);

const sprintSchema = new Schema<ISprint>(
  {
    userId: { type: String, required: true, unique: true },
    settings: { type: sprintSettingsSchema, default: () => ({ studyDurationMin: 40, breakDurationMin: 10, intensiveMode: false }) },
    sessions: { type: [sprintSessionSchema], default: [] },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sprintSchema.index({ "sessions.startedAt": -1 });      // Recent sessions query
sprintSchema.index({ "sessions.lessonId": 1 });         // Sessions per lesson

export const SprintModel = mongoose.model<ISprint>("Sprint", sprintSchema);
