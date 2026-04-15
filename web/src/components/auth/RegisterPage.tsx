import { useState, useMemo, FormEvent } from "react";
import { Eye, EyeOff, ArrowRight, AlertCircle, Check } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { t } from "../../utils/i18n";
import AvatarPicker from "./AvatarPicker";
import "./auth.css";

interface Props {
  onSwitchToLogin: () => void;
}

function usePasswordStrength(password: string) {
  return useMemo(() => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      digit: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    const score = Object.values(checks).filter(Boolean).length;
    return { checks, score };
  }, [password]);
}

export default function RegisterPage({ onSwitchToLogin }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState<"form" | "avatar">("form");
  const { register, loading, error, clearError } = useAuthStore();

  const { score } = usePasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await register(email, password, nickname, rememberMe);
    } catch {
      /* surfaced via store */
    }
  };

  const canSubmit = !loading && score === 4 && nickname.trim().length >= 2;

  if (step === "avatar") {
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
              Pick
              <br />
              <em>your face.</em>
            </div>
            <p className="auth-hero-sub">
              You can switch avatars anytime from settings. Show up however you
              feel today.
            </p>
          </div>
          <div className="auth-hero-ticker">
            <span className="auth-hero-ticker-steps">
              <span>Account</span>
              <em>→</em>
              <span>Avatar</span>
              <em>→</em>
              <span>Ready</span>
            </span>
            <span className="auth-hero-ticker-line" />
          </div>
        </aside>

        <section className="auth-panel">
          <div className="auth-form-wrap auth-avatar-step">
            <header className="auth-form-head">
              <span className="auth-eyebrow">Step 02</span>
              <h1 className="auth-title">{t("auth.chooseAvatar")}</h1>
              <p className="auth-subtitle">{t("auth.changeAvatarLater")}</p>
            </header>

            <AvatarPicker onSelect={() => setStep("form")} />

            <button
              type="button"
              className="auth-btn auth-btn--ghost"
              onClick={() => setStep("form")}
            >
              {t("auth.skipForNow")}
            </button>
          </div>
        </section>
      </main>
    );
  }

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
            <span className="auth-eyebrow">{t("auth.register")}</span>
            <h1 className="auth-title">{t("auth.createAccountSubtitle")}</h1>
          </header>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="auth-error" onClick={clearError} role="alert">
                <AlertCircle size={16} className="auth-error-icon" />
                <span>{error}</span>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="nickname">{t("auth.nickname")}</label>
              <input
                id="nickname"
                className="auth-input"
                type="text"
                autoComplete="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder={t("auth.nicknamePlaceholder")}
                required
                autoFocus
                minLength={2}
                maxLength={32}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-email">{t("auth.email")}</label>
              <input
                id="reg-email"
                className="auth-input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.emailPlaceholder")}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="reg-password">{t("auth.password")}</label>
              <div className="auth-field-pwd">
                <input
                  id="reg-password"
                  className="auth-input"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              <div className="auth-strength" aria-live="polite">
                <div className="auth-strength-bar">
                  <div
                    className="auth-strength-fill"
                    data-level={score}
                    style={{ width: `${(score / 4) * 100}%` }}
                  />
                </div>
                <p className="auth-hint">{t("auth.passwordHint")}</p>
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

            <button type="submit" className="auth-btn" disabled={!canSubmit}>
              {loading ? (
                <>
                  <span className="auth-btn-spin" />
                  <span>{t("auth.creatingAccount")}</span>
                </>
              ) : (
                <>
                  <span>{t("auth.register")}</span>
                  <ArrowRight size={16} strokeWidth={2.2} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {t("auth.hasAccount")}{" "}
            <button type="button" onClick={onSwitchToLogin}>
              {t("auth.signInLink")}
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}
