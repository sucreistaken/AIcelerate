// controllers/lessonControllers.ts
import path from "path";
import { readJSON, writeJSON, ensureDataFiles } from "../utils/file-Handler";
import { lessonCache, invalidateLessonCaches } from "../cache";
// Lazy import to avoid circular dependency (contextAssembler → channelService → env)
let _invalidateCache: ((lessonId: string) => void) | null = null;
function getInvalidateCache() {
  if (!_invalidateCache) {
    try {
      _invalidateCache = require("./contextAssembler").invalidateToolContextCache;
    } catch {
      _invalidateCache = () => {};
    }
  }
  return _invalidateCache!;
}
import type { LessonPlan, LoAlignment, DeviationResult, MindmapCache, MindmapModuleCacheEntry } from "../types";
import type { CheatSheet } from "../types";

// ---- Tipler ----
export type Emphasis = {
  statement: string;
  why: string;
  in_slides?: boolean;
  evidence?: string;
  confidence?: number; // 0..1
};

type QuizQA = { question: string; answer?: string };
// LO bazlı çalışma modülleri (backend versiyonu)
export type LoStudyModule = {
  loId: string;
  loTitle: string;
  oneLineGist: string;
  coreIdeas: string[];
  mustRemember: string[];
  intuitiveExplanation: string;
  examples: {
    label: string;
    description: string;
  }[];
  typicalQuestions: string[];
  commonTraps: string[];
  miniQuiz: {
    question: string;
    answer: string;
    why: string;
  }[];
  recommended_study_time_min: number;
};

export type LessonLoModules = {
  lessonId: string;
  modules: LoStudyModule[];
};
export type { CheatSheet } from "../types";
export type Lesson = {
  id: string;
  title: string;
  date: string;                 // ISO string
  transcript: string;
  slideText: string;
  plan?: LessonPlan;
  summary?: string;
  highlights?: string[];
  professorEmphases?: Emphasis[];
  // Eski şema ile uyumluluk için (opsiyonel):
  quiz?: QuizQA[];
  cheatSheet?: CheatSheet;
  // Yeni quiz paket modeli:
  quizPacks?: Array<{ packId: string; createdAt: string; lastScore?: number }>;

  // Ders bazında ilerleme:
  progress?: { lastMode?: string; percent?: number };

  // Zaman damgaları:
  createdAt?: string;      // ISO string
  updatedAt?: string;
  courseId?: string;             // linked course ID
  courseCode?: string;          // "MATH 153" gibi
  learningOutcomes?: string[];  // IEU'den çekilen resmi LO listesi

  loAlignment?: LoAlignment;
  loModules?: LessonLoModules;

  mindmapCache?: MindmapCache;
  mindmapModuleCache?: { [moduleIndex: string]: MindmapModuleCacheEntry };
  deviation?: DeviationResult;

  // Compact AI digest (generated after plan creation)
  digest?: import("../services/lessonDigestService").LessonDigest;

  // Confidence scores for AI-generated artifacts (OPT-15)
  planConfidence?: import("../types").ConfidenceScore;
  cheatSheetConfidence?: import("../types").ConfidenceScore;
};

type GlobalMemory = {
  recurringConcepts: string[];
  recentEmphases: Array<Pick<Emphasis, "statement" | "why" | "confidence">>;
  lastUpdated: string; // ISO
};

// ---- Yollar ----
const DATA_DIR = path.join(process.cwd(), "backend", "data");
const MEMORY_PATH = path.join(DATA_DIR, "memory.json");

// Başlangıç dosyalarını garanti altına al
ensureDataFiles([
  { path: MEMORY_PATH, initial: { recurringConcepts: [], recentEmphases: [], lastUpdated: new Date().toISOString() } }
]);

// ---- Yardımcılar (now backed by DataCache — O(1) reads, debounced writes) ----
function loadLessons(): Lesson[] {
  return lessonCache.getAll();
}

function saveLessons(list: Lesson[]) {
  lessonCache.setAll(list);
}

function loadMemory(): GlobalMemory {
  return (
    readJSON<GlobalMemory>(MEMORY_PATH) || {
      recurringConcepts: [],
      recentEmphases: [],
      lastUpdated: new Date().toISOString(),
    }
  );
}

function saveMemory(mem: GlobalMemory) {
  mem.lastUpdated = new Date().toISOString();
  writeJSON(MEMORY_PATH, mem);
}

// Bir ders üzerinden global memory'yi güncelle
function updateGlobalMemoryFromLesson(stamped: Lesson) {
  const memory = loadMemory();

  (stamped.highlights || []).forEach((h) => {
    if (h && !memory.recurringConcepts.includes(h)) memory.recurringConcepts.push(h);
  });

  if (stamped.professorEmphases?.length) {
    for (const e of stamped.professorEmphases) {
      memory.recentEmphases.unshift({
        statement: e.statement,
        why: e.why,
        confidence: e.confidence,
      });
    }
    // Kuyruk: en fazla 20 son vurgu
    memory.recentEmphases = memory.recentEmphases.slice(0, 20);
  }

  saveMemory(memory);
}

