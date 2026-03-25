import mongoose, { Schema } from "mongoose";

const quizItemSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["why", "tf"], required: true },
    lessonId: String,
    prompt: { type: String, required: true },
    expected_keywords: [String],
    expected_tf: Boolean,
  },
  { _id: false }
);

const quizPackSchema = new Schema(
  {
    _id: { type: String, required: true },
    items: [quizItemSchema],
  },
  { timestamps: true, _id: false }
);

export const QuizModel = mongoose.model("Quiz", quizPackSchema);
