import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import ModeRibbon from "../ModeRibbon";

beforeAll(() => {
  // jsdom has no scrollIntoView; ModeRibbon scrolls active tab into view.
  Element.prototype.scrollIntoView = vi.fn();
});

/**
 * Minimal framer-motion surface needed by ModeRibbon (motion.div/button/span,
 * AnimatePresence, LayoutGroup, useReducedMotion). Any further motion feature
 * the ribbon starts using needs to be added here.
 */
vi.mock("framer-motion", () => ({
  motion: {
    div: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
      (props, ref) => <div ref={ref} {...props} />,
    ),
    button: React.forwardRef<
      HTMLButtonElement,
      React.ButtonHTMLAttributes<HTMLButtonElement>
    >((props, ref) => <button ref={ref} {...props} />),
    span: React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
      (props, ref) => <span ref={ref} {...props} />,
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  LayoutGroup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}));

describe("ModeRibbon", () => {
  const setMode = vi.fn();

  it("renders the tablist landmark", () => {
    render(<ModeRibbon mode="plan" setMode={setMode} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("exposes the segment groups (Turkish defaults)", () => {
    render(<ModeRibbon mode="plan" setMode={setMode} />);
    // Groups are the top-level segment buttons inside the ribbon
    expect(screen.getByText("Kurs")).toBeInTheDocument();
    expect(screen.getByText("Analiz")).toBeInTheDocument();
    expect(screen.getByText("Çalışma")).toBeInTheDocument();
    expect(screen.getByText("Pratik")).toBeInTheDocument();
  });

  it("shows the Plan child tab when in the Analiz group", () => {
    render(<ModeRibbon mode="plan" setMode={setMode} />);
    // Plan lives inside the 'Analiz' segment and should be rendered
    expect(screen.getByTitle("Plan")).toBeInTheDocument();
  });

  it("marks the active mode tab with aria-selected", () => {
    render(<ModeRibbon mode="plan" setMode={setMode} />);
    const planTab = screen.getByTitle("Plan");
    expect(planTab).toHaveAttribute("aria-selected", "true");
  });

  it("calls setMode when a different child tab is clicked", () => {
    render(<ModeRibbon mode="plan" setMode={setMode} />);
    // Deviation ("Sapma") is in the same segment and should be clickable
    const sapmaBtn = screen.getByTitle(/Sapma|Deviation/);
    fireEvent.click(sapmaBtn);
    expect(setMode).toHaveBeenCalled();
  });
});
