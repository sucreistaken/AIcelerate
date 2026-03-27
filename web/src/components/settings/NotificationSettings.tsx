import React, { useState } from "react";
import { t } from "../../utils/i18n";

export default function NotificationSettings() {
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [mentions, setMentions] = useState(true);

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">{t("settings.notifTitle")}</h3>

      <div className="settings-group">
        <div className="settings-toggle-row">
          <div>
            <div className="settings-toggle-label">{t("settings.enableNotif")}</div>
            <div className="settings-toggle-desc">{t("settings.enableNotifDesc")}</div>
          </div>
          <button
            className={`settings-toggle ${notifications ? "settings-toggle--on" : ""}`}
            onClick={() => setNotifications(!notifications)}
          >
            <span className="settings-toggle__knob" />
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-toggle-row">
          <div>
            <div className="settings-toggle-label">{t("settings.sound")}</div>
            <div className="settings-toggle-desc">{t("settings.soundDesc")}</div>
          </div>
          <button
            className={`settings-toggle ${sound ? "settings-toggle--on" : ""}`}
            onClick={() => setSound(!sound)}
          >
            <span className="settings-toggle__knob" />
          </button>
        </div>
      </div>

      <div className="settings-group">
        <div className="settings-toggle-row">
          <div>
            <div className="settings-toggle-label">{t("settings.mentionsOnly")}</div>
            <div className="settings-toggle-desc">{t("settings.mentionsOnlyDesc")}</div>
          </div>
          <button
            className={`settings-toggle ${mentions ? "settings-toggle--on" : ""}`}
            onClick={() => setMentions(!mentions)}
          >
            <span className="settings-toggle__knob" />
          </button>
        </div>
      </div>
    </div>
  );
}
