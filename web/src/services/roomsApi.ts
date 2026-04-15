import { API_BASE } from "../config";
import { apiJson } from "./fetchWithAuth";
import { useAuthStore } from "../stores/authStore";
import type { StudyServer, ServerMemberInfo, ServerTemplate } from "../types";

const BASE = `${API_BASE}/api/rooms`;

// ── Envelope shapes ────────────────────────────────────────────────────────────
// Backend convention: { ok: true, ...payload }. We type the envelope explicitly
// and pull the payload field out at the call site so consumers get the bare
// domain object, not the wrapper.

interface OkRoom { ok: true; room: StudyServer }
interface OkRooms { ok: true; rooms: StudyServer[] }
interface OkTemplates { ok: true; templates: ServerTemplate[] }
interface OkMembers { ok: true; members: ServerMemberInfo[] }
interface OkInvite { ok: true; inviteCode: string }
interface OkSimple { ok: true }

function currentUserId(): string {
  const id = useAuthStore.getState().user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

export const roomsApi = {
  async create(name: string, description: string, iconColor?: string, options?: {
    tags?: string[]; university?: string; isPublic?: boolean; templateId?: string;
  }): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}`, {
      method: "POST",
      body: JSON.stringify({ name, description, iconColor, ...options }),
    });
    return r.room;
  },

  async createSolo(name: string, options?: { topic?: string; templateId?: string; tags?: string[] }): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/solo`, {
      method: "POST",
      body: JSON.stringify({ name, ...options }),
    });
    return r.room;
  },

  async discover(search?: string, tags?: string[]): Promise<StudyServer[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags?.length) params.set("tag", tags.join(","));
    const r = await apiJson<OkRooms>(`${BASE}/discover?${params}`);
    return r.rooms ?? [];
  },

  async getTemplates(): Promise<ServerTemplate[]> {
    const r = await apiJson<OkTemplates>(`${BASE}/templates`);
    return r.templates ?? [];
  },

  async get(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}`);
    return r.room;
  },

  async getByInviteCode(code: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/invite/${code}`);
    return r.room;
  },

  async getUserRooms(): Promise<StudyServer[]> {
    // Backend route is /user/:userId — passing literal "me" would match userId="me"
    // and return an empty list rather than the current user's rooms.
    const r = await apiJson<OkRooms>(`${BASE}/user/${currentUserId()}`);
    return r.rooms ?? [];
  },

  async update(id: string, updates: Record<string, unknown>): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return r.room;
  },

  async updateTopic(id: string, topic: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/topic`, {
      method: "PATCH",
      body: JSON.stringify({ topic }),
    });
    return r.room;
  },

  async join(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/join`, { method: "POST" });
    return r.room;
  },

  async joinByInvite(inviteCode: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/join-invite`, {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
    return r.room;
  },

  async leave(id: string): Promise<void> {
    await apiJson<OkSimple>(`${BASE}/${id}/leave`, { method: "POST" });
  },

  async kick(id: string, targetId: string): Promise<void> {
    await apiJson<OkSimple>(`${BASE}/${id}/kick`, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },

  async delete(id: string): Promise<void> {
    // 204 No Content — apiJson returns { ok: true } synthetically.
    await apiJson<OkSimple>(`${BASE}/${id}`, { method: "DELETE" });
  },

  async archive(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/archive`, { method: "POST" });
    return r.room;
  },

  async unarchive(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/unarchive`, { method: "POST" });
    return r.room;
  },

  async transferOwnership(id: string, newOwnerId: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/transfer-ownership`, {
      method: "POST",
      body: JSON.stringify({ newOwnerId }),
    });
    return r.room;
  },

  async setMaterial(id: string, materialId: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/${id}/material`, {
      method: "POST",
      body: JSON.stringify({ materialId }),
    });
    return r.room;
  },

  async getMembers(id: string): Promise<ServerMemberInfo[]> {
    const r = await apiJson<OkMembers>(`${BASE}/${id}/members`);
    return r.members ?? [];
  },

  async regenerateInvite(id: string): Promise<string> {
    const r = await apiJson<OkInvite>(`${BASE}/${id}/regenerate-invite`, { method: "POST" });
    return r.inviteCode;
  },
};
