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

export const FlashcardModel = mongoose.model("Flashcard", flashcardSchema);
