import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore } from "../authStore";
import { useCourseStore } from "../courseStore";
import { useLessonStore } from "../lessonStore";

vi.mock("../../services/authApi", () => ({
  authApi: {
    register: vi.fn(),
    login: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

import { authApi } from "../../services/authApi";

const mockedAuthApi = authApi as unknown as {
  [K in keyof typeof authApi]: ReturnType<typeof vi.fn>;
};

const mockUser = {
  id: "u1",
  email: "test@example.com",
  profile: { nickname: "Tester", avatar: "default" },
  friendCode: "ABC123",
};

const mockAuthResponse = {
  user: mockUser,
  token: "jwt-token-123",
  expiresIn: "7d",
};

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState(initialState);
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ---- Initial state ----
  it("starts with unauthenticated state", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  // ---- register ----
  it("register sets user, token, and isAuthenticated on success", async () => {
    mockedAuthApi.register.mockResolvedValue(mockAuthResponse);

    await useAuthStore.getState().register("test@example.com", "pass123", "Tester");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("jwt-token-123");
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it("register persists auth state via zustand persist", async () => {
    mockedAuthApi.register.mockResolvedValue(mockAuthResponse);

    await useAuthStore.getState().register("test@example.com", "pass123", "Tester");

    // The in-memory access token is set inside authApi (mocked here), so we
    // assert the persisted auth blob instead.
    const raw = localStorage.getItem("lc-auth");
    expect(raw).not.toBeNull();
    const blob = JSON.parse(raw as string);
    expect(blob.state.token).toBe("jwt-token-123");
    expect(blob.state.isAuthenticated).toBe(true);
  });

  it("register sets error and re-throws on failure", async () => {
    mockedAuthApi.register.mockRejectedValue(new Error("Email taken"));

    await expect(
      useAuthStore.getState().register("taken@example.com", "pass", "Nick")
    ).rejects.toThrow("Email taken");

    const state = useAuthStore.getState();
    expect(state.error).toBe("Email taken");
    expect(state.loading).toBe(false);
    expect(state.isAuthenticated).toBe(false);
  });

  // ---- login ----
  it("login sets user and token on success", async () => {
    mockedAuthApi.login.mockResolvedValue(mockAuthResponse);

    await useAuthStore.getState().login("test@example.com", "pass123");

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.token).toBe("jwt-token-123");
    expect(state.isAuthenticated).toBe(true);
    // Persisted blob contains the token (in-memory lc_token is set by authApi,
    // which is mocked here so that side effect isn't exercised).
    const blob = JSON.parse(localStorage.getItem("lc-auth") as string);
    expect(blob.state.token).toBe("jwt-token-123");
  });

  it("login sets error on failure", async () => {
    mockedAuthApi.login.mockRejectedValue(new Error("Invalid credentials"));

    await expect(
      useAuthStore.getState().login("wrong@example.com", "bad")
    ).rejects.toThrow("Invalid credentials");

    expect(useAuthStore.getState().error).toBe("Invalid credentials");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  // ---- logout ----
  it("logout clears user state and removes token from localStorage", () => {
    useAuthStore.setState({
      user: mockUser,
      token: "jwt-token-123",
      isAuthenticated: true,
    });
    localStorage.setItem("lc_token", "jwt-token-123");

    useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBeNull();
    expect(localStorage.getItem("lc_token")).toBeNull();
  });

  // ---- fetchMe ----
  it("fetchMe updates user when token exists", async () => {
    useAuthStore.setState({ token: "valid-token" });
    mockedAuthApi.me.mockResolvedValue({ user: mockUser });

    await useAuthStore.getState().fetchMe();

    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.loading).toBe(false);
  });

  it("fetchMe skips API call when no token", async () => {
    useAuthStore.setState({ token: null });

    await useAuthStore.getState().fetchMe();

    expect(mockedAuthApi.me).not.toHaveBeenCalled();
  });

  it("fetchMe clears auth state on expired/invalid token", async () => {
    useAuthStore.setState({ token: "expired-token", isAuthenticated: true });
    localStorage.setItem("lc_token", "expired-token");
    mockedAuthApi.me.mockRejectedValue(new Error("Unauthorized"));

    await useAuthStore.getState().fetchMe();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(localStorage.getItem("lc_token")).toBeNull();
  });

  // ---- clearError ----
  it("clearError resets error to null", () => {
    useAuthStore.setState({ error: "Some error" });

    useAuthStore.getState().clearError();

    expect(useAuthStore.getState().error).toBeNull();
  });

  // ---- updateProfile ----
  it("updateProfile merges partial profile into existing user", () => {
    useAuthStore.setState({ user: { ...mockUser } });

    useAuthStore.getState().updateProfile({ nickname: "NewNick", bio: "Hello" });

    const user = useAuthStore.getState().user!;
    expect(user.profile.nickname).toBe("NewNick");
    expect(user.profile.bio).toBe("Hello");
    expect(user.profile.avatar).toBe("default"); // preserved
  });

  it("updateProfile does nothing when user is null", () => {
    useAuthStore.setState({ user: null });

    useAuthStore.getState().updateProfile({ nickname: "Ghost" });

    expect(useAuthStore.getState().user).toBeNull();
  });

  // ---- cross-store cleanup on logout / session loss ----
  describe("cross-store cleanup", () => {
    beforeEach(() => {
      // Seed other stores with per-user data to prove logout clears it.
      useCourseStore.setState({
        courses: [
          { id: "c1", code: "CS101", name: "Intro", description: "", lessonIds: [], createdAt: "", updatedAt: "" } as any,
        ],
        currentCourseId: "c1",
      });
      useLessonStore.setState({
        lessons: [{ id: "l1", title: "Lecture", date: "2026-04-15" }],
        currentLessonId: "l1",
      });
    });

    it("logout() also resets courseStore and lessonStore", () => {
      useAuthStore.setState({ user: mockUser, token: "t", isAuthenticated: true });

      useAuthStore.getState().logout();

      expect(useCourseStore.getState().courses).toEqual([]);
      expect(useCourseStore.getState().currentCourseId).toBeNull();
      expect(useLessonStore.getState().lessons).toEqual([]);
      expect(useLessonStore.getState().currentLessonId).toBeNull();
    });

    it("fetchMe failure also resets per-user stores (implicit logout)", async () => {
      useAuthStore.setState({ token: "expired", isAuthenticated: true, user: mockUser });
      mockedAuthApi.me.mockRejectedValue(new Error("401"));

      await useAuthStore.getState().fetchMe();

      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useCourseStore.getState().courses).toEqual([]);
      expect(useLessonStore.getState().lessons).toEqual([]);
    });
  });
});
