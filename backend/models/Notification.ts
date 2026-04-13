import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  userId: string;
  type: "mention" | "friend_request" | "room_invite" | "system";
  title: string;
  message: string;
  roomId?: string;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: ["mention", "friend_request", "room_invite", "system"], required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    roomId: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for listing user's unread notifications sorted by newest first
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// TTL index: automatically delete notifications older than 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>("Notification", notificationSchema);
