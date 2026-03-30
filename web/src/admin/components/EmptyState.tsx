// admin/components/EmptyState.tsx — Empty state placeholder
import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  message: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  message,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="admin-empty">
      <div className="admin-empty__icon">
        <Icon size={48} />
      </div>
      <p className="admin-empty__message">{message}</p>
      {description && (
        <p className="admin-empty__description">{description}</p>
      )}
      {action}
    </div>
  );
}
