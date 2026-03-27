import React, { useState, FormEvent } from "react";
import { authApi } from "../../services/authApi";
import { t } from "../../utils/i18n";

export default function SecuritySettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setMessage({ type: "success", text: t("settings.passwordChanged") });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">{t("settings.security")}</h3>

      <form onSubmit={handleSubmit} className="settings-form">
        {message && (
          <div className={`settings-message settings-message--${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="settings-group">
          <label htmlFor="cur-pw">{t("settings.currentPassword")}</label>
          <input
            id="cur-pw"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="settings-input"
            required
          />
        </div>

        <div className="settings-group">
          <label htmlFor="new-pw">{t("settings.newPassword")}</label>
          <input
            id="new-pw"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="settings-input"
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="settings-btn" disabled={loading}>
          {loading ? t("settings.changingPassword") : t("settings.changePassword")}
        </button>
      </form>
    </div>
  );
}
