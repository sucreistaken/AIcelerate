// admin/modules/dashboard/hooks/useDashboardStats.ts
import { useState, useEffect } from "react";
import { dashboardApi } from "../services/dashboardApi";
import type { AdminStats } from "../../../types";

export function useDashboardStats() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    dashboardApi
      .getStats()
      .then((response: any) => {
        if (!cancelled) {
          // Backend returns { ok, data: { totalUsers, ... } }
          setStats(response.data ?? response);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading };
}
