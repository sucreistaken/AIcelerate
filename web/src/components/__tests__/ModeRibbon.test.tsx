import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import ModeRibbon from "../ModeRibbon";

// Mock scrollIntoView which jsdom does not implement
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock framer-motion to avoid animation issues in tests
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

describe("ModeRibbon", () => {
  const mockSetMode = vi.fn();

  it("renders with tablist role", () => {
    render(<ModeRibbon mode="plan" setMode={mockSetMode} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("renders core mode tabs by default", () => {
    render(<ModeRibbon mode="plan" setMode={mockSetMode} />);

    const coreLabels = [
      "Dashboard", "Plan", "Quiz", "Cards",
      "Mind Map", "Deep Dive", "My Notes",
    ];

    for (const label of coreLabels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("shows advanced tabs when an advanced mode is active", () => {
    render(<ModeRibbon mode="alignment" setMode={mockSetMode} />);

    // Advanced row auto-opens when active mode is in advanced tabs
    expect(screen.getByText("Alignment")).toBeInTheDocument();
    expect(screen.getByText("Deviation")).toBeInTheDocument();
    expect(screen.getByText("Cheat Sheet")).toBeInTheDocument();
  });

  it("marks the active mode tab with aria-selected", () => {
    render(<ModeRibbon mode="quiz" setMode={mockSetMode} />);

    const tabs = screen.getAllByRole("tab");
    const quizTab = tabs.find((tab) => tab.textContent?.includes("Quiz"));
    expect(quizTab).toHaveAttribute("aria-selected", "true");
  });

  it("calls setMode when a tab is clicked", () => {
    render(<ModeRibbon mode="plan" setMode={mockSetMode} />);

    const quizButton = screen.getByText("Quiz").closest("button");
    expect(quizButton).toBeTruthy();
    fireEvent.click(quizButton!);

    expect(mockSetMode).toHaveBeenCalledWith("quiz");
  });

  it("marks non-active tabs with aria-selected=false", () => {
    render(<ModeRibbon mode="plan" setMode={mockSetMode} />);

    const tabs = screen.getAllByRole("tab");
    const nonActiveTabs = tabs.filter(
      (tab) => !tab.textContent?.includes("Plan")
    );

    for (const tab of nonActiveTabs) {
      expect(tab).toHaveAttribute("aria-selected", "false");
    }
  });
});
