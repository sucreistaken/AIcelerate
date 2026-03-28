import { useState, useCallback, useRef, useEffect } from "react";
import { planApi } from "../services/api";
import { t } from "../utils/i18n";

export interface StreamPhase {
  id: string;
  message: string;
  status: "pending" | "active" | "done";
}

export interface StreamingModule {
  index: number;
  total: number;
  data: any;
}

export interface StreamingState {
  isStreaming: boolean;
  phases: StreamPhase[];
  currentPhase: string;
  tokenCount: number;
  modules: StreamingModule[];
  emphases: StreamingModule[];
  progress: number; // 0-100
  error: string | null;
}

const PHASE_ORDER = ["analyzing", "generating", "parsing", "emphases", "done"];

// Phase labels use i18n keys - resolved at render time via t()
const PHASE_KEYS: Record<string, string> = {
  analyzing: "streaming.analyzing",
  generating: "streaming.generating",
  parsing: "streaming.parsing",
  emphases: "streaming.emphases",
  retrying: "streaming.retrying",
  done: "streaming.done",
};

function getPhaseLabel(phase: string): string {
  const key = PHASE_KEYS[phase];
  return key ? t(key) : phase;
}

export function useStreamingAnalysis() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    phases: [],
    currentPhase: "",
    tokenCount: 0,
    modules: [],
    emphases: [],
    progress: 0,
    error: null,
  });

  const controllerRef = useRef<AbortController | null>(null);
  const lastProgressRef = useRef(0);

  const startStream = useCallback((
    params: {
      lectureText: string;
      slidesText: string;
      title: string;
      lessonId?: string;
      courseCode?: string;
      learningOutcomes?: string[];
    },
    onComplete: (plan: any, lessonId: string) => void,
  ) => {
    // Reset state
    setState({
      isStreaming: true,
      phases: PHASE_ORDER.slice(0, -1).map(id => ({
        id,
        message: getPhaseLabel(id),
        status: id === "analyzing" ? "active" : "pending",
      })),
      currentPhase: "analyzing",
      tokenCount: 0,
      modules: [],
      emphases: [],
      progress: 5,
      error: null,
    });

    const controller = planApi.createFromTextStream(params, {
      onPhase: (phase, message) => {
        setState(prev => {
          const phaseIndex = PHASE_ORDER.indexOf(phase);
          const progressMap: Record<string, number> = {
            analyzing: 10,
            generating: 25,
            parsing: 70,
            emphases: 85,
          };

          return {
            ...prev,
            currentPhase: phase,
            progress: progressMap[phase] || prev.progress,
            phases: prev.phases.map(p => {
              const pIdx = PHASE_ORDER.indexOf(p.id);
              if (pIdx < phaseIndex) return { ...p, status: "done" };
              if (pIdx === phaseIndex) return { ...p, status: "active", message: getPhaseLabel(phase) };
              return p;
            }),
          };
        });
      },
      onProgress: (tokens) => {
        // Throttle: only update state every 100 tokens
        if (tokens - lastProgressRef.current < 100) return;
        lastProgressRef.current = tokens;
        setState(prev => ({
          ...prev,
          tokenCount: tokens,
          progress: Math.min(65, 25 + (tokens / 100)),
        }));
      },
      onModule: (index, total, data) => {
        setState(prev => ({
          ...prev,
          modules: [...prev.modules, { index, total, data }],
          progress: 70 + ((index + 1) / total) * 15,
        }));
      },
      onEmphasis: (index, total, data) => {
        setState(prev => ({
          ...prev,
          emphases: [...prev.emphases, { index, total, data }],
          progress: 85 + ((index + 1) / total) * 10,
        }));
      },
      onDone: (plan, lessonId) => {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          progress: 100,
          currentPhase: "done",
          phases: prev.phases.map(p => ({ ...p, status: "done" })),
        }));
        onComplete(plan, lessonId);
      },
      onError: (error) => {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error,
        }));
      },
    });

    controllerRef.current = controller;
  }, []);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false, error: null, progress: 0 }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { controllerRef.current?.abort(); };
  }, []);

  return { ...state, startStream, cancel };
}
