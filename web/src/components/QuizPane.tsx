import React from "react";
import { Plan } from "../types";
import { useQuizPane } from "../hooks/useQuizPane";
import PaneInfoBanner from "./ui/PaneInfoBanner";
import { NoQuizEmpty } from "./ui/EmptyState";
import { QuizSkeleton } from "./ui/Skeleton";
import { t } from "../utils/i18n";
import QuizActionBar from "./quiz/QuizActionBar";
import QuizDashboard from "./quiz/QuizDashboard";
import QuizQuestionItem from "./quiz/QuizQuestionItem";

export default function QuizPane({
  quiz, setQuiz, hasPlan, plan,
}: {
  quiz: string[];
  setQuiz: (q: string[]) => void;
  hasPlan: boolean;
  plan: Plan | null;
}) {
  const {
    answers,
    userAnswers,
    setUserAnswers,
    evalResults,
    loading,
    loadingAns,
    evaluating,
    pdfLoading,
    showDashboard,
    quizContentRef,
    quizHistory,
    dashboardStats,
    setMode,
    handleExportPdf,
    generateQuizFromPlan,
    fetchAnswers,
    evaluateAnswers,
    handleCopy,
  } = useQuizPane(quiz, setQuiz, hasPlan, plan);

  const handleAnswerChange = (index: number, value: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: value }));
  };

  return (
    <div className="grid-gap-12">
      <section className="lc-section grid-gap-12">
        <PaneInfoBanner
          id="quiz"
          title={t("quiz.title")}
          description={t("quiz.desc")}
          tips={[t("quiz.tips1"), t("quiz.tips2"), t("quiz.tips3"), t("quiz.tips4")]}
        />
        <div className="fw-800 fs-18">{t("quiz.pageTitle")}</div>
        <div className="lc-chipset">
          <div className="lc-chip">{t("quiz.chipDifficulty")}</div>
          <div className="lc-chip">{t("quiz.chipEvidence")}</div>
          <div className="lc-chip">{t("quiz.chipAI")}</div>
        </div>

        <QuizActionBar
          hasPlan={hasPlan}
          quizLength={quiz.length}
          loading={loading}
          loadingAns={loadingAns}
          evaluating={evaluating}
          pdfLoading={pdfLoading}
          userAnswersCount={Object.keys(userAnswers).length}
          onGenerate={generateQuizFromPlan}
          onFetchAnswers={fetchAnswers}
          onEvaluate={evaluateAnswers}
          onExportPdf={handleExportPdf}
          onCopy={handleCopy}
        />

        {showDashboard && dashboardStats && (
          <QuizDashboard
            stats={dashboardStats}
            history={quizHistory}
            onDeepDive={() => setMode('deep-dive')}
          />
        )}

        <div ref={quizContentRef}>
          <div className="lc-section pad-top-8 mt-4">
            {loading ? (
              <QuizSkeleton />
            ) : quiz.length ? (
              <ol className="ol-reset">
                {quiz.map((q, i) => (
                  <QuizQuestionItem
                    key={i}
                    question={q}
                    index={i}
                    userAnswer={userAnswers[i] || ''}
                    evalResult={evalResults[i]}
                    answer={answers[i]}
                    onAnswerChange={handleAnswerChange}
                  />
                ))}
              </ol>
            ) : (
              <NoQuizEmpty onAction={hasPlan ? generateQuizFromPlan : undefined} />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
