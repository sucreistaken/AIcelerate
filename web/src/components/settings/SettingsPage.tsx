import React, { useState } from "react";
import { t } from "../../utils/i18n";
import ProfileSettings from "./ProfileSettings";
import ThemeSettings from "./ThemeSettings";
import NotificationSettings from "./NotificationSettings";
import SecuritySettings from "./SecuritySettings";
import AccountSettings from "./AccountSettings";
import "./settings.css";

const TABS = [
  { id: "profile", label: "settings.profile" },
  { id: "theme", label: "settings.appearance" },
  { id: "notifications", label: "settings.notifications" },
  { id: "security", label: "settings.security" },
  { id: "account", label: "settings.account" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  onClose: () => void;
}

export default function SettingsPage({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-sidebar">
          <h2 className="settings-sidebar__title">{t("settings.title")}</h2>
          <nav className="settings-nav">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`settings-nav__item ${activeTab === tab.id ? "settings-nav__item--active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {t(tab.label)}
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          <button className="settings-close" onClick={onClose} aria-label="Close settings">
            &times;
          </button>
          {activeTab === "profile" && <ProfileSettings />}
          {activeTab === "theme" && <ThemeSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "account" && <AccountSettings />}
        </div>
      </div>
    </div>
  );
}
