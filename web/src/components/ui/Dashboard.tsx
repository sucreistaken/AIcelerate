import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useGamificationStore, getLevelInfo } from "../../stores/gamificationStore";
import { useDashboard, type SparklinePoint, type WeeklyBar, type CourseCard } from "../../hooks/useDashboard";
import { ModeId } from "../../types";
import { t } from "../../utils/i18n";

/* ── Helpers ── */

function timeAgoShort(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}${t("welcome.minAbbr")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}${t("welcome.hourAbbr")}`;
  return `${Math.floor(hours / 24)}${t("welcome.dayAbbr")}`;
}

function getStreakWeek(streakDays: number) {
  const dayKeys = ["welcome.mon", "welcome.tue", "welcome.wed", "welcome.thu", "welcome.fri", "welcome.sat", "welcome.sun"];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;
  return dayKeys.map((key, i) => ({
    label: t(key),
    done: i < todayIdx && i >= todayIdx - streakDays + 1,
    today: i === todayIdx,
    future: i > todayIdx,
  }));
}

/* ── Icons ── */

function SvgIcon({ size = 22, ...props }: { size?: number } & React.SVGProps<SVGSVGElement>) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props} />;
}

const icons = {
  deepDive: <SvgIcon><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></SvgIcon>,
  quiz: <SvgIcon><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></SvgIcon>,
  flashcards: <SvgIcon><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></SvgIcon>,
  mindmap: <SvgIcon><circle cx="12" cy="12" r="3"/><path d="M12 2v7M12 15v7M2 12h7M15 12h7"/></SvgIcon>,
  cheatSheet: <SvgIcon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></SvgIcon>,
  notes: <SvgIcon><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></SvgIcon>,
  upload: <SvgIcon size={20}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></SvgIcon>,
  ai: <SvgIcon size={20}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></SvgIcon>,
  rocket: <SvgIcon size={20}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></SvgIcon>,
  book: <SvgIcon size={18}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></SvgIcon>,
  plus: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M8 3v10M3 8h10"/></svg>,
  arrow: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4"/></svg>,
  check: <SvgIcon size={16}><polyline points="20 6 9 17 4 12"/></SvgIcon>,
};

/* ── Study Tools Config ── */
const STUDY_TOOLS: Array<{ id: ModeId; icon: React.ReactNode; labelKey: string; descKey: string; tint: string }> = [
  { id: "deep-dive", icon: icons.deepDive, labelKey: "mode.deepDive", descKey: "welcome.toolDeepDive", tint: "37, 99, 235" },
  { id: "quiz", icon: icons.quiz, labelKey: "mode.quiz", descKey: "welcome.toolQuiz", tint: "239, 68, 68" },
  { id: "flashcards", icon: icons.flashcards, labelKey: "mode.flashcards", descKey: "welcome.toolFlashcards", tint: "245, 158, 11" },
  { id: "mindmap", icon: icons.mindmap, labelKey: "mode.mindmap", descKey: "welcome.toolMindMap", tint: "16, 185, 129" },
  { id: "cheat-sheet", icon: icons.cheatSheet, labelKey: "mode.cheatSheet", descKey: "welcome.toolCheatSheet", tint: "139, 92, 246" },
  { id: "notes", icon: icons.notes, labelKey: "mode.notes", descKey: "welcome.toolNotes", tint: "6, 182, 212" },
];

const svgSm = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const qaIcons = {
  plus: <svg {...svgSm}><path d="M12 5v14M5 12h14" /></svg>,
  doc: <svg {...svgSm}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  house: <svg {...svgSm}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  search: <svg {...svgSm}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>,
};

const statIcons = {
  courses: <svg {...svgSm}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  lessons: <svg {...svgSm}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  bolt: <svg {...svgSm}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  target: <svg {...svgSm}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  cards: <svg {...svgSm}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>,
};

const fireIcon = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/></svg>;

const QUICK_ACTIONS: Array<{ icon: React.ReactNode; labelKey: string; mode: ModeId; tint: string }> = [
  { icon: qaIcons.plus, labelKey: "welcome.qaCourse", mode: "create-lesson", tint: "59, 130, 246" },
  { icon: qaIcons.doc, labelKey: "welcome.qaLesson", mode: "create-lesson", tint: "168, 85, 247" },
  { icon: qaIcons.house, labelKey: "welcome.qaRoom", mode: "study-hub", tint: "34, 197, 94" },
  { icon: qaIcons.search, labelKey: "welcome.qaExplore", mode: "study-hub", tint: "251, 146, 60" },
];

/* ── Sub-Components ── */

function StatCard({ icon, value, label, delay }: { icon: React.ReactNode; value: React.ReactNode; label: string; delay: number }) {
  return (
    <motion.div
      className="wg-stat"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <span className="wg-stat__emoji">{icon}</span>
      <div className="wg-stat__value">{value}</div>
      <div className="wg-stat__label">{label}</div>
    </motion.div>
  );
}

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
      {active && <div className="wg-step__arrow">{icons.arrow}</div>}
    </motion.button>
  );
}

/* ── Level Progress Bar ── */
function LevelProgressBar({ totalXp, level, progress }: { totalXp: number; level: { level: number; name: string; minXp: number; maxXp: number }; progress: number }) {
  const isMax = level.maxXp === Infinity;
  return (
    <motion.div
      className="db-level"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
    >
      <div className="db-level__header">
        <span className="db-level__name">Lv.{level.level} {level.name}</span>
        <span className="db-level__xp">
          {isMax ? t("db.maxLevel") : `${totalXp} / ${level.maxXp} XP`}
        </span>
      </div>
      <div className="db-level__track">
        <motion.div
          className="db-level__fill"
          initial={{ width: 0 }}
          animate={{ width: `${Math.round((isMax ? 1 : progress) * 100)}%` }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      {!isMax && (
        <div className="db-level__hint">
          {t("db.xpToNext", { remaining: String(level.maxXp - totalXp) })}
        </div>
      )}
    </motion.div>
  );
}

/* ── XP Sparkline (14 days) ── */
function XpSparkline({ data }: { data: SparklinePoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const w = 280;
  const h = 48;
  const pad = 4;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (d.value / maxVal) * (h - pad * 2);
    return `${x},${y}`;
  });
  const hasData = data.some((d) => d.value > 0);

  return (
    <motion.div
      className="db-sparkline"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14, duration: 0.4 }}
    >
      <div className="db-sparkline__label">{t("db.activityChart")}</div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {hasData ? (
          <>
            <polyline
              points={points.join(" ")}
              fill="none"
              stroke="rgba(99,102,241,0.7)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((d, i) =>
              d.value > 0 ? (
                <circle
                  key={i}
                  cx={pad + (i / (data.length - 1)) * (w - pad * 2)}
                  cy={h - pad - (d.value / maxVal) * (h - pad * 2)}
                  r="3"
                  fill="#6366f1"
                />
              ) : null
            )}
          </>
        ) : (
          <>
            <line x1={pad} y1={h / 2} x2={w - pad} y2={h / 2} stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={w / 2} y={h / 2 - 6} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="11">{t("db.noActivity")}</text>
          </>
        )}
      </svg>
    </motion.div>
  );
}

/* ── Weekly XP Bars ── */
function WeeklyXpBars({ bars }: { bars: WeeklyBar[] }) {
  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  return (
    <motion.div
      className="db-weekly"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16, duration: 0.4 }}
    >
      <div className="db-weekly__label">{t("db.weeklyXp")}</div>
      <div className="db-weekly__bars">
        {bars.map((b, i) => (
          <div key={i} className="db-weekly__col">
            <div className="db-weekly__bar-track">
              <motion.div
                className="db-weekly__bar-fill"
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((b.value / maxVal) * 100, b.value > 0 ? 8 : 0)}%` }}
                transition={{ delay: 0.2 + i * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span className="db-weekly__day">{t(b.dayKey)}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Course Progress Cards ── */
const arrowLeft = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 4l-4 4 4 4"/></svg>;
const arrowRight = <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 4l4 4-4 4"/></svg>;

function CourseProgressCards({ cards, onGoToCourse, onCreateCourse }: {
  cards: CourseCard[];
  onGoToCourse: (id: string) => void;
  onCreateCourse: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkArrows();
    const el = scrollRef.current;
    if (el) el.addEventListener("scroll", checkArrows, { passive: true });
    window.addEventListener("resize", checkArrows);
    return () => {
      el?.removeEventListener("scroll", checkArrows);
      window.removeEventListener("resize", checkArrows);
    };
  }, [checkArrows, cards.length]);

  const scroll = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(".db-course-card")?.clientWidth || 250;
    el.scrollBy({ left: dir * (cardWidth + 10), behavior: "smooth" });
  };

  if (cards.length === 0) {
    return (
      <motion.div
        className="wg-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <div className="wg-section__label">{t("db.courseProgress")}</div>
        <motion.button
          className="db-course-card db-course-card--cta"
          onClick={onCreateCourse}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="db-course-card__plus">+</span>
          <span>{t("db.createFirstCourse")}</span>
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="wg-section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
    >
      <div className="wg-section__label">{t("db.courseProgress")}</div>
      <div className="db-course-wrap">
        {canLeft && (
          <button className="db-course-arrow db-course-arrow--left" onClick={() => scroll(-1)}>
            {arrowLeft}
          </button>
        )}
        <div className="db-course-cards" ref={scrollRef}>
          {cards.map((c, i) => {
            const pct = c.lessonCount > 0 ? Math.round((c.completedCount / c.lessonCount) * 100) : 0;
            return (
              <motion.button
                key={c.id}
                className="db-course-card"
                onClick={() => onGoToCourse(c.id)}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="db-course-card__code">{c.code}</div>
                <div className="db-course-card__name">{c.name}</div>
                <div className="db-course-card__meta">
                  {t("db.lessonsCompleted", { done: String(c.completedCount), total: String(c.lessonCount) })}
                </div>
                <div className="db-course-card__bar">
                  <div className="db-course-card__bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </motion.button>
            );
          })}
        </div>
        {canRight && (
          <button className="db-course-arrow db-course-arrow--right" onClick={() => scroll(1)}>
            {arrowRight}
          </button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main Component ── */
export default function Dashboard() {
  const {
    totalXp, streakDays, level, levelProgress,
    totalLessons, totalCourses, hasActivity,
    recentLessons, sparklineData, weeklyXp, courseCards,
    flashcardStats,
    setMode, handleContinue, handleNewLesson, handleGoToCourse,
  } = useDashboard();

  const streakWeek = getStreakWeek(streakDays);

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
          {totalLessons > 0 ? t("welcome.back") : t("welcome.hello")}
        </h1>
        <p className="wg-hero__subtitle">
          {totalLessons > 0
            ? t("welcome.backDesc", { count: totalLessons })
            : t("welcome.helloDesc")}
        </p>
        {totalXp > 0 && (
          <div className="wg-hero__stats">
            {streakDays > 0 && <div className="wg-hero__stat">{streakDays} {t("welcome.dayStreak")}</div>}
            <div className="wg-hero__stat">{totalXp} XP · {level.name}</div>
          </div>
        )}
      </motion.div>

      {/* ── Streak Banner ── */}
      {streakDays > 0 && (
        <motion.div
          className="wg-streak"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.4 }}
        >
          <span className="wg-streak__fire">{fireIcon}</span>
          <div className="wg-streak__info">
            <div className="wg-streak__title">{streakDays} {t("welcome.dayStreak")}!</div>
            <div className="wg-streak__desc">{t("welcome.streakKeepGoing")}</div>
          </div>
          <div className="wg-streak__days">
            {streakWeek.map((d, i) => (
              <div key={i} className={`wg-streak__day${d.done ? " wg-streak__day--done" : ""}${d.today ? " wg-streak__day--today" : ""}${d.future ? " wg-streak__day--future" : ""}`}>
                {d.label}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Level Progress Bar ── */}
      {totalXp > 0 && (
        <LevelProgressBar totalXp={totalXp} level={level} progress={levelProgress} />
      )}

      {/* ── Stats Row ── */}
      {hasActivity && (
        <div className="wg-stats">
          <StatCard icon={statIcons.courses} value={totalCourses} label={t("welcome.statCourses")} delay={0.08} />
          <StatCard icon={statIcons.lessons} value={totalLessons} label={t("welcome.statLessons")} delay={0.12} />
          <StatCard icon={statIcons.bolt} value={totalXp || 0} label="XP" delay={0.16} />
          <StatCard icon={statIcons.target} value={level.name} label={t("welcome.statLevel")} delay={0.2} />
          <StatCard
            icon={statIcons.cards}
            value={flashcardStats ? (flashcardStats.dueToday > 0 ? flashcardStats.dueToday : <span style={{ color: "var(--success)" }}>{icons.check}</span>) : "-"}
            label={flashcardStats?.dueToday === 0 ? t("db.flashcardsAllDone") : t("db.flashcardsDue")}
            delay={0.24}
          />
        </div>
      )}

      {/* ── Course Progress ── */}
      <CourseProgressCards
        cards={courseCards}
        onGoToCourse={handleGoToCourse}
        onCreateCourse={() => setMode("create-lesson")}
      />

      {/* ── Quick Actions ── */}
      <motion.div
        className="wg-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="wg-section__label">{t("welcome.quickActions")}</div>
        <div className="wg-quick-actions">
          {QUICK_ACTIONS.map((qa, i) => (
            <motion.button
              key={i}
              className="wg-qa"
              onClick={() => setMode(qa.mode)}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.14 + i * 0.03 }}
              whileHover={{ y: -2, borderColor: `rgba(${qa.tint}, 0.4)` }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="wg-qa__icon">{qa.icon}</span>
              <span className="wg-qa__label">{t(qa.labelKey)}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── Steps (new user) ── */}
      {totalLessons === 0 && (
        <motion.div
          className="wg-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="wg-section__label">{t("welcome.getStarted")}</div>
          <div className="wg-steps">
            <StepCard step={1} icon={icons.upload} title={t("welcome.step1Title")} desc={t("welcome.step1Desc")} active={true} onClick={handleNewLesson} />
            <StepCard step={2} icon={icons.ai} title={t("welcome.step2Title")} desc={t("welcome.step2Desc")} active={false} onClick={() => {}} />
            <StepCard step={3} icon={icons.rocket} title={t("welcome.step3Title")} desc={t("welcome.step3Desc")} active={false} onClick={() => {}} />
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
          <div className="wg-section__label">{t("welcome.continueLabel")}</div>
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
                    {l.highlights?.length || 0} {t("welcome.concept")}{l.date && ` · ${timeAgoShort(l.date)} ${t("welcome.ago")}`}
                  </div>
                </div>
                <div className="wg-lesson__action">{icons.arrow}</div>
              </motion.button>
            ))}
          </div>
          <motion.button className="wg-new-lesson" onClick={handleNewLesson} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <span className="wg-new-lesson__plus">+</span>
            <span>{t("welcome.newLesson")}</span>
          </motion.button>
        </motion.div>
      )}

    </div>
  );
}
