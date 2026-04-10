import mongoose, { Schema } from "mongoose";

const shareSchema = new Schema(
  {
    _id: { type: String, required: true },
    createdBy: { type: String, default: "anonymous" },
    lessonId: { type: String, required: true },
    expiresAt: String,
    bundle: {
      title: String,
      plan: Schema.Types.Mixed,
      cheatSheet: Schema.Types.Mixed,
      quiz: [String],
      loModules: [Schema.Types.Mixed],
      emphases: [Schema.Types.Mixed],
      notes: [String],
      weakTopics: [Schema.Types.Mixed],
    },
    comments: [
      {
        author: String,
        text: String,
        createdAt: { type: String, default: () => new Date().toISOString() },
      },
    ],
    accessCount: { type: Number, default: 0 },
  },
  { timestamps: true, _id: false }
);

// ── Indexes for frequent queries ──
shareSchema.index({ lessonId: 1 });                        // Shares for a lesson
shareSchema.index({ createdBy: 1, createdAt: -1 });        // User's shares (newest first)

export const ShareModel = mongoose.model("Share", shareSchema);
