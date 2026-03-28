// src/services/lessonApi.ts
// Lesson-related APIs: lessonsApi, uploadApi, planApi, cheatSheetApi, deviationApi, deepDiveApi, connectionsApi

import { logger } from "../utils/logger";
import { t } from "../utils/i18n";
import { API_BASE, LessonData, PlanResponse, TranscribeStartResponse } from './httpClient';
import { Plan, CheatSheet, ConceptConnection } from '../types';

// ============ Lessons API ============
export const lessonsApi = {
    async getAll(): Promise<LessonData[]> {
        try {
            const res = await fetch(`${API_BASE}/api/lessons`);
            const json = await res.json();
            return Array.isArray(json) ? json : [];
        } catch (error) {
            logger.warn('Dersler yuklenemedi', error);
            return [];
        }
    },

    async getById(id: string): Promise<LessonData | null> {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${id}`);
            if (!res.ok) return null;
            return await res.json();
        } catch (error) {
            logger.warn('Ders yuklenemedi', error);
            return null;
        }
    },

    async create(title: string): Promise<{ id: string; title: string } | null> {
        try {
            const res = await fetch(`${API_BASE}/api/lessons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });
            const json = await res.json();
            if (res.ok && json.id) {
                return { id: json.id, title: json.title };
            }
            return null;
        } catch (error) {
            logger.error('Ders olusturma hatasi:', error);
            return null;
        }
    },

    async delete(id: string): Promise<{ ok: boolean; error?: string }> {
        try {
            const res = await fetch(`${API_BASE}/api/lessons/${id}`, {
                method: 'DELETE',
            });
            return await res.json();
        } catch (error) {
            logger.error('Ders silme hatasi:', error);
            return { ok: false, error: t('error.lessonDeleteSingle') };
        }
    },

    async uploadSlides(lessonId: string, file: File): Promise<{ ok: boolean; text?: string; error?: string }> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lessonId', lessonId);

        try {
            const res = await fetch(`${API_BASE}/api/slides/upload`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                // Return the detailed error from backend (which includes stderr)
                throw new Error(data.details || data.error || res.statusText);
            }
            return data;
        } catch (error: any) {
            logger.error('OCR upload failed:', error);
            throw error; // Propagate the specific error message
        }
    },
};

// ============ Plan API ============
export const planApi = {
    async createFromText(params: {
        lectureText: string;
        slidesText: string;
        title: string;
        lessonId?: string;
        courseCode?: string;
        learningOutcomes?: string[];
    }): Promise<PlanResponse> {
        const res = await fetch(`${API_BASE}/api/plan-from-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
        });
        return await res.json();
    },

    createFromTextStream(
        params: {
            lectureText: string;
            slidesText: string;
            title: string;
            lessonId?: string;
            courseCode?: string;
            learningOutcomes?: string[];
        },
        callbacks: {
            onPhase: (phase: string, message: string) => void;
            onProgress: (tokens: number) => void;
            onModule: (index: number, total: number, data: any) => void;
            onEmphasis: (index: number, total: number, data: any) => void;
            onDone: (plan: any, lessonId: string) => void;
            onError: (error: string) => void;
        }
    ): AbortController {
        const controller = new AbortController();

        (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/plan-from-text/stream`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                    signal: controller.signal,
                });

                if (!res.ok) {
                    try {
                        const errBody = await res.json();
                        callbacks.onError(errBody.error || t('streaming.connectionFailed'));
                    } catch {
                        callbacks.onError(t('streaming.connectionFailed'));
                    }
                    return;
                }
                if (!res.body) {
                    callbacks.onError(t('streaming.connectionFailed'));
                    return;
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const data = JSON.parse(line.slice(6));
                            switch (data.type) {
                                case 'phase':
                                    callbacks.onPhase(data.phase, data.message);
                                    break;
                                case 'progress':
                                    callbacks.onProgress(data.tokens);
                                    break;
                                case 'module':
                                    callbacks.onModule(data.index, data.total, data.data);
                                    break;
                                case 'emphasis':
                                    callbacks.onEmphasis(data.index, data.total, data.data);
                                    break;
                                case 'done':
                                    callbacks.onDone(data.plan, data.lessonId);
                                    break;
                                case 'error':
                                    callbacks.onError(data.message);
                                    break;
                            }
                        } catch {
                            // skip malformed events
                        }
                    }
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    callbacks.onError(err.message || t('streaming.failed'));
                }
            }
        })();

        return controller;
    },
};

