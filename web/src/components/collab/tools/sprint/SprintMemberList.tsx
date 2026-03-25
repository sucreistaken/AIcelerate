import { getInitials, statusColor, statusLabel } from "./sprintHelpers";

interface Props {
  memberEntries: [string, { status: string; lastUpdate: string; nickname: string }][];
  userId: string;
}

export default function SprintMemberList({ memberEntries, userId }: Props) {
  if (memberEntries.length === 0) return null;

  return (
    <div className="sh-sprint__members-section">
      <h4 className="sh-sprint__members-heading">
        {"\Ü"}yeler
        <span className="sh-sprint__members-count">{memberEntries.length}</span>
      </h4>
      <div className="sh-sprint__members-grid">
        {memberEntries.map(([memberId, member]) => (
          <div key={memberId} className="sh-sprint__member-card">
            <div className="sh-sprint__member-avatar" style={{ borderColor: statusColor(member.status) }}>
              {getInitials(member.nickname)}
              <span
                className="sh-sprint__member-dot"
                style={{ background: statusColor(member.status) }}
              />
            </div>
            <span className="sh-sprint__member-name">
              {member.nickname}
              {memberId === userId ? " (sen)" : ""}
            </span>
            <span className="sh-sprint__member-badge" style={{ color: statusColor(member.status) }}>
              {statusLabel(member.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
