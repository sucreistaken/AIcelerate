// admin/modules/users/components/RoleBadge.tsx
interface RoleBadgeProps {
  role: string;
}

const ROLE_COLORS: Record<string, string> = {
  admin: "#ef4444",
  moderator: "#f59e0b",
  viewer: "#6366f1",
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const color = ROLE_COLORS[role] ?? "#64748b";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.65rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        color: "#fff",
        background: color,
        textTransform: "capitalize",
      }}
    >
      {role}
    </span>
  );
}
