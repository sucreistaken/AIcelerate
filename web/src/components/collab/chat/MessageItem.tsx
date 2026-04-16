import { memo, useEffect, useRef, useState, useMemo } from "react";
import { SmilePlus, Trash2, MessageSquare } from "lucide-react";
import { useMessageStore } from "../../../stores/messageStore";
import { useProfileStore } from "../../../stores/profileStore";
import { useServerStore } from "../../../stores/serverStore";
import { t } from "../../../utils/i18n";
import type { ChannelMessage } from "../../../types";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "🙌"];

interface Props {
  message: ChannelMessage;
  grouped: boolean;
  channelId: string;
}

function MessageItemInner({ message, grouped, channelId }: Props) {
  const profile = useProfileStore((s) => s.profile);
  const members = useServerStore((s) => s.members);
  const reactToMessage = useMessageStore((s) => s.reactToMessage);
  const deleteMessage = useMessageStore((s) => s.deleteMessage);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);


  const author = useMemo(
    () => members.find((m) => m.id === message.authorId),
    [members, message.authorId],
  );
  const isOwnMessage = profile?.id === message.authorId;
  const isSystem = message.type === "system";

  // Close reaction picker on Escape or outside click. Defer attaching the
  // mousedown listener to the NEXT frame so the same click that opened
  // the picker isn't immediately caught as "outside" (fires both mousedown
  // → React onClick → state updates → effect → listener attach, all within
  // one task; without the defer the listener sees the CURRENT mousedown).
  useEffect(() => {
    if (!showPicker) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPicker(false);
        pickerTriggerRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        pickerRef.current &&
        !pickerRef.current.contains(target) &&
        !pickerTriggerRef.current?.contains(target)
      ) {
        setShowPicker(false);
      }
    };
    window.addEventListener("keydown", onKey);
    const raf = requestAnimationFrame(() => {
      document.addEventListener("mousedown", onClick);
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", onClick);
    };
  }, [showPicker]);

  const time = useMemo(
    () =>
      new Date(message.createdAt).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [message.createdAt],
  );

  if (message.deleted) {
    return (
      <div className="sh-msg sh-msg--deleted" role="note">
        <span className="sh-msg__deleted-text">{t("studyHub.messageDeleted")}</span>
      </div>
    );
  }

  if (isSystem) {
    return (
      <div className="sh-msg sh-msg--system" role="note">
        <span className="sh-msg__system-text">{message.content}</span>
      </div>
    );
  }

  // Author fallback: server members first, then own profile (lobby has no
  // member list), then unknown.
  const authorName =
    author?.nickname ?? (isOwnMessage ? profile?.nickname : undefined) ?? t("studyHub.unknownAuthor");
  const authorAvatar = author?.avatar ?? (isOwnMessage ? profile?.avatar : undefined);
  const authorInitial = authorName.charAt(0).toUpperCase();

  return (
    <article className={`sh-msg ${grouped ? "sh-msg--grouped" : ""}`}>
      <span className="u-sr-only">{authorName}</span>
      {!grouped ? (
        <>
          <div
            className="sh-msg__avatar"
            style={{ background: authorAvatar || "var(--muted)" }}
            aria-hidden="true"
          >
            {authorInitial}
          </div>
          <div className="sh-msg__body">
            <header className="sh-msg__header">
              <span className="sh-msg__author" style={{ color: authorAvatar }}>
                {authorName}
              </span>
              <time className="sh-msg__time" dateTime={new Date(message.createdAt).toISOString()}>
                {time}
              </time>
              {message.edited && <span className="sh-msg__edited">{t("studyHub.edited")}</span>}
            </header>
            <div className="sh-msg__content">{message.content}</div>
            <MessageReactions
              message={message}
              channelId={channelId}
              onReact={reactToMessage}
              currentUserId={profile?.id}
            />
          </div>
        </>
      ) : (
        <>
          <div className="sh-msg__avatar" aria-hidden="true" />
          <div className="sh-msg__body">
            <span className="sh-msg__hover-time" aria-hidden="true">
              {time}
            </span>
            <div className="sh-msg__content">{message.content}</div>
            <MessageReactions
              message={message}
              channelId={channelId}
              onReact={reactToMessage}
              currentUserId={profile?.id}
            />
          </div>
        </>
      )}

      <div className="sh-msg__actions">
        <button
          ref={pickerTriggerRef}
          type="button"
          className="sh-msg__action-btn"
          onClick={() => setShowPicker((v) => !v)}
          aria-label={t("studyHub.addReaction")}
          aria-expanded={showPicker}
          aria-controls={`reaction-picker-${message.id}`}
        >
          <SmilePlus size={14} strokeWidth={1.75} aria-hidden="true" />
        </button>
        {message.replyCount > 0 && (
          <span className="sh-msg__thread-count">
            <MessageSquare size={12} strokeWidth={1.75} aria-hidden="true" />
            {message.replyCount} {t("studyHub.replyCount")}
          </span>
        )}
        {isOwnMessage && (
          <button
            type="button"
            className="sh-msg__action-btn sh-msg__action-btn--danger"
            onClick={() => profile && deleteMessage(channelId, message.id)}
            aria-label={t("studyHub.deleteMessage")}
          >
            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
      </div>

      {showPicker && (
        <div
          ref={pickerRef}
          id={`reaction-picker-${message.id}`}
          className="sh-reaction-picker"
          role="menu"
          aria-label={t("studyHub.addReaction")}
        >
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitem"
              className="sh-reaction-picker__btn"
              onClick={() => {
                if (profile) reactToMessage(channelId, message.id, emoji);
                setShowPicker(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}

// Memoized — avoid re-rendering every row on unrelated store changes
// (typingUsers, members presence ticks, other channel activity).
const MessageItem = memo(MessageItemInner, (prev, next) =>
  prev.message === next.message &&
  prev.grouped === next.grouped &&
  prev.channelId === next.channelId,
);
export default MessageItem;

function MessageReactions({
  message,
  channelId,
  onReact,
  currentUserId,
}: {
  message: ChannelMessage;
  channelId: string;
  onReact: (channelId: string, messageId: string, emoji: string) => void;
  currentUserId: string | undefined;
}) {
  if (message.reactions.length === 0) return null;
  return (
    <div className="sh-msg__reactions" role="group" aria-label="reactions">
      {message.reactions.map((r) => {
        const mine = currentUserId ? r.userIds.includes(currentUserId) : false;
        return (
          <button
            key={r.emoji}
            type="button"
            className={`sh-reaction ${mine ? "sh-reaction--active" : ""}`}
            onClick={() => currentUserId && onReact(channelId, message.id, r.emoji)}
            aria-pressed={mine}
          >
            <span aria-hidden="true">{r.emoji}</span>
            <span className="sh-reaction__count">{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}
