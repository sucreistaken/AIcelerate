import mongoose, { Schema, Document } from "mongoose";

export interface IMaterial extends Document {
  roomId: string;
  uploadedBy: string;
  pdfPath?: string;
  audioPath?: string;
  transcript?: string;
  slideText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const materialSchema = new Schema<IMaterial>(
  {
    roomId: { type: String, required: true },
    uploadedBy: { type: String, required: true },
    pdfPath: String,
    audioPath: String,
    transcript: String,
    slideText: String,
  },
  { timestamps: true }
);

// ── Indexes for frequent queries ──
materialSchema.index({ uploadedBy: 1 });                   // User's uploads
materialSchema.index({ roomId: 1, createdAt: -1 });        // Room materials (newest first)

export const Material = mongoose.model<IMaterial>("Material", materialSchema);
