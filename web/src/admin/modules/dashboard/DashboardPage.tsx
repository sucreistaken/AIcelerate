// admin/modules/dashboard/DashboardPage.tsx
import { PageContainer, PageContent } from "../../components/PageContainer";
import { PageHeader } from "../../components/PageHeader";
import { Spinner } from "../../../components/ui/Spinner";
import { StatsGrid } from "./components/StatsGrid";
import { ActivityFeed } from "./components/ActivityFeed";
import { useDashboardStats } from "./hooks/useDashboardStats";

export default function DashboardPage() {
  const { stats, loading } = useDashboardStats();

  return (
    <PageContainer>
      <PageHeader title="Dashboard" subtitle="Genel bakis ve istatistikler" />
      <PageContent>
        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "3rem",
            }}
          >
            <Spinner size="lg" />
          </div>
        ) : stats ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <StatsGrid stats={stats} />
            <ActivityFeed entries={stats.recentAuditEntries ?? []} />
          </div>
        ) : (
          <p style={{ color: "#94a3b8", textAlign: "center", padding: "2rem" }}>
            Istatistikler yuklenemedi.
          </p>
        )}
      </PageContent>
    </PageContainer>
  );
}
