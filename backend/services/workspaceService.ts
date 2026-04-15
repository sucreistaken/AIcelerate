// services/workspaceService.ts
// MongoDB-backed workspace persistence using atomic operations.

import { WorkspaceModel, IWorkspace } from "../models/Workspace";
import { generateId as genId } from "../utils/idGenerator";

// ====== Types (canonical location) ======

export interface MessageReaction {
  userId: string;
  type: "helpful";
}

export interface SharedChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  reactions: MessageReaction[];
  savedAsInsight: boolean;
}

export interface SharedInsight {
  id: string;
  text: string;
  sourceMessageId: string;
  savedBy: string;
  savedByNickname: string;
  tags: string[];
  timestamp: string;
}

export interface SharedDeepDiveState {
  messages: SharedChatMessage[];
  savedInsights: SharedInsight[];
}

export interface FlashcardVote {
  userId: string;
  vote: "up" | "down";
}

export interface SharedFlashcard {
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
  votes: FlashcardVote[];
  source: "manual" | "ai-generated";
}

export interface AnnotationReply {
  id: string;
  text: string;
  authorId: string;
  authorNickname: string;
  timestamp: string;
}

export interface MindMapAnnotation {
  id: string;
  nodeLabel: string;
  type: "note" | "question" | "example" | "understood";
  text: string;
  authorId: string;
  authorNickname: string;
  authorAvatar: string;
  timestamp: string;
  replies: AnnotationReply[];
}

export interface SharedNote {
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

export interface RoomWorkspace {
  deepDive: SharedDeepDiveState;
  flashcards: SharedFlashcard[];
  mindMapAnnotations: MindMapAnnotation[];
  notes: SharedNote[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function toPlain(doc: IWorkspace): RoomWorkspace {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    deepDive: obj.deepDive ?? { messages: [], savedInsights: [] },
    flashcards: obj.flashcards ?? [],
    mindMapAnnotations: obj.mindMapAnnotations ?? [],
    notes: obj.notes ?? [],
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export const workspaceService = {
  // ── Workspace CRUD ───────────────────────────────────────────────────────

  async getWorkspace(roomId: string): Promise<RoomWorkspace> {
    let ws = await WorkspaceModel.findOne({ roomId });
    if (!ws) {
      ws = await WorkspaceModel.create({
        roomId,
        deepDive: { messages: [], savedInsights: [] },
        flashcards: [],
        mindMapAnnotations: [],
        notes: [],
      });
    }
    return toPlain(ws);
  },

  async deleteWorkspace(roomId: string): Promise<void> {
    await WorkspaceModel.deleteOne({ roomId });
  },

  // ── Deep Dive ────────────────────────────────────────────────────────────

  async addDeepDiveMessage(roomId: string, message: SharedChatMessage): Promise<void> {
    await WorkspaceModel.findOneAndUpdate(
      { roomId },
      {
        $push: {
          "deepDive.messages": { $each: [message], $slice: -500 },
        },
      },
      { upsert: true },
    );
  },

  async addDeepDiveReaction(
    roomId: string,
    messageId: string,
    userId: string,
  ): Promise<MessageReaction[]> {
    // Need to load-modify-save because we toggle based on existing state
    const ws = await WorkspaceModel.findOne({ roomId });
    if (!ws) return [];

    const msg = ws.deepDive.messages.find((m) => m.id === messageId);
    if (!msg) return [];

    const existingIdx = msg.reactions.findIndex((r) => r.userId === userId);
    if (existingIdx >= 0) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ userId, type: "helpful" });
    }

    await ws.save();
    return msg.reactions;
  },

  async saveInsight(
    roomId: string,
    messageId: string,
    savedBy: string,
    savedByNickname: string,
    tags: string[],
  ): Promise<SharedInsight | null> {
    const ws = await WorkspaceModel.findOne({ roomId });
    if (!ws) return null;

    const msg = ws.deepDive.messages.find((m) => m.id === messageId);
    if (!msg) return null;

    msg.savedAsInsight = true;

    const insight: SharedInsight = {
      id: genId("insight"),
      text: msg.text,
      sourceMessageId: messageId,
      savedBy,
      savedByNickname,
      tags,
      timestamp: new Date().toISOString(),
    };
    ws.deepDive.savedInsights.push(insight);

    await ws.save();
    return insight;
  },

  // ── Flashcards ───────────────────────────────────────────────────────────

  async addFlashcard(
    roomId: string,
    card: Omit<SharedFlashcard, "id" | "createdAt" | "votes">,
  ): Promise<SharedFlashcard> {
    const newCard: SharedFlashcard = {
      ...card,
      id: genId("fc"),
      createdAt: new Date().toISOString(),
      votes: [],
    };

    await WorkspaceModel.findOneAndUpdate(
      { roomId },
      { $push: { flashcards: newCard } },
      { upsert: true },
    );

    return newCard;
  },

  async updateFlashcard(
    roomId: string,
    cardId: string,
    updates: { front?: string; back?: string; topicName?: string },
    editedBy: string,
    editedByNickname: string,
  ): Promise<SharedFlashcard | null> {
    const setFields: Record<string, unknown> = {
      "flashcards.$.editedBy": editedBy,
      "flashcards.$.editedByNickname": editedByNickname,
      "flashcards.$.editedAt": new Date().toISOString(),
    };
    if (updates.front !== undefined) setFields["flashcards.$.front"] = updates.front;
    if (updates.back !== undefined) setFields["flashcards.$.back"] = updates.back;
    if (updates.topicName !== undefined) setFields["flashcards.$.topicName"] = updates.topicName;

    const ws = await WorkspaceModel.findOneAndUpdate(
      { roomId, "flashcards.id": cardId },
      { $set: setFields },
      { returnDocument: 'after' },
    );

    if (!ws) return null;
    return ws.flashcards.find((c) => c.id === cardId) as SharedFlashcard | undefined ?? null;
  },

