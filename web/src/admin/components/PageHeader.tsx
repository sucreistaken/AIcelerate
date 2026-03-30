// admin/components/PageHeader.tsx — Page header with title, subtitle, actions
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="admin-page__header">
      <div>
        <h1 className="admin-page__title">{title}</h1>
        {subtitle && <p className="admin-page__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="admin-page__actions">{actions}</div>}
    </div>
  );
}
