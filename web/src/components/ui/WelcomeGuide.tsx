import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { useLessonStore } from "../../stores/lessonStore";
import { useUiStore } from "../../stores/uiStore";
import { useCourseStore } from "../../stores/courseStore";
import { useGamificationStore, getLevelInfo } from "../../stores/gamificationStore";
import { ModeId } from "../../types";
import { t } from "../../utils/i18n";

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
};

const fireIcon = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M12 12c2-2.96 0-7-1-8 0 3.038-1.773 4.741-3 6-1.226 1.26-2 3.24-2 5a6 6 0 1 0 12 0c0-1.532-1.056-3.94-2-5-1.786 3-2.791 3-4 2z"/></svg>;

const QUICK_ACTIONS: Array<{ icon: React.ReactNode; labelKey: string; mode: ModeId; tint: string }> = [
  { icon: qaIcons.plus, labelKey: "welcome.qaCourse", mode: "course-dashboard", tint: "59, 130, 246" },
  { icon: qaIcons.doc, labelKey: "welcome.qaLesson", mode: "create-lesson", tint: "168, 85, 247" },
  { icon: qaIcons.house, labelKey: "welcome.qaRoom", mode: "study-hub", tint: "34, 197, 94" },
  { icon: qaIcons.search, labelKey: "welcome.qaExplore", mode: "study-hub", tint: "251, 146, 60" },
];

function StatCard({ icon, value, label, delay }: { icon: React.ReactNode; value: string | number; label: string; delay: number }) {
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
      {active && <div className="wg-step__arrow">{icons.arrow}</div>}
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
  const courses = useCourseStore((s) => s.courses);
  const { totalXp, streakDays } = useGamificationStore();
  const level = getLevelInfo(totalXp);

  const recentLessons = useMemo(
    () => [...lessons].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()).slice(0, 3),
    [lessons]
  );

  const totalLessons = lessons.length;
  const totalCourses = courses.length;
  const streakWeek = getStreakWeek(streakDays);

  const handleNewLesson = () => {
    if (leftPanelCollapsed) toggleLeftPanel();
  };

  const handleContinue = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    setMode("plan");
  };

  const hasActivity = totalLessons > 0 || totalXp > 0;

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

      {/* ── Stats Row ── */}
      {hasActivity && (
        <div className="wg-stats">
          <StatCard icon={statIcons.courses} value={totalCourses} label={t("welcome.statCourses")} delay={0.08} />
          <StatCard icon={statIcons.lessons} value={totalLessons} label={t("welcome.statLessons")} delay={0.12} />
          <StatCard icon={statIcons.bolt} value={totalXp || 0} label="XP" delay={0.16} />
          <StatCard icon={statIcons.target} value={level.name} label={t("welcome.statLevel")} delay={0.2} />
        </div>
      )}

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

      {/* ── Study Tools ── */}
      <motion.div
        className="wg-section"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="wg-section__label">{t("welcome.studyTools")}</div>
        <div className="wg-tools">
          {STUDY_TOOLS.map((tool, i) => (
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
              <div className="wg-tool__label">{t(tool.labelKey)}</div>
              <div className="wg-tool__desc">{t(tool.descKey)}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
