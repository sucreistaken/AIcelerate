// admin/components/StatCard.tsx — Statistics card with icon and optional trend
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: StatCardProps) {
  const borderStyle = color ? { borderLeftColor: color } : undefined;

  return (
    <div className="admin-stat-card" style={borderStyle}>
      <div className="admin-stat-card__header">
        <span className="admin-stat-card__label">{label}</span>
        <span className="admin-stat-card__icon">
          <Icon size={20} />
        </span>
      </div>
      <div className="admin-stat-card__value">{value}</div>
      {trend !== undefined && (
        <span
          className={`admin-stat-card__trend ${
            trend >= 0
              ? "admin-stat-card__trend--up"
              : "admin-stat-card__trend--down"
          }`}
        >
          {trend >= 0 ? (
            <TrendingUp size={14} />
          ) : (
            <TrendingDown size={14} />
          )}
          {trend >= 0 ? "+" : ""}
          {trend}%
        </span>
      )}
    </div>
  );
}
