import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock framer-motion before importing the component
vi.mock("framer-motion", () => ({
  motion: {
    button: React.forwardRef(
      (props: React.ButtonHTMLAttributes<HTMLButtonElement>, ref: React.Ref<HTMLButtonElement>) => (
        <button ref={ref} {...props} />
      )
    ),
    span: React.forwardRef(
      (props: React.HTMLAttributes<HTMLSpanElement>, ref: React.Ref<HTMLSpanElement>) => (
        <span ref={ref} {...props} />
      )
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the uiStore. ThemeToggle reads `theme` and `setTheme` via
// per-field selectors (post selector-migration) — the mock must honor both.
const mockSetTheme = vi.fn();
let mockTheme: "light" | "dark" | "system" = "light";

vi.mock("../../../stores/uiStore", () => ({
  useUiStore: (selector?: (state: { theme: string; setTheme: (t: string) => void }) => unknown) => {
    const state = { theme: mockTheme, setTheme: mockSetTheme };
    return selector ? selector(state) : state;
  },
}));

import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockTheme = "light";
    vi.clearAllMocks();
  });

  it("renders a button with a theme aria-label", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", expect.stringContaining("tema"));
  });

  it("shows the 'Açık tema' title when theme is light", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Açık tema")).toBeInTheDocument();
  });

  it("shows the 'Koyu tema' title when theme is dark", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Koyu tema")).toBeInTheDocument();
  });

  it("treats 'system' as dark (follows current UI heuristic)", () => {
    mockTheme = "system";
    render(<ThemeToggle />);
    // ThemeToggle collapses `system` into the dark label/icon pair.
    expect(screen.getByTitle("Koyu tema")).toBeInTheDocument();
  });

  it("calls setTheme when clicked", () => {
    render(<ThemeToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(mockSetTheme).toHaveBeenCalledTimes(1);
  });
});
