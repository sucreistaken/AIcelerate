import mongoose, { Schema } from "mongoose";

const studyTaskSchema = new Schema(
  {
    id: String,
    courseId: String,
    lessonId: String,
    topicName: String,
    taskType: {
      type: String,
      enum: ["review-weakness", "flashcard-review", "quiz-practice", "deep-dive", "revision"],
    },
    reason: String,
    estimatedMinutes: Number,
    score: Number,
    completed: { type: Boolean, default: false },
  },
  { _id: false }
);

const dailyPlanSchema = new Schema(
  {
    id: String,
    courseId: String,
    date: String,
    generatedAt: String,
    tasks: [studyTaskSchema],
    totalEstimatedMinutes: Number,
    summary: String,
  },
  { _id: false }
);

const scheduleSchema = new Schema(
  {
    _id: { type: String, required: true },
    dailyPlans: [dailyPlanSchema],
    streak: {
      currentStreak: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      lastStudyDate: String,
      studyDates: [String],
    },
    completedTasks: [String],
  },
  { timestamps: true, _id: false }
);

export const ScheduleModel = mongoose.model("Schedule", scheduleSchema);
