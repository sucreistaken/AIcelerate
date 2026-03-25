import React from "react";
import { motion } from "framer-motion";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { useGamificationStore, getLevelInfo } from "../../stores/gamificationStore";
import { ModeId } from "../../types";

interface LessonSummary {
  id: string;
  title: string;
  date?: string;
  highlights?: string[];
  plan?: { modules?: any[] };
}

function timeAgoShort(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}sa`;
  const days = Math.floor(hours / 24);
  return `${days}g`;
}

/* ── Monochrome SVG Icons (SF Symbols style) ── */
const icons = {
  deepDive: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  quiz: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  flashcards: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/>
    </svg>
  ),
  mindmap: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M2 12h7"/><path d="M15 12h7"/><path d="M4.93 4.93l4.24 4.24"/><path d="M14.83 14.83l4.24 4.24"/><path d="M14.83 9.17l4.24-4.24"/><path d="M4.93 19.07l4.24-4.24"/>
    </svg>
  ),
  cheatSheet: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  notes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  ),
  upload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  rocket: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
    </svg>
  ),
  book: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
};

/* ── Study Tools Config ── */
const studyTools: Array<{ id: ModeId; icon: React.ReactNode; label: string; desc: string; tint: string }> = [
  { id: "deep-dive", icon: icons.deepDive, label: "Deep Dive", desc: "AI ile derinlemesine sohbet", tint: "37, 99, 235" },
  { id: "quiz", icon: icons.quiz, label: "Quiz", desc: "Kendini test et", tint: "239, 68, 68" },
  { id: "flashcards", icon: icons.flashcards, label: "Flashcards", desc: "Kartlarla tekrar et", tint: "245, 158, 11" },
  { id: "mindmap", icon: icons.mindmap, label: "Mind Map", desc: "Kavram haritasi olustur", tint: "16, 185, 129" },
  { id: "cheat-sheet", icon: icons.cheatSheet, label: "Cheat Sheet", desc: "Sinav odakli ozet", tint: "139, 92, 246" },
  { id: "notes", icon: icons.notes, label: "Notlar", desc: "Notlarini yonet", tint: "6, 182, 212" },
];

/* ── Step Card ── */
function StepCard({ step, icon, title, desc, active, onClick }: {
  step: number; icon: React.ReactNode; title: string; desc: string; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button
      className={`wg-step${active ? " wg-step--active" : ""}`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="wg-step__number"><span>{step}</span></div>
      <div className="wg-step__icon">{icon}</div>
      <div className="wg-step__content">
        <div className="wg-step__title">{title}</div>
        <div className="wg-step__desc">{desc}</div>
      </div>
      {active && (
        <div className="wg-step__arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
        </div>
      )}
    </motion.button>
  );
}

/* ── Main Component ── */
export default function WelcomeGuide() {
  const lessons = useLessonStore((s) => s.lessons) as LessonSummary[];
  const setCurrentLessonId = useLessonStore((s) => s.setCurrentLessonId);
  const setMode = useUiStore((s) => s.setMode);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);
  const leftPanelCollapsed = useUiStore((s) => s.leftPanelCollapsed);
  const { totalXp, streakDays } = useGamificationStore();
  const level = getLevelInfo(totalXp);

  const recentLessons = [...lessons]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
    .slice(0, 3);

  const totalLessons = lessons.length;

  const handleNewLesson = () => {
    if (leftPanelCollapsed) toggleLeftPanel();
  };

  const handleContinue = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setMode("plan");
  };

  return (
    <div className="wg">
      {/* ── Hero ── */}
      <motion.div
        className="wg-hero"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="wg-hero__badge">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/>
          </svg>
        </div>
        <h1 className="wg-hero__title">
          {totalLessons > 0 ? "Tekrar hoş geldin" : "Hoş geldin"}
        </h1>
        <p className="wg-hero__subtitle">
          {totalLessons > 0
            ? `${totalLessons} ders yükledin. Bugün ne çalışmak istersin?`
            : "Ders materyalini yükle, AI plan, quiz ve özet hazırlasın."}
        </p>

        {totalXp > 0 && (
          <div className="wg-hero__stats">
            {streakDays > 0 && <div className="wg-hero__stat">{streakDays} gün seri</div>}
            <div className="wg-hero__stat">{totalXp} XP · {level.name}</div>
          </div>
        )}
      </motion.div>

      {/* ── Steps (new user) ── */}
      {totalLessons === 0 && (
        <motion.div
          className="wg-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="wg-section__label">Başlamak için</div>
          <div className="wg-steps">
            <StepCard step={1} icon={icons.upload} title="Materyal yükle" desc="PDF slayt veya ses dosyası" active={true} onClick={handleNewLesson} />
            <StepCard step={2} icon={icons.ai} title="AI analiz etsin" desc="Plan, quiz ve kavramlar çıkarılsın" active={false} onClick={() => {}} />
            <StepCard step={3} icon={icons.rocket} title="Çalışmaya başla" desc="Quiz çöz, flashcard tekrar et" active={false} onClick={() => {}} />
          </div>
        </motion.div>
      )}

      {/* ── Recent Lessons ── */}
      {recentLessons.length > 0 && (
        <motion.div
          className="wg-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="wg-section__label">Kaldığın yerden devam et</div>
          <div className="wg-lessons">
            {recentLessons.map((l, i) => (
              <motion.button
                key={l.id}
                className="wg-lesson"
                onClick={() => handleContinue(l.id)}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.12 + i * 0.04 }}
                whileHover={{ x: 3 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="wg-lesson__icon">{icons.book}</div>
                <div className="wg-lesson__info">
                  <div className="wg-lesson__title">{l.title}</div>
                  <div className="wg-lesson__meta">
                    {l.highlights?.length || 0} kavram{l.date && ` · ${timeAgoShort(l.date)} önce`}
                  </div>
                </div>
                <div className="wg-lesson__action">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4" /></svg>
                </div>
              </motion.button>
            ))}
          </div>
          <motion.button className="wg-new-lesson" onClick={handleNewLesson} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <span className="wg-new-lesson__plus">+</span>
            <span>Yeni ders yükle</span>
          </motion.button>
        </motion.div>
      )}

      {/* ── Study Tools ── */}
      <motion.div
        className="wg-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="wg-section__label">Çalışma araçları</div>
        <div className="wg-tools">
          {studyTools.map((tool, i) => (
            <motion.button
              key={tool.id}
              className="wg-tool"
              onClick={() => setMode(tool.id)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.24 + i * 0.035 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="wg-tool__icon-wrap" style={{ '--tool-tint': tool.tint } as React.CSSProperties}>
                {tool.icon}
              </div>
              <div className="wg-tool__label">{tool.label}</div>
              <div className="wg-tool__desc">{tool.desc}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
