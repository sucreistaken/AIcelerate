// src/services/shareApi.ts
// Share link APIs (public share viewing + share lifecycle).

import { API_BASE } from './httpClient';
import { apiFetch, apiJson } from './fetchWithAuth';
import { SharedBundle } from '../types';

export const sharesApi = {
    async create(lessonId: string, createdBy?: string): Promise<{ ok: boolean; share?: SharedBundle; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/shares`, {
            method: 'POST',
            body: JSON.stringify({ lessonId, createdBy }),
        });
        return await res.json();
    },

    async get(shareId: string): Promise<{ ok: boolean; share?: SharedBundle; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/shares/${shareId}`);
        return await res.json();
    },

    async addComment(shareId: string, author: string, text: string): Promise<{ ok: boolean; share?: SharedBundle }> {
        const res = await apiFetch(`${API_BASE}/api/shares/${shareId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ author, text }),
        });
        return await res.json();
    },

    async list(): Promise<{ ok: boolean; shares?: SharedBundle[] }> {
        const res = await apiFetch(`${API_BASE}/api/shares`);
        return await res.json();
    },

    async delete(shareId: string): Promise<{ ok: boolean }> {
        try {
            // 204 No Content
            await apiJson(`${API_BASE}/api/shares/${shareId}`, { method: 'DELETE' });
            return { ok: true };
        } catch {
            return { ok: false };
        }
    },

    async import(shareId: string): Promise<{ ok: boolean; lessonId?: string; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/shares/${shareId}/import`, { method: 'POST' });
        return await res.json();
    },
};
