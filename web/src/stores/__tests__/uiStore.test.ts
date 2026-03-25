import { describe, it, expect, beforeEach, vi } from "vitest";
import { useUiStore } from "../uiStore";

describe("uiStore", () => {
  beforeEach(() => {
    useUiStore.setState({
      mode: "plan",
      theme: "light",
      isLoading: false,
      loadingMessage: null,
      showNewLessonModal: false,
      newLessonTitle: "",
      leftPanelCollapsed: false,
      language: "tr",
      loLoading: false,
      cheatLoading: false,
      devLoading: false,
      loModulesLoading: false,
      cheatErr: null,
      devErr: null,
    });
  });

  it("starts with plan mode", () => {
    expect(useUiStore.getState().mode).toBe("plan");
  });

  it("setMode changes mode", () => {
    useUiStore.getState().setMode("quiz");
    expect(useUiStore.getState().mode).toBe("quiz");
  });

  it("setMode persists to URL and localStorage", () => {
    useUiStore.getState().setMode("deep-dive");
    expect(useUiStore.getState().mode).toBe("deep-dive");
  });

  it("setTheme changes theme", () => {
    useUiStore.getState().setTheme("dark");
    expect(useUiStore.getState().theme).toBe("dark");
  });

  it("toggleTheme cycles through themes", () => {
    useUiStore.getState().setTheme("light");
    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("dark");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("system");

    useUiStore.getState().toggleTheme();
    expect(useUiStore.getState().theme).toBe("light");
  });

  it("setLanguage changes language", () => {
    useUiStore.getState().setLanguage("en");
    expect(useUiStore.getState().language).toBe("en");
  });

  it("setIsLoading sets loading state and message", () => {
    useUiStore.getState().setIsLoading(true, "Generating...");
    const state = useUiStore.getState();
    expect(state.isLoading).toBe(true);
    expect(state.loadingMessage).toBe("Generating...");
  });

  it("toggleLeftPanel flips collapsed state", () => {
    expect(useUiStore.getState().leftPanelCollapsed).toBe(false);
    useUiStore.getState().toggleLeftPanel();
    expect(useUiStore.getState().leftPanelCollapsed).toBe(true);
    useUiStore.getState().toggleLeftPanel();
    expect(useUiStore.getState().leftPanelCollapsed).toBe(false);
  });

  it("setShowNewLessonModal controls modal visibility", () => {
    useUiStore.getState().setShowNewLessonModal(true);
    expect(useUiStore.getState().showNewLessonModal).toBe(true);
  });

  it("loading state setters work", () => {
    useUiStore.getState().setLoLoading(true);
    expect(useUiStore.getState().loLoading).toBe(true);

    useUiStore.getState().setCheatLoading(true);
    expect(useUiStore.getState().cheatLoading).toBe(true);

    useUiStore.getState().setDevLoading(true);
    expect(useUiStore.getState().devLoading).toBe(true);
  });

  it("error setters work", () => {
    useUiStore.getState().setCheatErr("Some error");
    expect(useUiStore.getState().cheatErr).toBe("Some error");

    useUiStore.getState().setCheatErr(null);
    expect(useUiStore.getState().cheatErr).toBeNull();
  });
});
