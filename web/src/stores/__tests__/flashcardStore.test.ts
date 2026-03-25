import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFlashcardStore } from "../flashcardStore";

vi.mock("../../services/api", () => ({
  flashcardApi: {
    getAll: vi.fn(),
    getDue: vi.fn(),
    getStats: vi.fn(),
    generate: vi.fn(),
    review: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
}));

import { flashcardApi } from "../../services/api";

const mockedFlashcardApi = flashcardApi as unknown as {
  [K in keyof typeof flashcardApi]: ReturnType<typeof vi.fn>;
};

const makeCard = (overrides: Partial<any> = {}) => ({
  id: "fc1",
  lessonId: "L1",
  topicName: "Variables",
  front: "What is a variable?",
  back: "A named storage location",
  source: "ai-generated" as const,
  interval: 1,
  easeFactor: 2.5,
  repetitions: 0,
  nextReviewDate: "2026-03-26",
  state: "new" as const,
  createdAt: "2026-03-25",
  ...overrides,
});

const initialState = {
  cards: [],
  dueCards: [],
  stats: null,
  currentIndex: 0,
  isFlipped: false,
  loading: false,
  error: null,
  viewMode: "review" as const,
};

describe("flashcardStore", () => {
  beforeEach(() => {
    useFlashcardStore.setState(initialState);
    vi.clearAllMocks();
  });

  // ---- Initial state ----
  it("starts with empty state", () => {
    const state = useFlashcardStore.getState();
    expect(state.cards).toEqual([]);
    expect(state.dueCards).toEqual([]);
    expect(state.stats).toBeNull();
    expect(state.currentIndex).toBe(0);
    expect(state.isFlipped).toBe(false);
    expect(state.loading).toBe(false);
    expect(state.viewMode).toBe("review");
  });

  // ---- fetchAll ----
  it("fetchAll populates cards on success", async () => {
    const cards = [makeCard(), makeCard({ id: "fc2", front: "What is a function?" })];
    mockedFlashcardApi.getAll.mockResolvedValue({ ok: true, cards });

    await useFlashcardStore.getState().fetchAll("L1");

    expect(useFlashcardStore.getState().cards).toHaveLength(2);
    expect(useFlashcardStore.getState().loading).toBe(false);
  });

  it("fetchAll sets error on exception", async () => {
    mockedFlashcardApi.getAll.mockRejectedValue(new Error("Network error"));

    await useFlashcardStore.getState().fetchAll();

    expect(useFlashcardStore.getState().error).toBe("Network error");
    expect(useFlashcardStore.getState().loading).toBe(false);
  });

  // ---- fetchDue ----
  it("fetchDue populates dueCards and resets index/flip", async () => {
    const cards = [makeCard({ state: "review" }), makeCard({ id: "fc2", state: "learning" })];
    mockedFlashcardApi.getDue.mockResolvedValue({ ok: true, cards });

    // Set some existing state that should be reset
    useFlashcardStore.setState({ currentIndex: 3, isFlipped: true });

    await useFlashcardStore.getState().fetchDue();

    const state = useFlashcardStore.getState();
    expect(state.dueCards).toHaveLength(2);
    expect(state.currentIndex).toBe(0);
    expect(state.isFlipped).toBe(false);
    expect(state.loading).toBe(false);
  });

  it("fetchDue sets error on exception", async () => {
    mockedFlashcardApi.getDue.mockRejectedValue(new Error("Server down"));

    await useFlashcardStore.getState().fetchDue();

    expect(useFlashcardStore.getState().error).toBe("Server down");
  });

  // ---- fetchStats ----
  it("fetchStats populates stats on success", async () => {
    mockedFlashcardApi.getStats.mockResolvedValue({
      ok: true,
      total: 50,
      new: 10,
      learning: 15,
      review: 20,
      graduated: 5,
      dueToday: 12,
    });

    await useFlashcardStore.getState().fetchStats();

    const stats = useFlashcardStore.getState().stats;
    expect(stats).toEqual({
      total: 50,
      new: 10,
      learning: 15,
      review: 20,
      graduated: 5,
      dueToday: 12,
    });
  });

  // ---- deleteCard ----
  it("deleteCard removes card from state", async () => {
    const cards = [makeCard({ id: "fc1" }), makeCard({ id: "fc2" })];
    useFlashcardStore.setState({ cards });
    mockedFlashcardApi.delete.mockResolvedValue({ ok: true });
    mockedFlashcardApi.getStats.mockResolvedValue({ ok: true, total: 1, new: 0, learning: 0, review: 1, graduated: 0, dueToday: 1 });

    await useFlashcardStore.getState().deleteCard("fc1");

    const remaining = useFlashcardStore.getState().cards;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("fc2");
  });

  // ---- setFlipped ----
  it("setFlipped toggles flip state", () => {
    expect(useFlashcardStore.getState().isFlipped).toBe(false);

    useFlashcardStore.getState().setFlipped(true);
    expect(useFlashcardStore.getState().isFlipped).toBe(true);

    useFlashcardStore.getState().setFlipped(false);
    expect(useFlashcardStore.getState().isFlipped).toBe(false);
  });

  // ---- nextCard ----
  it("nextCard advances index and resets flip when more cards exist", () => {
    useFlashcardStore.setState({
      dueCards: [makeCard({ id: "fc1" }), makeCard({ id: "fc2" }), makeCard({ id: "fc3" })],
      currentIndex: 0,
      isFlipped: true,
    });

    useFlashcardStore.getState().nextCard();

    expect(useFlashcardStore.getState().currentIndex).toBe(1);
    expect(useFlashcardStore.getState().isFlipped).toBe(false);
  });

  it("nextCard calls fetchDue when at last card", async () => {
    const dueCards = [makeCard({ id: "fc1" })];
    useFlashcardStore.setState({ dueCards, currentIndex: 0 });
    mockedFlashcardApi.getDue.mockResolvedValue({ ok: true, cards: [] });

    useFlashcardStore.getState().nextCard();

    // At last card (index 0, length 1), so fetchDue should be called
    expect(mockedFlashcardApi.getDue).toHaveBeenCalled();
  });

  // ---- setViewMode ----
  it("setViewMode switches between review and browse", () => {
    expect(useFlashcardStore.getState().viewMode).toBe("review");

    useFlashcardStore.getState().setViewMode("browse");
    expect(useFlashcardStore.getState().viewMode).toBe("browse");

    useFlashcardStore.getState().setViewMode("review");
    expect(useFlashcardStore.getState().viewMode).toBe("review");
  });

  // ---- review ----
  it("review advances to next card and refreshes stats on success", async () => {
    useFlashcardStore.setState({
      dueCards: [makeCard({ id: "fc1" }), makeCard({ id: "fc2" })],
      currentIndex: 0,
      isFlipped: true,
    });
    mockedFlashcardApi.review.mockResolvedValue({ ok: true, card: makeCard({ id: "fc1" }) });
    mockedFlashcardApi.getStats.mockResolvedValue({ ok: true, total: 2, new: 0, learning: 1, review: 1, graduated: 0, dueToday: 1 });

    await useFlashcardStore.getState().review("fc1", 4);

    expect(mockedFlashcardApi.review).toHaveBeenCalledWith("fc1", 4);
    // nextCard was called, so index should advance
    expect(useFlashcardStore.getState().currentIndex).toBe(1);
    expect(useFlashcardStore.getState().isFlipped).toBe(false);
  });

  it("review sets error on exception", async () => {
    mockedFlashcardApi.review.mockRejectedValue(new Error("Review failed"));

    await useFlashcardStore.getState().review("fc1", 3);

    expect(useFlashcardStore.getState().error).toBe("Review failed");
  });

  // ---- generate ----
  it("generate returns count and refreshes cards+stats", async () => {
    mockedFlashcardApi.generate.mockResolvedValue({ ok: true, generated: 5 });
    mockedFlashcardApi.getAll.mockResolvedValue({ ok: true, cards: [makeCard()] });
    mockedFlashcardApi.getStats.mockResolvedValue({ ok: true, total: 5, new: 5, learning: 0, review: 0, graduated: 0, dueToday: 5 });

    const count = await useFlashcardStore.getState().generate("L1");

    expect(count).toBe(5);
    expect(mockedFlashcardApi.getAll).toHaveBeenCalled();
    expect(mockedFlashcardApi.getStats).toHaveBeenCalled();
  });

  it("generate returns 0 on failure", async () => {
    mockedFlashcardApi.generate.mockResolvedValue({ ok: false });

    const count = await useFlashcardStore.getState().generate("L1");

    expect(count).toBe(0);
  });
});
