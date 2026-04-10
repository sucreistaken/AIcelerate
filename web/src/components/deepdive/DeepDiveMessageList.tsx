import React from "react";
import { motion } from "framer-motion";
import { useLessonStore } from "../../stores/lessonStore";
import { formatMessage } from "./formatMessage";
import { Message } from "./types";

interface Props {
  displayMessages: Message[];
  messages: Message[];
  showStarredOnly: boolean;
  hoveredMsg: number | null;
  setHoveredMsg: (v: number | null) => void;
  copiedMsgIdx: number | null;
  savedMsgIdx: number | null;
  currentLessonId: string | null;
  copyMessage: (content: string, i: number) => void;
  toggleBookmark: (i: number) => void;
  saveToNotes: (content: string, idx: number) => void;
  send: (query: string) => void;
}

function DeepDiveMessageList({
  displayMessages,
  messages,
  showStarredOnly,
  hoveredMsg,
  setHoveredMsg,
  copiedMsgIdx,
  savedMsgIdx,
  currentLessonId,
  copyMessage,
  toggleBookmark,
  saveToNotes,
  send,
}: Props) {
  return (
    <>
      {displayMessages.map((m, i) => {
        if (!m.content) return null;
        const actualIdx = showStarredOnly ? messages.indexOf(m) : i;
        const isUser = m.role === "user";
        return (
          <motion.div
            key={actualIdx}
            className={`dd__msg${isUser ? " dd__msg--user" : ""}${m.bookmarked ? " dd__msg--bookmarked" : ""}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={() => setHoveredMsg(actualIdx)}
            onMouseLeave={() => setHoveredMsg(null)}
          >
            <div className="dd__msg-inner">
              <div className={`dd__avatar${isUser ? " dd__avatar--user" : ""}`}>
                {isUser ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                )}
              </div>

              <div className="dd__msg-body">
                <div className="dd__msg-role">{isUser ? "You" : "LearnCraft AI"}</div>
                <div className="dd__msg-content">{formatMessage(m.content)}</div>

                {!isUser && m.content && actualIdx > 0 && <ContextBadges />}

                {!isUser && m.suggestions && m.suggestions.length > 0 && (
                  <div className="dd__suggestions">
                    {m.suggestions.map((s, si) => (
                      <button key={si} className="dd__chip" onClick={() => send(s)}>
                        {s.replace(/\*\*/g, "").replace(/\*/g, "")}
                      </button>
                    ))}
                  </div>
                )}

                {!isUser && actualIdx > 0 && (
                  <MsgActions
                    visible={hoveredMsg === actualIdx}
                    content={m.content}
                    actualIdx={actualIdx}
                    bookmarked={!!m.bookmarked}
                    copiedMsgIdx={copiedMsgIdx}
                    savedMsgIdx={savedMsgIdx}
                    copyMessage={copyMessage}
                    toggleBookmark={toggleBookmark}
                    saveToNotes={saveToNotes}
                  />
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}

export default React.memo(DeepDiveMessageList);

/* ── Sub-components ── */

function ContextBadges() {
  const state = useLessonStore.getState();
  const badges: { label: string; color: string }[] = [];
  if (state.lectureText) badges.push({ label: "Lecture", color: "#6366f1" });
  if (state.slidesText) badges.push({ label: "Slides", color: "#e17055" });
  if (state.plan) badges.push({ label: "Plan", color: "#00b894" });
  if (!badges.length) return null;
  return (
    <div className="dd__badges">
      {badges.map((b) => (
        <span key={b.label} className="dd__badge" style={{ color: b.color, background: `${b.color}15` }}>{b.label}</span>
      ))}
    </div>
  );
}

interface MsgActionsProps {
  visible: boolean;
  content: string;
  actualIdx: number;
  bookmarked: boolean;
  copiedMsgIdx: number | null;
  savedMsgIdx: number | null;
  copyMessage: (c: string, i: number) => void;
  toggleBookmark: (i: number) => void;
  saveToNotes: (c: string, i: number) => void;
}

function MsgActions({ visible, content, actualIdx, bookmarked, copiedMsgIdx, savedMsgIdx, copyMessage, toggleBookmark, saveToNotes }: MsgActionsProps) {
  return (
    <div className={`dd__msg-actions${visible ? " dd__msg-actions--show" : ""}`}>
      <button className="dd__action-btn" onClick={() => copyMessage(content, actualIdx)} title="Copy">
        {copiedMsgIdx === actualIdx ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
      <button className={`dd__action-btn${bookmarked ? " dd__action-btn--active" : ""}`} onClick={() => toggleBookmark(actualIdx)} title="Bookmark">
        <svg width="13" height="13" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <button className={`dd__action-btn${savedMsgIdx === actualIdx ? " dd__action-btn--saved" : ""}`} onClick={() => saveToNotes(content, actualIdx)} title="Save to notes">
        {savedMsgIdx === actualIdx ? (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        )}
      </button>
    </div>
  );
}
