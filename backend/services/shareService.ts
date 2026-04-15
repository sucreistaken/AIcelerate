// services/shareService.ts
// Business logic for shared lesson bundles (MongoDB-backed).

import { ShareModel } from "../models/Share";
import { getLesson } from "./lessonDataService";
import type { LoStudyModule, Emphasis } from "./lessonDataService";
import { weaknessService } from "./weaknessService";
import type { TopicScore } from "./weaknessService";
import { generateId } from "../utils/idGenerator";
import type { LessonPlan, CheatSheet } from "../types/index";

const rid = () => generateId("share");

/** Shape of a Share document from Mongoose .lean() or .toObject() */
interface ShareDoc {
  _id: string;
  createdAt?: Date | string;
  expiresAt?: string;
  createdBy?: string;
  lessonId?: string;
  bundle?: SharedBundle["bundle"];
  comments?: SharedBundle["comments"];
  accessCount?: number;
}

export type SharedBundle = {
  shareId: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  lessonId: string;
  bundle: {
    title: string;
    plan?: LessonPlan;
    cheatSheet?: CheatSheet;
    quiz: string[];
    loModules: LoStudyModule[] | null;
    emphases: Emphasis[];
    notes: string[];
    weakTopics?: TopicScore[];
  };
  comments: Array<{ author: string; text: string; createdAt: string }>;
  accessCount: number;
};

export const shareService = {
  /**
   * Remove expired shares from the database.
   */
  async cleanExpired() {
    const now = new Date().toISOString();
    await ShareModel.deleteMany({ expiresAt: { $lte: now } });
  },

  /**
   * Create a new share bundle for a lesson.
   */
  async createShare(
    lessonId: string,
    createdBy: string = "anonymous"
  ): Promise<SharedBundle | null> {
    const lesson = getLesson(lessonId);
    if (!lesson) return null;

    const weakness = weaknessService.getWeaknessForLesson(lessonId);

    const shareId = rid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const bundle = {
      title: lesson.title,
      plan: lesson.plan || undefined,
      cheatSheet: lesson.cheatSheet || undefined,
      quiz: (lesson.quizPacks || []).map((q: { packId: string; createdAt: string; lastScore?: number }) => q.packId),
      loModules: lesson.loModules?.modules || undefined,
      emphases: lesson.professorEmphases || lesson.plan?.emphases || [],
      notes: [],
      weakTopics: weakness?.topics || [],
    };

    await this.cleanExpired();

    const doc = await ShareModel.create({
      _id: shareId,
      createdBy,
      lessonId,
      expiresAt,
      bundle,
      comments: [],
      accessCount: 0,
    });

    const plain = typeof doc.toObject === "function" ? doc.toObject() : doc;
    return this.toBundle(plain as unknown as ShareDoc);
  },

  /**
   * Retrieve a share by ID, incrementing access count.
   */
  async getShare(shareId: string): Promise<SharedBundle | null> {
    await this.cleanExpired();

    const doc = await ShareModel.findByIdAndUpdate(
      shareId,
      { $inc: { accessCount: 1 } },
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;
    return this.toBundle(doc as unknown as ShareDoc);
  },

  /**
   * Add a comment to an existing share.
   */
  async addComment(
    shareId: string,
    author: string,
    text: string
  ): Promise<SharedBundle | null> {
    const doc = await ShareModel.findByIdAndUpdate(
      shareId,
      {
        $push: {
          comments: {
            author: author || "anonymous",
            text,
            createdAt: new Date().toISOString(),
          },
        },
      },
      { returnDocument: 'after' }
    ).lean();

    if (!doc) return null;
    return this.toBundle(doc as unknown as ShareDoc);
  },

  /**
   * List non-expired shares owned by a specific user.
   */
  async listShares(userId: string): Promise<SharedBundle[]> {
    await this.cleanExpired();
    const docs = await ShareModel.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
    return docs.map((d) => this.toBundle(d as unknown as ShareDoc));
  },

  /**
   * Delete a share by ID (only if owned by userId).
   */
  async deleteShare(shareId: string, userId: string): Promise<boolean> {
    const result = await ShareModel.findOneAndDelete({ _id: shareId, createdBy: userId });
    return !!result;
  },

  /**
   * Convert a Mongoose lean document to SharedBundle shape.
   */
  toBundle(doc: ShareDoc): SharedBundle {
    const createdAt = doc.createdAt instanceof Date
      ? doc.createdAt.toISOString()
      : String(doc.createdAt ?? "");
    return {
      shareId: doc._id,
      createdAt,
      expiresAt: doc.expiresAt ?? "",
      createdBy: doc.createdBy ?? "anonymous",
      lessonId: doc.lessonId ?? "",
      bundle: doc.bundle ?? {
        title: "",
        plan: undefined,
        cheatSheet: undefined,
        quiz: [],
        loModules: null,
        emphases: [],
        notes: [],
      },
      comments: doc.comments ?? [],
      accessCount: doc.accessCount ?? 0,
    };
  },
};

// ── Standalone function aliases for backward-compatible imports ──

export const createShare = (lessonId: string, createdBy?: string) =>
  shareService.createShare(lessonId, createdBy);

export const getShare = (shareId: string) =>
  shareService.getShare(shareId);

export const addComment = (shareId: string, author: string, text: string) =>
  shareService.addComment(shareId, author, text);

export const listShares = (userId: string) =>
  shareService.listShares(userId);

export const deleteShare = (shareId: string, userId: string) =>
  shareService.deleteShare(shareId, userId);
