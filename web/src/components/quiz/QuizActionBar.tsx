import React from "react";

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
          {loading ? "Olusturuluyor..." : "Plandan Quiz Olustur"}
        </button>

        <button
          className={quizLength ? "btn" : "btn btn--disabled"}
          onClick={onFetchAnswers}
          disabled={!quizLength || loadingAns}
        >
          {loadingAns ? "Cevaplar Getiriliyor..." : "Cevaplari Goster"}
        </button>

        {quizLength > 0 && (
          <button
            className="btn btn-secondary"
            onClick={onEvaluate}
            disabled={evaluating || userAnswersCount === 0}
          >
            {evaluating ? "Degerlendiriliyor..." : "Cevaplarimi Degerlendir"}
          </button>
        )}

        {quizLength > 0 && (
          <button className="btn btn-secondary" onClick={onExportPdf} disabled={pdfLoading}>
            {pdfLoading ? "Exporting..." : "PDF Export"}
          </button>
        )}

        {quizLength > 0 && (
          <button className="btn btn-ghost" onClick={onCopy}>
            Kopyala
          </button>
        )}
      </div>

      {!hasPlan && (
        <div className="op-60 fs-12 mt-2">
          Quiz olusturmak icin once soldaki panelden ders verisi girip "Planla" butonuna basmalsiniz.
        </div>
      )}
    </>
  );
}
