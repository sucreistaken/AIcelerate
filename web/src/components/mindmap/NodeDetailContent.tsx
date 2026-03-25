import { motion } from "framer-motion";
import type { NodeDetail } from "../../hooks/useMindMap";

interface Props {
  nodeDetail: NodeDetail | null;
  nodeLoading: boolean;
  selectedQuizAnswer: string | null;
  setSelectedQuizAnswer: (answer: string | null) => void;
  showQuizResult: boolean;
  setShowQuizResult: (show: boolean) => void;
}

export default function NodeDetailContent({
  nodeDetail,
  nodeLoading,
  selectedQuizAnswer,
  setSelectedQuizAnswer,
  showQuizResult,
  setShowQuizResult,
}: Props) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      {nodeLoading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            style={{ display: 'inline-block' }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>
          </motion.div>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
            AI is thinking...
          </p>
        </div>
      )}

      {!nodeLoading && !nodeDetail && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ marginBottom: 12 }}><svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 9V5a1 1 0 1 1 2 0v4"/><path d="M14 10V5a1 1 0 1 1 2 0v5"/><path d="M8 10V7a1 1 0 1 1 2 0v3"/><path d="M6 15v-3a1 1 0 1 1 2 0v3"/><path d="M18 11a1 1 0 1 1 2 0v5a7 7 0 0 1-7 7h-1a7 7 0 0 1-7-7v0"/></svg></div>
          <p style={{ fontSize: 13 }}>Click a button above to get AI-powered insights</p>
        </div>
      )}

      {!nodeLoading && nodeDetail && (
        <div>
          {nodeDetail.explanation && (
            <ExplanationSection
              explanation={nodeDetail.explanation}
              keyPoints={nodeDetail.keyPoints}
            />
          )}

          {nodeDetail.example && (
            <ExampleSection example={nodeDetail.example} />
          )}

          {nodeDetail.quiz && (
            <QuizSection
              quiz={nodeDetail.quiz}
              selectedQuizAnswer={selectedQuizAnswer}
              setSelectedQuizAnswer={setSelectedQuizAnswer}
              showQuizResult={showQuizResult}
              setShowQuizResult={setShowQuizResult}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ExplanationSection({ explanation, keyPoints }: { explanation: string; keyPoints?: string[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text)' }}>
        {explanation}
      </p>
      {keyPoints && keyPoints.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--accent-2)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>Key Points
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {keyPoints.map((point, i) => (
              <li key={i} style={{ fontSize: 13, marginBottom: 6, color: 'var(--text)' }}>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExampleSection({ example }: { example: { scenario: string; explanation: string; takeaway: string } }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)'
      }}>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--accent-2)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Scenario
        </h4>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          {example.scenario}
        </p>
        <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--accent-2)' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><line x1="9" y1="18" x2="15" y2="18"/><line x1="10" y1="22" x2="14" y2="22"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>How it applies
        </h4>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 12 }}>
          {example.explanation}
        </p>
        <div style={{
          background: 'var(--accent-2)',
          color: 'white',
          padding: '10px 14px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: 4 }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>Takeaway: {example.takeaway}
        </div>
      </div>
    </div>
  );
}

function QuizSection({
  quiz,
  selectedQuizAnswer,
  setSelectedQuizAnswer,
  showQuizResult,
  setShowQuizResult,
}: {
  quiz: { question: string; options: string[]; correctAnswer: string; explanation: string };
  selectedQuizAnswer: string | null;
  setSelectedQuizAnswer: (answer: string | null) => void;
  showQuizResult: boolean;
  setShowQuizResult: (show: boolean) => void;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        background: 'var(--bg)',
        borderRadius: 12,
        padding: 16,
        border: '1px solid var(--border)'
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text)' }}>
          {quiz.question}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quiz.options.map((option, i) => {
            const optionLetter = option.charAt(0);
            const isSelected = selectedQuizAnswer === optionLetter;
            const isCorrect = optionLetter === quiz.correctAnswer;
            const showResult = showQuizResult;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!showQuizResult) {
                    setSelectedQuizAnswer(optionLetter);
                    setShowQuizResult(true);
                  }
                }}
                disabled={showQuizResult}
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: showResult
                    ? isCorrect
                      ? '2px solid #22c55e'
                      : isSelected
                        ? '2px solid #ef4444'
                        : '1px solid var(--border)'
                    : isSelected
                      ? '2px solid var(--accent-2)'
                      : '1px solid var(--border)',
                  background: showResult
                    ? isCorrect
                      ? 'rgba(34, 197, 94, 0.1)'
                      : isSelected
                        ? 'rgba(239, 68, 68, 0.1)'
                        : 'var(--card)'
                    : 'var(--card)',
                  cursor: showQuizResult ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontSize: 13,
                  color: 'var(--text)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                {showResult && isCorrect && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>}
                {showResult && isSelected && !isCorrect && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>}
                {option}
              </button>
            );
          })}
        </div>
        {showQuizResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 16,
              padding: 12,
              borderRadius: 8,
              background: selectedQuizAnswer === quiz.correctAnswer
                ? 'rgba(34, 197, 94, 0.1)'
                : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${selectedQuizAnswer === quiz.correctAnswer ? '#22c55e' : '#ef4444'}`
            }}
          >
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              {selectedQuizAnswer === quiz.correctAnswer
                ? 'Correct!'
                : 'Not quite right'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text)', opacity: 0.8 }}>
              {quiz.explanation}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
