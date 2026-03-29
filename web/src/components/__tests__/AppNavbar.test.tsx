import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AppNavbar from "../layout/AppNavbar";

// Mock child components that have their own store dependencies
vi.mock("../ui/NotificationBell", () => ({
  default: () => <div data-testid="notification-bell">NotificationBell</div>,
}));
vi.mock("../ui/StreakBadge", () => ({
  StreakBadge: () => <div data-testid="streak-badge">StreakBadge</div>,
}));
vi.mock("../ui/ShareButton", () => ({
  default: () => <div data-testid="share-button">ShareButton</div>,
}));
vi.mock("../ui/ThemeToggle", () => ({
  default: () => <div data-testid="theme-toggle">ThemeToggle</div>,
}));

describe("AppNavbar", () => {
  const defaultProps = {
    language: "tr" as const,
    onToggleLanguage: vi.fn(),
    onOpenSettings: vi.fn(),
    onOpenShortcuts: vi.fn(),
  };

  it("renders brand text", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByText("AIcelerate")).toBeInTheDocument();
  });

  it("renders version pill", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByText("v3.0")).toBeInTheDocument();
  });

  it("renders navigation landmark", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders settings button and calls handler on click", () => {
    const onOpenSettings = vi.fn();
    render(<AppNavbar {...defaultProps} onOpenSettings={onOpenSettings} />);

    const settingsBtn = screen.getByLabelText("Settings");
    fireEvent.click(settingsBtn);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("renders language toggle showing EN when language is tr", () => {
    render(<AppNavbar {...defaultProps} language="tr" />);
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("renders language toggle showing TR when language is en", () => {
    render(<AppNavbar {...defaultProps} language="en" />);
    expect(screen.getByText("TR")).toBeInTheDocument();
  });

  it("calls onToggleLanguage when language button is clicked", () => {
    const onToggleLanguage = vi.fn();
    render(<AppNavbar {...defaultProps} onToggleLanguage={onToggleLanguage} />);

    const langBtn = screen.getByLabelText("Switch to English");
    fireEvent.click(langBtn);
    expect(onToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it("shows user nickname when authUser is provided", () => {
    const authUser = {
      id: "u1",
      email: "test@example.com",
      profile: { nickname: "TestUser", avatar: "" },
      friendCode: "ABC123",
    };
    render(<AppNavbar {...defaultProps} authUser={authUser} />);
    expect(screen.getByText("TestUser")).toBeInTheDocument();
  });

  it("does not show nickname when authUser is null", () => {
    render(<AppNavbar {...defaultProps} authUser={null} />);
    expect(screen.queryByText("TestUser")).not.toBeInTheDocument();
  });

  it("renders child UI components", () => {
    render(<AppNavbar {...defaultProps} />);
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByTestId("streak-badge")).toBeInTheDocument();
    expect(screen.getByTestId("share-button")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });
});
