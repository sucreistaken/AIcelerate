import { useEffect } from "react";
import { Hash, Users } from "lucide-react";
import { useMessageStore } from "../../../stores/messageStore";
import { t } from "../../../utils/i18n";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface Props {
  channelId: string;
  serverId: string;
  channelName: string;
  memberCount?: number;
  readOnly?: boolean;
}

export default function FullChat({ channelId, serverId, channelName, memberCount, readOnly }: Props) {
  const loadMessages = useMessageStore((s) => s.loadMessages);

  useEffect(() => {
    if (channelId) loadMessages(channelId);
  }, [channelId, loadMessages]);

  return (
    <div className="sh-full-chat">
      <header className="sh-full-chat__header">
        <div className="sh-full-chat__header-left">
          <Hash
            className="sh-full-chat__hash"
            size={18}
            strokeWidth={1.6}
            aria-hidden="true"
          />
          <h3 className="sh-full-chat__channel-name">{channelName}</h3>
        </div>
        {memberCount != null && (
          <span className="sh-full-chat__member-count" aria-label={`${memberCount} ${t("studyHub.memberCount")}`}>
            <Users size={14} strokeWidth={1.6} aria-hidden="true" />
            <span>{memberCount}</span>
          </span>
        )}
      </header>

      <div className="sh-full-chat__body">
        <MessageList channelId={channelId} />
      </div>

      {!readOnly ? (
        <div className="sh-full-chat__footer">
          <MessageInput
            channelId={channelId}
            serverId={serverId}
            channelName={channelName}
            disabled={false}
          />
        </div>
      ) : (
        <div className="sh-full-chat__readonly" role="note">
          {t("studyHub.announcementReadonly")}
        </div>
      )}
    </div>
  );
}
