interface ScoreEntry {
  correct: number;
  total: number;
  nickname: string;
}

interface Props {
  topic: string;
  userId: string;
  myScore?: { correct: number; total: number; nickname: string };
  scoreEntries: [string, ScoreEntry][];
  generating: boolean;
  handleGenerate: () => void;
  resetToReview: () => void;
}

export default function QuizResultsView({
  topic,
  userId,
  myScore,
  scoreEntries,
  generating,
  handleGenerate,
  resetToReview,
}: Props) {
  return (
    <div className="sh-tool">
      <div className="sh-tool__header sh-quiz__header-gradient">
        <div className="sh-tool__header-left">
          <div className="sh-quiz__header-icon">
            <span className="sh-quiz__header-icon-inner">&#9733;</span>
          </div>
          <h3 className="sh-main-content__channel-name">Quiz Results - {topic}</h3>
        </div>
      </div>
      <div className="sh-tool__body">
        <div className="sh-quiz__scoreboard">
          {myScore && (
            <div className="sh-quiz__my-score sh-quiz__my-score-card">
              <div className="sh-quiz__my-score-top">
                <span className="sh-quiz__my-score-label">Your Score</span>
              </div>
              <div className="sh-quiz__my-score-main">
                <span className="sh-quiz__my-score-value">{myScore.correct}/{myScore.total}</span>
                <span className="sh-quiz__my-score-pct">
                  {myScore.total > 0 ? Math.round((myScore.correct / myScore.total) * 100) : 0}%
                </span>
              </div>
              <div className="sh-quiz__my-score-bar-track">
                <div
                  className="sh-quiz__my-score-bar-fill"
                  style={{ width: `${myScore.total > 0 ? (myScore.correct / myScore.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          <h4 className="sh-quiz__scoreboard-title">Scoreboard</h4>
          {scoreEntries.length === 0 ? (
            <p className="sh-quiz__scoreboard-empty">No scores yet.</p>
          ) : (
            <div className="sh-quiz__score-grid">
              {scoreEntries.map(([id, score], idx) => {
                const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
                return (
                  <div key={id} className={`sh-quiz__score-card${id === userId ? " sh-quiz__score-card--me" : ""}`}>
                    <div className="sh-quiz__score-card-top">
                      <span className="sh-quiz__score-rank">#{idx + 1}</span>
                      <div className="sh-quiz__score-avatar">
                        {score.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="sh-quiz__score-name">{score.nickname}</span>
                      <span className="sh-quiz__score-value">{score.correct}/{score.total}</span>
                    </div>
                    <div className="sh-quiz__score-bar-track">
                      <div className="sh-quiz__score-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="sh-quiz__results-actions">
            <button className="lc-btn lc-btn--primary lc-btn--sm" onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <>
                  <span className="sh-quiz__spinner" />
                  Generating...
                </>
              ) : (
                "New Quiz"
              )}
            </button>
            <button className="lc-btn lc-btn--ghost lc-btn--sm" onClick={resetToReview}>
              Review Questions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
