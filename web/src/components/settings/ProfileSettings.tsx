import React, { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { t } from "../../utils/i18n";
import AvatarPicker from "../auth/AvatarPicker";

export default function ProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const [nickname, setNickname] = useState(user?.profile.nickname || "");
  const [department, setDepartment] = useState(user?.profile.department || "");
  const [bio, setBio] = useState(user?.profile.bio || "");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    updateProfile({ nickname: nickname.trim(), department: department.trim(), bio: bio.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings-section">
      <h3 className="settings-section__title">{t("settings.profile")}</h3>

      <div className="settings-group">
        <label>{t("settings.avatar")}</label>
        <AvatarPicker />
      </div>

      <div className="settings-group">
        <label htmlFor="s-nickname">{t("settings.nickname")}</label>
        <input
          id="s-nickname"
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="settings-input"
        />
      </div>

      <div className="settings-group">
        <label htmlFor="s-department">{t("settings.department")}</label>
        <input
          id="s-department"
          type="text"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="settings-input"
          placeholder={t("settings.departmentPlaceholder")}
        />
      </div>

      <div className="settings-group">
        <label htmlFor="s-bio">{t("settings.bio")}</label>
        <textarea
          id="s-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="settings-input settings-textarea"
          rows={3}
          placeholder={t("settings.bioPlaceholder")}
        />
      </div>

      <div className="settings-group">
        <label>{t("settings.friendCode")}</label>
        <div className="settings-readonly">{user?.friendCode || "—"}</div>
      </div>

      <button className="settings-btn" onClick={handleSave}>
        {saved ? t("settings.saved") : t("settings.saveChanges")}
      </button>
    </div>
  );
}
