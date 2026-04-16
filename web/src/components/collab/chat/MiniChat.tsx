import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Hash, X } from "lucide-react";
import { useMessageStore } from "../../../stores/messageStore";
import { t } from "../../../utils/i18n";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface Props {
  channelId: string;
  serverId: string;
  channelName: string;
}

export default function MiniChat({ channelId, serverId, channelName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const loadMessages = useMessageStore((s) => s.loadMessages);

  useEffect(() => {
    if (channelId) loadMessages(channelId);
  }, [channelId, loadMessages]);

  // Close on Escape when open.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  const openTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 400, damping: 25 };

  const toggleLabel = `${t("studyHub.openChat")} #${channelName}`;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            type="button"
            className="sh-mini-chat__toggle"
            onClick={() => setIsOpen(true)}
            aria-label={toggleLabel}
            title={toggleLabel}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <Hash size={22} strokeWidth={1.6} aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sh-mini-chat sh-mini-chat--open"
            role="dialog"
            aria-label={`#${channelName}`}
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 16, opacity: 0 }}
            transition={openTransition}
          >
            <header className="sh-mini-chat__header">
              <Hash
                className="sh-mini-chat__header-icon"
                size={16}
                strokeWidth={1.6}
                aria-hidden="true"
              />
              <span className="sh-mini-chat__header-name">{channelName}</span>
              <button
                type="button"
                className="sh-mini-chat__close"
                onClick={() => setIsOpen(false)}
                aria-label={t("studyHub.minimize")}
              >
                <X size={14} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </header>
            <div className="sh-mini-chat__body">
              <MessageList channelId={channelId} />
            </div>
            <div className="sh-mini-chat__footer">
              <MessageInput
                channelId={channelId}
                serverId={serverId}
                channelName={channelName}
                disabled={false}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
