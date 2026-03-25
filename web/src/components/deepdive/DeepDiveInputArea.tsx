import React from "react";

interface DeepDiveInputAreaProps {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  send: () => void;
}

export default function DeepDiveInputArea({
  input,
  setInput,
  loading,
  textareaRef,
  send,
}: DeepDiveInputAreaProps) {
  return (
    <div className="dd-input-zone">
      <div className="dd-input-box">
        <textarea
          ref={textareaRef}
          className="dd-textarea"
          placeholder="Message LearnCraft AI..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          rows={1}
        />
        <button
          className={`dd-send${input.trim() && !loading ? ' dd-send--active' : ''}`}
          onClick={send}
          disabled={loading || !input.trim()}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
      <div className="dd-input-hint">
        Press Enter to send, Shift+Enter for new line
      </div>
    </div>
  );
}
