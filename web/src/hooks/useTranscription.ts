// src/hooks/useTranscription.ts
import { useCallback, useRef } from 'react';
import { useLessonStore } from '../stores/lessonStore';
import { useUiStore } from '../stores/uiStore';
import { uploadApi } from '../services/api';
import { consumeSseStream } from '../services/sseClient';

import { formatSeconds as fmtTime, formatDuration as formatTime } from '../utils/formatters';

const ALLOWED_FORMATS = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/mp3', 'audio/webm', 'video/mp4'];
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.mp4', '.m4a', '.webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Module-scoped accessors — stable references so useCallback deps don't churn.
// Consumers invoke these at call time to read the latest store state without
// subscribing the component to every unrelated field change.
const store = () => useLessonStore.getState();
const ui = () => useUiStore.getState();

export function useTranscription() {
    // Reactive subscription — only re-render when `stt` slice changes (which
    // is what we actually expose to callers).
    const stt = useUiStore((s) => s.stt);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const streamCtrlRef = useRef<AbortController | null>(null);
    const segmentCountRef = useRef(0);
    const transcriptionStartRef = useRef<number>(0);

    const showToast = useCallback((txt: string) => {
        // Debounce: only show toast every 5 segments
        segmentCountRef.current++;
        if (segmentCountRef.current % 5 !== 1) return;

        ui().setSttProgress({ toast: txt });
        if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current);
        }
        toastTimerRef.current = setTimeout(() => {
            ui().setSttProgress({ toast: null });
        }, 4000);
    }, []);

    const startTranscription = useCallback(async (file: File) => {
        const { currentLessonId } = store();

        if (!currentLessonId) {
            store().setError('First create or select a lesson (lessonId needed).');
            return;
        }

        // File validation
        const ext = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!ALLOWED_FORMATS.includes(file.type) && !ALLOWED_EXTENSIONS.includes(ext)) {
            store().setError(`Desteklenmeyen dosya formatı: ${ext || file.type}. Kabul edilen formatlar: MP3, WAV, MP4, M4A, WebM`);
            return;
        }
        if (file.size > MAX_FILE_SIZE) {
            store().setError(`Dosya çok büyük: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maksimum: 100MB`);
            return;
        }

        segmentCountRef.current = 0;
        transcriptionStartRef.current = Date.now();
        store().setError(null);
        ui().setSttProgress({
            progress: 0,
            now: null,
            status: 'Loading...',
            toast: null,
        });

        try {
            const result = await uploadApi.startTranscribe(file, currentLessonId);

            if (!result.ok) {
                store().setError(result.error || 'Start transcribe error');
                ui().setSttProgress({ status: 'Failed to start ❌' });
                return;
            }

            // Clear transcript for new transcription
            store().setLectureText('');
            ui().setSttProgress({ status: 'Transcribing...' });

            // Stream transcription progress via fetch-based SSE (Bearer-auth capable,
            // unlike native EventSource which can't set Authorization).
            const streamUrl = uploadApi.getTranscribeStreamUrl(result.jobId);
            streamCtrlRef.current?.abort();
            streamCtrlRef.current = consumeSseStream(
                streamUrl,
                { method: 'GET' },
                {
                    onEvent: (msg) => {
                        if (msg.type === 'meta') {
                            ui().setSttProgress({
                                status: `Model: ${msg.model} • Duration: ${((msg.duration as number) / 60).toFixed(1)} min`,
                            });
                            return;
                        }

                        if (msg.type === 'log') {
                            if (typeof msg.message === 'string' && msg.message.trim()) {
                                ui().setSttProgress({
                                    status: `Preparing... (${msg.message.trim().slice(0, 60)})`,
                                });
                            }
                            return;
                        }

                        if (msg.type === 'segment') {
                            const p = Math.round(((msg.progress as number) ?? 0) * 100);

                            if (typeof msg.start === 'number' && typeof msg.end === 'number') {
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
                                ui().setSttProgress({
                                    progress: p,
                                    now: { start: msg.start, end: msg.end },
                                    status: `Transcribing ${fmtTime(msg.start)}–${fmtTime(msg.end)} (${p}%)${etaStr}`,
                                });
                                showToast(`${fmtTime(msg.start)}–${fmtTime(msg.end)}`);
                            }

                            if (msg.text) {
                                const line = `[${formatTime(msg.start as number)} – ${formatTime(msg.end as number)}] ${msg.text}`;
                                const currentText = useLessonStore.getState().lectureText;
                                store().setLectureText(
                                    currentText ? currentText + '\n' + line : line
                                );
                            }
                            return;
                        }

                        if (msg.type === 'error') {
                            store().setError((msg.message as string) || 'Transcribe error');
                            ui().setSttProgress({ status: 'Error ❌', now: null });
                            streamCtrlRef.current?.abort();
                            return;
                        }

                        if (msg.type === 'done') {
                            ui().setSttProgress({
                                progress: 100,
                                status: 'Done ✅',
                                now: null,
                                toast: null,
                            });
                            streamCtrlRef.current?.abort();
                            return;
                        }
                    },
                    onError: (err) => {
                        store().setError(err);
                        ui().setSttProgress({ status: 'Connection error ❌', now: null });
                    },
                    onClose: () => {
                        streamCtrlRef.current = null;
                    },
                },
            );
        } catch (e: unknown) {
            store().setError((e instanceof Error ? e.message : String(e)) || 'Start transcribe error');
            ui().setSttProgress({ status: 'Failed to start ❌' });
        }
    }, [showToast]);

    const clearTranscription = useCallback(() => {
        store().setLectureText('');
        ui().resetStt();
        streamCtrlRef.current?.abort();
        streamCtrlRef.current = null;
    }, []);

    const cancelTranscription = useCallback(() => {
        streamCtrlRef.current?.abort();
        streamCtrlRef.current = null;
        ui().setSttProgress({
            status: 'Cancelled',
            now: null,
        });
    }, []);

    return {
        // State from ui store
        stt: stt,
        // Actions
        startTranscription,
        clearTranscription,
        cancelTranscription,
    };
}
