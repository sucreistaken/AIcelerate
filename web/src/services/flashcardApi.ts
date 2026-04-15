// src/services/flashcardApi.ts
// Flashcard-related API

import { API_BASE } from './httpClient';
import { apiFetch, apiJson } from './fetchWithAuth';
import { Flashcard, FlashcardStats } from '../types';

// ============ Flashcard API ============
export const flashcardApi = {
    async generate(lessonId: string): Promise<{ ok: boolean; generated?: number; cards?: Flashcard[]; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/flashcards/generate/${lessonId}`, { method: 'POST' });
        return await res.json();
    },

    async getDue(): Promise<{ ok: boolean; cards?: Flashcard[]; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/flashcards/due`);
        return await res.json();
    },

    async review(cardId: string, quality: number): Promise<{ ok: boolean; card?: Flashcard; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/flashcards/${cardId}/review`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quality }),
        });
        return await res.json();
    },

    async getStats(): Promise<{ ok: boolean } & Partial<FlashcardStats>> {
        const res = await apiFetch(`${API_BASE}/api/flashcards/stats`);
        return await res.json();
    },

    async getAll(lessonId?: string): Promise<{ ok: boolean; cards?: Flashcard[]; error?: string }> {
        const url = lessonId ? `${API_BASE}/api/flashcards?lessonId=${lessonId}` : `${API_BASE}/api/flashcards`;
        const res = await apiFetch(url);
        return await res.json();
    },

    async update(cardId: string, front?: string, back?: string): Promise<{ ok: boolean; card?: Flashcard; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/flashcards/${cardId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ front, back }),
        });
        return await res.json();
    },

    async delete(cardId: string): Promise<{ ok: boolean; error?: string }> {
        try {
            // 204 No Content
            await apiJson(`${API_BASE}/api/flashcards/${cardId}`, { method: 'DELETE' });
            return { ok: true };
        } catch (error) {
            return { ok: false, error: (error as Error).message };
        }
    },

    async create(lessonId: string, front: string, back: string, topicName: string): Promise<{ ok: boolean; card?: Flashcard; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/flashcards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lessonId, front, back, topicName }),
        });
        return await res.json();
    },
};
