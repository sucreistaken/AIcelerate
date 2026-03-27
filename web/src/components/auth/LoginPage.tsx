import React, { useState, FormEvent } from "react";
import { useAuthStore } from "../../stores/authStore";
import { t } from "../../utils/i18n";
import "./auth.css";

interface Props {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
    } catch {
      // error is set in store
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">{t("auth.appTitle")}</h1>
          <p className="auth-subtitle">{t("auth.signInSubtitle")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="auth-error" onClick={clearError}>
              {error}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">{t("auth.email")}</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              required
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">{t("auth.password")}</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("auth.passwordHint")}
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? t("auth.signingIn") : t("auth.signIn")}
          </button>
        </form>

        <p className="auth-switch">
          {t("auth.noAccount")}{" "}
          <button type="button" onClick={onSwitchToRegister}>
            {t("auth.createOne")}
          </button>
        </p>
      </div>
    </div>
  );
}
