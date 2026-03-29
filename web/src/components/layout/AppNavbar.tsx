import React from "react";
import NotificationBell from "../ui/NotificationBell";
import { StreakBadge } from "../ui/StreakBadge";
import ThemeToggle from "../ui/ThemeToggle";
import { t } from "../../utils/i18n";

const SettingsIcon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>);

const QuestionIcon = (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);

interface AppNavbarProps {
  language: "tr" | "en";
  onToggleLanguage: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts: () => void;
}

export default function AppNavbar({ language, onToggleLanguage, onOpenSettings, onOpenShortcuts }: AppNavbarProps) {
  return (
    <nav className="nav" role="navigation" aria-label="Ana navigasyon">
      <div className="nav-inner">
        <div className="brand">
          <span className="brand-text">AIcelerate</span>
          <div className="pill">v3.0</div>
        </div>
        <div className="flex-1" />
        <div className="nav-actions">
          <NotificationBell />
          <button className="nav-icon-btn" onClick={onOpenShortcuts} title={t("shortcuts.title")} aria-label={t("shortcuts.title")}>
            {QuestionIcon}
          </button>
          <button className="nav-icon-btn" onClick={onOpenSettings} title={t("nav.settings")} aria-label={t("nav.settings")}>
            {SettingsIcon}
          </button>
          <div className="nav-divider" />
          <StreakBadge />
          <div className="nav-divider" />
          <button className="nav-lang-btn" onClick={onToggleLanguage} title={language === "tr" ? t("nav.switchToEn") : t("nav.switchToTr")} aria-label={language === "tr" ? t("nav.switchToEn") : t("nav.switchToTr")}>
            {language === "tr" ? "TR" : "EN"}
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
