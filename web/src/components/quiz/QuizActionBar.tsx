import React from "react";
import { t } from "../../utils/i18n";

interface QuizActionBarProps {
  hasPlan: boolean;
  quizLength: number;
  loading: boolean;
  loadingAns: boolean;
  evaluating: boolean;
  pdfLoading: boolean;
  userAnswersCount: number;
  onGenerate: () => void;
  onFetchAnswers: () => void;
  onEvaluate: () => void;
  onExportPdf: () => void;
  onCopy: () => void;
}

export default function QuizActionBar({
  hasPlan, quizLength, loading, loadingAns, evaluating, pdfLoading,
  userAnswersCount, onGenerate, onFetchAnswers, onEvaluate, onExportPdf, onCopy,
}: QuizActionBarProps) {
  return (
    <>
      <div className="flex-gap-8" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <button
          className={hasPlan ? "btn btn-primary" : "btn btn--disabled"}
          onClick={onGenerate}
          disabled={!hasPlan || loading}
        >
          {loading ? t("quiz.generatingQuiz") : t("quiz.generateFromPlan")}
        </button>

        <button
          className={quizLength ? "btn" : "btn btn--disabled"}
          onClick={onFetchAnswers}
          disabled={!quizLength || loadingAns}
        >
          {loadingAns ? t("quiz.fetchingAnswers") : t("quiz.showAnswers")}
        </button>

        {quizLength > 0 && (
          <button
            className="btn btn-secondary"
            onClick={onEvaluate}
            disabled={evaluating || userAnswersCount === 0}
          >
            {evaluating ? t("quiz.evaluating") : t("quiz.evaluateAnswers")}
          </button>
        )}

        {quizLength > 0 && (
          <button className="btn btn-secondary" onClick={onExportPdf} disabled={pdfLoading}>
            {pdfLoading ? t("notes.exporting") : "PDF"}
          </button>
        )}

        {quizLength > 0 && (
          <button className="btn btn-ghost" onClick={onCopy}>
            {t("quiz.copy")}
          </button>
        )}
      </div>

      {!hasPlan && (
        <div className="op-60 fs-12 mt-2">
          {t("quiz.needPlan")}
        </div>
      )}
    </>
  );
}
