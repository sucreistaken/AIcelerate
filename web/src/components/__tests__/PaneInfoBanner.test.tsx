import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import PaneInfoBanner from "../ui/PaneInfoBanner";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("PaneInfoBanner", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("renders title and description when not dismissed", () => {
    render(
      <PaneInfoBanner
        id="test-banner"
        title="Test Title"
        description="Test description text"
      />
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description text")).toBeInTheDocument();
  });

  it("renders tips when provided", () => {
    render(
      <PaneInfoBanner
        id="test-banner"
        title="Title"
        description="Description"
        tips={["Tip one", "Tip two"]}
      />
    );

    // Tips render as "{tip} →" — match by substring to stay robust against
    // trivial separator tweaks.
    expect(screen.getByText(/Tip one/)).toBeInTheDocument();
    expect(screen.getByText(/Tip two/)).toBeInTheDocument();
  });

  it("hides banner and shows reopen button when dismissed", () => {
    render(
      <PaneInfoBanner
        id="test-banner"
        title="Test Title"
        description="Test description"
      />
    );

    // Click dismiss button (x)
    const dismissBtn = screen.getByTitle("Kapat");
    fireEvent.click(dismissBtn);

    // Title should no longer be visible
    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();

    // Reopen button should appear
    expect(screen.getByText("Bu mod ne ise yarar?")).toBeInTheDocument();
  });

  it("shows banner again when reopen button is clicked", () => {
    render(
      <PaneInfoBanner
        id="test-banner"
        title="Test Title"
        description="Test description"
      />
    );

    // Dismiss first
    fireEvent.click(screen.getByTitle("Kapat"));
    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();

    // Reopen
    fireEvent.click(screen.getByText("Bu mod ne ise yarar?"));
    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("renders with role=status when visible", () => {
    render(
      <PaneInfoBanner
        id="test-banner"
        title="Title"
        description="Desc"
      />
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
