import mongoose, { Schema, Document } from "mongoose";

// ── Sub-document Interfaces ──────────────────────────────────────────────────

export interface IMessageReaction {
  userId: string;
  type: "helpful";
}

export interface ISharedChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  reactions: IMessageReaction[];
  savedAsInsight: boolean;
}

export interface ISharedInsight {
  id: string;
  text: string;
  sourceMessageId: string;
  savedBy: string;
  savedByNickname: string;
  tags: string[];
  timestamp: string;
}

export interface IFlashcardVote {
  userId: string;
  vote: "up" | "down";
}

export interface ISharedFlashcard {
  id: string;
  front: string;
  back: string;
  topicName: string;
  createdBy: string;
  createdByNickname: string;
  createdAt: string;
  editedBy?: string;
  editedByNickname?: string;
  editedAt?: string;
  votes: IFlashcardVote[];
  source: "manual" | "ai-generated";
}

export interface IAnnotationReply {
  id: string;
  text: string;
  authorId: string;
  authorNickname: string;
  timestamp: string;
}

export interface IMindMapAnnotation {
  id: string;
  nodeLabel: string;
  type: "note" | "question" | "example" | "understood";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  replies: IAnnotationReply[];
}

export interface ISharedNote {
  id: string;
  title: string;
  content: string;
  category: "concept" | "formula" | "example" | "tip" | "warning" | "summary";
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  createdAt: string;
  editedAt?: string;
  editedBy?: string;
  editedByNickname?: string;
  source?: "manual" | "deep-dive" | "mind-map";
  sourceId?: string;
  pinned: boolean;
}

// ── Main Interface ───────────────────────────────────────────────────────────

export interface IWorkspace extends Document {
  roomId: string;
  deepDive: {
    messages: ISharedChatMessage[];
    savedInsights: ISharedInsight[];
  };
  flashcards: ISharedFlashcard[];
  mindMapAnnotations: IMindMapAnnotation[];
  notes: ISharedNote[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const reactionSchema = new Schema<IMessageReaction>(
  { userId: { type: String, required: true }, type: { type: String, default: "helpful" } },
  { _id: false }
);

const chatMessageSchema = new Schema<ISharedChatMessage>(
  {
    id: { type: String, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    authorNickname: { type: String, default: "" },
    authorAvatar: { type: String, default: "" },
    timestamp: { type: String, required: true },
    reactions: { type: [reactionSchema], default: [] },
    savedAsInsight: { type: Boolean, default: false },
  },
  { _id: false }
);

const insightSchema = new Schema<ISharedInsight>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    sourceMessageId: { type: String, required: true },
    savedBy: { type: String, required: true },
    savedByNickname: { type: String, default: "" },
    tags: { type: [String], default: [] },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const flashcardVoteSchema = new Schema<IFlashcardVote>(
  { userId: { type: String, required: true }, vote: { type: String, enum: ["up", "down"], required: true } },
  { _id: false }
);

const sharedFlashcardSchema = new Schema<ISharedFlashcard>(
  {
    id: { type: String, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    topicName: { type: String, default: "" },
    createdBy: { type: String, required: true },
    createdByNickname: { type: String, default: "" },
    createdAt: { type: String, required: true },
    editedBy: String,
    editedByNickname: String,
    editedAt: String,
    votes: { type: [flashcardVoteSchema], default: [] },
    source: { type: String, enum: ["manual", "ai-generated"], default: "manual" },
  },
  { _id: false }
);

const annotationReplySchema = new Schema<IAnnotationReply>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    authorNickname: { type: String, default: "" },
    timestamp: { type: String, required: true },
  },
  { _id: false }
);

const mindMapAnnotationSchema = new Schema<IMindMapAnnotation>(
  {
    id: { type: String, required: true },
    nodeLabel: { type: String, required: true },
    type: { type: String, enum: ["note", "question", "example", "understood"], required: true },
    text: { type: String, required: true },
    authorId: { type: String, required: true },
    authorNickname: { type: String, default: "" },
    authorAvatar: { type: String, default: "" },
    timestamp: { type: String, required: true },
    replies: { type: [annotationReplySchema], default: [] },
  },
  { _id: false }
);

const sharedNoteSchema = new Schema<ISharedNote>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ["concept", "formula", "example", "tip", "warning", "summary"],
      default: "concept",
    },
    authorId: { type: String, required: true },
    authorNickname: { type: String, default: "" },
    authorAvatar: { type: String, default: "" },
    createdAt: { type: String, required: true },
    editedAt: String,
    editedBy: String,
    editedByNickname: String,
    source: { type: String, enum: ["manual", "deep-dive", "mind-map"] },
    sourceId: String,
    pinned: { type: Boolean, default: false },
  },
  { _id: false }
);

// ── Main Schema ──────────────────────────────────────────────────────────────

const workspaceSchema = new Schema<IWorkspace>(
  {
    roomId: { type: String, required: true, unique: true },
    deepDive: {
      messages: { type: [chatMessageSchema], default: [] },
      savedInsights: { type: [insightSchema], default: [] },
    },
    flashcards: { type: [sharedFlashcardSchema], default: [] },
    mindMapAnnotations: { type: [mindMapAnnotationSchema], default: [] },
    notes: { type: [sharedNoteSchema], default: [] },
  },
  { timestamps: true }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// roomId is already unique in schema, covers primary lookup
// Additional indexes for querying within embedded arrays during aggregation
workspaceSchema.index({ "notes.authorId": 1 });
workspaceSchema.index({ "flashcards.topicName": 1 });

export const WorkspaceModel = mongoose.model<IWorkspace>("Workspace", workspaceSchema);
