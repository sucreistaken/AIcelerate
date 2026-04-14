import { create } from 'zustand';
import { ConceptConnection } from '../types';
import { connectionsApi } from '../services/api';
import { t } from '../utils/i18n';

type SortMode = 'strength' | 'alpha' | 'lesson-count';

interface ConnectionsState {
  connections: ConceptConnection[];
  loading: boolean;
  error: string | null;

  searchQuery: string;
  minStrength: number;
  selectedLessonFilter: string | null;
  sortMode: SortMode;

  selectedConcept: string | null;
  deepDiveResult: string | null;
  deepDiveLoading: boolean;
  deepDiveError: string | null;
  /** AbortController for the currently in-flight deep-dive SSE stream, if any. */
  _deepDiveController: AbortController | null;

  fetchConnections: () => Promise<void>;
  buildConnections: () => Promise<void>;

  setSearchQuery: (q: string) => void;
  setMinStrength: (v: number) => void;
  setLessonFilter: (lessonId: string | null) => void;
  setSortMode: (mode: SortMode) => void;

  setSelectedConcept: (concept: string | null) => void;
  deepDiveConcept: (concept: string, lessonTitles: string[], relatedConcepts: string[]) => void;
  clearDeepDive: () => void;

  getFilteredConnections: () => ConceptConnection[];
}

export const useConnectionsStore = create<ConnectionsState>()((set, get) => ({
  connections: [],
  loading: false,
  error: null,

  searchQuery: '',
  minStrength: 0,
  selectedLessonFilter: null,
  sortMode: 'strength' as SortMode,

  selectedConcept: null,
  deepDiveResult: null,
  deepDiveLoading: false,
  deepDiveError: null,
  _deepDiveController: null,

  fetchConnections: async () => {
    set({ loading: true, error: null });
    try {
      const res = await connectionsApi.get();
      if (res.ok && res.connections) {
        set({ connections: res.connections });
      }
    } catch (err: any) {
      set({ error: err.message || t('error.loadFailed') });
    }
    set({ loading: false });
  },

  buildConnections: async () => {
    set({ loading: true, error: null });
    try {
      const res = await connectionsApi.build();
      if (res.ok && res.connections) {
        set({ connections: res.connections });
      } else {
        set({ error: res.error || t('error.connectionsFailed') });
      }
    } catch (err: any) {
      set({ error: err.message || t('error.connectionsFailed') });
    }
    set({ loading: false });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setMinStrength: (v) => set({ minStrength: v }),
  setLessonFilter: (lessonId) => set({ selectedLessonFilter: lessonId }),
  setSortMode: (mode) => set({ sortMode: mode }),

  setSelectedConcept: (concept) => {
    // Switching concept mid-stream: abort the old one so its chunks don't leak
    // into the new concept's result.
    get()._deepDiveController?.abort();
    set({
      selectedConcept: concept,
      deepDiveResult: null,
      deepDiveError: null,
      deepDiveLoading: false,
      _deepDiveController: null,
    });
  },

  clearDeepDive: () => {
    get()._deepDiveController?.abort();
    set({
      deepDiveResult: null,
      deepDiveError: null,
      deepDiveLoading: false,
      _deepDiveController: null,
    });
  },

  deepDiveConcept: (concept, lessonTitles, relatedConcepts) => {
    // Cancel any in-flight stream before starting a new one
    get()._deepDiveController?.abort();

    // Seed the result with "" (not null) so the UI can distinguish
    // "streaming, nothing yet" from "no dive requested".
    set({
      deepDiveLoading: true,
      deepDiveResult: '',
      deepDiveError: null,
    });

    const controller = connectionsApi.deepDiveStream(
      concept,
      lessonTitles,
      relatedConcepts,
      (chunk) => {
        set((state) => ({ deepDiveResult: (state.deepDiveResult ?? '') + chunk }));
      },
      () => {
        set({ deepDiveLoading: false, _deepDiveController: null });
      },
      (error) => {
        set((state) => ({
          deepDiveLoading: false,
          deepDiveError: error,
          // Keep any partial text so the user sees what arrived before the error.
          deepDiveResult: state.deepDiveResult || null,
          _deepDiveController: null,
        }));
      },
    );

    set({ _deepDiveController: controller });
  },

  getFilteredConnections: () => {
    const { connections, searchQuery, minStrength, selectedLessonFilter, sortMode } = get();

    let filtered = connections.filter((c) => {
      if (searchQuery && !c.concept.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (c.strength < minStrength) return false;
      if (selectedLessonFilter && !c.lessonIds.includes(selectedLessonFilter)) return false;
      return true;
    });

    const sorted = [...filtered];
    switch (sortMode) {
      case 'strength':
        sorted.sort((a, b) => b.strength - a.strength);
        break;
      case 'alpha':
        sorted.sort((a, b) => a.concept.localeCompare(b.concept));
        break;
      case 'lesson-count':
        sorted.sort((a, b) => b.lessonIds.length - a.lessonIds.length);
        break;
    }

    return sorted;
  },
}));
