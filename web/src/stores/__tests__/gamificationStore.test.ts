import { describe, it, expect, beforeEach } from "vitest";
import { useGamificationStore, getLevelInfo, getLevelProgress } from "../gamificationStore";

describe("gamificationStore", () => {
  beforeEach(() => {
    useGamificationStore.setState({
      totalXp: 0,
      streakDays: 0,
      lastActiveDate: null,
      history: [],
      levelUpShown: 0,
    });
  });

  it("starts with zero XP", () => {
    const state = useGamificationStore.getState();
    expect(state.totalXp).toBe(0);
  });

  it("addXp increases totalXp", () => {
    const { addXp } = useGamificationStore.getState();
    const result = addXp("quiz-answer");

    expect(result.earned).toBe(10);
    expect(useGamificationStore.getState().totalXp).toBe(10);
  });

  it("addXp accumulates", () => {
    const store = useGamificationStore.getState();
    store.addXp("quiz-answer"); // +10
    store.addXp("flashcard-review"); // +5

    expect(useGamificationStore.getState().totalXp).toBe(15);
  });

  it("getTodayXp returns today's XP total", () => {
    const store = useGamificationStore.getState();
    store.addXp("quiz-answer"); // +10
    store.addXp("deep-dive-ask"); // +3

    expect(useGamificationStore.getState().getTodayXp()).toBe(13);
  });

  it("addXp records history events", () => {
    useGamificationStore.getState().addXp("plan-create");
    const { history } = useGamificationStore.getState();
    expect(history).toHaveLength(1);
    expect(history[0].action).toBe("plan-create");
    expect(history[0].amount).toBe(20);
  });
});

describe("getLevelInfo (pure function)", () => {
  it("returns level 1 for 0 XP", () => {
    expect(getLevelInfo(0).level).toBe(1);
  });

  it("returns level 2 for 100+ XP", () => {
    expect(getLevelInfo(100).level).toBe(2);
    expect(getLevelInfo(150).level).toBe(2);
  });

  it("returns level 3 for 500+ XP", () => {
    expect(getLevelInfo(500).level).toBe(3);
  });

  it("returns level 4 for 1500+ XP", () => {
    expect(getLevelInfo(1500).level).toBe(4);
    expect(getLevelInfo(10000).level).toBe(4);
  });
});

describe("getLevelProgress (pure function)", () => {
  it("returns 0 at level start", () => {
    expect(getLevelProgress(0)).toBe(0);
    expect(getLevelProgress(100)).toBe(0);
  });

  it("returns 0.5 at midpoint", () => {
    expect(getLevelProgress(50)).toBe(0.5);
  });

  it("returns 1 for max level", () => {
    expect(getLevelProgress(2000)).toBe(1);
  });
});
