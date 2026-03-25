import { motion } from "framer-motion";
import { RADIUS, CIRCUMFERENCE, formatTime } from "./sprintHelpers";
import type { ChannelSprintData } from "../../../../types";

interface Props {
  sprint: ChannelSprintData;
  timeLeft: number;
}

export default function SprintTimer({ sprint, timeLeft }: Props) {
  const isStudying = sprint.phase === "studying";
  const isBreak = sprint.phase === "break";
  const isFinished = sprint.phase === "finished";

  const totalDuration = (sprint.phase === "studying" ? sprint.studyDurationMin : sprint.breakDurationMin) * 60;
  const progress = totalDuration > 0 ? timeLeft / totalDuration : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  const ringStroke = isStudying
    ? "url(#studyGradient)"
    : isBreak
      ? "url(#breakGradient)"
      : "var(--border)";

  const phaseGlow = isStudying
    ? "rgba(59, 130, 246, 0.15)"
    : isBreak
      ? "rgba(34, 197, 94, 0.15)"
      : "transparent";

  return (
    <div className="sh-sprint__timer-ring-area" style={{ background: `radial-gradient(circle at center, ${phaseGlow} 0%, transparent 70%)` }}>
      <div className="sh-sprint__ring-container">
        <svg
          className="sh-sprint__ring-svg"
          width="220"
          height="220"
          viewBox="0 0 220 220"
        >
          <defs>
            <linearGradient id="studyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="breakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke="var(--border)"
            strokeWidth="6"
            opacity="0.25"
          />
          <circle
            cx="110"
            cy="110"
            r={RADIUS}
            fill="none"
            stroke={ringStroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 110 110)"
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>

        <div className="sh-sprint__ring-center">
          <motion.div
            className="sh-sprint__ring-time"
            animate={timeLeft <= 30 && timeLeft > 0 ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: timeLeft <= 30 && timeLeft > 0 ? Infinity : 0, repeatType: "loop" }}
          >
            {formatTime(timeLeft)}
          </motion.div>
          <div
            className={`sh-sprint__ring-phase${
              isStudying
                ? " sh-sprint__ring-phase--study"
                : isBreak
                  ? " sh-sprint__ring-phase--break"
                  : ""
            }`}
          >
            {isStudying
              ? "\ÇALI\ŞMA"
              : isBreak
                ? "MOLA"
                : isFinished
                  ? "B\İTT\İ"
                  : ""}
          </div>
        </div>
      </div>

      {timeLeft === 0 && (isStudying || isBreak) && (
        <motion.div
          className="sh-sprint__time-up"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          S{"\ü"}re doldu!
        </motion.div>
      )}
    </div>
  );
}
