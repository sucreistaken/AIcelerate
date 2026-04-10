import mongoose, { Schema, Document } from "mongoose";

export interface IJob extends Document {
  type: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "completed" | "failed" | "dead";
  result?: Record<string, unknown>;
  error?: string;
  attempts: number;
  maxAttempts: number;
  processedAt?: Date;
}

const jobSchema = new Schema<IJob>(
  {
    type: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "dead"],
      default: "pending",
      index: true,
    },
    result: { type: Schema.Types.Mixed },
    error: { type: String },
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    processedAt: { type: Date },
  },
  { timestamps: true },
);

// TTL index: auto-delete completed/dead jobs after 7 days
jobSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60, partialFilterExpression: { status: { $in: ["completed", "dead"] } } });
// Compound index for polling pending jobs
jobSchema.index({ status: 1, createdAt: 1 });

export const Job = mongoose.model<IJob>("Job", jobSchema);
