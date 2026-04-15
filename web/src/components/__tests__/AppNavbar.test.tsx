import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppNavbar from "../layout/AppNavbar";

// Mock child components that have their own store dependencies
vi.mock("../ui/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));
vi.mock("../ui/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

// Stores used by NavBreadcrumb — we seed them with empty state so the
// breadcrumb renders only the mode label.
vi.mock("../../stores/courseStore", () => ({
  useCourseStore: (selector: (s: any) => any) =>
    selector({ courses: [], currentCourseId: null }),
}));
vi.mock("../../stores/lessonStore", () => ({
  useLessonStore: (selector: (s: any) => any) =>
    selector({ lessons: [], currentLessonId: null }),
}));
vi.mock("../../stores/uiStore", () => ({
  useUiStore: (selector: (s: any) => any) => selector({ mode: "plan" }),
}));

describe("AppNavbar", () => {
  const defaultProps = {
    language: "tr" as const,
    onToggleLanguage: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenShortcuts: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a navigation landmark", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders the breadcrumb with the current mode", () => {
    render(<AppNavbar {...defaultProps} />);
    // The breadcrumb shows the mode name (from the mocked store — 'plan')
    expect(screen.getByText(/plan/i)).toBeInTheDocument();
  });

  it("renders settings button and fires handler on click", () => {
    const onOpenSettings = vi.fn();
    render(<AppNavbar {...defaultProps} onOpenSettings={onOpenSettings} />);
    // Settings button uses t('nav.settings') which is "Ayarlar" in TR
    const btn = screen.getByLabelText(/ayarlar|settings/i);
    fireEvent.click(btn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("renders the language toggle showing the current language code", () => {
    const { rerender } = render(<AppNavbar {...defaultProps} language="tr" />);
    expect(screen.getByText("TR")).toBeInTheDocument();

    rerender(<AppNavbar {...defaultProps} language="en" />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("calls onToggleLanguage when the language button is clicked", () => {
    const onToggleLanguage = vi.fn();
    render(<AppNavbar {...defaultProps} onToggleLanguage={onToggleLanguage} />);
    fireEvent.click(screen.getByText("TR"));
    expect(onToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it("renders child UI components (notification, theme)", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
