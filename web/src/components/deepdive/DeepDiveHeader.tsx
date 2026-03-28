import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatSession } from "./types";
import { t } from "../../utils/i18n";

interface DeepDiveHeaderProps {
  sessions: ChatSession[];
  activeSessionId: string;
  activeSession: ChatSession | undefined;
  showSessionMenu: boolean;
  setShowSessionMenu: (v: boolean) => void;
  showStarredOnly: boolean;
  setShowStarredOnly: (v: boolean) => void;
  messages: { role: string; content: string }[];
  menuRef: React.RefObject<HTMLDivElement | null>;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  createNewChat: () => void;
  exportToMarkdown: () => void;
  clearCurrentChat: () => void;
}

export default function DeepDiveHeader({
  sessions,
  activeSessionId,
  activeSession,
  showSessionMenu,
  setShowSessionMenu,
  showStarredOnly,
  setShowStarredOnly,
  messages,
  menuRef,
  switchSession,
  deleteSession,
  createNewChat,
  exportToMarkdown,
  clearCurrentChat,
}: DeepDiveHeaderProps) {
  return (
    <div className="dd-topbar">
      <div className="dd-topbar-left">
        <div className="dd-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
          </svg>
        </div>

        <div className="dd-session-picker" ref={menuRef}>
          <button className="dd-session-btn" onClick={() => setShowSessionMenu(!showSessionMenu)}>
            <span className="dd-session-name">{activeSession?.name || 'Chat'}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.5 }}>
              <path d="M3 5l3 3 3-3"/>
            </svg>
          </button>

          <AnimatePresence>
            {showSessionMenu && (
              <motion.div
                className="dd-dropdown"
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
              >
                {sessions.map(s => (
                  <div
                    key={s.id}
                    className={`dd-dropdown-item${s.id === activeSessionId ? ' dd-dropdown-item--active' : ''}`}
                    onClick={() => switchSession(s.id)}
                  >
                    <span className="dd-dropdown-label">{s.name}</span>
                    <span className="dd-dropdown-meta">{s.messages.length - 1} {t("deepDive.msgs")}</span>
                    {sessions.length > 1 && (
                      <button
                        className="dd-dropdown-del"
                        onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <div className="dd-dropdown-new" onClick={createNewChat}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                  {t("deepDive.newChat")}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="dd-topbar-actions">
        <button
          className={`dd-icon-btn${showStarredOnly ? ' dd-icon-btn--active' : ''}`}
          onClick={() => setShowStarredOnly(!showStarredOnly)}
          title={t("deepDive.starred")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={showStarredOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button className="dd-icon-btn" onClick={exportToMarkdown} title={t("deepDive.exportChat")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        {messages.length > 1 && (
          <button className="dd-icon-btn" onClick={clearCurrentChat} title={t("deepDive.clearChat")}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        )}
        <button className="dd-new-chat-btn" onClick={createNewChat}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          {t("deepDive.newChat")}
        </button>
      </div>
    </div>
  );
}
