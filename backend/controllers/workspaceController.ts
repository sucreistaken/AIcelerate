// controllers/workspaceController.ts
// Thin controller layer — delegates all persistence to workspaceService (MongoDB).

import { workspaceService } from "../services/workspaceService";

// ====== Types ======

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

// ====== Workspace CRUD ======

export async function loadWorkspace(roomId: string): Promise<RoomWorkspace> {
  return workspaceService.getWorkspace(roomId);
}

export async function deleteWorkspaceFile(roomId: string): Promise<void> {
  return workspaceService.deleteWorkspace(roomId);
}

// ====== Deep Dive ======

export async function addDeepDiveMessage(roomId: string, message: SharedChatMessage): Promise<void> {
  return workspaceService.addDeepDiveMessage(roomId, message);
}

export async function addDeepDiveReaction(roomId: string, messageId: string, userId: string): Promise<MessageReaction[]> {
  return workspaceService.addDeepDiveReaction(roomId, messageId, userId);
}

export async function saveInsight(roomId: string, messageId: string, savedBy: string, savedByNickname: string, tags: string[]): Promise<SharedInsight | null> {
  return workspaceService.saveInsight(roomId, messageId, savedBy, savedByNickname, tags);
}

// ====== Flashcards ======

export async function addFlashcard(roomId: string, card: Omit<SharedFlashcard, "id" | "createdAt" | "votes">): Promise<SharedFlashcard> {
  return workspaceService.addFlashcard(roomId, card);
}

export async function updateFlashcard(roomId: string, cardId: string, updates: { front?: string; back?: string; topicName?: string }, editedBy: string, editedByNickname: string): Promise<SharedFlashcard | null> {
  return workspaceService.updateFlashcard(roomId, cardId, updates, editedBy, editedByNickname);
}

export async function deleteFlashcard(roomId: string, cardId: string): Promise<boolean> {
  return workspaceService.deleteFlashcard(roomId, cardId);
}

export async function voteFlashcard(roomId: string, cardId: string, userId: string, vote: "up" | "down"): Promise<FlashcardVote[]> {
  return workspaceService.voteFlashcard(roomId, cardId, userId, vote);
}

export async function addBulkFlashcards(roomId: string, cards: SharedFlashcard[]): Promise<SharedFlashcard[]> {
  return workspaceService.addBulkFlashcards(roomId, cards);
}

// ====== Mind Map Annotations ======

export async function addMindMapAnnotation(roomId: string, annotation: Omit<MindMapAnnotation, "id" | "timestamp" | "replies">): Promise<MindMapAnnotation> {
  return workspaceService.addMindMapAnnotation(roomId, annotation);
}

export async function addAnnotationReply(roomId: string, annotationId: string, reply: Omit<AnnotationReply, "id" | "timestamp">): Promise<AnnotationReply | null> {
  return workspaceService.addAnnotationReply(roomId, annotationId, reply);
}

export async function getAnnotationsForNode(roomId: string, nodeLabel: string): Promise<MindMapAnnotation[]> {
  return workspaceService.getAnnotationsForNode(roomId, nodeLabel);
}

// ====== Notes ======

export async function addNote(roomId: string, note: Omit<SharedNote, "id" | "createdAt" | "pinned">): Promise<SharedNote> {
  return workspaceService.addNote(roomId, note);
}

export async function updateNote(roomId: string, noteId: string, updates: { title?: string; content?: string; category?: SharedNote["category"] }, editedBy: string, editedByNickname: string): Promise<SharedNote | null> {
  return workspaceService.updateNote(roomId, noteId, updates, editedBy, editedByNickname);
}

export async function deleteNote(roomId: string, noteId: string): Promise<boolean> {
  return workspaceService.deleteNote(roomId, noteId);
}

export async function toggleNotePin(roomId: string, noteId: string): Promise<boolean | null> {
  return workspaceService.toggleNotePin(roomId, noteId);
}
