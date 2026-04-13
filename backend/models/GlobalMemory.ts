import mongoose, { Schema, Document } from "mongoose";

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface IEmphasisEntry {
  statement: string;
  why: string;
  confidence?: number;
}

export interface IConceptConnection {
  concept: string;
  lessonIds: string[];
  lessonTitles: string[];
  strength: number;
  relatedConcepts: string[];
  aiInsight?: string;
}

export interface IGlobalMemory extends Document {
  userId: string;
  recurringConcepts: string[];
  recentEmphases: IEmphasisEntry[];
  connections: IConceptConnection[];
  lastUpdated: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ────────────────────────────────────────────────────────────────────

const emphasisEntrySchema = new Schema<IEmphasisEntry>(
  {
    statement: { type: String, required: true },
    why: { type: String, required: true },
    confidence: Number,
  },
  { _id: false }
);

const connectionSchema = new Schema<IConceptConnection>(
  {
    concept: { type: String, required: true },
    lessonIds: { type: [String], default: [] },
    lessonTitles: { type: [String], default: [] },
    strength: { type: Number, default: 0 },
    relatedConcepts: { type: [String], default: [] },
    aiInsight: String,
  },
  { _id: false }
);

const globalMemorySchema = new Schema<IGlobalMemory>(
  {
    userId: { type: String, required: true, unique: true },
    recurringConcepts: { type: [String], default: [] },
    recentEmphases: { type: [emphasisEntrySchema], default: [] },
    connections: { type: [connectionSchema], default: [] },
    lastUpdated: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
// Text search on recurring concepts
globalMemorySchema.index({ recurringConcepts: 1 });
// Connection strength for sorting (within embedded array, helps aggregation)
globalMemorySchema.index({ "connections.strength": -1 });

export const GlobalMemoryModel = mongoose.model<IGlobalMemory>("GlobalMemory", globalMemorySchema);
