import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import PaneRouter from "../layout/PaneRouter";

// Mock framer-motion following the ModeRibbon test pattern
vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef(
      (props: React.HTMLAttributes<HTMLDivElement>, ref: React.Ref<HTMLDivElement>) => (
        <div ref={ref} {...props} />
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock all lazy-loaded pane components to lightweight stubs
vi.mock("../PlanPane", () => ({ default: () => <div data-testid="pane-plan">PlanPane</div> }));
vi.mock("../QuizPane", () => ({ default: () => <div data-testid="pane-quiz">QuizPane</div> }));
vi.mock("../FlashcardPane", () => ({ default: () => <div data-testid="pane-flashcards">FlashcardPane</div> }));
vi.mock("../MindMapPane", () => ({ default: () => <div data-testid="pane-mindmap">MindMapPane</div> }));
vi.mock("../CourseDashboard", () => ({ default: () => <div data-testid="pane-course-dashboard">CourseDashboard</div> }));
vi.mock("../DeepDivePane", () => ({ default: () => <div data-testid="pane-deep-dive">DeepDivePane</div> }));
vi.mock("../NotesPane", () => ({ default: () => <div data-testid="pane-notes">NotesPane</div> }));
vi.mock("../ConnectionsPane", () => ({ default: () => <div data-testid="pane-connections">ConnectionsPane</div> }));
vi.mock("../DeviationPane", () => ({ default: () => <div data-testid="pane-deviation">DeviationPane</div> }));
vi.mock("../AlignmentPane", () => ({ default: () => <div data-testid="pane-alignment">AlignmentPane</div> }));
vi.mock("../LecturerNotePane", () => ({ default: () => <div data-testid="pane-lecturer-note">LecturerNotePane</div> }));
vi.mock("../LoStudyPane", () => ({ default: () => <div data-testid="pane-lo-study">LoStudyPane</div> }));
vi.mock("../CheatSheetPane", () => ({ default: () => <div data-testid="pane-cheat-sheet">CheatSheetPane</div> }));
vi.mock("../LessonsHistoryPane", () => ({ default: () => <div data-testid="pane-history">LessonsHistoryPane</div> }));
vi.mock("../collab/layout/StudyHub", () => ({ default: () => <div data-testid="pane-study-hub">StudyHub</div> }));
vi.mock("../ui/Dashboard", () => ({ default: () => <div data-testid="pane-dashboard">Dashboard</div> }));
vi.mock("../lesson-wizard/LessonWizard", () => ({ default: () => <div data-testid="pane-create-lesson">LessonWizard</div> }));
vi.mock("../ui/ErrorBoundary", () => ({
  PaneErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("../ui/EmptyState", () => ({
  NoPlanEmpty: () => <div data-testid="no-plan-empty">NoPlanEmpty</div>,
}));
vi.mock("../ui/MultiSelectionBanner", () => ({ default: () => null }));
vi.mock("../layout/PaneLoading", () => ({ default: () => <div>Loading...</div> }));

function buildLessonProp(overrides?: Record<string, any>) {
  return {
    plan: { topic: "Test Plan", modules: [] },
    deviation: null,
    lectureText: "lecture",
    slidesText: "slides",
    learningOutcomes: ["LO1"],
    loAlignment: null,
    quiz: ["Q1"],
    setQuiz: vi.fn(),
    loModules: null,
    cheatSheet: null,
    currentLessonId: "lesson-1",
    setCurrentLessonId: vi.fn(),
    analyzeDeviation: vi.fn(),
    reanalyzeDeviation: vi.fn(),
    generateCheatSheet: vi.fn(),
    ...overrides,
  };
}

function buildUiProp(overrides?: Record<string, any>) {
  return {
    mode: "plan" as any,
    setMode: vi.fn(),
    devLoading: false,
    devErr: null,
    cheatLoading: false,
    cheatErr: null,
    ...overrides,
  };
}

describe("PaneRouter", () => {
  it("renders PlanPane when mode is 'plan' and plan exists", async () => {
    render(<PaneRouter mode="plan" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-plan")).toBeInTheDocument();
  });

  it("renders Dashboard when mode is 'dashboard'", async () => {
    render(
      <PaneRouter
        mode="dashboard"
        lesson={buildLessonProp({ plan: null, currentLessonId: null })}
        ui={buildUiProp()}
      />
    );
    expect(await screen.findByTestId("pane-dashboard")).toBeInTheDocument();
  });

  it("renders Dashboard when mode is 'plan' and no plan or lesson", async () => {
    render(
      <PaneRouter
        mode="plan"
        lesson={buildLessonProp({ plan: null, currentLessonId: null })}
        ui={buildUiProp()}
      />
    );
    expect(await screen.findByTestId("pane-dashboard")).toBeInTheDocument();
  });

  it("renders QuizPane for mode 'quiz'", async () => {
    render(<PaneRouter mode="quiz" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-quiz")).toBeInTheDocument();
  });

  it("renders FlashcardPane for mode 'flashcards'", async () => {
    render(<PaneRouter mode="flashcards" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-flashcards")).toBeInTheDocument();
  });

  it("renders MindMapPane for mode 'mindmap'", async () => {
    render(<PaneRouter mode="mindmap" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-mindmap")).toBeInTheDocument();
  });

  it("renders CourseDashboard for mode 'course-dashboard'", async () => {
    render(<PaneRouter mode="course-dashboard" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-course-dashboard")).toBeInTheDocument();
  });

  it("renders DeepDivePane for mode 'deep-dive'", async () => {
    render(<PaneRouter mode="deep-dive" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-deep-dive")).toBeInTheDocument();
  });

  it("renders NotesPane for mode 'notes'", async () => {
    render(<PaneRouter mode="notes" lesson={buildLessonProp()} ui={buildUiProp()} />);
    expect(await screen.findByTestId("pane-notes")).toBeInTheDocument();
  });

  it("renders nothing visible for an unknown mode", () => {
    const { container } = render(
      <PaneRouter mode={"unknown-xyz" as any} lesson={buildLessonProp()} ui={buildUiProp()} />
    );
    // The motion.div wrapper is still rendered, but no pane component inside
    expect(screen.queryByTestId("pane-plan")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pane-quiz")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pane-mindmap")).not.toBeInTheDocument();
    expect(container).toBeTruthy();
  });

  it("renders NoPlanEmpty when mode is 'plan', no plan, but lessonId exists", async () => {
    render(
      <PaneRouter
        mode="plan"
        lesson={buildLessonProp({ plan: null, currentLessonId: "lesson-1" })}
        ui={buildUiProp()}
      />
    );
    expect(await screen.findByTestId("no-plan-empty")).toBeInTheDocument();
  });
});
