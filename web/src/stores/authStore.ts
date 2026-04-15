import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi, AuthUser } from "../services/authApi";
import { clearTokens } from "../services/fetchWithAuth";
import { useCourseStore } from "./courseStore";
import { useLessonStore } from "./lessonStore";
import { useNotesStore } from "./notesStore";
import { useProfileStore } from "./profileStore";
import { useGamificationStore } from "./gamificationStore";
import { useStudySelectionStore } from "./studySelectionStore";

/**
 * Reset every per-user persisted store so the next session doesn't flash the
 * previous user's data. When adding a new persisted store that holds user
 * data, add it to the list below — cross-user leak is a real security issue
 * on shared devices.
 */
function resetPersistedUserStores(): void {
  // Lesson + course list (lite + current selections)
  useCourseStore.getState().reset();
  useLessonStore.getState().reset();
  void useCourseStore.persist.clearStorage?.();
  void useLessonStore.persist.clearStorage?.();

  // Notes, profile, XP, selection mode
  useNotesStore.setState({ notes: [], searchQuery: "", selectedTags: [] }, true as never);
  useProfileStore.setState({ profile: null, loading: false, error: null, friends: [] }, true as never);
  useGamificationStore.setState(
    { totalXp: 0, streakDays: 0, lastActiveDate: null, history: [], levelUpShown: 0 },
    true as never,
  );
  useStudySelectionStore.setState(
    { selectedLessonIds: [], isSelectionMode: false, courseIdForSelection: null },
    true as never,
  );

  void useNotesStore.persist.clearStorage?.();
  void useProfileStore.persist.clearStorage?.();
  void useGamificationStore.persist.clearStorage?.();
  void useStudySelectionStore.persist.clearStorage?.();
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;

  register: (email: string, password: string, nickname: string, rememberMe?: boolean) => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
  updateProfile: (profile: Partial<AuthUser["profile"]>) => void;
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      register: async (email, password, nickname, rememberMe = false) => {
        set({ loading: true, error: null });
        try {
          const res = await authApi.register(email, password, nickname, rememberMe);
          set({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
        } catch (err) {
          set({ error: toMessage(err), loading: false });
          throw err;
        }
      },

      login: async (email, password, rememberMe = false) => {
        set({ loading: true, error: null });
        try {
          const res = await authApi.login(email, password, rememberMe);
          set({ user: res.user, token: res.token, isAuthenticated: true, loading: false });
        } catch (err) {
          set({ error: toMessage(err), loading: false });
          throw err;
        }
      },

      logout: async () => {
        // Invalidate the refresh cookie server-side BEFORE clearing local state.
        // Best-effort: if the request fails (network down, expired cookie), we
        // still proceed with local cleanup so the user isn't trapped.
        try {
          await authApi.logout();
        } catch {
          // Server unreachable; local logout still takes effect.
        }
        clearTokens();
        resetPersistedUserStores();
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      fetchMe: async () => {
        const token = get().token;
        if (!token) return;
        try {
          set({ loading: true });
          const res = await authApi.me();
          set({ user: res.user, isAuthenticated: true, loading: false });
        } catch {
          // Token revoked / refresh cookie expired — treat as implicit logout.
          clearTokens();
          resetPersistedUserStores();
          set({ user: null, token: null, isAuthenticated: false, loading: false });
        }
      },

      clearError: () => set({ error: null }),

      updateProfile: (profile) => {
        const user = get().user;
        if (user) {
          set({ user: { ...user, profile: { ...user.profile, ...profile } } });
        }
      },
    }),
    {
      name: "lc-auth",
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    }
  )
);
