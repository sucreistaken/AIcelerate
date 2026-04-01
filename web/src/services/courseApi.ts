// src/services/courseApi.ts
// Course and Learning Objectives APIs

import { logger } from "../utils/logger";
import { t } from "../utils/i18n";
import { API_BASE } from './httpClient';
import { Course, CourseKnowledgeIndex, CourseProgress, WeeklySchedule, CourseExport, LoAlignment, LoStudyModule, KnowledgeGraph, AdaptiveQuizSessionState, AdaptiveQuizSummary, LODashboardData, LOProgress } from '../types';

// ============ Course API ============
export const courseApi = {
    async getAll(): Promise<{ ok: boolean; courses?: Course[]; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses`);
            return await res.json();
        } catch (error) {
            logger.warn('Courses could not be loaded', error);
            return { ok: false, error: t('error.loadFailed') };
        }
    },

    async getById(id: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${id}`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.loadFailed') };
        }
    },

    async create(code: string, name: string, description?: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, name, description }),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.createFailed') };
        }
    },

    async update(id: string, updates: Partial<Course>): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.updateFailed') };
        }
    },

    async delete(id: string): Promise<{ ok: boolean; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${id}`, { method: 'DELETE' });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.deleteFailed') };
        }
    },

    async addLesson(courseId: string, lessonId: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lessonId}`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.updateFailed') };
        }
    },

    async removeLesson(courseId: string, lessonId: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lessonId}`, {
                method: 'DELETE',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.updateFailed') };
        }
    },

    async rebuildIndex(courseId: string): Promise<{ ok: boolean; knowledgeIndex?: CourseKnowledgeIndex; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/rebuild-index`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.generic') };
        }
    },

    async courseChat(courseId: string, message: string, history: any[]): Promise<{ ok: boolean; text?: string; suggestions?: string[]; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message, history }),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.generic') };
        }
    },

    async getProgress(courseId: string): Promise<{ ok: boolean; progress?: CourseProgress; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/progress`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.loadFailed') };
        }
    },

    async generateSchedule(courseId: string, examDate?: string): Promise<{ ok: boolean; schedule?: WeeklySchedule; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/study-schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ examDate }),
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.generic') };
        }
    },

    async exportCourse(courseId: string): Promise<{ ok: boolean; export?: CourseExport; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/export`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: t('error.generic') };
        }
    },
};

// ============ LO (Learning Outcomes) API ============
export const loApi = {
    async fetchLearningOutcomes(courseCode: string): Promise<{ ok: boolean; learningOutcomes?: string[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/ieu/learning-outcomes?code=${encodeURIComponent(courseCode)}`);
        return await res.json();
    },

    async align(lessonId: string, params: {
        transcript: string;
        slidesText: string;
        learningOutcomes: string[];
    }): Promise<{ ok: boolean; loAlignment?: LoAlignment; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/lo-align`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return await res.json();
    },

    async generateModules(lessonId: string): Promise<{ ok: boolean; modules?: LoStudyModule[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/lo-modules`, {
            method: 'POST',
        });
        return await res.json();
    },
};

// ============ Knowledge Graph API ============
export const knowledgeGraphApi = {
    async get(courseId: string): Promise<{ ok: boolean; graph?: KnowledgeGraph | null; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/knowledge-graph`);
            return await res.json();
        } catch {
            return { ok: false, error: "Failed to fetch knowledge graph" };
        }
    },
    async rebuild(courseId: string): Promise<{ ok: boolean; graph?: KnowledgeGraph; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/knowledge-graph/rebuild`, { method: "POST" });
            return await res.json();
        } catch {
            return { ok: false, error: "Failed to rebuild knowledge graph" };
        }
    },
};

// ============ Adaptive Quiz API ============
export const adaptiveQuizApi = {
    async start(courseId: string, lessonIds?: string[]): Promise<{ ok: boolean } & Partial<AdaptiveQuizSessionState>> {
        try {
            const res = await fetch(`${API_BASE}/api/adaptive-quiz/start`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ courseId, lessonIds }),
            });
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
    async getSession(sessionId: string): Promise<{ ok: boolean } & Partial<AdaptiveQuizSessionState>> {
        try {
            const res = await fetch(`${API_BASE}/api/adaptive-quiz/${sessionId}`);
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
    async submitAnswer(sessionId: string, itemId: string, answer: string): Promise<{ ok: boolean; grade?: string } & Partial<AdaptiveQuizSessionState>> {
        try {
            const res = await fetch(`${API_BASE}/api/adaptive-quiz/${sessionId}/answer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId, answer }),
            });
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
    async endSession(sessionId: string): Promise<{ ok: boolean; summary?: AdaptiveQuizSummary; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/adaptive-quiz/${sessionId}/end`, { method: "POST" });
            return await res.json();
        } catch {
            return { ok: false, error: "Failed to end session" };
        }
    },
};

// ============ LO Progress API ============
export const loProgressApi = {
    async get(courseId: string): Promise<{ ok: boolean } & Partial<LODashboardData>> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lo-progress`);
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
    async getDetail(courseId: string, loId: string): Promise<{ ok: boolean } & Partial<LOProgress>> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lo-progress/${loId}`);
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
    async refresh(courseId: string): Promise<{ ok: boolean } & Partial<LODashboardData>> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lo-progress/refresh`, { method: "POST" });
            return await res.json();
        } catch {
            return { ok: false };
        }
    },
};
