import { ChevronLeft, Wrench } from "lucide-react";
import { useServerStore } from "../../../stores/serverStore";
import { useProfileStore } from "../../../stores/profileStore";
import { t } from "../../../utils/i18n";
import ServerDiscovery from "../server/ServerDiscovery";
import ChannelToolRouter from "../tools/ChannelToolRouter";
import FullChat from "../chat/FullChat";

interface Props {
  onCreateServer?: () => void;
  onNavigate?: (panel: number) => void;
  isMobile?: boolean;
}

export default function MainContent({ onCreateServer, onNavigate, isMobile }: Props) {
  // Per-slice selectors — avoid full-store subscribe to minimize re-renders.
  const activeChannelId = useServerStore((s) => s.activeChannelId);
  const channels = useServerStore((s) => s.channels);
  const activeServerId = useServerStore((s) => s.activeServerId);
  const servers = useServerStore((s) => s.servers);
  const members = useServerStore((s) => s.members);
  const profile = useProfileStore((s) => s.profile);

  const activeChannel = activeChannelId ? channels.find((c) => c.id === activeChannelId) ?? null : null;
  const activeServer = activeServerId ? servers.find((s) => s.id === activeServerId) ?? null : null;

  if (!activeServerId) {
    return <ServerDiscovery onCreateServer={onCreateServer} />;
  }

  const backButton = isMobile ? (
    <button
      type="button"
      className="sh-mobile-back"
      onClick={() => onNavigate?.(1)}
      aria-label={t("studyHub.backToChannels")}
    >
      <ChevronLeft size={14} strokeWidth={2} aria-hidden="true" />
      <span>{t("studyHub.panelChannels")}</span>
    </button>
  ) : null;

  if (activeChannel && activeChannel.type === "study-tool" && activeChannel.toolType) {
    return (
      <div className="sh-main-content">
        {backButton}
        <ChannelToolRouter
          channel={activeChannel}
          serverId={activeServerId}
          serverName={activeServer?.name || ""}
          userId={profile?.id || ""}
          nickname={profile?.nickname || ""}
        />
      </div>
    );
  }

  if (activeChannel && (activeChannel.type === "text" || activeChannel.type === "announcement")) {
    return (
      <div className="sh-main-content">
        {backButton}
        <FullChat
          channelId={activeChannel.id}
          serverId={activeServerId}
          channelName={activeChannel.name}
          memberCount={members.length}
          readOnly={activeChannel.type === "announcement"}
        />
      </div>
    );
  }

  return (
    <div className="sh-main-content sh-main-content--empty" role="region" aria-label={t("studyHub.selectTool")}>
      {backButton}
      <div className="sh-main-content__placeholder">
        <div className="sh-main-content__placeholder-icon" aria-hidden="true">
          <Wrench size={44} strokeWidth={1.2} />
        </div>
        <h2 className="sh-main-content__channel-name">{t("studyHub.selectTool")}</h2>
        <p>{t("studyHub.selectToolHint")}</p>
      </div>
    </div>
  );
}
