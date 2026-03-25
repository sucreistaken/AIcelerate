import React from "react";
import { Plan } from "../types";
import { useQuizPane } from "../hooks/useQuizPane";
import PaneInfoBanner from "./ui/PaneInfoBanner";
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
          title="Quiz Modu Nasil Calisir?"
          description="AI, ogrenme planiniza dayali farkli zorluk seviyelerinde (Easy/Medium/Hard) sorular uretir. Her soruyu cevaplayin, sonra 'Cevaplarimi Degerlendir' ile AI'dan geri bildirim alin. Dogru/Kismen/Yanlis olarak derecelendirilir."
          tips={["Zorluk etiketleri", "AI degerlendirme", "Skor takibi", "Eksik konu analizi"]}
        />
        <div className="fw-800 fs-18">Quiz Modu</div>
        <div className="lc-chipset">
          <div className="lc-chip">Zorluk: Easy/Medium/Hard</div>
          <div className="lc-chip">Kanitli cevaplar</div>
          <div className="lc-chip">AI Degerlendirme</div>
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
            {quiz.length ? (
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
              <div className="op-65 text-center p-8">
                Henuz soru yok. "Plandan Quiz Olustur" butonuna tiklayin.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