// ============ Upload API ============
export const uploadApi = {
    async uploadPdf(file: File): Promise<{ ok: boolean; text?: string; error?: string }> {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/api/upload/pdf`, {
            method: 'POST',
            body: formData,
        });
        return await res.json();
    },

    async startTranscribe(file: File, lessonId: string): Promise<TranscribeStartResponse> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('lessonId', lessonId);
        const res = await fetch(`${API_BASE}/api/transcribe/start`, {
            method: 'POST',
            body: formData,
        });
        return await res.json();
    },

    getTranscribeStreamUrl(jobId: string): string {
        return `${API_BASE}/api/transcribe/stream/${jobId}`;
    },
};

// ============ Cheat Sheet API ============
export const cheatSheetApi = {
    async generate(lessonId: string, language: 'tr' | 'en' = 'tr'): Promise<{ ok: boolean; cheatSheet?: CheatSheet; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/cheat-sheet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language }),
        });
        return await res.json();
    },
};

// ============ Deviation API ============
export const deviationApi = {
    async analyze(lessonId: string, force = false): Promise<{ ok: boolean; deviation?: unknown; error?: string }> {
        const url = force
            ? `${API_BASE}/api/lessons/${lessonId}/deviation?force=true`
            : `${API_BASE}/api/lessons/${lessonId}/deviation`;
        const res = await fetch(url, {
            method: 'POST',
        });
        return await res.json();
    },

    async reanalyze(lessonId: string): Promise<{ ok: boolean; deviation?: unknown; error?: string }> {
        return this.analyze(lessonId, true);
    },
};

// ============ Deep Dive (Chat & MindMap) API ============
export const deepDiveApi = {
    async chat(lessonId: string, message: string, history: any[]): Promise<{ ok: boolean; text?: string; suggestions?: string[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history }),
        });
        return await res.json();
    },

    chatStream(
        lessonId: string,
        message: string,
        history: any[],
        onChunk: (text: string) => void,
        onDone: (suggestions: string[]) => void,
        onError: (error: string) => void,
    ): AbortController {
        const controller = new AbortController();
        fetch(`${API_BASE}/api/lessons/${lessonId}/chat?stream=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history }),
            signal: controller.signal,
        }).then(async (res) => {
            if (!res.ok || !res.body) {
                onError('Stream connection failed');
                return;
            }
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'chunk') onChunk(data.text);
                            else if (data.type === 'done') onDone(data.suggestions || []);
                            else if (data.type === 'error') onError(data.error || 'Unknown error');
                        } catch {}
                    }
                }
            }
        }).catch((err) => {
            if (err.name !== 'AbortError') onError(err.message);
        });
        return controller;
    },

    async generateMindMap(lessonId: string): Promise<{ ok: boolean; code?: string; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/mindmap`, {
            method: 'POST',
        });
        return await res.json();
    },

    // Multi-Map: Get list of modules
    async getModules(lessonId: string): Promise<{ ok: boolean; lessonTitle?: string; modules?: Array<{ id: number; title: string; topics: string[] }>; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/modules`);
        return await res.json();
    },

    // Multi-Map: Generate mindmap for specific module
    async generateModuleMindMap(lessonId: string, moduleIndex: number): Promise<{ ok: boolean; code?: string; moduleTitle?: string; error?: string }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/mindmap/module`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ moduleIndex }),
        });
        return await res.json();
    },

    // Node Detail: Get AI-powered explanation, example, or quiz for a node
    async getNodeDetail(lessonId: string, nodeName: string, action: 'explain' | 'example' | 'quiz'): Promise<{
        ok: boolean;
        action?: string;
        title?: string;
        explanation?: string;
        keyPoints?: string[];
        relatedConcepts?: string[];
        example?: { scenario: string; explanation: string; takeaway: string };
        quiz?: { question: string; options: string[]; correctAnswer: string; explanation: string };
        error?: string;
    }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/mindmap/node-detail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeName, action }),
        });
        return await res.json();
    },

    // Node Detail Full: Get explain+example+quiz in a single call (saves 2 API calls)
    async getNodeDetailFull(lessonId: string, nodeName: string): Promise<{
        ok: boolean;
        action?: string;
        title?: string;
        explanation?: string;
        keyPoints?: string[];
        relatedConcepts?: string[];
        example?: { scenario: string; explanation: string; takeaway: string };
        quiz?: { question: string; options: string[]; correctAnswer: string; explanation: string };
        error?: string;
    }> {
        const res = await fetch(`${API_BASE}/api/lessons/${lessonId}/mindmap/node-detail`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeName, action: 'all' }),
        });
        return await res.json();
    }
};

// ============ Connections API ============
export const connectionsApi = {
    async get(): Promise<{ ok: boolean; connections?: ConceptConnection[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/connections`);
        return await res.json();
    },

    async build(): Promise<{ ok: boolean; connections?: ConceptConnection[]; error?: string }> {
        const res = await fetch(`${API_BASE}/api/connections/build`, { method: 'POST' });
        return await res.json();
    },

    async deepDive(
        concept: string,
        lessonTitles: string[],
        relatedConcepts: string[]
    ): Promise<{ ok: boolean; analysis?: string; error?: string }> {
        const res = await fetch(`${API_BASE}/api/connections/deep-dive`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ concept, lessonTitles, relatedConcepts }),
        });
        return await res.json();
    },
};
