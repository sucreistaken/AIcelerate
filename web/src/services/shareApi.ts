// src/services/shareApi.ts
// Share, Rooms (old study rooms), Room Workspace, Weakness, and Sprint APIs

import { API_BASE } from './httpClient';
import { WeaknessAnalysis, WeaknessSummary, SharedBundle, StudyRoom, SprintSettings, SprintSession } from '../types';

// ============ Shares API ============
export const sharesApi = {
    async create(lessonId: string, createdBy?: string): Promise<{ ok: boolean; share?: SharedBundle; error?: string }> {
        const res = await fetch(`${API_BASE}/api/shares`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, createdBy }),
        });
        return await res.json();
    },

    async get(shareId: string): Promise<{ ok: boolean; share?: SharedBundle; error?: string }> {
        const res = await fetch(`${API_BASE}/api/shares/${shareId}`);
        return await res.json();
    },

    async addComment(shareId: string, author: string, text: string): Promise<{ ok: boolean; share?: SharedBundle }> {
        const res = await fetch(`${API_BASE}/api/shares/${shareId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ author, text }),
        });
        return await res.json();
    },

    async list(): Promise<{ ok: boolean; shares?: SharedBundle[] }> {
        const res = await fetch(`${API_BASE}/api/shares`);
        return await res.json();
    },

    async delete(shareId: string): Promise<{ ok: boolean }> {
        const res = await fetch(`${API_BASE}/api/shares/${shareId}`, { method: 'DELETE' });
        return await res.json();
    },

    async import(shareId: string): Promise<{ ok: boolean; lessonId?: string; error?: string }> {
        const res = await fetch(`${API_BASE}/api/shares/${shareId}/import`, { method: 'POST' });
        return await res.json();
    },
};

// ============ Rooms API ============
export const roomsApi = {
    async create(name: string, hostId: string, settings?: any, lessonId?: string, lessonTitle?: string): Promise<{ ok: boolean; room?: StudyRoom; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, hostId, settings, lessonId, lessonTitle }),
        });
        return await res.json();
    },

    async get(id: string): Promise<{ ok: boolean; room?: StudyRoom; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/${id}`);
        return await res.json();
    },

    async getByCode(code: string): Promise<{ ok: boolean; room?: StudyRoom; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/code/${encodeURIComponent(code)}`);
        return await res.json();
    },

    async list(): Promise<{ ok: boolean; rooms?: StudyRoom[] }> {
        const res = await fetch(`${API_BASE}/api/rooms`);
        return await res.json();
    },

    async getMyRooms(userId: string): Promise<{ ok: boolean; rooms?: StudyRoom[] }> {
        const res = await fetch(`${API_BASE}/api/rooms/my/${encodeURIComponent(userId)}`);
        return await res.json();
    },

    async getWorkspace(roomId: string): Promise<{ ok: boolean; workspace?: any; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}/workspace`);
        return await res.json();
    },

    async delete(id: string, userId?: string): Promise<{ ok: boolean; error?: string }> {
        const url = userId ? `${API_BASE}/api/rooms/${id}?userId=${encodeURIComponent(userId)}` : `${API_BASE}/api/rooms/${id}`;
        const res = await fetch(url, { method: 'DELETE' });
        return await res.json();
    },
};

// ============ Room Workspace API ============
export const roomWorkspaceApi = {
    async deepDiveAsk(roomId: string, message: string, history: any[]): Promise<{ ok: boolean; text?: string; suggestions?: string[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}/deepdive/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history }),
        });
        return await res.json();
    },

    async generateFlashcards(roomId: string): Promise<{ ok: boolean; cards?: any[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}/flashcards/generate`, {
            method: 'POST',
        });
        return await res.json();
    },

    async mindMapAsk(roomId: string, nodeLabel: string, question?: string): Promise<{ ok: boolean; text?: string; error?: string }> {
        const res = await fetch(`${API_BASE}/api/rooms/${roomId}/mindmap/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeLabel, question }),
        });
        return await res.json();
    },
};

// ============ Weakness Tracker API ============
export const weaknessApi = {
    async getGlobal(): Promise<{ ok: boolean; globalWeakTopics?: WeaknessSummary['globalWeakTopics']; studyPriority?: string[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/weakness`);
        return await res.json();
    },

    async getForLesson(lessonId: string): Promise<{ ok: boolean; analysis?: WeaknessAnalysis; error?: string }> {
        const res = await fetch(`${API_BASE}/api/weakness/${lessonId}`);
        return await res.json();
    },

    async analyzeAll(): Promise<{ ok: boolean; analyses?: WeaknessAnalysis[]; summary?: WeaknessSummary; error?: string }> {
        const res = await fetch(`${API_BASE}/api/weakness/analyze`, { method: 'POST' });
        return await res.json();
    },

    async analyzeLesson(lessonId: string): Promise<{ ok: boolean; analysis?: WeaknessAnalysis; error?: string }> {
        const res = await fetch(`${API_BASE}/api/weakness/${lessonId}/analyze`, { method: 'POST' });
        return await res.json();
    },
};

// ============ Sprint API ============
export const sprintApi = {
    async getSettings(): Promise<{ ok: boolean; settings?: SprintSettings }> {
        const res = await fetch(`${API_BASE}/api/sprint/settings`);
        return await res.json();
    },

    async updateSettings(settings: Partial<SprintSettings>): Promise<{ ok: boolean; settings?: SprintSettings }> {
        const res = await fetch(`${API_BASE}/api/sprint/settings`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        return await res.json();
    },

    async createSession(lessonId?: string): Promise<{ ok: boolean; session?: SprintSession }> {
        const res = await fetch(`${API_BASE}/api/sprint/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId }),
        });
        return await res.json();
    },

    async updateSession(id: string, updates: Partial<SprintSession>): Promise<{ ok: boolean; session?: SprintSession }> {
        const res = await fetch(`${API_BASE}/api/sprint/sessions/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return await res.json();
    },

    async getStats(): Promise<{ ok: boolean; totalSessions?: number; totalStudyMinutes?: number; totalPomodoros?: number; recentSessions?: SprintSession[] }> {
        const res = await fetch(`${API_BASE}/api/sprint/stats`);
        return await res.json();
    },

    async getFocus(lessonId: string): Promise<{ ok: boolean; focus?: { weakTopics: string[]; dueFlashcards: number; cheatHighlights: string[]; emphases: string[] } }> {
        const res = await fetch(`${API_BASE}/api/sprint/focus/${lessonId}`);
        return await res.json();
    },
};
