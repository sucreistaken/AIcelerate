import React from "react";
import NotificationBell from "../ui/NotificationBell";
import { StreakBadge } from "../ui/StreakBadge";
import ShareButton from "../ui/ShareButton";
import ThemeToggle from "../ui/ThemeToggle";
import type { AuthUser } from "../../services/authApi";

interface AppNavbarProps {
  authUser: AuthUser | null;
  language: "tr" | "en";
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
}

export default function AppNavbar({
  authUser,
  language,
  onToggleLanguage,
  onOpenSettings,
}: AppNavbarProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Ana navigasyon">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-text">AIcelerate</span>
          <div className="pill">v3.0</div>
        </div>
        <div className="flex-1" />
        <div className="nav-divider" />
        <div className="nav-actions">
          <NotificationBell />
          {authUser && (
            <span
              className="nav-user-name"
              style={{
                fontSize: "var(--text-sm)",
                color: "var(--muted)",
              }}
            >
              {authUser.profile.nickname}
            </span>
          )}
          <button
            className="nav-settings-btn"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontSize: "var(--text-lg)",
              padding: "var(--space-1)",
            }}
          >
            &#9881;
          </button>
          <StreakBadge />
          <button
            onClick={onToggleLanguage}
            title={language === "tr" ? "Switch to English" : "Turkceye gec"}
            aria-label={language === "tr" ? "Switch to English" : "Turkceye gec"}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-full)",
              padding: "3px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              color: "var(--muted)",
              transition: "all 0.15s",
            }}
          >
            {language === "tr" ? "EN" : "TR"}
          </button>
          <ShareButton />
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
