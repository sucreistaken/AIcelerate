import React, { useState, FormEvent } from "react";
import { useAuthStore } from "../../stores/authStore";
import { t } from "../../utils/i18n";
import AvatarPicker from "./AvatarPicker";
import "./auth.css";

interface Props {
  onSwitchToLogin: () => void;
}

export default function RegisterPage({ onSwitchToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [step, setStep] = useState<"form" | "avatar">("form");
  const { register, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, nickname);
    } catch {
      // error is set in store
    }
  };

  if (step === "avatar") {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <h1 className="auth-title">{t("auth.chooseAvatar")}</h1>
            <p className="auth-subtitle">{t("auth.changeAvatarLater")}</p>
          </div>
          <AvatarPicker onSelect={() => setStep("form")} />
          <button
            type="button"
            className="auth-btn auth-btn--secondary"
            onClick={() => setStep("form")}
          >
            {t("auth.skipForNow")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">{t("auth.appTitle")}</h1>
          <p className="auth-subtitle">{t("auth.createAccountSubtitle")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error" onClick={clearError}>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="nickname">{t("auth.nickname")}</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t("auth.nicknamePlaceholder")}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email">{t("auth.email")}</label>
            <input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password">{t("auth.password")}</label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordHint")}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t("auth.creatingAccount") : t("auth.register")}
          </button>
        </form>

        <p className="auth-switch">
          {t("auth.hasAccount")}{" "}
          <button type="button" onClick={onSwitchToLogin}>
            {t("auth.signInLink")}
          </button>
        </p>
      </div>
    </div>
  );
}
