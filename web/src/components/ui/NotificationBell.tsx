// src/components/ui/NotificationBell.tsx
import React, { useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNotificationStore } from "../../stores/notificationStore";
import { useUiStore } from "../../stores/uiStore";
import { getCollabSocket } from "../../services/socket";
import type { AppNotification, ModeId } from "../../types";
import { timeAgo } from "../../utils/formatters";
import { t } from "../../utils/i18n";

const severityColors: Record<string, string> = {
  critical: "var(--danger, #ef4444)",
  warning: "var(--warning, #f59e0b)",
  info: "var(--accent, #6366f1)",
};

export default function NotificationBell() {
  const store = useNotificationStore();
  const setMode = useUiStore((s) => s.setMode);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Socket listeners
  useEffect(() => {
    const sock = getCollabSocket();

    const handleNewNotif = (notif: AppNotification) => {
      store.prependNotification(notif);
      store.setUnreadCount(store.unreadCount + 1);
      // Shake bell on new notification
      bellRef.current?.classList.remove("notification-bell__btn--shake");
      void bellRef.current?.offsetWidth; // force reflow
      bellRef.current?.classList.add("notification-bell__btn--shake");
    };

    const handleBadgeUpdate = (data: { count: number }) => {
      store.setUnreadCount(data.count);
    };

    sock.on("notification:new", handleNewNotif);
    sock.on("notification:badge-update", handleBadgeUpdate);

    // Request initial count
    sock.emit("notification:request-count");

    return () => {
      sock.off("notification:new", handleNewNotif);
      sock.off("notification:badge-update", handleBadgeUpdate);
    };
  }, []);

  // Fetch on mount
  useEffect(() => {
    store.fetchNotifications();
    store.fetchUnreadCount();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        store.setDropdownOpen(false);
      }
    };
    if (store.dropdownOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [store.dropdownOpen]);

  const handleClick = useCallback((notif: AppNotification) => {
    if (!notif.dismissed) {
      store.dismissNotification(notif.id);
    }
    if (notif.actionTarget?.mode) {
      setMode(notif.actionTarget.mode as ModeId);
      store.setDropdownOpen(false);
    }
  }, [setMode, store]);

  const displayNotifs = store.notifications.slice(0, 20);

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button
        ref={bellRef}
        className="notification-bell__btn"
        onClick={() => store.toggleDropdown()}
        aria-label={`Notifications${store.unreadCount > 0 ? ` (${store.unreadCount} unread)` : ""}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {store.unreadCount > 0 && (
          <span className="notification-bell__badge">
            {store.unreadCount > 9 ? "9+" : store.unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {store.dropdownOpen && (
          <motion.div
            className="notification-bell__dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
          >
            <div className="notification-bell__dropdown-header">
              <span className="notification-bell__dropdown-title">{t("nav.notifications")}</span>
              <div className="notification-bell__dropdown-header-right">
                {store.unreadCount > 0 && (
                  <span className="notification-bell__dropdown-count">{store.unreadCount} {t("common.unread")}</span>
                )}
                {displayNotifs.length > 0 && (
                  <button
                    className="notification-bell__clear-all"
                    onClick={(e) => { e.stopPropagation(); store.dismissAll(); }}
                  >
                    {t("common.clearAll") || "Tumunu temizle"}
                  </button>
                )}
              </div>
            </div>
            <motion.div
              className="notification-bell__dropdown-list"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.04 } },
              }}
            >
              {displayNotifs.length === 0 && (
                <div className="notification-bell__empty">{t("common.noNotifications")}</div>
              )}
              {displayNotifs.map((notif) => (
                <motion.div
                  key={notif.id}
                  className={`notification-bell__item${!notif.dismissed ? " notification-bell__item--unread" : ""}`}
                  onClick={() => handleClick(notif)}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <div
                    className="notification-bell__item-title"
                    style={{ color: !notif.dismissed ? severityColors[notif.severity] : undefined }}
                  >
                    {notif.title}
                  </div>
                  <div className="notification-bell__item-message">{notif.message}</div>
                  <div className="notification-bell__item-time">{timeAgo(notif.createdAt)}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
