import { logger } from "../utils/logger";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import { API_BASE } from "../config";
import { Plan } from "../types";
import { useLessonStore } from "../stores/lessonStore";
import { useUiStore } from "../stores/uiStore";
import { exportToPdf } from "../utils/pdfExport";
import { withRetry } from "../utils/apiRetry";
import PaneInfoBanner from "./ui/PaneInfoBanner";

const QUIZ_ANSWERS_KEY_PREFIX = 'lc.quiz.answers.';
const QUIZ_EVAL_KEY_PREFIX = 'lc.quiz.eval.';
const QUIZ_HISTORY_KEY_PREFIX = 'lc.quiz.history.';

function parseDifficulty(q: string): { difficulty: string; cleanQ: string } {
  const match = q.match(/^\[(Easy|Medium|Hard)\]\s*/i);
  if (match) return { difficulty: match[1], cleanQ: q.slice(match[0].length) };
  return { difficulty: '', cleanQ: q };
}

function getDifficultyColor(d: string): string {
  switch (d.toLowerCase()) {
    case 'easy': return '#00b894';
    case 'medium': return '#fdcb6e';
    case 'hard': return '#e17055';
    default: return 'var(--muted)';
  }
}

interface QuizEvalResult {
  grade: 'correct' | 'partial' | 'incorrect';
  feedback: string;
  missing_points: string[];
  confidence: number;
}

interface QuizHistoryEntry {
  date: string;
  total: number;
  correct: number;
  partial: number;
  incorrect: number;
  score: number;
}

