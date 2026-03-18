import React, { useEffect, useState } from "react";
import { useGamificationStore, getLevelInfo, getLevelProgress } from "../../stores/gamificationStore";
import { motion, AnimatePresence } from "framer-motion";

function LevelIcon({ level }: { level: number }) {
  const icons = ["🌱", "📖", "⭐", "👑"];
  return <span>{icons[level - 1] || icons[0]}</span>;
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
            <span className="streak-badge__fire">🔥</span>
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
            <div className="level-up-toast__icon">🎉</div>
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
