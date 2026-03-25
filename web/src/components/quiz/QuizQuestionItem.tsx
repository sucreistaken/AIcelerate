import React from "react";
import {
  QuizEvalResult,
  parseDifficulty,
  getDifficultyColor,
  getDifficultyBg,
  gradeColor,
  gradeLabel,
} from "../../hooks/useQuizPane";

interface QuizQuestionItemProps {
  question: string;
  index: number;
  userAnswer: string;
  evalResult?: QuizEvalResult;
  answer?: any;
  onAnswerChange: (index: number, value: string) => void;
}

function QuizQuestionItem({
  question, index, userAnswer, evalResult, answer, onAnswerChange,
}: QuizQuestionItemProps) {
  const { difficulty, cleanQ } = parseDifficulty(question);

  return (
    <li className="q-item">
      <div className="fw-700 mb-2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {difficulty && (
          <span style={{
            fontSize: 'var(--fs-xs)', fontWeight: 600, padding: "2px 8px", borderRadius: 'var(--radius-xs)',
            background: getDifficultyBg(difficulty), color: getDifficultyColor(difficulty),
          }}>
            {difficulty}
          </span>
        )}
        {cleanQ}
      </div>

      <textarea
        placeholder="Cevabinizi buraya yazin..."
        value={userAnswer}
        onChange={(e) => onAnswerChange(index, e.target.value)}
        rows={2}
        style={{
          width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)",
          background: "var(--input-bg)", color: "var(--text)", fontSize: 13,
          resize: "vertical", marginBottom: 8, fontFamily: "inherit"
        }}
      />

      {evalResult && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 8,
          border: `1px solid ${gradeColor(evalResult.grade)}33`,
          background: `${gradeColor(evalResult.grade)}11`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
              background: gradeColor(evalResult.grade), color: '#fff',
            }}>
              {gradeLabel(evalResult.grade)}
            </span>
            {evalResult.confidence != null && (
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                Guven: %{Math.round(evalResult.confidence * 100)}
              </span>
            )}
          </div>
          <div style={{ fontSize: 13 }}>{evalResult.feedback}</div>
          {evalResult.missing_points?.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#e17055' }}>
              <b>Eksik:</b> {evalResult.missing_points.join(', ')}
            </div>
          )}
        </div>
      )}

      {answer && (
        <div className="lc-section answer-card" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
          <div className="mb-2"><b>Kisa Cevap:</b> {answer.short_answer}</div>
          <div className="mb-2 op-80">{answer.explanation}</div>
          {answer.evidence && (
            <div className="evidence text-xs mt-3 p-2 bg-white rounded border">
              <div className="op-60 mb-1">KANIT:</div>
              {answer.evidence.lec?.map((e: any, k: number) => <div key={k} className="mb-1">"{e.quote}"</div>)}
              {answer.evidence.slide?.map((e: any, k: number) => <div key={k} className="mb-1">"{e.quote}"</div>)}
            </div>
          )}
        </div>
      )}
    </li>
  );
}

export default React.memo(QuizQuestionItem);
