import mongoose, { Schema } from "mongoose";

const flashcardSchema = new Schema(
  {
    _id: { type: String, required: true },
    lessonId: { type: String, required: true },
    topicName: String,
    front: { type: String, required: true },
    back: { type: String, required: true },
    source: {
      type: String,
      enum: ["emphasis", "cheatsheet", "miniQuiz", "loModule", "ai-generated"],
      default: "ai-generated",
    },
    interval: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: String,
    state: {
      type: String,
      enum: ["new", "learning", "review", "graduated"],
      default: "new",
    },
    lastReviewedAt: String,
  },
  { timestamps: true, _id: false }
);

// ── Indexes for frequent queries ──
flashcardSchema.index({ lessonId: 1 });                    // Per-lesson flashcard fetch
flashcardSchema.index({ lessonId: 1, state: 1 });          // SM-2: "due cards for lesson X"
flashcardSchema.index({ state: 1, nextReviewDate: 1 });    // Global due cards query
flashcardSchema.index({ topicName: 1 });                    // Scheduler groups cards by topic
flashcardSchema.index({ source: 1 });                       // Filter by source type

export const FlashcardModel = mongoose.model("Flashcard", flashcardSchema);
