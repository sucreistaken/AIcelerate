import { useState, FormEvent } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, Check } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { t } from "../../utils/i18n";
import "./auth.css";

interface Props {
  onSwitchToRegister: () => void;
}

export default function LoginPage({ onSwitchToRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const { login, loading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password, rememberMe);
    } catch {
      /* surfaced via store */
    }
  };

  return (
    <main className="auth-stage">
      <aside className="auth-hero" aria-hidden="true">
        <span className="auth-hero-scan" />

        <div className="auth-hero-top">
          <div className="auth-hero-mark">
            <em>AI</em>celerate
          </div>
          <span className="auth-hero-tag">Live</span>
        </div>

        <div className="auth-hero-body">
          <div className="auth-hero-display">
            Knowledge,
            <br />
            <em>accelerated.</em>
          </div>
          <p className="auth-hero-sub">
            Drop your lecture notes in. Walk away with a study plan, quizzes, and
            flashcards ready to go.
          </p>
        </div>

        <div className="auth-hero-ticker">
          <span className="auth-hero-ticker-steps">
            <span>Upload</span>
            <em>→</em>
            <span>Plan</span>
            <em>→</em>
            <span>Practice</span>
            <em>→</em>
            <span>Master</span>
          </span>
          <span className="auth-hero-ticker-line" />
        </div>
      </aside>

      <section className="auth-panel">
        <div className="auth-form-wrap">
          <header className="auth-form-head">
            <span className="auth-eyebrow">{t("auth.signIn")}</span>
            <h1 className="auth-title">{t("auth.signInSubtitle")}</h1>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error" onClick={clearError} role="alert">
                <AlertCircle size={16} className="auth-error-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email">{t("auth.email")}</label>
              <input
                id="email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
                autoFocus
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">{t("auth.password")}</label>
              <div className="auth-field-pwd">
                <input
                  id="password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="auth-field-pwd-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="auth-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="auth-remember-box">
                <Check size={12} strokeWidth={3} />
              </span>
              <span>{t("auth.rememberMe")}</span>
            </label>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="auth-btn-spin" />
                  <span>{t("auth.signingIn")}</span>
                </>
              ) : (
                <>
                  <span>{t("auth.signIn")}</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {t("auth.noAccount")}{" "}
            <button type="button" onClick={onSwitchToRegister}>
              {t("auth.createOne")}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
