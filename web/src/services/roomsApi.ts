import { API_BASE } from "../config";
import { fetchWithAuth } from "./fetchWithAuth";
import type { StudyServer, ServerMemberInfo, ServerTemplate } from "../types";

const BASE = `${API_BASE}/api/rooms`;
const request = fetchWithAuth;

export const roomsApi = {
  create(name: string, description: string, iconColor?: string, options?: {
    tags?: string[]; university?: string; isPublic?: boolean; templateId?: string;
  }) {
    return request<StudyServer>(`${BASE}`, {
      method: "POST",
      body: JSON.stringify({ name, description, iconColor, ...options }),
    });
  },

  createSolo(name: string, options?: { topic?: string; templateId?: string; tags?: string[] }) {
    return request<StudyServer>(`${BASE}/solo`, {
      method: "POST",
      body: JSON.stringify({ name, ...options }),
    });
  },

  discover(search?: string, tags?: string[]) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags?.length) params.set("tag", tags.join(","));
    return request<StudyServer[]>(`${BASE}/discover?${params}`);
  },

  getTemplates() {
    return request<ServerTemplate[]>(`${BASE}/templates`);
  },

  get(id: string) {
    return request<StudyServer>(`${BASE}/${id}`);
  },

  getByInviteCode(code: string) {
    return request<StudyServer>(`${BASE}/invite/${code}`);
  },

  getUserRooms() {
    return request<StudyServer[]>(`${BASE}/user/me`);
  },

  update(id: string, updates: Record<string, any>) {
    return request<StudyServer>(`${BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  updateTopic(id: string, topic: string) {
    return request<StudyServer>(`${BASE}/${id}/topic`, {
      method: "PATCH",
      body: JSON.stringify({ topic }),
    });
  },

  join(id: string) {
    return request<StudyServer>(`${BASE}/${id}/join`, {
      method: "POST",
    });
  },

  joinByInvite(inviteCode: string) {
    return request<StudyServer>(`${BASE}/join-invite`, {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  },

  leave(id: string) {
    return request<{ success: boolean }>(`${BASE}/${id}/leave`, {
      method: "POST",
    });
  },

  kick(id: string, targetId: string) {
    return request<{ success: boolean }>(`${BASE}/${id}/kick`, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },

  delete(id: string) {
    return request<{ success: boolean }>(`${BASE}/${id}`, {
      method: "DELETE",
    });
  },

  archive(id: string) {
    return request<StudyServer>(`${BASE}/${id}/archive`, {
      method: "POST",
    });
  },

  unarchive(id: string) {
    return request<StudyServer>(`${BASE}/${id}/unarchive`, {
      method: "POST",
    });
  },

  transferOwnership(id: string, newOwnerId: string) {
    return request<StudyServer>(`${BASE}/${id}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ newOwnerId }),
    });
  },

  setMaterial(id: string, materialId: string) {
    return request<StudyServer>(`${BASE}/${id}/material`, {
      method: "POST",
      body: JSON.stringify({ materialId }),
    });
  },

  getMembers(id: string) {
    return request<ServerMemberInfo[]>(`${BASE}/${id}/members`);
  },

  regenerateInvite(id: string) {
    return request<{ inviteCode: string }>(`${BASE}/${id}/regenerate-invite`, {
      method: "POST",
    });
  },
};
