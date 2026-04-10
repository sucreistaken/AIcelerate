import mongoose, { Schema } from "mongoose";

const lessonSchema = new Schema(
  {
    _id: { type: String, required: true },
    title: { type: String, default: "Untitled Lecture" },
    date: String,
    transcript: { type: String, default: "" },
    slideText: { type: String, default: "" },
    plan: { type: Schema.Types.Mixed },
    summary: String,
    highlights: [String],
    professorEmphases: [Schema.Types.Mixed],
    quiz: [Schema.Types.Mixed],
    cheatSheet: { type: Schema.Types.Mixed },
    quizPacks: [Schema.Types.Mixed],
    progress: { type: Schema.Types.Mixed },
    courseId: String,
    courseCode: String,
    learningOutcomes: [String],
    loAlignment: { type: Schema.Types.Mixed },
    loModules: { type: Schema.Types.Mixed },
    mindmapCache: { type: Schema.Types.Mixed },
    mindmapModuleCache: { type: Schema.Types.Mixed },
    deviation: { type: Schema.Types.Mixed },
    digest: { type: Schema.Types.Mixed },
  },
  { timestamps: true, _id: false }
);

// ── Indexes for frequent queries ──
lessonSchema.index({ courseId: 1, createdAt: -1 }); // "All lessons for course X" (newest first)
lessonSchema.index({ courseCode: 1 });                // Lookup by course code

export const LessonModel = mongoose.model("Lesson", lessonSchema);
