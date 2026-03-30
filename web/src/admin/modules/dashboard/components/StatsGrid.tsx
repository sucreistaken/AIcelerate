// admin/modules/dashboard/components/StatsGrid.tsx
import { Users, BookOpen, GraduationCap, FileText } from "lucide-react";
import { StatCard } from "../../../components/StatCard";
import type { AdminStats } from "../../../types";

interface StatsGridProps {
  stats: AdminStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "1.25rem",
      }}
    >
      <StatCard
        label="Kullanicilar"
        value={stats.totalUsers}
        icon={Users}
        color="#6366f1"
      />
      <StatCard
        label="Kurslar"
        value={stats.totalCourses}
        icon={BookOpen}
        color="#22c55e"
      />
      <StatCard
        label="Dersler"
        value={stats.totalLessons}
        icon={GraduationCap}
        color="#f59e0b"
      />
      <StatCard
        label="Quiz"
        value={stats.recentAuditEntries?.length ?? 0}
        icon={FileText}
        color="#ec4899"
      />
    </div>
  );
}
