import React from "react";
import { motion } from "framer-motion";
import { useLessonStore } from "../../stores/lessonStore";
import { formatMessage } from "./formatMessage";
import { Message } from "./types";

interface DeepDiveMessageListProps {
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
}: DeepDiveMessageListProps) {
  return (
    <>
      {displayMessages.map((m, i) => {
        if (i === 0 && !m.content) return null;
        const actualIdx = showStarredOnly ? messages.indexOf(m) : i;
        const isUser = m.role === 'user';
        return (
          <motion.div
            key={actualIdx}
            className={`dd-msg-row${isUser ? ' dd-msg-row--user' : ''}${m.bookmarked ? ' dd-msg-row--bookmarked' : ''}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onMouseEnter={() => setHoveredMsg(actualIdx)}
            onMouseLeave={() => setHoveredMsg(null)}
          >
            <div className="dd-msg-inner">
              <div className={`dd-avatar${isUser ? ' dd-avatar--user' : ''}`}>
                {isUser ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                )}
              </div>

              <div className="dd-msg-body">
                <div className="dd-msg-role">{isUser ? 'You' : 'LearnCraft AI'}</div>
                <div className="dd-msg-content">{formatMessage(m.content)}</div>

                {!isUser && m.content && actualIdx > 0 && (
                  <ContextBadges />
                )}

                {!isUser && m.suggestions && m.suggestions.length > 0 && (
                  <div className="dd-msg-suggestions">
                    {m.suggestions.map((s, si) => (
                      <button key={si} className="dd-chip" onClick={() => send(s)}>
                        {s.replace(/\*\*/g, '').replace(/\*/g, '')}
                      </button>
                    ))}
                  </div>
                )}

                {!isUser && actualIdx > 0 && (
                  <MessageActions
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

function ContextBadges() {
  const state = useLessonStore.getState();
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
      {state.lectureText && (
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#6366f1', fontWeight: 600 }}>
          Ders notu
        </span>
      )}
      {state.slidesText && (
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(253,203,110,0.15)', color: '#e17055', fontWeight: 600 }}>
          Slayt
        </span>
      )}
      {state.plan && (
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,184,148,0.12)', color: '#00b894', fontWeight: 600 }}>
          Plan
        </span>
      )}
    </div>
  );
}

interface MessageActionsProps {
  visible: boolean;
  content: string;
  actualIdx: number;
  bookmarked: boolean;
  copiedMsgIdx: number | null;
  savedMsgIdx: number | null;
  copyMessage: (content: string, i: number) => void;
  toggleBookmark: (i: number) => void;
  saveToNotes: (content: string, idx: number) => void;
}

function MessageActions({
  visible,
  content,
  actualIdx,
  bookmarked,
  copiedMsgIdx,
  savedMsgIdx,
  copyMessage,
  toggleBookmark,
  saveToNotes,
}: MessageActionsProps) {
  return (
    <div className={`dd-msg-actions${visible ? ' dd-msg-actions--visible' : ''}`}>
      <button className="dd-action" onClick={() => copyMessage(content, actualIdx)} title="Copy">
        {copiedMsgIdx === actualIdx ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        )}
      </button>
      <button className={`dd-action${bookmarked ? ' dd-action--active' : ''}`} onClick={() => toggleBookmark(actualIdx)} title="Bookmark">
        <svg width="14" height="14" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      </button>
      <button className={`dd-action${savedMsgIdx === actualIdx ? ' dd-action--saved' : ''}`} onClick={() => saveToNotes(content, actualIdx)} title="Save to notes">
        {savedMsgIdx === actualIdx ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
        )}
      </button>
    </div>
  );
}
