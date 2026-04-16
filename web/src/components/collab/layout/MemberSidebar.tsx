import { useMemo } from "react";
import { useServerStore } from "../../../stores/serverStore";
import { t } from "../../../utils/i18n";
import type { ServerMemberInfo } from "../../../types";

type Status = "online" | "studying" | "idle" | "dnd" | "offline";

const STATUS_VAR: Record<Status, string> = {
  online: "var(--presence-online)",
  studying: "var(--accent-2)",
  idle: "var(--presence-idle)",
  dnd: "var(--presence-dnd)",
  offline: "var(--presence-offline)",
};

const STATUS_KEY: Record<Status, string> = {
  online: "studyHub.statusOnline",
  studying: "studyHub.statusStudying",
  idle: "studyHub.statusIdle",
  dnd: "studyHub.statusDnd",
  offline: "studyHub.statusOffline",
};

const DEFAULT_ROLE_LABEL = "Member";

export default function MemberSidebar() {
  const members = useServerStore((s) => s.members);
  const servers = useServerStore((s) => s.servers);
  const activeServerId = useServerStore((s) => s.activeServerId);

  const server = useMemo(
    () => (activeServerId ? servers.find((s) => s.id === activeServerId) ?? null : null),
    [servers, activeServerId],
  );

  const { online, offline } = useMemo(() => {
    const onl: ServerMemberInfo[] = [];
    const off: ServerMemberInfo[] = [];
    for (const m of members) {
      if ((m.status as Status) === "offline") off.push(m);
      else onl.push(m);
    }
    return { online: onl, offline: off };
  }, [members]);

  if (!server) return null;

  const roleFor = (member: ServerMemberInfo) => {
    const roleId = member.roles?.[0];
    if (!roleId) return null;
    return server.roles?.find((r) => r.id === roleId) ?? null;
  };

  const renderMember = (member: ServerMemberInfo) => {
    const status = (member.status as Status) || "offline";
    const role = roleFor(member);
    const roleName = role?.name;
    const showRole = roleName && roleName !== DEFAULT_ROLE_LABEL;

    return (
      <div
        key={member.id}
        className="sh-member"
        title={t(STATUS_KEY[status])}
        role="listitem"
      >
        <div className="sh-member__avatar" style={{ background: member.avatar }}>
          <span>{member.nickname.charAt(0).toUpperCase()}</span>
          <span
            className="sh-member__status-dot"
            style={{ background: STATUS_VAR[status] }}
            aria-label={t(STATUS_KEY[status])}
          />
        </div>
        <div className="sh-member__info">
          <span
            className="sh-member__name"
            style={role?.color ? { color: role.color } : undefined}
          >
            {member.nickname}
          </span>
          {showRole && <span className="sh-member__role">{roleName}</span>}
        </div>
      </div>
    );
  };

  return (
    <aside className="sh-member-sidebar" aria-label="Members">
      {online.length > 0 && (
        <div className="sh-member-group" role="list">
          <h4 className="sh-member-group__title">
            {t("studyHub.memberActive")} — <span style={{ fontVariantNumeric: "tabular-nums" }}>{online.length}</span>
          </h4>
          {online.map(renderMember)}
        </div>
      )}
      {offline.length > 0 && (
        <div className="sh-member-group" role="list">
          <h4 className="sh-member-group__title">
            {t("studyHub.memberOffline")} — <span style={{ fontVariantNumeric: "tabular-nums" }}>{offline.length}</span>
          </h4>
          {offline.map(renderMember)}
        </div>
      )}
    </aside>
  );
}
