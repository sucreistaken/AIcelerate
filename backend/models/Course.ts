import mongoose, { Schema } from "mongoose";

const courseSchema = new Schema(
  {
    _id: { type: String, required: true },
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    lessonIds: [String],
    learningOutcomes: [String],
    knowledgeIndex: { type: Schema.Types.Mixed },
    settings: {
      language: { type: String, enum: ["tr", "en"], default: "en" },
      examDate: String,
    },
  },
  { timestamps: true, _id: false }
);

courseSchema.index({ code: 1 });
courseSchema.index({ "lessonIds": 1 });
courseSchema.index({ createdAt: -1 });

export const CourseModel = mongoose.model("Course", courseSchema);
