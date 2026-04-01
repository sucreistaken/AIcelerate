// src/services/httpClient.ts
// Shared types and fetch helpers used across all API modules

import { API_BASE } from '../config';
import { t } from '../utils/i18n';

export { API_BASE };

// ============ Types ============
export interface ApiResponse<T = unknown> {
    ok: boolean;
    error?: string;
    data?: T;
}

export interface LessonData {
    id: string;
    title: string;
    date: string;
    transcript?: string;
    slideText?: string;
    plan?: import('../types').Plan;
    courseCode?: string;
    learningOutcomes?: string[];
    loAlignment?: import('../types').LoAlignment;
    loModules?: { modules: import('../types').LoStudyModule[] };
    cheatSheet?: import('../types').CheatSheet;
    planConfidence?: import('../types').ConfidenceScore;
    cheatSheetConfidence?: import('../types').ConfidenceScore;
}

export interface PlanResponse {
    ok: boolean;
    plan: import('../types').Plan;
    lessonId?: string;
    error?: string;
}

export interface TranscribeStartResponse {
    ok: boolean;
    jobId: string;
    error?: string;
}

// ============ Helper ============
export async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const json = await response.json();
    if (!response.ok || !json.ok) {
        return { ok: false, error: json.error || t('error.generic') };
    }
    return { ok: true, data: json };
}
