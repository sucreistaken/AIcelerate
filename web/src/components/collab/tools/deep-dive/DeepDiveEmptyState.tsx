import { QUICK_ACTION_META } from "./DeepDiveHelpers";
import type { QuickAction } from "./useDeepDive";

interface Props {
  topic: string;
  quickActions: QuickAction[];
  loading: boolean;
  input: string;
  setInput: (val: string) => void;
  handleQuickAction: (prompt: string) => void;
  handleSend: () => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export default function DeepDiveEmptyState({
  topic,
  quickActions,
  loading,
  input,
  setInput,
  handleQuickAction,
  handleSend,
  handleKeyDown,
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
      </div>

      <div className="sh-tool__body">
        <div className="sh-dive__empty-hero">
          <div className="sh-dive__empty-icon-ring">
            <span className="sh-dive__empty-icon-inner">{"D"}</span>
          </div>
          <h3 className="sh-dive__empty-title">Birlikte Ke{"\ş"}fedin</h3>
          <p className="sh-dive__empty-desc">
            Konuyla ilgili sorular sorun, AI asistan{"\ı"} herkese yard{"\ı"}mc{"\ı"} olacak.
            {"\n"}A{"\ş"}a{"\ğ"}{"\ı"}daki aksiyonlardan birini se{"\ç"}erek ba{"\ş"}layabilirsiniz.
          </p>
        </div>

        <div className="sh-dive__action-grid">
          {quickActions.map((action) => {
            const meta = QUICK_ACTION_META[action.label];
            return (
              <button
                key={action.label}
                className="sh-dive__action-card"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={loading}
              >
                <span className="sh-dive__action-card-icon">
                  {meta?.icon ?? "*"}
                </span>
                <div className="sh-dive__action-card-body">
                  <span className="sh-dive__action-card-title">
                    {action.label}
                  </span>
                  <span className="sh-dive__action-card-desc">
                    {meta?.desc ?? ""}
                  </span>
                </div>
              </button>
            );
          })}
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
