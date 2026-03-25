import { motion } from "framer-motion";
import type { ChannelDeepDiveMessage } from "../../../../types";
import { formatTimestamp } from "../../../../utils/formatters";
import { hashAuthorColor, renderFormattedText } from "./DeepDiveHelpers";
import type { QuickAction } from "./useDeepDive";

interface Props {
  topic: string;
  messages: ChannelDeepDiveMessage[];
  loading: boolean;
  savedMsgId: string | null;
  quickActions: QuickAction[];
  input: string;
  setInput: (val: string) => void;
  handleQuickAction: (prompt: string) => void;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSaveAsNote: (msg: ChannelDeepDiveMessage) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function DeepDiveMessageList({
  topic,
  messages,
  loading,
  savedMsgId,
  quickActions,
  input,
  setInput,
  handleQuickAction,
  handleSend,
  handleKeyDown,
  handleSaveAsNote,
  messagesEndRef,
  textareaRef,
}: Props) {
  return (
    <div className="sh-tool">
      <div className="sh-tool__header">
        <div className="sh-tool__header-left">
          <div className="sh-dive__header-icon">
            <span>{"D"}</span>
          </div>
          <div className="sh-dive__header-info">
            <h3 className="sh-main-content__channel-name">{topic}</h3>
            <span className="sh-dive__subtitle">Grup AI Sohbeti</span>
          </div>
        </div>
        <div className="sh-tool__header-right">
          <span className="sh-dive__msg-count">
            {messages.length} mesaj
          </span>
        </div>
      </div>

      <div className="sh-tool__body" style={{ padding: 0 }}>
        <div className="sh-dive__messages">
          {messages.map((msg) => {
            const isAI = msg.role === "assistant";
            return (
              <motion.div
                key={msg.id}
                className={`sh-dive__bubble-row ${isAI ? "sh-dive__bubble-row--ai" : "sh-dive__bubble-row--user"}`}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 340, damping: 28 }}
              >
                {isAI && (
                  <div className="sh-dive__avatar sh-dive__avatar--ai">
                    <span>{"AI"}</span>
                  </div>
                )}

                <div className={`sh-dive__bubble ${isAI ? "sh-dive__bubble--ai" : "sh-dive__bubble--user"}`}>
                  <div className="sh-dive__bubble-meta">
                    <span className="sh-dive__bubble-author">
                      {isAI ? "Study AI" : msg.authorNickname}
                    </span>
                    <time className="sh-dive__bubble-time">{formatTimestamp(msg.timestamp)}</time>
                  </div>

                  <div className="sh-dive__bubble-text">
                    {isAI ? renderFormattedText(msg.text) : msg.text}
                  </div>

                  {isAI && (
                    <div className="sh-dive__bubble-actions">
                      <button
                        className={`sh-dive__save-btn ${savedMsgId === msg.id ? "sh-dive__save-btn--saved" : ""}`}
                        onClick={() => handleSaveAsNote(msg)}
                        disabled={savedMsgId === msg.id}
                        title="Not olarak kaydet"
                      >
                        <svg className="sh-dive__save-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 1h7l3 3v9a2 2 0 0 1-2 2H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z" />
                          <path d="M5 1v4h5V1" />
                          <path d="M5 10h6" />
                          <path d="M5 12.5h4" />
                        </svg>
                        <span>{savedMsgId === msg.id ? "Kaydedildi" : "Not olarak kaydet"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {!isAI && (
                  <div
                    className="sh-dive__avatar sh-dive__avatar--user"
                    style={{ background: `linear-gradient(135deg, ${hashAuthorColor(msg.authorId)}, ${hashAuthorColor(msg.authorId)}dd)` }}
                  >
                    <span>{msg.authorNickname.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </motion.div>
            );
          })}

          {loading && (
            <div className="sh-dive__bubble-row sh-dive__bubble-row--ai">
              <div className="sh-dive__avatar sh-dive__avatar--ai">
                <span>{"AI"}</span>
              </div>
              <div className="sh-dive__typing-bubble">
                <span className="sh-dive__typing-label">Study AI d{"\ü"}{"\ş"}{"\ü"}n{"\ü"}yor</span>
                <span className="sh-dive__typing-dots">
                  <span className="sh-dive__dot" />
                  <span className="sh-dive__dot" />
                  <span className="sh-dive__dot" />
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="sh-dive__quick-actions">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="sh-dive__quick-btn"
              onClick={() => handleQuickAction(action.prompt)}
              disabled={loading}
            >
              {action.label}
            </button>
          ))}
        </div>

        <div className="sh-dive__input">
          <div className="sh-message-input__wrapper">
            <textarea
              ref={textareaRef}
              className="sh-message-input__textarea"
              placeholder="Bir soru sorun..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="sh-message-input__send"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              {loading ? "..." : ">"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
