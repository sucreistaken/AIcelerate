import { TypingIndicator } from "../../../ui";

interface FlashcardsEmptyProps {
  topic: string;
  hasLesson: boolean;
  generating: boolean;
  extracting: boolean;
  /** True when any member in the channel is currently generating flashcards. */
  aiThinking?: boolean;
  onGenerate: () => void;
  onExtract: () => void;
  onShowAddForm: () => void;
}

export default function FlashcardsEmpty({
  topic,
  hasLesson,
  generating,
  extracting,
  aiThinking = false,
  onGenerate,
  onExtract,
  onShowAddForm,
}: FlashcardsEmptyProps) {
  return (
    <div className="sh-tool">
      <div className="sh-tool__header sh-fc__header--gradient">
        <div className="sh-tool__header-left">
          <div className="sh-fc__header-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <h3 className="sh-main-content__channel-name">Flashcards - {topic}</h3>
        </div>
      </div>
      <div className="sh-tool__body">
        <div className="sh-tool__empty sh-fc__empty--enhanced">
          <div className="sh-fc__empty-illustration">
            <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
              <rect x="14" y="10" width="44" height="32" rx="6" fill="var(--border)" opacity="0.5" />
              <rect x="10" y="16" width="44" height="32" rx="6" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
              <rect x="18" y="24" width="44" height="32" rx="6" fill="var(--card)" stroke="var(--accent-2)" strokeWidth="2" />
              <circle cx="56" cy="20" r="3" fill="var(--accent-2)" opacity="0.7" />
              <circle cx="60" cy="14" r="1.5" fill="var(--accent-2)" opacity="0.4" />
              <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="bold" fill="var(--accent-2)">?</text>
            </svg>
          </div>
          <h3 className="sh-tool__empty-title" style={{ fontSize: "var(--text-lg)", marginTop: "var(--space-3)" }}>
            Hen{"\ü"}z kart yok
          </h3>
          <p className="sh-tool__empty-desc" style={{ maxWidth: 360, margin: "var(--space-2) auto var(--space-5)" }}>
            AI ile <strong>"{topic}"</strong> konusunda kartlar olu{"\ş"}turun veya kendiniz ekleyin!
          </p>
          {aiThinking && (
            <div style={{ marginBottom: 12 }}>
              <TypingIndicator label="AI kart \u00FCretiyor" />
            </div>
          )}
          <div className="sh-fc__empty-actions">
            <button className="sh-fc__cta-btn sh-fc__cta-btn--primary" onClick={onGenerate} disabled={generating}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
              {generating ? "Olu\şturuluyor..." : "AI ile Olu\ştur"}
            </button>
            {hasLesson && (
              <button className="sh-fc__cta-btn sh-fc__cta-btn--extract" onClick={onExtract} disabled={extracting}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                {extracting ? "\Ç\ıkar\ıl\ıyor..." : "Dersten \Ç\ıkar"}
              </button>
            )}
            <button className="sh-fc__cta-btn sh-fc__cta-btn--ghost" onClick={onShowAddForm}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Kart Ekle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
