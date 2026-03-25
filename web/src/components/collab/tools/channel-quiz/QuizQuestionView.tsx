import { motion, AnimatePresence } from "framer-motion";
import type { ChannelQuizQuestion } from "../../../../types";

const LETTERS = ["A", "B", "C", "D"];

interface Props {
  topic: string;
  questions: ChannelQuizQuestion[];
  currentIndex: number;
  selectedIndex: number | null;
  answered: boolean;
  result: { correct: boolean; correctIndex: number; explanation: string } | null;
  sourcesSummary: string | null;
  myScore?: { correct: number; total: number; nickname: string };
  getOptionClass: (optIndex: number) => string;
  handleSelectOption: (optIndex: number) => void;
  handlePrevious: () => void;
  handleNext: () => void;
  setShowResults: (v: boolean) => void;
}

export default function QuizQuestionView({
  topic,
  questions,
  currentIndex,
  selectedIndex,
  answered,
  result,
  sourcesSummary,
  myScore,
  getOptionClass,
  handleSelectOption,
  handlePrevious,
  handleNext,
  setShowResults,
}: Props) {
  const currentQuestion = questions[currentIndex];
  const qType = (currentQuestion as any)?.type === 'tf' ? 'T/F' : 'MC';

  return (
    <div className="sh-tool">
      <div className="sh-tool__header sh-quiz__header-gradient">
        <div className="sh-tool__header-left">
          <div className="sh-quiz__header-icon">
            <span className="sh-quiz__header-icon-inner">?</span>
          </div>
          <h3 className="sh-main-content__channel-name">Quiz - {topic}</h3>
          <span className="sh-tool__count">{currentIndex + 1}/{questions.length}</span>
          {myScore && (
            <span className="sh-quiz__inline-score">
              <span className="sh-quiz__inline-score-icon">&#10003;</span>
              {myScore.correct}/{myScore.total}
            </span>
          )}
        </div>
        <div className="sh-tool__header-right">
          <button className="lc-btn lc-btn--ghost lc-btn--sm" onClick={() => setShowResults(true)}>
            Scoreboard
          </button>
        </div>
      </div>

      <div className="sh-tool__body">
        <div className="sh-quiz__progress">
          <div className="sh-quiz__progress-bar">
            <div className="sh-quiz__progress-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }} />
          </div>
        </div>

        {sourcesSummary && (
          <div className="sh-tool__context-info">
            Kaynak: {sourcesSummary} temelinde olu{"\ş"}turuldu
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2 }}
            >
              <div className="sh-quiz__question sh-quiz__question-card">
                <div className="sh-quiz__question-card-accent" />
                <div className="sh-quiz__question-meta">
                  <span className="sh-quiz__question-number sh-quiz__question-number-badge">
                    {currentIndex + 1}
                  </span>
                  <span className="sh-quiz__question-type sh-quiz__question-type-badge">{qType}</span>
                </div>
                <p className="sh-quiz__question-text">{currentQuestion.question}</p>
              </div>

              <div className="sh-quiz__options">
                {currentQuestion.options.map((option, optIdx) => (
                  <button key={optIdx} className={getOptionClass(optIdx)} onClick={() => handleSelectOption(optIdx)} disabled={answered}>
                    <span className="sh-quiz__option-letter sh-quiz__option-letter-badge">
                      {qType === 'T/F' ? '' : LETTERS[optIdx] ?? String(optIdx + 1)}
                    </span>
                    <span className="sh-quiz__option-text">{option}</span>
                    {answered && optIdx === result?.correctIndex && (
                      <span className="sh-quiz__option-result-icon sh-quiz__option-result-icon--correct">&#10003;</span>
                    )}
                    {answered && optIdx === selectedIndex && !result?.correct && optIdx !== result?.correctIndex && (
                      <span className="sh-quiz__option-result-icon sh-quiz__option-result-icon--wrong">&#10007;</span>
                    )}
                  </button>
                ))}
              </div>

              {answered && result && (
                <motion.div
                  className={`sh-quiz__explanation ${result.correct ? "sh-quiz__explanation--correct" : "sh-quiz__explanation--wrong"}`}
                  initial={{ scale: 0.9, y: 10, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <div className="sh-quiz__explanation-header">
                    <span className="sh-quiz__explanation-icon">
                      {result.correct ? "\✓" : "\✗"}
                    </span>
                    <strong>{result.correct ? "Correct!" : "Wrong"}</strong>
                  </div>
                  <p className="sh-quiz__explanation-text">{result.explanation}</p>
                </motion.div>
              )}

              <div className="sh-quiz__nav">
                <button className="lc-btn lc-btn--ghost lc-btn--sm" onClick={handlePrevious} disabled={currentIndex === 0}>
                  Previous
                </button>

                <div className="sh-quiz__dot-indicators">
                  {questions.map((_, dotIdx) => (
                    <span
                      key={dotIdx}
                      className={`sh-quiz__dot${dotIdx === currentIndex ? " sh-quiz__dot--active" : ""}${dotIdx < currentIndex ? " sh-quiz__dot--done" : ""}`}
                    />
                  ))}
                </div>

                <button className="lc-btn lc-btn--primary lc-btn--sm" onClick={handleNext} disabled={!answered}>
                  {currentIndex < questions.length - 1 ? "Next" : "Results"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
