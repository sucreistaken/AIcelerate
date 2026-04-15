import { API_BASE } from "../config";
import type {
  ChannelToolData,
  ChannelFlashcardItem,
  ChannelDeepDiveMessage,
  ChannelMindMapData,
  ChannelSprintData,
  ChannelNoteItem,
  Channel,
  LessonSummary,
  LessonContextInfo,
  LessonDetailData,
  ExtractionSummary,
} from "../types";

import { apiJson } from "./fetchWithAuth";
import { consumeSseStream } from "./sseClient";

const BASE = `${API_BASE}/api/collab/channels`;
const COLLAB_BASE = `${API_BASE}/api/collab`;

// ── Envelope shapes (backend convention: { ok: true, ...payload }) ─────────────

interface OkData { ok: true; data: ChannelToolData; sourcesSummary?: string | null }
interface OkQuizAnswer {
  ok: true;
  result: {
    correct: boolean;
    correctIndex: number;
    explanation: string;
    scores: Record<string, { correct: number; total: number; nickname: string }>;
  };
}
interface OkCard { ok: true; card: ChannelFlashcardItem }
interface OkCards { ok: true; cards: ChannelFlashcardItem[]; sourcesSummary?: string | null }
interface OkExtract { ok: true; cards: ChannelFlashcardItem[]; summary: ExtractionSummary }
interface OkDeepDive {
  ok: true;
  userMessage: ChannelDeepDiveMessage;
  aiMessage: ChannelDeepDiveMessage;
}
interface OkMindMap { ok: true; mindMap: ChannelMindMapData; sourcesSummary?: string | null }
interface OkSprint { ok: true; sprint: ChannelSprintData }
interface OkNote { ok: true; note: ChannelNoteItem }
interface OkLessons { ok: true; lessons: LessonSummary[] }
interface OkChannel { ok: true; channel: Channel }
interface OkLock { ok: true; locked: boolean; lockedBy: string | null }
interface OkExport { ok: true; data: unknown }
interface OkSimple { ok: true }

export interface DeepDiveStreamBody {
  text: string;
  nickname: string;
  topic: string;
  serverName: string;
}

export interface DeepDiveStreamCallbacks {
  onChunk: (text: string) => void;
  /** Fired when the server emits `done`. Carries the real IDs so the client can reconcile optimistic placeholders. */
  onDone: (ids: { userMessageId: string; aiMessageId: string }) => void;
  onError: (error: string) => void;
}

