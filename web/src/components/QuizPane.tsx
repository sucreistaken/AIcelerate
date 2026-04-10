import React from "react";
import { motion } from "framer-motion";
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
    answers, userAnswers, setUserAnswers, evalResults,
    loading, loadingAns, evaluating, pdfLoading,
    showDashboard, quizContentRef, quizHistory, dashboardStats,
    setMode, handleExportPdf, generateQuizFromPlan,
    fetchAnswers, evaluateAnswers, handleCopy,
  } = useQuizPane(quiz, setQuiz, hasPlan, plan);

  const handleAnswerChange = (index: number, value: string) => {
    setUserAnswers((prev: Record<number, string>) => ({ ...prev, [index]: value }));
  };

  return (
    <motion.div
      className="qz"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <PaneInfoBanner
        id="quiz"
        title={t("quiz.title")}
        description={t("quiz.desc")}
        tips={[t("quiz.tips1"), t("quiz.tips2"), t("quiz.tips3"), t("quiz.tips4")]}
      />

      <motion.header
        className="qz__header"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="qz__header-left">
          <div className="qz__header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <h1 className="qz__title">{t("quiz.pageTitle")}</h1>
            <div className="qz__chips">
              <span className="qz__chip">{t("quiz.chipDifficulty")}</span>
              <span className="qz__chip">{t("quiz.chipEvidence")}</span>
              <span className="qz__chip">{t("quiz.chipAI")}</span>
            </div>
          </div>
        </div>
      </motion.header>

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

      <div ref={quizContentRef} className="qz__questions">
        {loading ? (
          <QuizSkeleton />
        ) : quiz.length ? (
          <ol className="qz__list">
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
    </motion.div>
  );
}
