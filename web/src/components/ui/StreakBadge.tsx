import React, { useEffect, useState } from "react";
import { useGamificationStore, getLevelInfo, getLevelProgress } from "../../stores/gamificationStore";
import { motion, AnimatePresence } from "framer-motion";

const SvgSeedling = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" />
    <path d="M12 12C12 8 8 4 4 4c0 4 4 8 8 8z" />
    <path d="M12 15C12 11 16 7 20 7c0 4-4 8-8 8z" />
  </svg>
);

const SvgBook = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4c2-1 5-1 7 0s5 1 7 0v14c-2 1-5 1-7 0s-5-1-7 0V4z" />
    <path d="M9 4v14" />
    <path d="M2 8c2-.5 5-.5 7 0" />
    <path d="M9 8c2-.5 5-.5 7 0" />
  </svg>
);

const SvgStar = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

const SvgCrown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 20h20" />
    <path d="M4 17l-2-9 6 4 4-7 4 7 6-4-2 9H4z" />
  </svg>
);

const SvgFlame = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 3-7 1 2 2 3 3 3 0-3 2-7 4-9 0 3 1 5 2 7 1-1 2-3 2-4 1 2 2 4 2 6 0 6-4 11-9 11z" />
  </svg>
);

const SvgSparkle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const levelIcons = [SvgSeedling, SvgBook, SvgStar, SvgCrown];

function LevelIcon({ level }: { level: number }) {
  const Icon = levelIcons[level - 1] || levelIcons[0];
  return <span style={{ display: "inline-flex", alignItems: "center" }}><Icon /></span>;
}

export function StreakBadge() {
  const { streakDays, totalXp, levelUpShown, acknowledgeLevelUp, checkStreak } = useGamificationStore();
  const level = getLevelInfo(totalXp);
  const progress = getLevelProgress(totalXp);
  const [showLevelUp, setShowLevelUp] = useState(false);

  useEffect(() => {
    checkStreak();
  }, []);

  useEffect(() => {
    if (level.level > levelUpShown && levelUpShown > 0) {
      setShowLevelUp(true);
      const timer = setTimeout(() => {
        setShowLevelUp(false);
        acknowledgeLevelUp();
      }, 4000);
      return () => clearTimeout(timer);
    }
    if (levelUpShown === 0) {
      acknowledgeLevelUp();
    }
  }, [level.level, levelUpShown]);

  return (
    <>
      <div className="streak-badge" title={`${totalXp} XP | ${level.name} | ${streakDays} gün streak`}>
        {/* Streak */}
        {streakDays > 0 && (
          <div className="streak-badge__streak">
            <span className="streak-badge__fire" style={{ display: "inline-flex", alignItems: "center" }}><SvgFlame /></span>
            <span className="streak-badge__count">{streakDays}</span>
          </div>
        )}

        {/* Level + XP */}
        <div className="streak-badge__level">
          <LevelIcon level={level.level} />
          <span className="streak-badge__xp">{totalXp} XP</span>
        </div>

        {/* Progress bar */}
        {level.maxXp !== Infinity && (
          <div className="streak-badge__progress-bar">
            <div
              className="streak-badge__progress-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Level-up celebration toast */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            className="level-up-toast"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="level-up-toast__icon" style={{ display: "inline-flex", alignItems: "center" }}><SvgSparkle /></div>
            <div>
              <div className="level-up-toast__title">Seviye Atladın!</div>
              <div className="level-up-toast__subtitle">
                <LevelIcon level={level.level} /> {level.name}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
