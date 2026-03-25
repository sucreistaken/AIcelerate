import { motion } from "framer-motion";
import type { ChannelSprintData } from "../../../../types";

interface Props {
  sprint: ChannelSprintData;
  members: Record<string, { status: string; lastUpdate: string; nickname: string }>;
  userId: string;
  handlePause: () => void;
  handleResume: () => void;
  handleReset: () => void;
  handleStatusChange: (status: "studying" | "break" | "idle") => void;
}

export default function SprintControls({
  sprint,
  members,
  userId,
  handlePause,
  handleResume,
  handleReset,
  handleStatusChange,
}: Props) {
  const isStudying = sprint.phase === "studying";
  const isBreak = sprint.phase === "break";

  return (
    <>
      <div className="sh-sprint__action-bar">
        {isStudying && (
          <motion.button
            className="sh-sprint__action-btn sh-sprint__action-btn--pause"
            onClick={handlePause}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Duraklat
          </motion.button>
        )}
        {isBreak && (
          <motion.button
            className="sh-sprint__action-btn sh-sprint__action-btn--resume"
            onClick={handleResume}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
          >
            Devam Et
          </motion.button>
        )}
        <motion.button
          className="sh-sprint__action-btn sh-sprint__action-btn--reset"
          onClick={handleReset}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
        >
          S{"\ı"}f{"\ı"}rla
        </motion.button>
      </div>

      <div className="sh-sprint__my-status">
        <span className="sh-sprint__my-status-label">Durumun:</span>
        <div className="sh-sprint__my-status-buttons">
          <button
            className={`sh-sprint__status-pill${
              members[userId]?.status === "studying" ? " sh-sprint__status-pill--active sh-sprint__status-pill--study" : ""
            }`}
            onClick={() => handleStatusChange("studying")}
          >
            {"\Ç"}al{"\ı"}{"\ş"}{"\ı"}yorum
          </button>
          <button
            className={`sh-sprint__status-pill${
              members[userId]?.status === "break" ? " sh-sprint__status-pill--active sh-sprint__status-pill--break" : ""
            }`}
            onClick={() => handleStatusChange("break")}
          >
            Moladay{"\ı"}m
          </button>
          <button
            className={`sh-sprint__status-pill${
              members[userId]?.status === "idle" ? " sh-sprint__status-pill--active sh-sprint__status-pill--idle" : ""
            }`}
            onClick={() => handleStatusChange("idle")}
          >
            Beklemede
          </button>
        </div>
      </div>
    </>
  );
}
