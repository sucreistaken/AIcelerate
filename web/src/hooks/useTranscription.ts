// src/hooks/useTranscription.ts
import { useCallback, useRef } from 'react';
import { useLessonStore } from '../stores/lessonStore';
import { useUiStore } from '../stores/uiStore';
import { uploadApi } from '../services/api';

import { formatSeconds as fmtTime, formatDuration as formatTime } from '../utils/formatters';

const ALLOWED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3', 'audio/webm', 'video/mp4'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.mp4', '.m4a', '.webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export function useTranscription() {
    const store = useLessonStore();
    const ui = useUiStore();
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const segmentCountRef = useRef(0);
    const transcriptionStartRef = useRef<number>(0);

    const showToast = useCallback((txt: string) => {
        // Debounce: only show toast every 5 segments
        segmentCountRef.current++;
        if (segmentCountRef.current % 5 !== 1) return;

        ui.setSttProgress({ toast: txt });
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
            ui.setSttProgress({ toast: null });
        }, 4000);
    }, [ui]);

    const startTranscription = useCallback(async (file: File) => {
        const { currentLessonId } = store;

        if (!currentLessonId) {
            store.setError('First create or select a lesson (lessonId needed).');
            return;
        }

        // File validation
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_FORMATS.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
            store.setError(`Desteklenmeyen dosya formatı: ${ext || file.type}. Kabul edilen formatlar: MP3, WAV, MP4, M4A, WebM`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            store.setError(`Dosya çok büyük: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maksimum: 100MB`);
            return;
        }

        segmentCountRef.current = 0;
        transcriptionStartRef.current = Date.now();
        store.setError(null);
        ui.setSttProgress({
            progress: 0,
            now: null,
            status: 'Loading...',
            toast: null,
        });

        try {
            const result = await uploadApi.startTranscribe(file, currentLessonId);

            if (!result.ok) {
                store.setError(result.error || 'Start transcribe error');
                ui.setSttProgress({ status: 'Failed to start ❌' });
                return;
            }

            // Clear transcript for new transcription
            store.setLectureText('');
            ui.setSttProgress({ status: 'Transcribing...' });

            // Start SSE connection
            const streamUrl = uploadApi.getTranscribeStreamUrl(result.jobId);
            const es = new EventSource(streamUrl);
            eventSourceRef.current = es;

            es.onmessage = (ev) => {
                try {
                    const msg = JSON.parse(ev.data);

                    if (msg.type === 'meta') {
                        ui.setSttProgress({
                            status: `Model: ${msg.model} • Duration: ${(msg.duration / 60).toFixed(1)} min`,
                        });
                        return;
                    }

                    if (msg.type === 'log') {
                        if (typeof msg.message === 'string' && msg.message.trim()) {
                            ui.setSttProgress({
                                status: `Preparing... (${msg.message.trim().slice(0, 60)})`,
                            });
                        }
                        return;
                    }

                    if (msg.type === 'segment') {
                        const p = Math.round((msg.progress ?? 0) * 100);

                        if (typeof msg.start === 'number' && typeof msg.end === 'number') {
                            // Calculate estimated remaining time
                            let etaStr = '';
                            if (p > 5 && transcriptionStartRef.current) {
                                const elapsed = (Date.now() - transcriptionStartRef.current) / 1000;
                                const remaining = (elapsed / (p / 100)) - elapsed;
                                if (remaining > 60) {
                                    etaStr = ` • ~${Math.ceil(remaining / 60)} dk kaldı`;
                                } else if (remaining > 0) {
                                    etaStr = ` • ~${Math.round(remaining)}s kaldı`;
                                }
                            }
                            ui.setSttProgress({
                                progress: p,
                                now: { start: msg.start, end: msg.end },
                                status: `Transcribing ${fmtTime(msg.start)}–${fmtTime(msg.end)} (${p}%)${etaStr}`,
                            });
                            showToast(`${fmtTime(msg.start)}–${fmtTime(msg.end)}`);
                        }

                        if (msg.text) {
                            const line = `[${formatTime(msg.start)} – ${formatTime(msg.end)}] ${msg.text}`;
                            const currentText = useLessonStore.getState().lectureText;
                            store.setLectureText(
                                currentText ? currentText + '\n' + line : line
                            );
                        }
                        return;
                    }

                    if (msg.type === 'error') {
                        store.setError(msg.message || 'Transcribe error');
                        ui.setSttProgress({
                            status: 'Error ❌',
                            now: null,
                        });
                        es.close();
                        return;
                    }

                    if (msg.type === 'done') {
                        ui.setSttProgress({
                            progress: 100,
                            status: 'Done ✅',
                            now: null,
                            toast: null,
                        });
                        es.close();
                        return;
                    }
                } catch {
                    // ignore parse errors
                }
            };

            es.onerror = () => {
                ui.setSttProgress({
                    status: 'Connection error (SSE) ❌',
                    now: null,
                });
                es.close();
            };
        } catch (e: any) {
            store.setError(e.message || 'Start transcribe error');
            ui.setSttProgress({ status: 'Failed to start ❌' });
        }
    }, [store, ui, showToast]);

    const clearTranscription = useCallback(() => {
        store.setLectureText('');
        ui.resetStt();
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
    }, [store, ui]);

    const cancelTranscription = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        ui.setSttProgress({
            status: 'Cancelled',
            now: null,
        });
    }, [ui]);

    return {
        // State from ui store
        stt: ui.stt,
        // Actions
        startTranscription,
        clearTranscription,
        cancelTranscription,
    };
}
