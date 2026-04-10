import { ToolData } from "../models/ToolData";

// ── Interfaces (preserved for backward compat) ────────────────────────────────

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  type?: 'mc' | 'tf';
  difficulty?: string;
}

export interface QuizData {
  questions: QuizQuestion[];
  scores: Record<string, { correct: number; total: number; nickname: string }>;
  generatedAt?: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string;
  topic: string;
  createdBy: string;
  createdByNickname: string;
  createdAt: string;
  votes: Array<{ userId: string; vote: "up" | "down" }>;
  source: "manual" | "ai-generated" | "lesson-emphasis" | "lesson-cheatsheet" | "lesson-miniQuiz" | "lesson-loModule";
  sm2?: Record<string, {
    easeFactor: number;
    interval: number;
    repetitions: number;
    nextReview: string;
    lastReview: string;
  }>;
}

export interface FlashcardsData {
  cards: FlashcardItem[];
}

export interface DeepDiveMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  authorId: string;
  authorNickname: string;
  timestamp: string;
}

export interface DeepDiveData {
  messages: DeepDiveMessage[];
}

export interface MindMapData {
  mermaidCode: string;
  generatedAt?: string;
  topic?: string;
}

export interface SprintMember {
  status: string;
  lastUpdate: string;
  nickname: string;
}

export interface SprintData {
  phase: "idle" | "studying" | "break" | "finished";
  studyDurationMin: number;
  breakDurationMin: number;
  startedAt?: string;
  currentPhaseStartedAt?: string;
  pomodorosCompleted: number;
  members: Record<string, SprintMember>;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  category: "concept" | "formula" | "example" | "tip" | "warning" | "summary";
  authorId: string;
  authorNickname: string;
  createdAt: string;
  editedAt?: string;
  pinned: boolean;
}

export interface NotesData {
  items: NoteItem[];
}

export interface ChannelToolData {
  channelId: string;
  toolType: string;
  quiz?: QuizData;
  flashcards?: FlashcardsData;
  deepDive?: DeepDiveData;
  mindMap?: MindMapData;
  sprint?: SprintData;
  notes?: NotesData;
  locked?: boolean;
  lockedBy?: string;
}

// ── MongoDB-backed Repository ──────────────────────────────────────────────────

class ChannelToolRepository {
  private defaultData(channelId: string): ChannelToolData {
    return { channelId, toolType: "" };
  }

  async load(channelId: string): Promise<ChannelToolData> {
    const doc = await ToolData.findOne({ channelId }).lean();
    if (!doc || !doc.data) return this.defaultData(channelId);

    return {
      channelId,
      toolType: doc.toolType || "",
      ...doc.data,
      locked: doc.locked,
      lockedBy: doc.lockedBy,
    } as ChannelToolData;
  }

  async save(channelId: string, data: ChannelToolData): Promise<void> {
    const { channelId: _cid, toolType, locked, lockedBy, ...rest } = data;

    await ToolData.findOneAndUpdate(
      { channelId },
      {
        $set: {
          channelId,
          toolType: toolType || "",
          data: rest,
          locked: locked ?? false,
          lockedBy: lockedBy ?? null,
        },
        $inc: { version: 1 },
      },
      { upsert: true }
    );
  }
}

export const channelToolRepo = new ChannelToolRepository();
