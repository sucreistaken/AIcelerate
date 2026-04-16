import { useCallback, useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import toast from "react-hot-toast";
import { useMessageStore } from "../../../stores/messageStore";
import { t } from "../../../utils/i18n";

interface Props {
  channelId: string;
  serverId: string;
  channelName: string;
  disabled: boolean;
}

const MAX_TEXTAREA_HEIGHT = 160;
const TYPING_THROTTLE_MS = 2000;
const TYPING_STOP_DELAY_MS = 3000;

export default function MessageInput({ channelId, serverId, channelName, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  const sendMessage = useMessageStore((s) => s.sendMessage);
  const startTyping = useMessageStore((s) => s.startTyping);
  const stopTyping = useMessageStore((s) => s.stopTyping);

  // Auto-grow textarea, capped at MAX_TEXTAREA_HEIGHT.
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [text]);

  // Cleanup typing timer on unmount/channel switch.
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [channelId]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await sendMessage(channelId, serverId, trimmed);
      setText("");
      stopTyping(channelId);
      lastTypingEmitRef.current = 0;
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      textareaRef.current?.focus();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("studyHub.sendFailed");
      toast.error(msg || t("studyHub.sendFailed"));
    } finally {
      setSending(false);
    }
  }, [text, sending, disabled, channelId, serverId, sendMessage, stopTyping]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const now = Date.now();
    if (now - lastTypingEmitRef.current > TYPING_THROTTLE_MS) {
      startTyping(channelId);
      lastTypingEmitRef.current = now;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(channelId);
      lastTypingEmitRef.current = 0;
    }, TYPING_STOP_DELAY_MS);
  };

  const placeholder = `${t("studyHub.sendPlaceholder")} #${channelName}`;

  return (
    <form
      className="sh-message-input"
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
    >
      <div className="sh-message-input__wrapper">
        <textarea
          ref={textareaRef}
          className="sh-message-input__textarea"
          placeholder={placeholder}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-busy={sending}
          rows={1}
          enterKeyHint="send"
          aria-label={placeholder}
        />
        <button
          type="submit"
          className="sh-message-input__send"
          disabled={!text.trim() || sending || disabled}
          aria-label={t("studyHub.send")}
        >
          <Send size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
