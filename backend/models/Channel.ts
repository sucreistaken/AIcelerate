import mongoose, { Schema, Document } from "mongoose";

export interface IChannel extends Document {
  roomId: string;
  categoryId: string;
  name: string;
  type: "text" | "study-tool" | "announcement";
  toolType?: "quiz" | "flashcards" | "deep-dive" | "mind-map" | "sprint" | "notes";
  lessonId?: string;
  lessonTitle?: string;
  pinnedMessageIds: string[];
  lastMessageAt: Date;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const channelSchema = new Schema<IChannel>(
  {
    roomId: { type: String, required: true },
    categoryId: { type: String, default: "" },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    type: { type: String, enum: ["text", "study-tool", "announcement"], required: true },
    toolType: { type: String, enum: ["quiz", "flashcards", "deep-dive", "mind-map", "sprint", "notes"] },
    lessonId: String,
    lessonTitle: String,
    pinnedMessageIds: { type: [String], default: [] },
    lastMessageAt: { type: Date, default: Date.now },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        ret.serverId = ret.roomId; // Backward compat alias
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
channelSchema.index({ roomId: 1, type: 1 });
channelSchema.index({ roomId: 1, categoryId: 1 });

export const Channel = mongoose.model<IChannel>("Channel", channelSchema);
