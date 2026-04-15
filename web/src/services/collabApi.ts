import { API_BASE } from "../config";
import { apiJson } from "./fetchWithAuth";
import { useAuthStore } from "../stores/authStore";
import type {
  UserProfile,
  StudyServer,
  Channel,
  ChannelMessage,
  ServerMemberInfo,
  ServerTemplate,
} from "../types";

const BASE = `${API_BASE}/api/collab`;

// ── Envelope shapes ────────────────────────────────────────────────────────────
// Backend convention: `{ ok: true, ...payload }`. We unwrap the payload field
// at the call site so callers receive the bare domain type.

interface OkProfile { ok: true; profile: UserProfile }
interface OkFriends { ok: true; friends: UserProfile[] }
interface OkRoom { ok: true; room: StudyServer }
interface OkRooms { ok: true; rooms: StudyServer[] }
interface OkTemplates { ok: true; templates: ServerTemplate[] }
interface OkMembers { ok: true; members: ServerMemberInfo[] }
interface OkInvite { ok: true; inviteCode: string }
interface OkChannel { ok: true; channel: Channel }
interface OkChannels { ok: true; channels: Channel[] }
interface OkMessage { ok: true; message: ChannelMessage }
interface OkMessages { ok: true; messages: ChannelMessage[] }
interface OkResult { ok: true; success?: boolean; message?: string }

function currentUserId(): string {
  const id = useAuthStore.getState().user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}

