// admin/modules/users/services/userAdminApi.ts
import { adminApi } from "../../../services/adminApi";

export interface AdminUser {
  _id?: string;
  id?: string;
  email: string;
  profile: {
    nickname: string;
    avatar?: string;
  };
  role?: string;
  adminRole?: string;
  status?: string;
  createdAt: string;
}

export const userAdminApi = {
  list(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get<{ items: AdminUser[]; total: number }>("/users", params);
  },

  getById(id: string) {
    return adminApi.get<AdminUser>(`/users/${id}`);
  },

  update(id: string, data: Partial<AdminUser>) {
    return adminApi.patch<AdminUser>(`/users/${id}`, data);
  },

  setRole(id: string, role: string) {
    return adminApi.patch<AdminUser>(`/users/${id}/role`, { role });
  },

  delete(id: string) {
    return adminApi.del<{ success: boolean }>(`/users/${id}`);
  },
};
