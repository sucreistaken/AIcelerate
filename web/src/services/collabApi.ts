import { API_BASE } from "../config";
import { fetchWithAuth } from "./fetchWithAuth";
import type {
  UserProfile,
  StudyServer,
  Channel,
  ChannelMessage,
  ServerMemberInfo,
  ServerTemplate,
} from "../types";

const BASE = `${API_BASE}/api/collab`;
const request = fetchWithAuth;

// ===== Profiles =====
export const profilesApi = {
  create(nickname: string, avatar?: string) {
    return request<UserProfile>(`${BASE}/profiles`, {
      method: "POST",
      body: JSON.stringify({ nickname, avatar }),
    });
  },

  get(id: string) {
    return request<UserProfile>(`${BASE}/profiles/${id}`);
  },

  update(id: string, updates: Partial<Pick<UserProfile, "nickname" | "avatar" | "bio" | "settings">>) {
    return request<UserProfile>(`${BASE}/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  setStatus(id: string, status: UserProfile["status"]) {
    return request<UserProfile>(`${BASE}/profiles/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },

  sendFriendRequest(id: string, friendCode: string) {
    return request<{ success: boolean; message: string }>(`${BASE}/profiles/${id}/friend-request`, {
      method: "POST",
      body: JSON.stringify({ friendCode }),
    });
  },

  acceptFriendRequest(id: string, fromId: string) {
    return request(`${BASE}/profiles/${id}/friend-accept`, {
      method: "POST",
      body: JSON.stringify({ fromId }),
    });
  },

  rejectFriendRequest(id: string, fromId: string) {
    return request(`${BASE}/profiles/${id}/friend-reject`, {
      method: "POST",
      body: JSON.stringify({ fromId }),
    });
  },

  removeFriend(id: string, friendId: string) {
    return request(`${BASE}/profiles/${id}/friends/${friendId}`, {
      method: "DELETE",
    });
  },

  getFriends(id: string) {
    return request<UserProfile[]>(`${BASE}/profiles/${id}/friends`);
  },
};

// ===== Servers =====
export const serversApi = {
  create(name: string, description: string, iconColor?: string, options?: {
    tags?: string[];
    university?: string;
    isPublic?: boolean;
    templateId?: string;
  }) {
    return request<StudyServer>(`${BASE}/servers`, {
      method: "POST",
      body: JSON.stringify({ name, description, iconColor, ...options }),
    });
  },

  get(id: string) {
    return request<StudyServer>(`${BASE}/servers/${id}`);
  },

  getByInviteCode(code: string) {
    return request<StudyServer>(`${BASE}/servers/invite/${code}`);
  },

  getUserServers() {
    return request<StudyServer[]>(`${BASE}/servers/user/me`);
  },

  discover(search?: string, tags?: string[]) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tags && tags.length) params.set("tag", tags.join(","));
    return request<StudyServer[]>(`${BASE}/servers/discover?${params}`);
  },

  getTemplates() {
    return request<ServerTemplate[]>(`${BASE}/servers/templates`);
  },

  update(id: string, updates: Partial<Pick<StudyServer, "name" | "description" | "iconColor" | "settings" | "tags" | "university">>) {
    return request<StudyServer>(`${BASE}/servers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  join(id: string) {
    return request<StudyServer>(`${BASE}/servers/${id}/join`, {
      method: "POST",
    });
  },

  joinByInvite(inviteCode: string) {
    return request<StudyServer>(`${BASE}/servers/join-invite`, {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
  },

  leave(id: string) {
    return request(`${BASE}/servers/${id}/leave`, {
      method: "POST",
    });
  },

  kick(id: string, targetId: string) {
    return request(`${BASE}/servers/${id}/kick`, {
      method: "POST",
      body: JSON.stringify({ targetId }),
    });
  },

  delete(id: string) {
    return request(`${BASE}/servers/${id}`, {
      method: "DELETE",
    });
  },

  addCategory(id: string, name: string) {
    return request<StudyServer>(`${BASE}/servers/${id}/categories`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  regenerateInvite(id: string) {
    return request<{ inviteCode: string }>(`${BASE}/servers/${id}/regenerate-invite`, {
      method: "POST",
    });
  },

  getMembers(id: string) {
    return request<ServerMemberInfo[]>(`${BASE}/servers/${id}/members`);
  },
};

// ===== Channels =====
export const channelsApi = {
  create(serverId: string, data: {
    categoryId: string;
    name: string;
    type: Channel["type"];
    toolType?: Channel["toolType"];
    lessonId?: string;
    lessonTitle?: string;
  }) {
    return request<Channel>(`${BASE}/servers/${serverId}/channels`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getByServer(serverId: string) {
    return request<Channel[]>(`${BASE}/servers/${serverId}/channels`);
  },

  get(serverId: string, channelId: string) {
    return request<Channel>(`${BASE}/servers/${serverId}/channels/${channelId}`);
  },

  update(serverId: string, channelId: string, updates: Partial<Pick<Channel, "name" | "lessonId" | "lessonTitle">>) {
    return request<Channel>(`${BASE}/servers/${serverId}/channels/${channelId}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  },

  delete(serverId: string, channelId: string) {
    return request(`${BASE}/servers/${serverId}/channels/${channelId}`, {
      method: "DELETE",
    });
  },
};

// ===== Messages =====
export const messagesApi = {
  send(channelId: string, data: {
    serverId: string;
    content: string;
    type?: ChannelMessage["type"];
    threadId?: string;
  }) {
    return request<ChannelMessage>(`${BASE}/channels/${channelId}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  get(channelId: string, limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return request<ChannelMessage[]>(`${BASE}/channels/${channelId}/messages?${params}`);
  },

  getThread(channelId: string, threadId: string) {
    return request<ChannelMessage[]>(`${BASE}/channels/${channelId}/threads/${threadId}`);
  },

  edit(channelId: string, messageId: string, content: string) {
    return request<ChannelMessage>(`${BASE}/channels/${channelId}/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  },

  delete(channelId: string, messageId: string) {
    return request(`${BASE}/channels/${channelId}/messages/${messageId}`, {
      method: "DELETE",
    });
  },

  react(channelId: string, messageId: string, emoji: string) {
    return request<ChannelMessage>(`${BASE}/channels/${channelId}/messages/${messageId}/react`, {
      method: "POST",
      body: JSON.stringify({ emoji }),
    });
  },

  pin(channelId: string, messageId: string, serverId: string) {
    return request<ChannelMessage>(`${BASE}/channels/${channelId}/messages/${messageId}/pin`, {
      method: "POST",
      body: JSON.stringify({ serverId }),
    });
  },
};

// ===== Lobby =====
export const lobbyApi = {
  getMessages(limit = 50, before?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before) params.set("before", before);
    return request<ChannelMessage[]>(`${BASE}/lobby/messages?${params}`);
  },

  send(content: string) {
    return request<ChannelMessage>(`${BASE}/lobby/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  },
};