// ---- Okuma Fonksiyonları ----
export function listLessons(): Lesson[] {
  return loadLessons();
}

export function listLessonsPaginated(cursor?: string, limit = 20): { items: Lesson[]; nextCursor: string | null; hasMore: boolean } {
  const all = loadLessons();
  let startIdx = 0;
  if (cursor) {
    const idx = all.findIndex((l) => l.id === cursor);
    if (idx >= 0) startIdx = idx + 1;
  }
  const sliced = all.slice(startIdx, startIdx + limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;
  const last = items[items.length - 1];
  return { items, nextCursor: hasMore && last ? last.id : null, hasMore };
}

// Geriye dönük uyumluluk (eski isim):
export const getLessons = (): Lesson[] => listLessons();

export function getLesson(id: string): Lesson | null {
  return lessonCache.get(id);
}

export const getMemory = (): GlobalMemory => loadMemory();

// ---- Yazma/Update Fonksiyonları ----

// Eski API ile uyumluluk: addLesson (oluşturur + memory günceller)
export const addLesson = (lesson: Lesson) => {
  const stamped: Lesson = {
    ...lesson,
    createdAt: lesson.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  lessonCache.set(stamped); // O(1) + debounced flush

  updateGlobalMemoryFromLesson(stamped);
  return stamped;
};

// Yeni API: upsert (varsa günceller, yoksa oluşturur) + memory günceller
export function upsertLesson(newL: Partial<Lesson> & { id?: string }): Lesson {
  let l: Lesson;

  if (newL.id) {
    const existing = lessonCache.get(newL.id);
    if (existing) {
      // Güncelle
      l = {
        ...existing,
        ...newL,
        updatedAt: new Date().toISOString(),
      } as Lesson;

      // Varsayılan boş alanlar:
      l.transcript = l.transcript ?? "";
      l.slideText = l.slideText ?? "";
      l.highlights = l.highlights ?? [];
      l.professorEmphases = l.professorEmphases ?? [];
      l.quizPacks = l.quizPacks ?? existing.quizPacks ?? [];
      l.progress = { ...(existing.progress || {}), ...(newL.progress || {}) };
    } else {
      // Yoksa oluştur
      l = {
        id: newL.id,
        title: newL.title || "Untitled Lecture",
        date: newL.date || new Date().toISOString(),
        transcript: newL.transcript || "",
        slideText: newL.slideText || "",
        plan: newL.plan,
        summary: newL.summary,
        highlights: newL.highlights || [],
        professorEmphases: newL.professorEmphases || [],
        quiz: newL.quiz || [],
        quizPacks: newL.quizPacks || [],
        progress: newL.progress || { lastMode: "alignment", percent: 0 },
        createdAt: newL.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  } else {
    // Yeni kayıt oluştur
    const id = "lec-" + Date.now();
    l = {
      id,
      title: newL.title || "Untitled Lecture",
      date: newL.date || new Date().toISOString(),
      transcript: newL.transcript || "",
      slideText: newL.slideText || "",
      plan: newL.plan,
      summary: newL.summary,
      highlights: newL.highlights || [],
      professorEmphases: newL.professorEmphases || [],
      quiz: newL.quiz || [],
      quizPacks: newL.quizPacks || [],
      progress: newL.progress || { lastMode: "alignment", percent: 0 },
      createdAt: newL.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  lessonCache.set(l); // O(1) memory write + debounced async disk flush
  // Invalidate context & computed caches
  getInvalidateCache()(l.id);
  invalidateLessonCaches(l.id);
  // Memory'yi ders içeriğine göre güncelle
  updateGlobalMemoryFromLesson(l);
  return l;
}

// Quiz paketi iliştirme
export function attachQuizPack(lessonId: string, packId: string) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return;

  const lp = lesson.quizPacks || [];
  lp.push({ packId, createdAt: new Date().toISOString() });
  lessonCache.set({ ...lesson, quizPacks: lp, updatedAt: new Date().toISOString() });
  invalidateLessonCaches(lessonId);
}

// Quiz skorunu güncelleme
export function setQuizScore(lessonId: string, packId: string, score: number) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return;

  const lp = lesson.quizPacks || [];
  const p = lp.find((x: any) => x.packId === packId);
  if (p) p.lastScore = score;

  lessonCache.set({ ...lesson, quizPacks: lp, updatedAt: new Date().toISOString() });
  invalidateLessonCaches(lessonId);
}

// İlerleme güncelleme (ders bazında durum saklama)
export function updateProgress(
  lessonId: string,
  progress: Partial<Lesson["progress"]>
) {
  const lesson = lessonCache.get(lessonId);
  if (!lesson) return null;

  const updated = {
    ...lesson,
    progress: { ...(lesson.progress || {}), ...progress },
    updatedAt: new Date().toISOString(),
  };
  lessonCache.set(updated);
  invalidateLessonCaches(lessonId);
  return updated;
}

// Ders silme
export function deleteLesson(lessonId: string): boolean {
  const deleted = lessonCache.delete(lessonId);
  if (deleted) invalidateLessonCaches(lessonId);
  return deleted;
}
