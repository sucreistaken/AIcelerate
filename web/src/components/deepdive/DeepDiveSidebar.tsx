import { motion, AnimatePresence } from "framer-motion";
import { ChatSession } from "./types";
import { t } from "../../utils/i18n";

interface Props {
  open: boolean;
  sessions: ChatSession[];
  activeSessionId: string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  createNewChat: () => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
}

export default function DeepDiveSidebar({ open, sessions, activeSessionId, switchSession, deleteSession, createNewChat }: Props) {
  const sorted = [...sessions].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.aside
          className="dd__sidebar"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 280, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          <div className="dd__sidebar-inner">
            <button className="dd__sidebar-new" onClick={createNewChat}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
              <span>Yeni sohbet</span>
            </button>

            <div className="dd__sidebar-label">Sessions</div>

            <div className="dd__sidebar-list">
              {sorted.map((s) => {
                const isActive = s.id === activeSessionId;
                const msgCount = s.messages.filter(m => m.content).length;
                return (
                  <div
                    key={s.id}
                    className={`dd__sidebar-item${isActive ? " dd__sidebar-item--active" : ""}`}
                    onClick={() => switchSession(s.id)}
                  >
                    <div className="dd__sidebar-item-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    </div>
                    <div className="dd__sidebar-item-body">
                      <span className="dd__sidebar-item-name">{s.name}</span>
                      <span className="dd__sidebar-item-meta">
                        {msgCount} msg · {formatDate(s.createdAt)}
                      </span>
                    </div>
                    {sessions.length > 1 && (
                      <button
                        className="dd__sidebar-item-del"
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                        title="Delete"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
