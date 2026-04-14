import {
  channelToolRepo,
  ChannelToolData,
  NoteItem,
} from "../repositories/channelToolRepo";
import { buildToolContext, LessonContextMeta } from "./contextAssemblerService";
import { generateQuiz, answerQuiz } from "./channelQuizService";
import { addFlashcard, generateFlashcards, extractFlashcardsFromLesson, reviewFlashcard } from "./channelFlashcardService";
import { deepDiveChat, deepDiveChatStream } from "./channelDeepDiveService";
import { generateMindMap } from "./channelMindMapService";
import { generateId } from "../utils/idGenerator";

export { LessonContextMeta } from "./contextAssemblerService";

export const channelToolService = {
  // ── Get data ────────────────────────────────────────────────────────────────
  async getData(channelId: string): Promise<ChannelToolData> {
    return await channelToolRepo.load(channelId);
  },

  // ── Delegated domain methods ──────────────────────────────────────────────
  generateQuiz,
  answerQuiz,
  addFlashcard,
  generateFlashcards,
  extractFlashcardsFromLesson,
  reviewFlashcard,
  deepDiveChat,
  deepDiveChatStream,
  generateMindMap,

  // ── Get lesson context meta (for frontend badges) ─────────────────────────
  async getLessonContextMeta(channelId: string): Promise<LessonContextMeta | null> {
    const result = await buildToolContext(channelId, "quiz"); // toolType doesn't matter for meta
    return result?.meta || null;
  },

  // ── Sprint: start ───────────────────────────────────────────────────────────
  async startSprint(
    channelId: string,
    studyMin: number,
    breakMin: number,
    userId: string,
    nickname: string
  ) {
    const data = await channelToolRepo.load(channelId);

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

    await channelToolRepo.save(channelId, data);

    return data.sprint;
  },

  // ── Sprint: update member status ────────────────────────────────────────────
  async updateSprintStatus(
    channelId: string,
    userId: string,
    nickname: string,
    status: string
  ) {
    const data = await channelToolRepo.load(channelId);

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

    await channelToolRepo.save(channelId, data);

    return data.sprint;
  },

  // ── Notes: add ──────────────────────────────────────────────────────────────
  async addNote(
    channelId: string,
    title: string,
    content: string,
    category: NoteItem["category"],
    userId: string,
    nickname: string
  ): Promise<NoteItem> {
    const data = await channelToolRepo.load(channelId);

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
    await channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Notes: edit ─────────────────────────────────────────────────────────────
  async editNote(
    channelId: string,
    noteId: string,
    updates: { title?: string; content?: string; category?: string }
  ): Promise<NoteItem | null> {
    const data = await channelToolRepo.load(channelId);

    if (!data.notes) return null;

    const note = data.notes.items.find((n) => n.id === noteId);
    if (!note) return null;

    if (updates.title !== undefined) note.title = updates.title;
    if (updates.content !== undefined) note.content = updates.content;
    if (updates.category !== undefined) note.category = updates.category as NoteItem["category"];
    note.editedAt = new Date().toISOString();

    await channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Notes: delete ───────────────────────────────────────────────────────────
  async deleteNote(channelId: string, noteId: string): Promise<boolean> {
    const data = await channelToolRepo.load(channelId);

    if (!data.notes) return false;

    const before = data.notes.items.length;
    data.notes.items = data.notes.items.filter((n) => n.id !== noteId);

    if (data.notes.items.length === before) return false;

    await channelToolRepo.save(channelId, data);
    return true;
  },

  // ── Notes: pin/unpin ────────────────────────────────────────────────────────
  async pinNote(channelId: string, noteId: string): Promise<NoteItem | null> {
    const data = await channelToolRepo.load(channelId);

    if (!data.notes) return null;

    const note = data.notes.items.find((n) => n.id === noteId);
    if (!note) return null;

    note.pinned = !note.pinned;
    await channelToolRepo.save(channelId, data);

    return note;
  },

  // ── Lock mode ─────────────────────────────────────────────────────────────
  async lockTool(channelId: string, userId: string): Promise<{ locked: boolean; lockedBy: string }> {
    const data = await channelToolRepo.load(channelId);
    data.locked = true;
    data.lockedBy = userId;
    await channelToolRepo.save(channelId, data);
    return { locked: true, lockedBy: userId };
  },

  async unlockTool(channelId: string): Promise<{ locked: boolean; lockedBy: string | null }> {
    const data = await channelToolRepo.load(channelId);
    data.locked = false;
    data.lockedBy = null;
    await channelToolRepo.save(channelId, data);
    return { locked: false, lockedBy: null };
  },

  async getToolLockStatus(channelId: string): Promise<{ locked: boolean; lockedBy: string | null }> {
    const data = await channelToolRepo.load(channelId);
    return { locked: !!data.locked, lockedBy: data.lockedBy || null };
  },
};
