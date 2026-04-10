import mongoose, { Schema, Document } from "mongoose";

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface MessageEmbed {
  type: "tool-result" | "quiz-score" | "achievement";
  title: string;
  description: string;
  color?: string;
  fields?: { name: string; value: string }[];
}

export interface IMessage extends Document {
  channelId: string;
  roomId: string;
  authorId: string;
  content: string;
  type: "text" | "system" | "file" | "embed";
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  embeds: MessageEmbed[];
  replyToId?: string;
  threadId?: string;
  replyCount: number;
  mentions: string[];
  reactions: MessageReaction[];
  pinned: boolean;
  edited: boolean;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const reactionSchema = new Schema<MessageReaction>(
  {
    emoji: { type: String, required: true },
    userIds: { type: [String], default: [] },
  },
  { _id: false }
);

const embedSchema = new Schema<MessageEmbed>(
  {
    type: { type: String, enum: ["tool-result", "quiz-score", "achievement"], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    color: String,
    fields: [{ name: String, value: String }],
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    channelId: { type: String, required: true },
    roomId: { type: String, default: "" },
    authorId: { type: String, required: true },
    content: { type: String, required: true, maxlength: 4000 },
    type: { type: String, enum: ["text", "system", "file", "embed"], default: "text" },
    fileUrl: String,
    fileName: String,
    fileType: String,
    embeds: { type: [embedSchema], default: [] },
    replyToId: String,
    threadId: String,
    replyCount: { type: Number, default: 0 },
    mentions: { type: [String], default: [] },
    reactions: { type: [reactionSchema], default: [] },
    pinned: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────────
messageSchema.index({ channelId: 1, deleted: 1, createdAt: -1 }); // Main query: messages by channel
messageSchema.index({ channelId: 1, threadId: 1, createdAt: 1 }); // Thread queries
messageSchema.index({ roomId: 1 }); // Cascade delete
messageSchema.index({ authorId: 1 }); // User message lookups

export const Message = mongoose.model<IMessage>("Message", messageSchema);
