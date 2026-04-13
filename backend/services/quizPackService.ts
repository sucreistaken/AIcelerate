// services/quizPackService.ts
// Business logic for quiz pack generation, retrieval, and scoring (MongoDB-backed).

import { QuizModel } from "../models/Quiz";
import { lessonCache } from "../cache";
import { generateId } from "../utils/idGenerator";

type Emphasis = {
  statement: string;
  why: string;
  in_slides: boolean;
  evidence: string;
  confidence: number;
};

type Lesson = {
  id: string;
  title: string;
  date: string;
  transcript: string;
  summary?: string;
  highlights?: string[];
  professorEmphases?: Emphasis[];
  quiz?: { question: string; answer?: string }[];
  createdAt?: string;
};

type QuizItem = {
  id: string;
  type: "why" | "tf";
  lessonId?: string;
  prompt: string;
  expected_keywords?: string[];
  expected_tf?: boolean;
};

const rid = (p: string) => generateId(p);

export const quizPackService = {
  /**
   * Generate a quiz pack from lesson emphases and persist it in MongoDB.
   */
  async generateFromEmphases(count = 5, lessonIds?: string[]) {
    const lessons = lessonCache.getAll() as Lesson[];
    const emphases: Array<{ lessonId: string; e: Emphasis }> = [];

    for (const L of lessons) {
      if (lessonIds && !lessonIds.includes(L.id)) continue;
      (L.professorEmphases || []).forEach((e) => emphases.push({ lessonId: L.id, e }));
    }

    if (!emphases.length) {
      return { error: "No emphases found. Add lessons with professorEmphases first." };
    }

    const shuffled = emphases.sort(() => Math.random() - 0.5).slice(0, count);

    const items: QuizItem[] = shuffled.flatMap(({ lessonId, e }) => {
      const whyQ: QuizItem = {
        id: rid("q"),
        type: "why",
        lessonId,
        prompt: `Why did the professor emphasize: "${e.statement}"?`,
        expected_keywords: (e.why || "")
          .toLowerCase()
          .split(/\W+/)
          .filter(Boolean)
          .slice(0, 6),
      };

      const tfQ: QuizItem = {
        id: rid("q"),
        type: "tf",
        lessonId,
        prompt: `Was this emphasized point present in slides? ("${e.statement}")`,
        expected_tf: !!e.in_slides,
      };
      return [whyQ, tfQ];
    });

    const packId = rid("qp");

    const doc = await QuizModel.create({
      _id: packId,
      items,
    });

    // Keep max 20 packs — delete oldest beyond the limit
    const totalPacks = await QuizModel.countDocuments();
    if (totalPacks > 20) {
      const oldest = await QuizModel.find()
        .sort({ createdAt: 1 })
        .limit(totalPacks - 20)
        .select("_id")
        .lean();
      if (oldest.length > 0) {
        await QuizModel.deleteMany({ _id: { $in: oldest.map((o) => o._id) } });
      }
    }

    const createdDoc = doc as typeof doc & { createdAt?: Date };
    return {
      id: doc._id,
      createdAt: createdDoc.createdAt?.toISOString?.() ?? new Date().toISOString(),
      items: doc.items,
    };
  },

  /**
   * Retrieve a single quiz pack by ID.
   */
  async getPack(packId: string) {
    const doc = await QuizModel.findById(packId).lean();
    if (!doc) return null;
    const leanDoc = doc as typeof doc & { createdAt?: string };
    return {
      id: doc._id,
      createdAt: leanDoc.createdAt ?? "",
      items: doc.items,
    };
  },

  /**
   * Score a quiz pack given user answers. Returns feedback per item.
   */
  async scorePack(
    packId: string,
    answers: Array<{ id: string; answer: string | boolean }>
  ) {
    const pack = await this.getPack(packId);
    if (!pack) return { error: "Quiz pack not found." };

    let correct = 0;
    const feedback: Array<{ id: string; correct: boolean; note?: string }> = [];

    for (const item of pack.items) {
      const a = answers.find((x) => x.id === item.id);
      if (!a) {
        feedback.push({ id: item.id, correct: false, note: "No answer" });
        continue;
      }

      if (item.type === "tf") {
        const ok = String(a.answer) === String(item.expected_tf);
        if (ok) correct++;
        feedback.push({ id: item.id, correct: ok, note: ok ? "Correct" : `Expected ${item.expected_tf}` });
      } else {
        const text = String(a.answer).toLowerCase();
        const keys = item.expected_keywords || [];
        const hits = keys.filter((k) => k.length > 2 && text.includes(k)).length;
        const ok = hits >= Math.max(1, Math.ceil(keys.length * 0.4));
        if (ok) correct++;
        feedback.push({ id: item.id, correct: ok, note: `${hits}/${keys.length} keywords hit` });
      }
    }

    return {
      packId,
      total: pack.items.length,
      correct,
      score: Math.round((correct / pack.items.length) * 100),
      feedback,
    };
  },
};
