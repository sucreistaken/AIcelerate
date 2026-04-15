// src/services/quizApi.ts
// Quiz-related API

import { API_BASE } from './httpClient';
import { apiFetch } from './fetchWithAuth';
import { Plan } from '../types';

// ============ Quiz API ============
export const quizApi = {
    async generateFromPlan(plan: Plan): Promise<{ ok: boolean; questions?: string[]; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/quiz-from-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ plan }),
        });
        return await res.json();
    },

    async getAnswers(params: {
        questions: string[];
        lectureText?: string;
        slidesText?: string;
        plan?: Plan | null;
        lessonId?: string;
    }): Promise<{ ok: boolean; answers?: unknown[]; error?: string }> {
        const res = await apiFetch(`${API_BASE}/api/quiz-answers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return await res.json();
    },
};
