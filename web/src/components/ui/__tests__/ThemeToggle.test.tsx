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

// Mock the uiStore
const mockToggleTheme = vi.fn();
let mockTheme = "light";

vi.mock("../../../stores/uiStore", () => ({
  useUiStore: (selector?: (state: { theme: string; toggleTheme: () => void }) => unknown) => {
    const state = { theme: mockTheme, toggleTheme: mockToggleTheme };
    return selector ? selector(state) : state;
  },
}));

import ThemeToggle from "../ThemeToggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    mockTheme = "light";
    vi.clearAllMocks();
  });

  it("renders a button with theme label", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label", expect.stringContaining("tema"));
  });

  it("shows correct label for light theme", () => {
    mockTheme = "light";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Açık tema")).toBeInTheDocument();
  });

  it("shows correct label for dark theme", () => {
    mockTheme = "dark";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Koyu tema")).toBeInTheDocument();
  });

  it("shows correct label for system theme", () => {
    mockTheme = "system";
    render(<ThemeToggle />);
    expect(screen.getByTitle("Sistem")).toBeInTheDocument();
  });

  it("calls toggleTheme when clicked", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });
});
