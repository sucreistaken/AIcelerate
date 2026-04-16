import { useEffect, useRef, useCallback } from "react";
import { useMessageStore } from "../../../stores/messageStore";
import { t } from "../../../utils/i18n";
import type { ChannelMessage } from "../../../types";
import MessageItem from "./MessageItem";

interface Props {
  channelId: string;
}

const EMPTY_MESSAGES: ChannelMessage[] = [];
const EMPTY_TYPING: string[] = [];
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export default function MessageList({ channelId }: Props) {
  const messages = useMessageStore((s) => s.messagesByChannel[channelId] ?? EMPTY_MESSAGES);
  const loading = useMessageStore((s) => s.loading);
  const hasMore = useMessageStore((s) => s.hasMore[channelId]);
  const loadMore = useMessageStore((s) => s.loadMore);
  const typingUsers = useMessageStore((s) => s.typingUsers[channelId] ?? EMPTY_TYPING);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const isLoadingMoreRef = useRef(false);

  // Auto-scroll only on NEW messages (append), not on loadMore (prepend).
  useEffect(() => {
    if (messages.length > prevLenRef.current && !isLoadingMoreRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
    prevLenRef.current = messages.length;
    isLoadingMoreRef.current = false;
  }, [messages.length]);

  const handleLoadMore = useCallback(async () => {
    const container = listRef.current;
    if (!container) return;
    const prevScrollHeight = container.scrollHeight;
    isLoadingMoreRef.current = true;
    await loadMore(channelId);
    requestAnimationFrame(() => {
      const newScrollHeight = container.scrollHeight;
      container.scrollTop += newScrollHeight - prevScrollHeight;
    });
  }, [channelId, loadMore]);

  const typingText =
    typingUsers.length === 1
      ? t("studyHub.typingSingle")
      : `${typingUsers.length} ${t("studyHub.typingMultiple")}`;

  return (
    <div
      className="sh-message-list"
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label={t("studyHub.panelContent")}
    >
      {hasMore && (
        <div className="sh-message-list__load-more">
          <button
            type="button"
            className="sh-message-list__load-btn"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading ? t("common.loading") : t("collab.loadOlder")}
          </button>
        </div>
      )}

      {messages.length === 0 && !loading && (
        <div className="sh-message-list__empty">
          <p>{t("studyHub.chatEmpty")}</p>
          <p style={{ opacity: 0.6 }}>{t("studyHub.chatEmptyHint")}</p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = i > 0 ? messages[i - 1] : null;
        const grouped = Boolean(
          prev &&
            prev.authorId === msg.authorId &&
            !msg.deleted &&
            !prev.deleted &&
            new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < GROUP_WINDOW_MS,
        );
        return (
          <MessageItem
            key={msg.id}
            message={msg}
            grouped={grouped}
            channelId={channelId}
          />
        );
      })}

      {typingUsers.length > 0 && (
        <div className="sh-typing-indicator" aria-live="polite" aria-atomic="true">
          <span className="sh-typing-indicator__dots" aria-hidden="true">
            <span className="sh-typing-dot" />
            <span className="sh-typing-dot" />
            <span className="sh-typing-dot" />
          </span>
          <span className="sh-typing-indicator__text">{typingText}</span>
        </div>
      )}

      <div ref={bottomRef} aria-hidden="true" />
    </div>
  );
}
