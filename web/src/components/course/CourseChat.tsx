import React, { type RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChatMessage } from "../../hooks/useCourseDashboard";

function formatChatLine(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;
  let partIdx = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={`${keyPrefix}-b${partIdx++}`}>{match[2]}</strong>);
    else if (match[3]) parts.push(<code key={`${keyPrefix}-c${partIdx++}`} style={{ background: "var(--hair)", padding: "2px 6px", borderRadius: 4, fontSize: 12 }}>{match[3]}</code>);
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

function formatChatMessage(content: string) {
  return content.split("\n").map((line, i) => {
    if (line.startsWith("- ") || line.startsWith("\• ")) {
      return <div key={i} style={{ paddingLeft: 16, marginBottom: 4 }}>{"\• "}{formatChatLine(line.slice(2), `cl${i}`)}</div>;
    }
    if (!line.trim()) return <div key={i} style={{ marginBottom: 4 }}>{"\ "}</div>;
    return <div key={i} style={{ marginBottom: 4 }}>{formatChatLine(line, `cl${i}`)}</div>;
  });
}

interface CourseChatProps {
  chatHistory: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  chatBottomRef: RefObject<HTMLDivElement | null>;
  onInputChange: (value: string) => void;
  onSend: (customMsg?: string) => void;
  onClear: () => void;
}

export function CourseChat({ chatHistory, chatInput, chatLoading, chatBottomRef, onInputChange, onSend, onClear }: CourseChatProps) {
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 className="h3">Course AI Chat</h3>
        {chatHistory.length > 0 && (
          <button
            className="btn btn-ghost"
            onClick={onClear}
            style={{ fontSize: 11, color: "var(--muted)" }}
          >
            Clear Chat
          </button>
        )}
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ maxHeight: 350, overflowY: "auto", padding: 12 }}>
          {chatHistory.length === 0 && (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div className="muted small" style={{ marginBottom: 8 }}>Ask anything about your entire course</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {["What are the main themes?", "Which topics should I focus on?", "Help me prepare for the exam"].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => onSend(suggestion)}
                    style={{
                      padding: "6px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: "var(--bg)", border: "1px solid var(--border)",
                      color: "var(--text)", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--accent-2)"}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {chatHistory.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: msg.role === "user" ? "var(--accent-2)" : "var(--bg)",
                  color: msg.role === "user" ? "white" : "var(--text)",
                  borderBottomRightRadius: msg.role === "user" ? 4 : 14,
                  borderBottomLeftRadius: msg.role === "user" ? 14 : 4,
                  border: msg.role === "user" ? "none" : "1px solid var(--border)",
                  fontSize: 13, lineHeight: 1.6,
                }}>
                  {msg.role === "user" ? msg.content : formatChatMessage(msg.content)}

                  {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {msg.suggestions.map((s, si) => (
                        <button
                          key={si}
                          onClick={() => onSend(s)}
                          style={{
                            padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                            background: "var(--card)", border: "1px solid var(--border)",
                            color: "var(--text)", cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => e.currentTarget.style.borderColor = "var(--accent-2)"}
                          onMouseOut={(e) => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {chatLoading && (
            <div style={{ display: "flex", gap: 6, padding: 8 }}>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                  style={{ width: 6, height: 6, background: "var(--accent-2)", borderRadius: "50%" }}
                />
              ))}
            </div>
          )}
          <div ref={chatBottomRef} />
        </div>

        <div style={{
          padding: "10px 12px",
          borderTop: "1px solid var(--border)",
          display: "flex", gap: 8,
        }}>
          <input
            className="lc-textarea input"
            style={{ flex: 1, marginBottom: 0, height: 38, borderRadius: 19, padding: "0 16px", fontSize: 13 }}
            placeholder="Ask about the entire course..."
            value={chatInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            disabled={chatLoading}
          />
          <button
            className="btn btn-primary"
            onClick={() => onSend()}
            disabled={!chatInput.trim() || chatLoading}
            style={{
              borderRadius: "50%", width: 38, height: 38, padding: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16,
            }}
          >
            &#10148;
          </button>
        </div>
      </div>
    </div>
  );
}