export default function QuizPane({
  quiz, setQuiz, hasPlan, plan,
}: {
  quiz: string[];
  setQuiz: (q: string[]) => void;
  hasPlan: boolean;
  plan: Plan | null;
}) {
  const { currentLessonId } = useLessonStore();
  const setMode = useUiStore((s) => s.setMode);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [evalResults, setEvalResults] = useState<Record<number, QuizEvalResult>>({});
  const [loading, setLoading] = useState(false);
  const [loadingAns, setLoadingAns] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const quizContentRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = async () => {
    if (!quizContentRef.current) return;
    setPdfLoading(true);
    try {
      await exportToPdf(quizContentRef.current, "Quiz");
    } catch (err) {
      logger.error("PDF export error:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  // Load answers from localStorage when lesson changes
  useEffect(() => {
    if (!currentLessonId) {
      setAnswers({});
      setEvalResults({});
      return;
    }

    const storageKey = QUIZ_ANSWERS_KEY_PREFIX + currentLessonId;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try { setAnswers(JSON.parse(savedData) || {}); }
      catch (e) { logger.error('Failed to parse saved quiz answers:', e); setAnswers({}); }
    } else { setAnswers({}); }

    const evalKey = QUIZ_EVAL_KEY_PREFIX + currentLessonId;
    const savedEval = localStorage.getItem(evalKey);
    if (savedEval) {
      try { setEvalResults(JSON.parse(savedEval) || {}); }
      catch { setEvalResults({}); }
    } else { setEvalResults({}); }
  }, [currentLessonId]);

  // Save answers to localStorage whenever they change
  useEffect(() => {
    if (!currentLessonId || Object.keys(answers).length === 0) return;
    localStorage.setItem(QUIZ_ANSWERS_KEY_PREFIX + currentLessonId, JSON.stringify(answers));
  }, [answers, currentLessonId]);

  // Save eval results
  useEffect(() => {
    if (!currentLessonId || Object.keys(evalResults).length === 0) return;
    localStorage.setItem(QUIZ_EVAL_KEY_PREFIX + currentLessonId, JSON.stringify(evalResults));
  }, [evalResults, currentLessonId]);

  // 1. Generate quiz from plan
  const generateQuizFromPlan = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const j = await withRetry(async () => {
        const r = await fetch(`${API_BASE}/api/quiz-from-plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && Array.isArray(j.questions)) {
        setQuiz(j.questions);
        setAnswers({});
        setEvalResults({});
        setUserAnswers({});
        setShowDashboard(false);
        if (currentLessonId) {
          localStorage.removeItem(QUIZ_ANSWERS_KEY_PREFIX + currentLessonId);
          localStorage.removeItem(QUIZ_EVAL_KEY_PREFIX + currentLessonId);
        }
      } else {
        toast.error(j.error || "Quiz üretilemedi");
      }
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch answers
  async function fetchAnswers() {
    if (!quiz.length) return;
    setLoadingAns(true);
    try {
      const j = await withRetry(async () => {
        const r = await fetch(`${API_BASE}/api/quiz-answers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: quiz, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && j.answers) {
        const map: Record<number, any> = {};
        j.answers.forEach((a: any, i: number) => { map[i] = a; });
        setAnswers(map);
      } else {
        toast.error("Cevaplar alınamadı.");
      }
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setLoadingAns(false);
    }
  }

  // 3. Evaluate user answers in batch
  const evaluateAnswers = async () => {
    const items = quiz.map((q, i) => ({
      q: parseDifficulty(q).cleanQ,
      student_answer: userAnswers[i] || '',
    })).filter(item => item.student_answer.trim());

    if (items.length === 0) {
      toast.error("Lütfen en az bir soruyu cevaplayın.");
      return;
    }

    setEvaluating(true);
    try {
      const j = await withRetry(async () => {
        const r = await fetch(`${API_BASE}/api/quiz-eval-batch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items, lessonId: currentLessonId }),
        });
        return await r.json();
      });
      if (j.ok && j.results) {
        const map: Record<number, QuizEvalResult> = {};
        j.results.forEach((r: any) => { map[r.index] = r; });
        setEvalResults(map);
        setShowDashboard(true);
        saveToHistory(j.results);
        toast.success("Değerlendirme tamamlandı!");
      } else {
        toast.error("Değerlendirme yapılamadı.");
      }
    } catch (e: any) {
      toast.error("Hata: " + e.message);
    } finally {
      setEvaluating(false);
    }
  };

  // Save quiz result to history
  const saveToHistory = (results: QuizEvalResult[]) => {
    if (!currentLessonId) return;
    const historyKey = QUIZ_HISTORY_KEY_PREFIX + currentLessonId;
    let history: QuizHistoryEntry[] = [];
    try { history = JSON.parse(localStorage.getItem(historyKey) || '[]'); } catch {}

    const correct = results.filter(r => r.grade === 'correct').length;
    const partial = results.filter(r => r.grade === 'partial').length;
    const incorrect = results.filter(r => r.grade === 'incorrect').length;
    const total = results.length;
    const score = Math.round(((correct + partial * 0.5) / total) * 100);

    history.push({ date: new Date().toISOString(), total, correct, partial, incorrect, score });
    if (history.length > 10) history = history.slice(-10);
    localStorage.setItem(historyKey, JSON.stringify(history));
  };

  // Load history
  const quizHistory = useMemo<QuizHistoryEntry[]>(() => {
    if (!currentLessonId) return [];
    try { return JSON.parse(localStorage.getItem(QUIZ_HISTORY_KEY_PREFIX + currentLessonId) || '[]'); } catch { return []; }
  }, [currentLessonId, showDashboard]);

  // Dashboard stats
  const dashboardStats = useMemo(() => {
    const results = Object.values(evalResults);
    if (!results.length) return null;
    const correct = results.filter(r => r.grade === 'correct').length;
    const partial = results.filter(r => r.grade === 'partial').length;
    const incorrect = results.filter(r => r.grade === 'incorrect').length;
    const total = results.length;
    const score = Math.round(((correct + partial * 0.5) / total) * 100);

    // Group missed concepts
    const allMissed = results.flatMap(r => r.missing_points || []);
    const missedCount: Record<string, number> = {};
    allMissed.forEach(m => { missedCount[m] = (missedCount[m] || 0) + 1; });
    const topMissed = Object.entries(missedCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { total, correct, partial, incorrect, score, topMissed };
  }, [evalResults]);

  const gradeColor = (g: string) => g === 'correct' ? '#00b894' : g === 'partial' ? '#fdcb6e' : '#e17055';
  const gradeLabel = (g: string) => g === 'correct' ? 'Dogru' : g === 'partial' ? 'Kismen' : 'Yanlis';

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
          <div className="lc-chip">Kanıtlı cevaplar</div>
          <div className="lc-chip">AI Değerlendirme</div>
        </div>

        {/* BUTTON GROUP */}
        <div className="flex-gap-8" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            className={hasPlan ? "btn btn-primary" : "btn btn--disabled"}
            onClick={generateQuizFromPlan}
            disabled={!hasPlan || loading}
          >
            {loading ? "Oluşturuluyor..." : "Plandan Quiz Oluştur"}
          </button>

          <button
            className={quiz.length ? "btn" : "btn btn--disabled"}
            onClick={fetchAnswers}
            disabled={!quiz.length || loadingAns}
          >
            {loadingAns ? "Cevaplar Getiriliyor..." : "Cevapları Göster"}
          </button>

          {quiz.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={evaluateAnswers}
              disabled={evaluating || Object.keys(userAnswers).length === 0}
            >
              {evaluating ? "Değerlendiriliyor..." : "Cevaplarımı Değerlendir"}
            </button>
          )}

          {quiz.length > 0 && (
            <button className="btn btn-secondary" onClick={handleExportPdf} disabled={pdfLoading}>
              {pdfLoading ? "Exporting..." : "PDF Export"}
            </button>
          )}

          {quiz.length > 0 && (
            <button className="btn btn-ghost" onClick={() => {
              navigator.clipboard.writeText(quiz.join("\n")).catch(() => toast.error("Kopyalanamadı"));
              toast.success("Kopyalandı!");
            }}>
              Kopyala
            </button>
          )}
        </div>

        {!hasPlan && (
          <div className="op-60 fs-12 mt-2">
            Quiz oluşturmak için önce soldaki panelden ders verisi girip "Planla" butonuna basmalısınız.
          </div>
        )}

        {/* QUIZ RESULT DASHBOARD */}
        {showDashboard && dashboardStats && (
          <div className="lc-section" style={{ background: "var(--input-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginTop: 8 }}>
            <div className="fw-700 fs-16 mb-2">Sonuç Özeti</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: dashboardStats.score >= 70 ? '#00b894' : dashboardStats.score >= 40 ? '#fdcb6e' : '#e17055' }}>
                  %{dashboardStats.score}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Genel Skor</div>
              </div>
              <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#00b894' }}>{dashboardStats.correct}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Dogru</div>
              </div>
              <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#fdcb6e' }}>{dashboardStats.partial}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Kismen</div>
              </div>
              <div style={{ textAlign: "center", padding: 12, borderRadius: 8, background: "var(--bg)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#e17055' }}>{dashboardStats.incorrect}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Yanlis</div>
              </div>
            </div>

            {/* Weak topics */}
            {dashboardStats.topMissed.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div className="fw-600 fs-13 mb-1" style={{ color: "var(--muted)" }}>Eksik Konular:</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {dashboardStats.topMissed.map(([concept, count]) => (
                    <span key={concept} style={{
                      display: "inline-block", padding: "4px 10px", borderRadius: 6,
                      background: "rgba(225, 112, 85, 0.15)", color: "#e17055", fontSize: 12, fontWeight: 600
                    }}>
                      {concept} ({count}x)
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ marginTop: 8, fontSize: 12 }}
                  onClick={() => setMode('deep-dive')}
                >
                  Deep Dive'da Çalış &rarr;
                </button>
              </div>
            )}

            {/* Trend */}
            {quizHistory.length > 1 && (
              <div>
                <div className="fw-600 fs-13 mb-1" style={{ color: "var(--muted)" }}>Skor Trendi:</div>
                <div style={{ display: "flex", alignItems: "end", gap: 4, height: 40 }}>
                  {quizHistory.slice(-8).map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${Math.max(h.score, 5)}%`, borderRadius: 3,
                      background: h.score >= 70 ? '#00b894' : h.score >= 40 ? '#fdcb6e' : '#e17055',
                      minWidth: 8, maxWidth: 32,
                    }} title={`${new Date(h.date).toLocaleDateString()} - %${h.score}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* QUESTION LIST */}
        <div ref={quizContentRef}>
        <div className="lc-section pad-top-8 mt-4">
          {quiz.length ? (
            <ol className="ol-reset">
              {quiz.map((q, i) => {
                const { difficulty, cleanQ } = parseDifficulty(q);
                return (
                <li key={i} className="q-item">
                  <div className="fw-700 mb-2" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {difficulty && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: getDifficultyColor(difficulty) + '22', color: getDifficultyColor(difficulty),
                      }}>
                        {difficulty}
                      </span>
                    )}
                    {cleanQ}
                  </div>

                  {/* User answer input */}
                  <textarea
                    placeholder="Cevabınızı buraya yazın..."
                    value={userAnswers[i] || ''}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                    rows={2}
                    style={{
                      width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--border)",
                      background: "var(--input-bg)", color: "var(--text)", fontSize: 13,
                      resize: "vertical", marginBottom: 8, fontFamily: "inherit"
                    }}
                  />

                  {/* Eval result */}
                  {evalResults[i] && (
                    <div style={{
                      padding: "10px 14px", borderRadius: 8, marginBottom: 8,
                      border: `1px solid ${gradeColor(evalResults[i].grade)}33`,
                      background: `${gradeColor(evalResults[i].grade)}11`,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: gradeColor(evalResults[i].grade), color: '#fff',
                        }}>
                          {gradeLabel(evalResults[i].grade)}
                        </span>
                        {evalResults[i].confidence != null && (
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>
                            Güven: %{Math.round(evalResults[i].confidence * 100)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13 }}>{evalResults[i].feedback}</div>
                      {evalResults[i].missing_points?.length > 0 && (
                        <div style={{ marginTop: 6, fontSize: 12, color: '#e17055' }}>
                          <b>Eksik:</b> {evalResults[i].missing_points.join(', ')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* AI answer card */}
                  {answers[i] ? (
                    <div className="lc-section answer-card" style={{ background: "var(--input-bg)", border: "1px solid var(--border)" }}>
                      <div className="mb-2"><b>Kısa Cevap:</b> {answers[i].short_answer}</div>
                      <div className="mb-2 op-80">{answers[i].explanation}</div>

                      {answers[i].evidence && (
                        <div className="evidence text-xs mt-3 p-2 bg-white rounded border">
                          <div className="op-60 mb-1">KANIT:</div>
                          {answers[i].evidence.lec?.map((e: any, k: number) => <div key={k} className="mb-1">"{e.quote}"</div>)}
                          {answers[i].evidence.slide?.map((e: any, k: number) => <div key={k} className="mb-1">"{e.quote}"</div>)}
                        </div>
                      )}
                    </div>
                  ) : null}
                </li>
                );
              })}
            </ol>
          ) : (
            <div className="op-65 text-center p-8">
              Henüz soru yok. "Plandan Quiz Oluştur" butonuna tıklayın.
            </div>
          )}
        </div>
        </div>
      </section>
    </div>
  );
}