  async deleteFlashcard(roomId: string, cardId: string): Promise<boolean> {
    const result = await WorkspaceModel.updateOne(
      { roomId },
      { $pull: { flashcards: { id: cardId } } },
    );
    return result.modifiedCount > 0;
  },

  async voteFlashcard(
    roomId: string,
    cardId: string,
    userId: string,
    vote: "up" | "down",
  ): Promise<FlashcardVote[]> {
    // Toggle logic requires load-modify-save
    const ws = await WorkspaceModel.findOne({ roomId });
    if (!ws) return [];

    const card = ws.flashcards.find((c) => c.id === cardId);
    if (!card) return [];

    const existingIdx = card.votes.findIndex((v) => v.userId === userId);
    if (existingIdx >= 0) {
      if (card.votes[existingIdx].vote === vote) {
        card.votes.splice(existingIdx, 1);
      } else {
        card.votes[existingIdx].vote = vote;
      }
    } else {
      card.votes.push({ userId, vote });
    }

    await ws.save();
    return card.votes as FlashcardVote[];
  },

  async addBulkFlashcards(
    roomId: string,
    cards: SharedFlashcard[],
  ): Promise<SharedFlashcard[]> {
    await WorkspaceModel.findOneAndUpdate(
      { roomId },
      { $push: { flashcards: { $each: cards } } },
      { upsert: true },
    );
    return cards;
  },

  // ── Mind Map Annotations ─────────────────────────────────────────────────

  async addMindMapAnnotation(
    roomId: string,
    annotation: Omit<MindMapAnnotation, "id" | "timestamp" | "replies">,
  ): Promise<MindMapAnnotation> {
    const newAnnotation: MindMapAnnotation = {
      ...annotation,
      id: genId("ann"),
      timestamp: new Date().toISOString(),
      replies: [],
    };

    await WorkspaceModel.findOneAndUpdate(
      { roomId },
      { $push: { mindMapAnnotations: newAnnotation } },
      { upsert: true },
    );

    return newAnnotation;
  },

  async addAnnotationReply(
    roomId: string,
    annotationId: string,
    reply: Omit<AnnotationReply, "id" | "timestamp">,
  ): Promise<AnnotationReply | null> {
    const newReply: AnnotationReply = {
      ...reply,
      id: genId("reply"),
      timestamp: new Date().toISOString(),
    };

    const result = await WorkspaceModel.updateOne(
      { roomId, "mindMapAnnotations.id": annotationId },
      { $push: { "mindMapAnnotations.$.replies": newReply } },
    );

    if (result.modifiedCount === 0) return null;
    return newReply;
  },

  async getAnnotationsForNode(
    roomId: string,
    nodeLabel: string,
  ): Promise<MindMapAnnotation[]> {
    const ws = await WorkspaceModel.findOne({ roomId }).lean();
    if (!ws) return [];
    return (ws.mindMapAnnotations ?? []).filter((a) => a.nodeLabel === nodeLabel) as MindMapAnnotation[];
  },

  // ── Notes ────────────────────────────────────────────────────────────────

  async addNote(
    roomId: string,
    note: Omit<SharedNote, "id" | "createdAt" | "pinned">,
  ): Promise<SharedNote> {
    const newNote: SharedNote = {
      ...note,
      id: genId("note"),
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    await WorkspaceModel.findOneAndUpdate(
      { roomId },
      { $push: { notes: newNote } },
      { upsert: true },
    );

    return newNote;
  },

  async updateNote(
    roomId: string,
    noteId: string,
    updates: { title?: string; content?: string; category?: SharedNote["category"] },
    editedBy: string,
    editedByNickname: string,
  ): Promise<SharedNote | null> {
    const setFields: Record<string, unknown> = {
      "notes.$.editedBy": editedBy,
      "notes.$.editedByNickname": editedByNickname,
      "notes.$.editedAt": new Date().toISOString(),
    };
    if (updates.title !== undefined) setFields["notes.$.title"] = updates.title;
    if (updates.content !== undefined) setFields["notes.$.content"] = updates.content;
    if (updates.category !== undefined) setFields["notes.$.category"] = updates.category;

    const ws = await WorkspaceModel.findOneAndUpdate(
      { roomId, "notes.id": noteId },
      { $set: setFields },
      { returnDocument: 'after' },
    );

    if (!ws) return null;
    return ws.notes.find((n) => n.id === noteId) as SharedNote | undefined ?? null;
  },

  async deleteNote(roomId: string, noteId: string): Promise<boolean> {
    const result = await WorkspaceModel.updateOne(
      { roomId },
      { $pull: { notes: { id: noteId } } },
    );
    return result.modifiedCount > 0;
  },

  async toggleNotePin(roomId: string, noteId: string): Promise<boolean | null> {
    // Must read current value to toggle
    const ws = await WorkspaceModel.findOne({ roomId });
    if (!ws) return null;

    const note = ws.notes.find((n) => n.id === noteId);
    if (!note) return null;

    note.pinned = !note.pinned;
    await ws.save();
    return note.pinned;
  },
};
