import { logger } from "../../../utils/logger";
import { useState } from "react";
import { channelToolApi } from "../../../services/channelToolApi";
import { getCollabSocket } from "../../../services/socket";

interface Props {
  channelId: string;
  userId: string;
  locked: boolean;
  lockedBy: string | null;
  isOwner: boolean;
  onLockChange: (locked: boolean, lockedBy: string | null) => void;
}

export default function LockToggle({ channelId, userId, locked, lockedBy, isOwner, onLockChange }: Props) {
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    if (toggling || !isOwner) return;
    setToggling(true);
    try {
      if (locked) {
        const res = await channelToolApi.unlockTool(channelId);
        onLockChange(res.locked, res.lockedBy);
        getCollabSocket().emit("tool:unlock", { channelId });
      } else {
        const res = await channelToolApi.lockTool(channelId, userId);
        onLockChange(res.locked, res.lockedBy);
        getCollabSocket().emit("tool:lock", { channelId, lockedBy: userId });
      }
    } catch (err) {
      logger.error("Lock toggle failed:", err);
    } finally {
      setToggling(false);
    }
  }

  if (!isOwner && !locked) return null;

  return (
    <button
      className={`sh-lock-toggle${locked ? " sh-lock-toggle--locked" : ""}`}
      onClick={handleToggle}
      disabled={toggling || !isOwner}
      title={locked ? "Kilidi a\ç (sadece sahip)" : "Kilitle (sadece g\ör\ünt\üleme)"}
    >
      {locked ? "Kilitli" : "Acik"}
    </button>
  );
}