export const channelToolApi = {
  async getToolData(channelId: string): Promise<ChannelToolData> {
    const r = await apiJson<OkData>(`${BASE}/${channelId}/tool-data`);
    return r.data;
  },

  generateQuiz(
    channelId: string,
    topic: string,
    serverName: string,
    count?: number,
    difficulty?: string,
    includeTrueFalse?: boolean
  ): Promise<OkData> {
    return apiJson<OkData>(`${BASE}/${channelId}/tool/quiz/generate`, {
      method: "POST",
      body: JSON.stringify({ topic, serverName, count, difficulty, includeTrueFalse }),
    });
  },

  answerQuiz(channelId: string, nickname: string, questionId: string, selectedIndex: number): Promise<OkQuizAnswer> {
    return apiJson<OkQuizAnswer>(`${BASE}/${channelId}/tool/quiz/answer`, {
      method: "POST",
      body: JSON.stringify({ nickname, questionId, selectedIndex }),
    });
  },

  addFlashcard(channelId: string, front: string, back: string, topic: string, nickname: string): Promise<OkCard> {
    return apiJson<OkCard>(`${BASE}/${channelId}/tool/flashcards/add`, {
      method: "POST",
      body: JSON.stringify({ front, back, topic, nickname }),
    });
  },

  generateFlashcards(channelId: string, topic: string, serverName: string, count?: number): Promise<OkCards> {
    return apiJson<OkCards>(`${BASE}/${channelId}/tool/flashcards/generate`, {
      method: "POST",
      body: JSON.stringify({ topic, serverName, count }),
    });
  },

  extractFlashcardsFromLesson(channelId: string): Promise<OkExtract> {
    return apiJson<OkExtract>(`${BASE}/${channelId}/tool/flashcards/extract`, { method: "POST" });
  },

  reviewFlashcard(channelId: string, cardId: string, quality: number): Promise<OkCard> {
    return apiJson<OkCard>(`${BASE}/${channelId}/tool/flashcards/review`, {
      method: "POST",
      body: JSON.stringify({ cardId, quality }),
    });
  },

  deepDiveChat(channelId: string, text: string, nickname: string, topic: string, serverName: string): Promise<OkDeepDive> {
    return apiJson<OkDeepDive>(`${BASE}/${channelId}/tool/deep-dive/chat`, {
      method: "POST",
      body: JSON.stringify({ text, nickname, topic, serverName }),
    });
  },

  /**
   * Streaming variant of deepDiveChat. Server emits:
   *  - { type: "chunk", text }
   *  - { type: "done", userMessageId, aiMessageId }
   *  - { type: "error", message }
   * Returns an AbortController — call .abort() to cancel the stream.
   */
  deepDiveChatStream(
    channelId: string,
    body: DeepDiveStreamBody,
    callbacks: DeepDiveStreamCallbacks,
    signal?: AbortSignal,
  ): AbortController {
    return consumeSseStream(
      `${BASE}/${channelId}/tool/deep-dive/chat/stream`,
      { method: "POST", body, signal },
      {
        onEvent: (evt) => {
          if (evt.type === "chunk" && typeof evt.text === "string") {
            callbacks.onChunk(evt.text);
          } else if (
            evt.type === "done" &&
            typeof evt.userMessageId === "string" &&
            typeof evt.aiMessageId === "string"
          ) {
            callbacks.onDone({ userMessageId: evt.userMessageId, aiMessageId: evt.aiMessageId });
          } else if (evt.type === "error") {
            const msg =
              typeof evt.message === "string" ? evt.message
              : typeof evt.error === "string" ? evt.error
              : "Stream error";
            callbacks.onError(msg);
          }
        },
        onError: callbacks.onError,
      },
    );
  },

  generateMindMap(channelId: string, topic: string, serverName: string): Promise<OkMindMap> {
    return apiJson<OkMindMap>(`${BASE}/${channelId}/tool/mind-map/generate`, {
      method: "POST",
      body: JSON.stringify({ topic, serverName }),
    });
  },

  startSprint(channelId: string, studyMin: number, breakMin: number, nickname: string): Promise<OkSprint> {
    return apiJson<OkSprint>(`${BASE}/${channelId}/tool/sprint/start`, {
      method: "POST",
      body: JSON.stringify({ studyMin, breakMin, nickname }),
    });
  },

  updateSprintStatus(channelId: string, nickname: string, status: string): Promise<OkSprint> {
    return apiJson<OkSprint>(`${BASE}/${channelId}/tool/sprint/status`, {
      method: "POST",
      body: JSON.stringify({ nickname, status }),
    });
  },

  addNote(channelId: string, title: string, content: string, category: string, nickname: string): Promise<OkNote> {
    return apiJson<OkNote>(`${BASE}/${channelId}/tool/notes/add`, {
      method: "POST",
      body: JSON.stringify({ title, content, category, nickname }),
    });
  },

  editNote(channelId: string, noteId: string, updates: { title?: string; content?: string; category?: string }): Promise<OkNote> {
    return apiJson<OkNote>(`${BASE}/${channelId}/tool/notes/${noteId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  async deleteNote(channelId: string, noteId: string): Promise<void> {
    await apiJson<OkSimple>(`${BASE}/${channelId}/tool/notes/${noteId}`, { method: "DELETE" });
  },

  pinNote(channelId: string, noteId: string): Promise<OkNote> {
    return apiJson<OkNote>(`${BASE}/${channelId}/tool/notes/${noteId}/pin`, { method: "POST" });
  },

  // Export
  exportQuiz(channelId: string): Promise<OkExport> {
    return apiJson<OkExport>(`${BASE}/${channelId}/export/quiz`);
  },

  exportFlashcards(channelId: string): Promise<OkExport> {
    return apiJson<OkExport>(`${BASE}/${channelId}/export/flashcards`);
  },

  exportNotes(channelId: string): Promise<OkExport> {
    return apiJson<OkExport>(`${BASE}/${channelId}/export/notes`);
  },

  exportMindMap(channelId: string): Promise<OkExport> {
    return apiJson<OkExport>(`${BASE}/${channelId}/export/mind-map`);
  },

  exportAll(channelId: string): Promise<OkExport> {
    return apiJson<OkExport>(`${BASE}/${channelId}/export/all`);
  },

  // Lock
  lockTool(channelId: string): Promise<OkLock> {
    return apiJson<OkLock>(`${BASE}/${channelId}/tool/lock`, { method: "POST" });
  },

  unlockTool(channelId: string): Promise<OkLock> {
    return apiJson<OkLock>(`${BASE}/${channelId}/tool/unlock`, { method: "POST" });
  },

  // ── Lesson linking ──────────────────────────────────────────────────────
  async getLessons(): Promise<LessonSummary[]> {
    const r = await apiJson<OkLessons>(`${COLLAB_BASE}/lessons`);
    return r.lessons ?? [];
  },

  linkLesson(channelId: string, serverId: string, lessonId: string, lessonTitle: string): Promise<OkChannel> {
    return apiJson<OkChannel>(`${BASE}/${channelId}/link-lesson`, {
      method: "POST",
      body: JSON.stringify({ serverId, lessonId, lessonTitle }),
    });
  },

  unlinkLesson(channelId: string, serverId: string): Promise<OkChannel> {
    return apiJson<OkChannel>(`${BASE}/${channelId}/link-lesson`, {
      method: "DELETE",
      body: JSON.stringify({ serverId }),
    });
  },

  getLessonContext(channelId: string): Promise<LessonContextInfo> {
    // Backend returns flat shape (no envelope) — see channelToolController:219-249.
    return apiJson<LessonContextInfo>(`${BASE}/${channelId}/lesson-context`);
  },

  getLessonDetail(channelId: string): Promise<LessonDetailData> {
    return apiJson<LessonDetailData>(`${BASE}/${channelId}/lesson-detail`);
  },
};
