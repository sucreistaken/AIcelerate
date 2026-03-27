// src/components/SchedulerWidget.tsx
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSchedulerStore } from "../stores/schedulerStore";
import { useUiStore } from "../stores/uiStore";
import { t } from "../utils/i18n";

const taskTypeLabelsShort: Record<string, string> = {
  "review-weakness": "Review",
  "flashcard-review": "Cards",
  "quiz-practice": "Quiz",
  "deep-dive": "Dive",
  revision: "Rev",
};

const taskTypeLabels: Record<string, string> = {
  "review-weakness": "Review",
  "flashcard-review": "Flashcards",
  "quiz-practice": "Quiz Practice",
  "deep-dive": "Deep Dive",
  revision: "Revision",
};

export default function SchedulerWidget() {
  const scheduler = useSchedulerStore();
  const setMode = useUiStore((s) => s.setMode);

  useEffect(() => {
    scheduler.fetchNextSession();
    scheduler.fetchStreak();
    scheduler.fetchDailyPlan();
  }, []);

  const handleStartTask = () => {
    if (!scheduler.nextTask) return;
    const taskType = scheduler.nextTask.taskType;
    if (taskType === "flashcard-review") setMode("flashcards");
    else if (taskType === "quiz-practice") setMode("quiz");
    else if (taskType === "deep-dive") setMode("deep-dive");
    else setMode("plan");
  };

  const handleCompleteTask = async (taskId: string) => {
    await scheduler.completeTask(taskId);
    scheduler.fetchNextSession();
  };

  if (!scheduler.nextTask && !scheduler.dailyPlan?.tasks.length) {
    return null;
  }

  return (
    <div className="scheduler-widget">
      {/* Compact header */}
      <div className="scheduler-widget__header" onClick={scheduler.toggleExpanded}>
        <div className="scheduler-widget__left">
          {scheduler.nextTask && (
            <>
              <span className="scheduler-widget__icon">
                {taskTypeLabelsShort[scheduler.nextTask.taskType] || "Study"}
              </span>
              <div className="scheduler-widget__info">
                <span className="scheduler-widget__label">{t("scheduler.studyNow")}</span>
                <span className="scheduler-widget__topic">{scheduler.nextTask.topicName}</span>
              </div>
            </>
          )}
          {!scheduler.nextTask && (
            <div className="scheduler-widget__info">
              <span className="scheduler-widget__label">{t("scheduler.allCaughtUp")}</span>
            </div>
          )}
        </div>
        <div className="scheduler-widget__right">
          {scheduler.streak && scheduler.streak.currentStreak > 0 && (
            <span className="scheduler-widget__streak" title={`${scheduler.streak.currentStreak} day streak`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2c1 4-2 7-2 10a4 4 0 0 0 8 0c0-3-1-5-2-7 0 0-1 3-2 3s-2-3-2-6z"/></svg>{" "}{scheduler.streak.currentStreak}
            </span>
          )}
          {scheduler.nextTask && (
            <button
              className="btn btn-sm btn-accent"
              onClick={(e) => {
                e.stopPropagation();
                handleStartTask();
              }}
            >
              {t("scheduler.start")}
            </button>
          )}
          <button className="scheduler-widget__toggle" aria-label="Toggle scheduler details">
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
              style={{ transform: scheduler.expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Reason line */}
      {scheduler.nextTask && !scheduler.expanded && (
        <div className="scheduler-widget__reason">{scheduler.nextTask.reason}</div>
      )}

      {/* Expanded: daily plan */}
      <AnimatePresence>
        {scheduler.expanded && scheduler.dailyPlan && (
          <motion.div
            className="scheduler-widget__expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="scheduler-widget__plan-header">
              <span className="scheduler-widget__plan-title">{t("scheduler.dailyPlan")}</span>
              <span className="muted small">
                {scheduler.dailyPlan.tasks.filter((t) => t.completed).length}/{scheduler.dailyPlan.tasks.length} done
              </span>
            </div>
            <div className="scheduler-widget__tasks">
              {scheduler.dailyPlan.tasks.map((task) => (
                <label key={task.id} className={`scheduler-widget__task${task.completed ? " scheduler-widget__task--done" : ""}`}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => !task.completed && handleCompleteTask(task.id)}
                  />
                  <span className="scheduler-widget__task-icon">
                    {taskTypeLabelsShort[task.taskType] || "Study"}
                  </span>
                  <span className="scheduler-widget__task-name">{task.topicName}</span>
                  <span className="scheduler-widget__task-type">
                    {taskTypeLabels[task.taskType] || task.taskType}
                  </span>
                  <span className="scheduler-widget__task-time">{task.estimatedMinutes}m</span>
                </label>
              ))}
              {scheduler.dailyPlan.tasks.length === 0 && (
                <div className="muted small" style={{ padding: "8px 0" }}>{t("scheduler.noTasks")}</div>
              )}
            </div>
            {scheduler.dailyPlan.totalEstimatedMinutes > 0 && (
              <div className="scheduler-widget__summary">
                {t("scheduler.total")} {scheduler.dailyPlan.totalEstimatedMinutes} min
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
