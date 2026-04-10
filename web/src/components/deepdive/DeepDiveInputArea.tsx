import React from "react";
import { t } from "../../utils/i18n";

interface Props {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  send: () => void;
}

export default function DeepDiveInputArea({ input, setInput, loading, textareaRef, send }: Props) {
  return (
    <div className="dd__input">
      <div className="dd__input-box">
        <textarea
          ref={textareaRef}
          className="dd__textarea"
          placeholder={t("deepDive.placeholder") || "Ask about this lesson..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
          disabled={loading}
        />
        <button
          className={`dd__send${input.trim() && !loading ? " dd__send--active" : ""}`}
          onClick={send}
          disabled={loading || !input.trim()}
        >
          {loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="dd__send-spinner">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          )}
        </button>
      </div>
      <div className="dd__input-hint">{t("deepDive.enterHint") || "Enter to send, Shift+Enter for new line"}</div>
    </div>
  );
}
