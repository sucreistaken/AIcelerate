import { useState, useEffect, useRef } from "react";
import { logger } from "../../../../utils/logger";
import { useChannelToolStore } from "../../../../stores/channelToolStore";
import { channelToolApi } from "../../../../services/channelToolApi";
import { getCollabSocket } from "../../../../services/socket";

const EMPTY_MEMBERS: Record<string, { status: string; lastUpdate: string; nickname: string }> = {};

export function useChannelSprint(channelId: string, nickname: string) {
  const sprint = useChannelToolStore(s => s.dataByChannel[channelId]?.sprint ?? null);
  const updateSprint = useChannelToolStore(s => s.updateSprint);

  const [studyMin, setStudyMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [timeLeft, setTimeLeft] = useState(0);
  const [starting, setStarting] = useState(false);

  const notifiedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sprint || sprint.phase === "idle" || sprint.phase === "finished") {
      setTimeLeft(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    notifiedRef.current = false;

    const tick = () => {
      if (!sprint.currentPhaseStartedAt) {
        setTimeLeft(0);
        return;
      }

      const phaseStart = new Date(sprint.currentPhaseStartedAt).getTime();
      const elapsed = Math.floor((Date.now() - phaseStart) / 1000);
      const duration =
        (sprint.phase === "studying" ? sprint.studyDurationMin : sprint.breakDurationMin) * 60;
      const remaining = Math.max(0, duration - elapsed);
      setTimeLeft(remaining);

      if (remaining === 0 && !notifiedRef.current) {
        notifiedRef.current = true;
        if (Notification.permission === "granted") {
          new Notification("S\üre doldu!", {
            body:
              sprint.phase === "studying"
                ? "Mola zaman\ı!"
                : "\Çal\ı\şma zaman\ı!",
          });
        }
      }
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sprint?.phase, sprint?.currentPhaseStartedAt, sprint?.studyDurationMin, sprint?.breakDurationMin]);

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    try {
      const res = await channelToolApi.startSprint(channelId, studyMin, breakMin, nickname);
      updateSprint(channelId, res.sprint);
      getCollabSocket().emit("tool:sprint:update", {
        channelId,
        sprint: res.sprint,
      });
    } catch (err) {
      logger.error("Failed to start sprint:", err);
    } finally {
      setStarting(false);
    }
  }

  async function handlePause() {
    try {
      const res = await channelToolApi.updateSprintStatus(channelId, nickname, "idle");
      updateSprint(channelId, res.sprint);
      getCollabSocket().emit("tool:sprint:update", {
        channelId,
        sprint: res.sprint,
      });
    } catch (err) {
      logger.error("Failed to pause sprint:", err);
    }
  }

  async function handleResume() {
    try {
      const res = await channelToolApi.updateSprintStatus(channelId, nickname, "studying");
      updateSprint(channelId, res.sprint);
      getCollabSocket().emit("tool:sprint:update", {
        channelId,
        sprint: res.sprint,
      });
    } catch (err) {
      logger.error("Failed to resume sprint:", err);
    }
  }

  async function handleReset() {
    try {
      const res = await channelToolApi.updateSprintStatus(channelId, nickname, "idle");
      updateSprint(channelId, res.sprint);
      getCollabSocket().emit("tool:sprint:update", {
        channelId,
        sprint: res.sprint,
      });
    } catch (err) {
      logger.error("Failed to reset sprint:", err);
    }
  }

  async function handleStatusChange(status: "studying" | "break" | "idle") {
    try {
      const res = await channelToolApi.updateSprintStatus(channelId, nickname, status);
      updateSprint(channelId, res.sprint);
      getCollabSocket().emit("tool:sprint:update", {
        channelId,
        sprint: res.sprint,
      });
    } catch (err) {
      logger.error("Failed to update status:", err);
    }
  }

  const members = sprint?.members ?? EMPTY_MEMBERS;
  const memberEntries = Object.entries(members);
  const pomodorosCompleted = sprint?.pomodorosCompleted ?? 0;

  return {
    sprint,
    studyMin,
    setStudyMin,
    breakMin,
    setBreakMin,
    timeLeft,
    starting,
    members,
    memberEntries,
    pomodorosCompleted,
    handleStart,
    handlePause,
    handleResume,
    handleReset,
    handleStatusChange,
  };
}
