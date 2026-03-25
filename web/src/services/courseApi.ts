// src/services/courseApi.ts
// Course and Learning Objectives APIs

import { logger } from "../utils/logger";
import { API_BASE } from './httpClient';
import { Course, CourseKnowledgeIndex, CourseProgress, WeeklySchedule, CourseExport, LoAlignment, LoStudyModule } from '../types';

// ============ Course API ============
export const courseApi = {
    async getAll(): Promise<{ ok: boolean; courses?: Course[]; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses`);
            return await res.json();
        } catch (error) {
            logger.warn('Courses could not be loaded', error);
            return { ok: false, error: 'Failed to load courses' };
        }
    },

    async getById(id: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${id}`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to load course' };
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
            return { ok: false, error: 'Failed to create course' };
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
            return { ok: false, error: 'Failed to update course' };
        }
    },

    async delete(id: string): Promise<{ ok: boolean; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${id}`, { method: 'DELETE' });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to delete course' };
        }
    },

    async addLesson(courseId: string, lessonId: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lessonId}`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to add lesson' };
        }
    },

    async removeLesson(courseId: string, lessonId: string): Promise<{ ok: boolean; course?: Course; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lessonId}`, {
                method: 'DELETE',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to remove lesson' };
        }
    },

    async rebuildIndex(courseId: string): Promise<{ ok: boolean; knowledgeIndex?: CourseKnowledgeIndex; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/rebuild-index`, {
                method: 'POST',
            });
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to rebuild index' };
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
            return { ok: false, error: 'Failed to chat' };
        }
    },

    async getProgress(courseId: string): Promise<{ ok: boolean; progress?: CourseProgress; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/progress`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to get progress' };
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
            return { ok: false, error: 'Failed to generate schedule' };
        }
    },

    async exportCourse(courseId: string): Promise<{ ok: boolean; export?: CourseExport; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/courses/${courseId}/export`);
            return await res.json();
        } catch (error) {
            return { ok: false, error: 'Failed to export course' };
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
