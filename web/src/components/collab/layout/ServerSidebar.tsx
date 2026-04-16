import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Home, Plus } from "lucide-react";
import { useServerStore } from "../../../stores/serverStore";
import { useProfileStore } from "../../../stores/profileStore";
import { t } from "../../../utils/i18n";

interface Props {
  onCreateServer: () => void;
  onNavigate?: (panel: number) => void;
}

export default function ServerSidebar({ onCreateServer, onNavigate }: Props) {
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const selectServer = useServerStore((s) => s.selectServer);
  const deselectServer = useServerStore((s) => s.deselectServer);
  const profile = useProfileStore((s) => s.profile);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  const handleServerClick = (serverId: string) => {
    selectServer(serverId);
    onNavigate?.(1);
  };

  const handleHomeClick = () => {
    deselectServer();
    onNavigate?.(2);
  };

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 17 };
  const hover = reduceMotion ? {} : { scale: 1.06, y: -1 };
  const tap = reduceMotion ? {} : { scale: 0.94 };

  return (
    <nav className="sh-server-sidebar" aria-label="Servers">
      <motion.button
        type="button"
        className={`sh-server-icon ${!activeServerId ? "sh-server-icon--active" : ""}`}
        style={{ background: "var(--accent-2)" }}
        title={t("studyHub.home")}
        aria-label={t("studyHub.home")}
        aria-current={!activeServerId ? "page" : undefined}
        onClick={handleHomeClick}
        whileHover={hover}
        whileTap={tap}
        transition={spring}
      >
        <Home size={18} strokeWidth={1.75} aria-hidden="true" color="white" />
      </motion.button>

      <div className="sh-server-divider" role="separator" />

      {servers.map((server) => {
        const isActive = server.id === activeServerId;
        const isHovered = server.id === hoveredId;
        return (
          <motion.button
            key={server.id}
            type="button"
            className={`sh-server-icon ${isActive ? "sh-server-icon--active" : ""}`}
            style={{ background: server.iconColor }}
            title={server.name}
            aria-label={server.name}
            aria-current={isActive ? "page" : undefined}
            onClick={() => handleServerClick(server.id)}
            onMouseEnter={() => setHoveredId(server.id)}
            onMouseLeave={() => setHoveredId(null)}
            whileHover={hover}
            whileTap={tap}
            transition={spring}
          >
            <AnimatePresence>
              {(isActive || isHovered) && (
                <motion.span
                  layoutId="server-pill"
                  className="sh-server-pill"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  aria-hidden="true"
                />
              )}
            </AnimatePresence>
            <span className="sh-server-icon__letter">
              {server.name.charAt(0).toUpperCase()}
            </span>
          </motion.button>
        );
      })}

      <motion.button
        type="button"
        className="sh-server-icon sh-server-icon--add"
        title={t("studyHub.createRoom")}
        aria-label={t("studyHub.createRoom")}
        onClick={onCreateServer}
        whileHover={reduceMotion ? {} : { scale: 1.06, rotate: 90 }}
        whileTap={tap}
        transition={spring}
      >
        <Plus size={18} strokeWidth={1.75} aria-hidden="true" />
      </motion.button>

      {profile && (
        <div
          className="sh-server-icon sh-server-icon--user"
          style={{ background: profile.avatar }}
          title={`${profile.nickname} (${profile.friendCode})`}
          aria-label={profile.nickname}
        >
          <span className="sh-server-icon__letter">
            {profile.nickname.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </nav>
  );
}
