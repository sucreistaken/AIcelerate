// admin/components/PageContainer.tsx — Page wrapper components
import type { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  const classes = ["admin-page", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

interface PageContentProps {
  children: ReactNode;
  className?: string;
}

export function PageContent({ children, className = "" }: PageContentProps) {
  const classes = ["admin-page__content", className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
