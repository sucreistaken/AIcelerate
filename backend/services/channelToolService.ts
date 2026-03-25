import {
  channelToolRepo,
  ChannelToolData,
  NoteItem,
} from "../repositories/channelToolRepo";
import { buildToolContext, LessonContextMeta } from "./channelContextBuilder";
import { generateQuiz, answerQuiz } from "./channelQuizService";
import { addFlashcard, generateFlashcards, extractFlashcardsFromLesson, reviewFlashcard } from "./channelFlashcardService";
import { deepDiveChat } from "./channelDeepDiveService";
import { generateMindMap } from "./channelMindMapService";
import { generateId } from "../utils/idGenerator";

export { LessonContextMeta } from "./channelContextBuilder";

export const channelToolService = {
  // ── Get data ────────────────────────────────────────────────────────────────
  getData(channelId: string): ChannelToolData {
    return channelToolRepo.load(channelId);
  },

  // ── Delegated domain methods ──────────────────────────────────────────────
  generateQuiz,
  answerQuiz,
  addFlashcard,
  generateFlashcards,
  extractFlashcardsFromLesson,
  reviewFlashcard,
  deepDiveChat,
  generateMindMap,

  // ── Get lesson context meta (for frontend badges) ─────────────────────────
  async getLessonContextMeta(channelId: string): Promise<LessonContextMeta | null> {
    const result = await buildToolContext(channelId, "quiz"); // toolType doesn't matter for meta
    return result?.meta || null;
  },

  // ── Sprint: start ───────────────────────────────────────────────────────────
  startSprint(
    channelId: string,
    studyMin: number,
    breakMin: number,
    userId: string,
    nickname: string
  ) {
    const data = channelToolRepo.load(channelId);

    const now = new Date().toISOString();

    data.sprint = {
      phase: "studying",
      studyDurationMin: studyMin,
      breakDurationMin: breakMin,
      startedAt: now,
      currentPhaseStartedAt: now,
      pomodorosCompleted: data.sprint?.pomodorosCompleted || 0,
      members: {
        ...(data.sprint?.members || {}),
        [userId]: {
          status: "studying",
          lastUpdate: now,
          nickname,
        },
      },
    };

    channelToolRepo.save(channelId, data);

    return data.sprint;
  },

  // ── Sprint: update member status ────────────────────────────────────────────
  updateSprintStatus(
    channelId: string,
    userId: string,
    nickname: string,
    status: string
  ) {
    const data = channelToolRepo.load(channelId);

    if (!data.sprint) {
      data.sprint = {
        phase: "idle",
        studyDurationMin: 25,
        breakDurationMin: 5,
        pomodorosCompleted: 0,
        members: {},
      };
    }

    data.sprint.members[userId] = {
      status,
      lastUpdate: new Date().toISOString(),
      nickname,
    };

    channelToolRepo.save(channelId, data);

    return data.sprint;
  },

  // ── Notes: add ──────────────────────────────────────────────────────────────
  addNote(
    channelId: string,
    title: string,
    content: string,
    category: NoteItem["category"],
    userId: string,
    nickname: string
  ): NoteItem {
    const data = channelToolRepo.load(channelId);

    if (!data.notes) {
      data.notes = { items: [] };
    }

    const note: NoteItem = {
      id: generateId(),
      title,
      content,
      category,
      authorId: userId,
      authorNickname: nickname,
      createdAt: new Date().toISOString(),
      pinned: false,
    };

    data.notes.items.push(note);
    channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Notes: edit ─────────────────────────────────────────────────────────────
  editNote(
    channelId: string,
    noteId: string,
    updates: { title?: string; content?: string; category?: string }
  ): NoteItem | null {
    const data = channelToolRepo.load(channelId);

    if (!data.notes) return null;

    const note = data.notes.items.find((n) => n.id === noteId);
    if (!note) return null;

    if (updates.title !== undefined) note.title = updates.title;
    if (updates.content !== undefined) note.content = updates.content;
    if (updates.category !== undefined) note.category = updates.category as NoteItem["category"];
    note.editedAt = new Date().toISOString();

    channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Notes: delete ───────────────────────────────────────────────────────────
  deleteNote(channelId: string, noteId: string): boolean {
    const data = channelToolRepo.load(channelId);

    if (!data.notes) return false;

    const before = data.notes.items.length;
    data.notes.items = data.notes.items.filter((n) => n.id !== noteId);

    if (data.notes.items.length === before) return false;

    channelToolRepo.save(channelId, data);
    return true;
  },

  // ── Notes: pin/unpin ────────────────────────────────────────────────────────
  pinNote(channelId: string, noteId: string): NoteItem | null {
    const data = channelToolRepo.load(channelId);

    if (!data.notes) return null;

    const note = data.notes.items.find((n) => n.id === noteId);
    if (!note) return null;

    note.pinned = !note.pinned;
    channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Lock mode ─────────────────────────────────────────────────────────────
  lockTool(channelId: string, userId: string): { locked: boolean; lockedBy: string } {
    const data = channelToolRepo.load(channelId);
    (data as any).locked = true;
    (data as any).lockedBy = userId;
    channelToolRepo.save(channelId, data);
    return { locked: true, lockedBy: userId };
  },

  unlockTool(channelId: string): { locked: boolean; lockedBy: string | null } {
    const data = channelToolRepo.load(channelId);
    (data as any).locked = false;
    (data as any).lockedBy = null;
    channelToolRepo.save(channelId, data);
    return { locked: false, lockedBy: null };
  },

  getToolLockStatus(channelId: string): { locked: boolean; lockedBy: string | null } {
    const data = channelToolRepo.load(channelId);
    return { locked: !!(data as any).locked, lockedBy: (data as any).lockedBy || null };
  },
};
