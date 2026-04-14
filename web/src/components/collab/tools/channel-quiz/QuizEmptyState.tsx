import { TypingIndicator } from "../../../ui";

const COUNT_OPTIONS = [5, 10, 15, 20];

interface Props {
  topic: string;
  generating: boolean;
  /** True when another session is running an AI generation on this channel. */
  aiThinking?: boolean;
  quizCount: number;
  setQuizCount: (n: number) => void;
  difficulty: 'easy' | 'medium' | 'hard';
  setDifficulty: (d: 'easy' | 'medium' | 'hard') => void;
  includeTF: boolean;
  setIncludeTF: (v: boolean) => void;
  handleGenerate: () => void;
}

export default function QuizEmptyState({
  topic,
  generating,
  aiThinking = false,
  quizCount,
  setQuizCount,
  difficulty,
  setDifficulty,
  includeTF,
  setIncludeTF,
  handleGenerate,
}: Props) {
  return (
    <div className="sh-tool">
      <div className="sh-tool__header sh-quiz__header-gradient">
        <div className="sh-tool__header-left">
          <div className="sh-quiz__header-icon">
            <span className="sh-quiz__header-icon-inner">?</span>
          </div>
          <h3 className="sh-main-content__channel-name">Quiz - {topic}</h3>
        </div>
      </div>
      <div className="sh-tool__body">
        <div className="sh-tool__empty sh-quiz__empty-state">
          <div className="sh-quiz__empty-icon-wrapper">
            <svg className="sh-quiz__empty-icon" viewBox="0 0 48 48" width="64" height="64" fill="none">
              <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2" opacity="0.2" />
              <text x="24" y="32" textAnchor="middle" fontSize="26" fill="currentColor" fontWeight="bold">?</text>
            </svg>
          </div>
          <h3 className="sh-tool__empty-title">Create a Quiz</h3>
          <p className="sh-tool__empty-desc">Test your knowledge with AI-generated questions about "{topic}"</p>

          {aiThinking && (
            <div style={{ marginBottom: 12 }}>
              <TypingIndicator label="AI quiz olu\u015Fturuyor" />
            </div>
          )}

          <div className="sh-quiz__config sh-quiz__config-card">
            <div className="sh-quiz__config-card-header">
              <span className="sh-quiz__config-card-title">Quiz Settings</span>
            </div>

            <div className="sh-quiz__config-grid">
              <div className="sh-quiz__config-row">
                <label className="sh-quiz__config-label">Questions</label>
                <div className="sh-quiz__config-options">
                  {COUNT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      className={`sh-quiz__config-btn ${quizCount === c ? "sh-quiz__config-btn--active" : ""}`}
                      onClick={() => setQuizCount(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sh-quiz__config-row">
                <label className="sh-quiz__config-label">Difficulty</label>
                <div className="sh-quiz__config-options">
                  {(["easy", "medium", "hard"] as const).map((d) => (
                    <button
                      key={d}
                      className={`sh-quiz__config-btn ${difficulty === d ? "sh-quiz__config-btn--active" : ""}`}
                      onClick={() => setDifficulty(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="sh-quiz__config-row sh-quiz__config-row--checkbox">
                <label className="sh-quiz__config-checkbox-label">
                  <input
                    type="checkbox"
                    checked={includeTF}
                    onChange={(e) => setIncludeTF(e.target.checked)}
                    className="sh-quiz__config-checkbox"
                  />{" "}
                  Include True/False questions
                </label>
              </div>
            </div>

            <div className="sh-quiz__config-actions">
              <button
                className="lc-btn lc-btn--primary lc-btn--sm sh-quiz__generate-btn"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <span className="sh-quiz__spinner" />
                    Generating...
                  </>
                ) : (
                  "Generate Quiz"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