// ===== Profiles =====
export const profilesApi = {
  async create(nickname: string, avatar?: string): Promise<UserProfile> {
    const r = await apiJson<OkProfile>(`${BASE}/profiles`, {
      method: "POST",
      body: JSON.stringify({ nickname, avatar }),
    });
    return r.profile;
  },

  async get(id: string): Promise<UserProfile> {
    const r = await apiJson<OkProfile>(`${BASE}/profiles/${id}`);
    return r.profile;
  },

  async update(id: string, updates: Partial<Pick<UserProfile, "nickname" | "avatar" | "bio" | "settings">>): Promise<UserProfile> {
    const r = await apiJson<OkProfile>(`${BASE}/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return r.profile;
  },

  async setStatus(id: string, status: UserProfile["status"]): Promise<UserProfile> {
    const r = await apiJson<OkProfile>(`${BASE}/profiles/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return r.profile;
  },

  sendFriendRequest(id: string, friendCode: string): Promise<OkResult> {
    return apiJson<OkResult>(`${BASE}/profiles/${id}/friend-request`, {
      method: "POST",
      body: JSON.stringify({ friendCode }),
    });
  },

  acceptFriendRequest(id: string, fromId: string): Promise<OkResult> {
    return apiJson<OkResult>(`${BASE}/profiles/${id}/friend-accept`, {
      method: "POST",
      body: JSON.stringify({ fromId }),
    });
  },

  rejectFriendRequest(id: string, fromId: string): Promise<OkResult> {
    return apiJson<OkResult>(`${BASE}/profiles/${id}/friend-reject`, {
      method: "POST",
      body: JSON.stringify({ fromId }),
    });
  },

  async removeFriend(id: string, friendId: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/profiles/${id}/friends/${friendId}`, {
      method: "DELETE",
    });
  },

  async getFriends(id: string): Promise<UserProfile[]> {
    const r = await apiJson<OkFriends>(`${BASE}/profiles/${id}/friends`);
    return r.friends ?? [];
  },
};

// ===== Servers (collab namespace mounts roomController, so envelope uses `room`) =====
export const serversApi = {
  async create(name: string, description: string, iconColor?: string, options?: {
    tags?: string[];
    university?: string;
    isPublic?: boolean;
    templateId?: string;
  }): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers`, {
      method: "POST",
      body: JSON.stringify({ name, description, iconColor, ...options }),
    });
    return r.room;
  },

  async get(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/${id}`);
    return r.room;
  },

  async getByInviteCode(code: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/invite/${code}`);
    return r.room;
  },

  async getUserServers(): Promise<StudyServer[]> {
    // /user/:userId — pass real user id, not "me" literal
    const r = await apiJson<OkRooms>(`${BASE}/servers/user/${currentUserId()}`);
    return r.rooms ?? [];
  },

  async discover(search?: string, tags?: string[]): Promise<StudyServer[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags && tags.length) params.set("tag", tags.join(","));
    const r = await apiJson<OkRooms>(`${BASE}/servers/discover?${params}`);
    return r.rooms ?? [];
  },

  async getTemplates(): Promise<ServerTemplate[]> {
    const r = await apiJson<OkTemplates>(`${BASE}/servers/templates`);
    return r.templates ?? [];
  },

  async update(id: string, updates: Partial<Pick<StudyServer, "name" | "description" | "iconColor" | "settings" | "tags" | "university">>): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return r.room;
  },

  async join(id: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/${id}/join`, { method: "POST" });
    return r.room;
  },

  async joinByInvite(inviteCode: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/join-invite`, {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
    return r.room;
  },

  async leave(id: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/servers/${id}/leave`, { method: "POST" });
  },

  async kick(id: string, targetId: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/servers/${id}/kick`, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },

  async delete(id: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/servers/${id}`, { method: "DELETE" });
  },

  async addCategory(id: string, name: string): Promise<StudyServer> {
    const r = await apiJson<OkRoom>(`${BASE}/servers/${id}/categories`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    return r.room;
  },

  async regenerateInvite(id: string): Promise<string> {
    const r = await apiJson<OkInvite>(`${BASE}/servers/${id}/regenerate-invite`, { method: "POST" });
    return r.inviteCode;
  },

  async getMembers(id: string): Promise<ServerMemberInfo[]> {
    const r = await apiJson<OkMembers>(`${BASE}/servers/${id}/members`);
    return r.members ?? [];
  },
};

// ===== Channels =====
export const channelsApi = {
  async create(serverId: string, data: {
    categoryId: string;
    name: string;
    type: Channel["type"];
    toolType?: Channel["toolType"];
    lessonId?: string;
    lessonTitle?: string;
  }): Promise<Channel> {
    const r = await apiJson<OkChannel>(`${BASE}/servers/${serverId}/channels`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return r.channel;
  },

  async getByServer(serverId: string): Promise<Channel[]> {
    const r = await apiJson<OkChannels>(`${BASE}/servers/${serverId}/channels`);
    return r.channels ?? [];
  },

  async get(serverId: string, channelId: string): Promise<Channel> {
    const r = await apiJson<OkChannel>(`${BASE}/servers/${serverId}/channels/${channelId}`);
    return r.channel;
  },

  async update(serverId: string, channelId: string, updates: Partial<Pick<Channel, "name" | "lessonId" | "lessonTitle">>): Promise<Channel> {
    const r = await apiJson<OkChannel>(`${BASE}/servers/${serverId}/channels/${channelId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return r.channel;
  },

  async delete(serverId: string, channelId: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/servers/${serverId}/channels/${channelId}`, { method: "DELETE" });
  },
};

// ===== Messages =====
export const messagesApi = {
  async send(channelId: string, data: {
    serverId: string;
    content: string;
    type?: ChannelMessage["type"];
    threadId?: string;
  }): Promise<ChannelMessage> {
    const r = await apiJson<OkMessage>(`${BASE}/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return r.message;
  },

  async get(channelId: string, limit = 50, before?: string): Promise<ChannelMessage[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    const r = await apiJson<OkMessages>(`${BASE}/channels/${channelId}/messages?${params}`);
    return r.messages ?? [];
  },

  async getThread(channelId: string, threadId: string): Promise<ChannelMessage[]> {
    const r = await apiJson<OkMessages>(`${BASE}/channels/${channelId}/threads/${threadId}`);
    return r.messages ?? [];
  },

  async edit(channelId: string, messageId: string, content: string): Promise<ChannelMessage> {
    const r = await apiJson<OkMessage>(`${BASE}/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
    return r.message;
  },

  async delete(channelId: string, messageId: string): Promise<void> {
    await apiJson<OkResult>(`${BASE}/channels/${channelId}/messages/${messageId}`, { method: "DELETE" });
  },

  async react(channelId: string, messageId: string, emoji: string): Promise<ChannelMessage> {
    const r = await apiJson<OkMessage>(`${BASE}/channels/${channelId}/messages/${messageId}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
    return r.message;
  },

  async pin(channelId: string, messageId: string, serverId: string): Promise<ChannelMessage> {
    const r = await apiJson<OkMessage>(`${BASE}/channels/${channelId}/messages/${messageId}/pin`, {
      method: "POST",
      body: JSON.stringify({ serverId }),
    });
    return r.message;
  },
};

// ===== Lobby =====
export const lobbyApi = {
  async getMessages(limit = 50, before?: string): Promise<ChannelMessage[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    const r = await apiJson<OkMessages>(`${BASE}/lobby/messages?${params}`);
    return r.messages ?? [];
  },

  async send(content: string): Promise<ChannelMessage> {
    const r = await apiJson<OkMessage>(`${BASE}/lobby/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    return r.message;
  },
};
