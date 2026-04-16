import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Brain,
  ChevronDown,
  Hash,
  HelpCircle,
  Home,
  Layers,
  Megaphone,
  Network,
  Plus,
  StickyNote,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useServerStore } from "../../../stores/serverStore";
import { t } from "../../../utils/i18n";
import type { Channel } from "../../../types";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "deep-dive": Brain,
  flashcards: Layers,
  "mind-map": Network,
  notes: StickyNote,
  quiz: HelpCircle,
  sprint: Zap,
};

// Short descriptions — kept local because they're tool-specific copy
// and share TR↔EN translations through the same t() catalog later.
const TOOL_DESCRIPTIONS_TR: Record<string, string> = {
  "deep-dive": "AI ile derinlemesine analiz",
  flashcards: "Kartlarla tekrar et",
  "mind-map": "Konuyu görselleştir",
  notes: "Birlikte not al",
  quiz: "Bilgini test et",
  sprint: "Odaklanarak çalış",
};

interface Props {
  onInvite: () => void;
  onServerSettings: () => void;
  onCreateChannel: (categoryId: string) => void;
  onNavigate?: (panel: number) => void;
}

export default function ChannelSidebar({
  onInvite,
  onServerSettings,
  onCreateChannel,
  onNavigate,
}: Props) {
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const channels = useServerStore((s) => s.channels);
  const activeChannelId = useServerStore((s) => s.activeChannelId);
  const selectChannel = useServerStore((s) => s.selectChannel);
  const loading = useServerStore((s) => s.loading);

  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const reduceMotion = useReducedMotion();

  const server = useMemo(
    () => (activeServerId ? servers.find((s) => s.id === activeServerId) ?? null : null),
    [servers, activeServerId],
  );

  const { toolChannels, chatChannels } = useMemo(() => {
    if (!server) return { toolChannels: [] as Channel[], chatChannels: [] as Channel[] };
    const tools: Channel[] = [];
    const chats: Channel[] = [];
    for (const cat of server.categories) {
      const catChannels = channels.filter((ch) => cat.channelIds.includes(ch.id));
      for (const ch of catChannels) {
        if (ch.type === "study-tool") tools.push(ch);
        else chats.push(ch);
      }
    }
    return { toolChannels: tools, chatChannels: chats };
  }, [server, channels]);

  if (!server) {
    return (
      <aside className="sh-channel-sidebar" aria-label={t("studyHub.panelChannels")}>
        <div className="sh-channel-sidebar__empty">
          <div className="sh-channel-sidebar__empty-icon" aria-hidden="true">
            <Home size={26} strokeWidth={1.4} />
          </div>
          <p>{t("studyHub.noRoomSelected")}</p>
        </div>
      </aside>
    );
  }

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectCh = (ch: Channel) => {
    selectChannel(ch.id);
    onNavigate?.(2);
  };

  const firstCatId = server.categories[0]?.id;
  const toolsCollapsed = collapsed.has("tools");
  const chatCollapsed = collapsed.has("chat");

  return (
    <aside className="sh-channel-sidebar" aria-label={t("studyHub.panelChannels")}>
      <button
        type="button"
        className="sh-channel-sidebar__header"
        onClick={onServerSettings}
        aria-label={server.name}
      >
        <h3 className="sh-channel-sidebar__server-name">{server.name}</h3>
        <ChevronDown
          className="sh-channel-sidebar__chevron"
          size={16}
          strokeWidth={1.6}
          aria-hidden="true"
        />
      </button>

      <div className="sh-channel-sidebar__list">
        {loading && channels.length === 0 && (
          <div className="sh-channel-sidebar__loading" aria-live="polite">
            <div className="sh-skeleton sh-skeleton--channel" />
            <div className="sh-skeleton sh-skeleton--channel" />
            <div className="sh-skeleton sh-skeleton--channel" />
          </div>
        )}

        {toolChannels.length > 0 && (
          <section className={`sh-category ${toolsCollapsed ? "sh-category--collapsed" : ""}`}>
            <button
              type="button"
              className="sh-category__header"
              onClick={() => toggle("tools")}
              aria-expanded={!toolsCollapsed}
            >
              <ChevronDown
                className="sh-category__arrow"
                size={12}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="sh-category__name">{t("studyHub.categoryTools")}</span>
              {firstCatId && (
                <button
                  type="button"
                  className="sh-category__add"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateChannel(firstCatId);
                  }}
                  aria-label={t("studyHub.addTool")}
                  title={t("studyHub.addTool")}
                >
                  <Plus size={12} strokeWidth={2} aria-hidden="true" />
                </button>
              )}
            </button>
            {!toolsCollapsed && (
              <div className="sh-channel-tools" role="list">
                {toolChannels.map((ch) => {
                  const Icon = ch.toolType ? TOOL_ICONS[ch.toolType] ?? Hash : Hash;
                  const isActive = activeChannelId === ch.id;
                  return (
                    <motion.button
                      key={ch.id}
                      type="button"
                      role="listitem"
                      className={`sh-channel-tool ${isActive ? "sh-channel-tool--active" : ""}`}
                      onClick={() => selectCh(ch)}
                      whileHover={reduceMotion ? {} : { y: -1 }}
                      whileTap={reduceMotion ? {} : { y: 0 }}
                      transition={{ duration: 0.16 }}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="sh-channel-tool__icon" aria-hidden="true">
                        <Icon size={14} strokeWidth={1.75} />
                      </span>
                      <div className="sh-channel-tool__info">
                        <span className="sh-channel-tool__name">{ch.name}</span>
                        {ch.toolType && TOOL_DESCRIPTIONS_TR[ch.toolType] && (
                          <span className="sh-channel-tool__desc">
                            {TOOL_DESCRIPTIONS_TR[ch.toolType]}
                          </span>
                        )}
                      </div>
                      {ch.lessonId && (
                        <span
                          className="sh-channel-tool__material-dot"
                          title={ch.lessonTitle}
                          aria-label="linked"
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {chatChannels.length > 0 && (
          <section className={`sh-category ${chatCollapsed ? "sh-category--collapsed" : ""}`}>
            <button
              type="button"
              className="sh-category__header"
              onClick={() => toggle("chat")}
              aria-expanded={!chatCollapsed}
            >
              <ChevronDown
                className="sh-category__arrow"
                size={12}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span className="sh-category__name">{t("studyHub.categoryChat")}</span>
            </button>
            {!chatCollapsed && (
              <div role="list">
                {chatChannels.map((ch) => {
                  const isActive = activeChannelId === ch.id;
                  const Icon = ch.type === "announcement" ? Megaphone : Hash;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      role="listitem"
                      className={`sh-channel ${isActive ? "sh-channel--active" : ""}`}
                      onClick={() => selectCh(ch)}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <span className="sh-channel__icon" aria-hidden="true">
                        <Icon size={14} strokeWidth={1.75} />
                      </span>
                      <span className="sh-channel__name">{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {toolChannels.length === 0 && chatChannels.length === 0 && !loading && (
          <div className="sh-channel-sidebar__empty">
            <p>{t("studyHub.noToolsYet")}</p>
            {firstCatId && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onCreateChannel(firstCatId)}
                style={{ marginTop: 8 }}
              >
                {t("studyHub.addToolBtn")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sh-channel-sidebar__footer">
        <button
          type="button"
          className="sh-channel-sidebar__invite-btn"
          onClick={onInvite}
        >
          {t("studyHub.invite")}
        </button>
      </div>
    </aside>
  );
}
