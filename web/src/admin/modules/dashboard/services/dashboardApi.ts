// admin/modules/dashboard/services/dashboardApi.ts
import { adminApi } from "../../../services/adminApi";
import type { AdminStats } from "../../../types";

export const dashboardApi = {
  getStats(): Promise<AdminStats> {
    return adminApi.get<AdminStats>("/stats");
  },
};
